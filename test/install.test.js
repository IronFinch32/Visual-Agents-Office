import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addHooks, removeHooks, EVENTS } from '../hooks/install.js';

const theirs = { type: 'command', command: 'echo mine' };

test('addHooks keeps existing hooks and is idempotent', () => {
  const s = { theme: 'dark', hooks: { Stop: [{ hooks: [theirs] }] } };
  addHooks(s, 4747);
  addHooks(s, 4747);
  for (const e of EVENTS) assert.ok(s.hooks[e], e);
  assert.equal(s.hooks.Stop.length, 2);
  assert.deepEqual(s.hooks.Stop[0].hooks[0], theirs);
  assert.equal(s.hooks.PreToolUse[0].matcher, '*');
  assert.match(s.hooks.Stop[1].hooks[0].command, /127\.0\.0\.1:4747\/event.*\|\| true$/);
  assert.equal(s.theme, 'dark');
});

test('removeHooks only removes ours', () => {
  const s = addHooks({ hooks: { Stop: [{ hooks: [theirs] }] } }, 4747);
  removeHooks(s);
  assert.deepEqual(s, { hooks: { Stop: [{ hooks: [theirs] }] } });
  assert.deepEqual(removeHooks(addHooks({}, 1)), {});
});

test('CLI install/uninstall writes a backup and valid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vao-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, JSON.stringify({ theme: 'dark' }));
  const cli = fileURLToPath(new URL('../hooks/install.js', import.meta.url));
  execFileSync('node', [cli, 'install', '--settings', file]);
  assert.ok(JSON.parse(readFileSync(file, 'utf8')).hooks.SessionStart);
  execFileSync('node', [cli, 'uninstall', '--settings', file]);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { theme: 'dark' });
  assert.ok(readdirSync(dir).some((f) => f.includes('.vao-backup-')));
});

test('hook command is silent and harmless when the server is down', () => {
  const s = addHooks({}, 1); // port 1: nothing listens
  const out = execFileSync('sh', ['-c', s.hooks.Stop[0].hooks[0].command], { input: '{"x":1}' }).toString();
  assert.equal(out, '');
});

test('hooksInstalled detects our hooks per port', async () => {
  const { hooksInstalled, updateSettings } = await import('../hooks/install.js');
  const dir = mkdtempSync(join(tmpdir(), 'vao-'));
  const file = join(dir, 'settings.json');
  assert.equal(hooksInstalled(file, 4747), false);
  updateSettings('install', { file, port: 4747, log: () => {} });
  assert.equal(hooksInstalled(file, 4747), true);
  assert.equal(hooksInstalled(file, 5000), false);
  updateSettings('uninstall', { file, port: 4747, log: () => {} });
  assert.equal(hooksInstalled(file, 4747), false);
});
