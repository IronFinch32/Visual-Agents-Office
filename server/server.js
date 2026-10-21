import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState, applyEvent, prune, snapshot, assignRooms, ceoSnapshot, restoreCeo } from './state.js';
import { createTenx } from './tenx.js';

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const MAX_BODY = 256 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};
const LOCAL_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

// Walk up to the nearest folder containing .git so subfolders of a repo share one office.
export function gitRootResolver(exists = existsSync) {
  const cache = new Map();
  return (cwd) => {
    if (cache.has(cwd)) return cache.get(cwd);
    let dir = cwd;
    let root = cwd;
    while (dir && dir !== dirname(dir)) {
      if (exists(join(dir, '.git'))) { root = dir; break; }
      dir = dirname(dir);
    }
    if (cache.size > 500) cache.clear();
    cache.set(cwd, root);
    return root;
  };
}

// Read-only file access for 10x mode (ADR-006): small text files and directory listings.
export const nodeFs = {
  exists: (p) => existsSync(p),
  readText: (p) => {
    try {
      if (statSync(p).size > 256 * 1024) return '';
      return readFileSync(p, 'utf8');
    } catch {
      return '';
    }
  },
  list: (dir) => {
    try {
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => ({ name: d.name, mtimeMs: statSync(join(dir, d.name)).mtimeMs }));
    } catch {
      return [];
    }
  },
};

// Where the CEO session is remembered across a restart (ADR-011).
export const CEO_FILE = join(homedir(), '.visual-agents-office', 'ceo.json');

export function fileCeoStore(file = CEO_FILE) {
  return {
    load: () => {
      try {
        if (statSync(file).size > 64 * 1024) return [];
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch {
        return [];
      }
    },
    save: (list) => {
      try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(`${file}.tmp`, JSON.stringify(list), { mode: 0o600 });
        renameSync(`${file}.tmp`, file);
      } catch { /* best effort: the office works without it */ }
    },
  };
}

export function createServer({ debug = false, projectRoot = gitRootResolver(), fs = nodeFs, ceoStore = null } = {}) {
  const state = createState({ projectRoot });
  const tenx = createTenx({ fs });
  const clients = new Set();
  let pending = null;

  // Remember the CEO session (ADR-011): restore on start, save when it changes (updatedAt at most once a minute).
  let savedCeo = '';
  let savedAt = 0;
  if (ceoStore) {
    restoreCeo(state, ceoStore.load(), Date.now());
    const list = ceoSnapshot(state);
    savedCeo = JSON.stringify(list.map(({ updatedAt, ...rest }) => rest));
    savedAt = Math.max(0, ...list.map((a) => a.updatedAt));
  }
  function persistCeo() {
    if (!ceoStore) return;
    const list = ceoSnapshot(state);
    const key = JSON.stringify(list.map(({ updatedAt, ...rest }) => rest));
    const latest = Math.max(0, ...list.map((a) => a.updatedAt));
    if (key === savedCeo && latest - savedAt < 60_000) return;
    savedCeo = key;
    savedAt = latest;
    ceoStore.save(list);
  }

  function fullSnapshot() {
    const agents = snapshot(state);
    const ceoIds = new Set(agents.filter((a) => a.ceo).map((a) => a.id));
    const tx = tenx.snapshot(new Set(agents.filter((a) => !ceoIds.has(a.sessionId)).map((a) => a.projectKey)));
    assignRooms(agents, { ceoSeen: state.ceoSeen, isTenx: (k) => !!tx[k] });
    return { agents, tenx: tx, now: Date.now() };
  }

  function send(res) {
    res.write(`event: snapshot\ndata: ${JSON.stringify(fullSnapshot())}\n\n`);
  }

  function broadcast() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      for (const res of clients) send(res);
    }, 100);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  async function handleEvent(req, res) {
    const origin = req.headers.origin;
    if (origin && !LOCAL_ORIGIN.test(origin)) { res.writeHead(403).end(); return; }
    let evt;
    try {
      evt = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (evt && typeof evt === 'object') {
      // Which tool sent it (ADR-005): hooks for Codex post to /event?src=codex.
      const src = new URL(req.url, 'http://x').searchParams.get('src');
      evt.source = src === 'codex' ? 'codex' : 'claude';
    }
    if (debug) console.log('[event]', evt.hook_event_name, evt.session_id, evt.agent_id || '', evt.tool_name || '');
    let changed = applyEvent(state, evt, Date.now());
    if (evt && evt.session_id && tenx.onEvent(evt, state.agents.get(String(evt.session_id)))) changed = true;
    if (changed) { broadcast(); persistCeo(); }
    res.writeHead(204).end();
  }

  async function serveStatic(req, res) {
    const url = new URL(req.url, 'http://x');
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = normalize(join(WEB_DIR, rel));
    if (!file.startsWith(WEB_DIR)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }

  const server = http.createServer((req, res) => {
    // Block DNS-rebinding: a foreign site resolving to 127.0.0.1 would send its own Host header.
    if (!LOCAL_HOST.test(req.headers.host || '')) { res.writeHead(421).end(); return; }
    const path = req.url.split('?')[0];
    if (req.method === 'POST' && path === '/event') return void handleEvent(req, res);
    if (req.method === 'GET' && path === '/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      send(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'GET' && path === '/api/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(fullSnapshot()));
      return;
    }
    if (req.method === 'GET' && path === '/api/decision') {
      const q = new URL(req.url, 'http://x').searchParams;
      const decision = tenx.readDecision(q.get('project') || '', q.get('role') || '');
      res.writeHead(decision ? 200 : 404, { 'content-type': 'application/json' });
      res.end(JSON.stringify(decision || { error: 'not found' }));
      return;
    }
    if (req.method === 'GET') return void serveStatic(req, res);
    res.writeHead(405).end();
  });

  const timers = [
    setInterval(() => { if (prune(state, Date.now()) | tenx.tick()) { broadcast(); persistCeo(); } }, 5_000),
    setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 15_000),
  ];
  timers.forEach((t) => t.unref());
  server.on('close', () => {
    timers.forEach(clearInterval);
    for (const res of clients) res.end();
  });

  return { server, state, tenx };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.VAO_PORT) || 4747;
  const { server } = createServer({ debug: process.env.VAO_DEBUG === '1', ceoStore: fileCeoStore() });
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Poort ${port} is al in gebruik. Draait het kantoor al?` : err.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Visual Agents Office draait op http://127.0.0.1:${port}`);
  });
}
