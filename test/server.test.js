import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, gitRootResolver } from '../server/server.js';

async function withServer(fn) {
  const { server } = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.closeAllConnections(); await new Promise((r) => server.close(r)); }
}

const post = (base, body, headers = {}) =>
  fetch(`${base}/event`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

test('POST /event updates /api/state', () => withServer(async (base) => {
  const res = await post(base, JSON.stringify({ session_id: 's1', cwd: '/x/proj', hook_event_name: 'UserPromptSubmit', prompt: 'hi' }));
  assert.equal(res.status, 204);
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.agents.length, 1);
  assert.equal(state.agents[0].status, 'working');
}));

test('invalid JSON -> 400, foreign origin -> 403', () => withServer(async (base) => {
  assert.equal((await post(base, '{nope')).status, 400);
  assert.equal((await post(base, '{}', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(base, '{}', { origin: 'http://localhost:4747' })).status, 204);
}));

test('foreign Host header is rejected (DNS rebinding)', () => withServer(async (base) => {
  const { request } = await import('node:http');
  const { port } = new URL(base);
  const status = await new Promise((resolve) => {
    request({ host: '127.0.0.1', port, path: '/api/state', headers: { host: 'evil.example' } }, (res) => resolve(res.statusCode)).end();
  });
  assert.equal(status, 421);
}));

test('oversized body is rejected', () => withServer(async (base) => {
  const res = await post(base, JSON.stringify({ x: 'a'.repeat(300 * 1024) })).catch(() => ({ status: 'reset' }));
  assert.notEqual(res.status, 204);
}));

test('static files served, traversal blocked', () => withServer(async (base) => {
  const html = await fetch(`${base}/`);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Visual Agents Office/);
  const trav = await fetch(`${base}/..%2fpackage.json`);
  assert.notEqual(trav.status, 200);
}));

test('/stream sends a snapshot on connect', () => withServer(async (base) => {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/stream`, { signal: ctrl.signal });
  const reader = res.body.getReader();
  let text = '';
  while (!text.includes('event: snapshot')) text += new TextDecoder().decode((await reader.read()).value);
  ctrl.abort();
  assert.match(text, /"agents":\[\]/);
}));

test('gitRootResolver finds the nearest .git folder, falls back to cwd', () => {
  const resolve = gitRootResolver((p) => p === '/r/app/.git');
  assert.equal(resolve('/r/app/web/src'), '/r/app');
  assert.equal(resolve('/r/app'), '/r/app');
  assert.equal(resolve('/tmp/x'), '/tmp/x');
});
