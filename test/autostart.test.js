import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serviceSpec, stableRoot, LABEL } from '../service/autostart.js';

const base = { home: '/Users/u', node: '/opt/node/bin/node', entry: '/apps/v a o/bin/visual-agents-office.js', port: 4747, uid: 501, logFile: '/Users/u/.visual-agents-office/office.log' };

test('macOS: LaunchAgent with KeepAlive, escaped args and gui domain commands', () => {
  const s = serviceSpec({ ...base, platform: 'darwin', entry: '/apps/a&b/bin/x.js' });
  assert.equal(s.kind, 'launchd');
  assert.equal(s.file, `/Users/u/Library/LaunchAgents/${LABEL}.plist`);
  assert.match(s.content, /<string>\/opt\/node\/bin\/node<\/string>/);
  assert.match(s.content, /<string>\/apps\/a&amp;b\/bin\/x\.js<\/string>/);
  assert.match(s.content, /<string>--service<\/string>/);
  assert.match(s.content, /<key>KeepAlive<\/key><true\/>/);
  assert.deepEqual(s.enable[1], ['launchctl', 'bootstrap', 'gui/501', s.file]);
  assert.deepEqual(s.disable[0], ['launchctl', 'bootout', `gui/501/${LABEL}`]);
});

test('Linux: systemd user unit with quoted paths and restart', () => {
  const s = serviceSpec({ ...base, platform: 'linux' });
  assert.equal(s.kind, 'systemd');
  assert.equal(s.file, '/Users/u/.config/systemd/user/visual-agents-office.service');
  assert.match(s.content, /ExecStart="\/opt\/node\/bin\/node" "\/apps\/v a o\/bin\/visual-agents-office\.js" "start" "--service"/);
  assert.match(s.content, /Restart=always/);
  assert.match(s.content, /WantedBy=default\.target/);
});

test('Windows: logon task', () => {
  const s = serviceSpec({ ...base, platform: 'win32' });
  assert.equal(s.kind, 'schtasks');
  assert.ok(s.enable[0].includes('ONLOGON'));
  assert.match(s.enable[0].at(-1), /"--port" "4747"/);
});

test('unsupported platform throws', () => {
  assert.throws(() => serviceSpec({ ...base, platform: 'aix' }), /niet ondersteund/);
});

test('stableRoot keeps a clone in place and copies an npx cache install', () => {
  assert.equal(stableRoot('/Users/u/code/Visual-Agents-Office', { copy: false }), '/Users/u/code/Visual-Agents-Office');
  const tmp = mkdtempSync(join(tmpdir(), 'vao-'));
  const npxRoot = join(tmp, '_npx', 'abc', 'node_modules', 'visual-agents-office');
  mkdirSync(join(npxRoot, 'bin'), { recursive: true });
  writeFileSync(join(npxRoot, 'bin', 'visual-agents-office.js'), '// cli');
  writeFileSync(join(npxRoot, 'package.json'), '{}');
  const target = stableRoot(npxRoot, { appDir: join(tmp, 'stable') });
  assert.equal(target, join(tmp, 'stable', 'app'));
  assert.ok(existsSync(join(target, 'bin', 'visual-agents-office.js')));
  assert.ok(existsSync(join(target, 'package.json')));
});
