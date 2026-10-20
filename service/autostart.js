// Run the office at login with the OS's own per-user service manager (ADR-004).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

export const LABEL = 'com.visualagentsoffice';
export const APP_DIR = join(homedir(), '.visual-agents-office');
const APP_PARTS = ['bin', 'server', 'hooks', 'web', 'scripts', 'service', 'package.json', 'LICENSE', 'README.md'];

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

/**
 * Describe the service for a platform without touching the system.
 * Returns { kind, file, content, enable: [[cmd, ...args]], disable: [[cmd, ...args]] }.
 */
export function serviceSpec({ platform, home, node, entry, port, uid, logFile }) {
  const args = [entry, 'start', '--service', '--no-open', '--port', String(port)];
  if (platform === 'darwin') {
    const file = join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${[node, ...args].map((a) => `    <string>${xml(a)}</string>`).join('\n')}
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xml(logFile)}</string>
  <key>StandardErrorPath</key><string>${xml(logFile)}</string>
</dict>
</plist>
`;
    return {
      kind: 'launchd',
      file,
      content,
      enable: [['launchctl', 'bootout', `gui/${uid}/${LABEL}`], ['launchctl', 'bootstrap', `gui/${uid}`, file]],
      disable: [['launchctl', 'bootout', `gui/${uid}/${LABEL}`]],
    };
  }
  if (platform === 'linux') {
    const file = join(home, '.config', 'systemd', 'user', 'visual-agents-office.service');
    const content = `[Unit]
Description=Visual Agents Office

[Service]
ExecStart=${[node, ...args].map(quote).join(' ')}
Restart=always
RestartSec=10
StandardOutput=append:${logFile}
StandardError=append:${logFile}

[Install]
WantedBy=default.target
`;
    return {
      kind: 'systemd',
      file,
      content,
      enable: [['systemctl', '--user', 'daemon-reload'], ['systemctl', '--user', 'enable', '--now', 'visual-agents-office.service']],
      disable: [['systemctl', '--user', 'disable', '--now', 'visual-agents-office.service']],
    };
  }
  if (platform === 'win32') {
    const run = [node, ...args].map(quote).join(' ');
    return {
      kind: 'schtasks',
      file: null,
      content: null,
      enable: [['schtasks', '/Create', '/F', '/SC', 'ONLOGON', '/TN', 'VisualAgentsOffice', '/TR', run], ['schtasks', '/Run', '/TN', 'VisualAgentsOffice']],
      disable: [['schtasks', '/End', '/TN', 'VisualAgentsOffice'], ['schtasks', '/Delete', '/F', '/TN', 'VisualAgentsOffice']],
    };
  }
  throw new Error(`Autostart wordt niet ondersteund op ${platform}.`);
}

/** npx runs from a cache that can be cleaned up; copy the app somewhere stable in that case. */
export function stableRoot(root, { appDir = APP_DIR, copy = true } = {}) {
  if (!/[\\/]_npx[\\/]/.test(root)) return root;
  const target = join(appDir, 'app');
  if (copy) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    for (const part of APP_PARTS) {
      if (existsSync(join(root, part))) cpSync(join(root, part), join(target, part), { recursive: true });
    }
  }
  return target;
}

function run(cmds, { ignoreFirstError = false } = {}) {
  cmds.forEach(([cmd, ...args], i) => {
    try {
      execFileSync(cmd, args, { stdio: 'pipe' });
    } catch (err) {
      // `bootout` of a service that isn't loaded fails; that's fine.
      if (!(ignoreFirstError && i === 0)) throw new Error(`${cmd} ${args.join(' ')} mislukte: ${err.stderr?.toString().trim() || err.message}`);
    }
  });
}

export function enableAutostart({ root, port, log = console.log }) {
  const appRoot = stableRoot(root);
  mkdirSync(APP_DIR, { recursive: true });
  const logFile = join(APP_DIR, 'office.log');
  const spec = serviceSpec({
    platform: process.platform,
    home: homedir(),
    node: process.execPath,
    entry: join(appRoot, 'bin', 'visual-agents-office.js'),
    port,
    uid: process.getuid?.() ?? userInfo().uid,
    logFile,
  });
  if (spec.file) {
    mkdirSync(join(spec.file, '..'), { recursive: true });
    writeFileSync(spec.file, spec.content);
  }
  run(spec.enable, { ignoreFirstError: spec.kind === 'launchd' });
  if (appRoot !== root) log(`App gekopieerd naar ${appRoot}`);
  log(`Autostart aan (${spec.kind}). Het kantoor start nu en bij elke login op http://127.0.0.1:${port}`);
  log(`Log: ${logFile}`);
  if (spec.kind === 'schtasks') log('Let op: autostart op Windows is niet getest.');
}

export function disableAutostart({ port = 4747, log = console.log } = {}) {
  const spec = serviceSpec({
    platform: process.platform,
    home: homedir(),
    node: process.execPath,
    entry: '',
    port,
    uid: process.getuid?.() ?? userInfo().uid,
    logFile: '',
  });
  // Best effort: each step may fail when the service isn't loaded or running.
  for (const cmd of spec.disable) {
    try { run([cmd]); } catch { /* already stopped or removed */ }
  }
  if (spec.file) rmSync(spec.file, { force: true });
  log(`Autostart uit (${spec.kind}).`);
}
