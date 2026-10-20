import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState, applyEvent, prune, snapshot } from './state.js';

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

export function createServer({ debug = false, projectRoot = gitRootResolver() } = {}) {
  const state = createState({ projectRoot });
  const clients = new Set();
  let pending = null;

  function send(res) {
    res.write(`event: snapshot\ndata: ${JSON.stringify({ agents: snapshot(state), now: Date.now() })}\n\n`);
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
    if (applyEvent(state, evt, Date.now())) broadcast();
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
      res.end(JSON.stringify({ agents: snapshot(state), now: Date.now() }));
      return;
    }
    if (req.method === 'GET') return void serveStatic(req, res);
    res.writeHead(405).end();
  });

  const timers = [
    setInterval(() => { if (prune(state, Date.now())) broadcast(); }, 5_000),
    setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 15_000),
  ];
  timers.forEach((t) => t.unref());
  server.on('close', () => {
    timers.forEach(clearInterval);
    for (const res of clients) res.end();
  });

  return { server, state };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.VAO_PORT) || 4747;
  const { server } = createServer({ debug: process.env.VAO_DEBUG === '1' });
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Poort ${port} is al in gebruik. Draait het kantoor al?` : err.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Visual Agents Office draait op http://127.0.0.1:${port}`);
  });
}
