// Adds or removes the Visual Agents Office hooks in ~/.claude/settings.json.
// Usage: node hooks/install.js install|uninstall [--settings <path>] [--port <n>]
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVENTS = [
  'SessionStart', 'SessionEnd', 'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'PermissionRequest', 'Notification', 'Elicitation',
  'Stop', 'StopFailure', 'SubagentStart', 'SubagentStop',
];
// Events whose hooks accept a tool matcher.
const MATCHER_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest']);
const MARKER = '/event'; // combined with the host below to recognise our entries

export function hookCommand(port) {
  // Silent and bounded: never blocks Claude, never prints (stdout of some hooks reaches Claude's context).
  return `curl -s -m 1 -X POST -H 'content-type: application/json' --data-binary @- http://127.0.0.1:${port}/event >/dev/null 2>&1 || true`;
}

function isOurs(hook) {
  return hook && typeof hook.command === 'string' && hook.command.includes('http://127.0.0.1:') && hook.command.includes(MARKER);
}

export function removeHooks(settings) {
  const hooks = settings.hooks || {};
  for (const event of Object.keys(hooks)) {
    if (!Array.isArray(hooks[event])) continue;
    hooks[event] = hooks[event]
      .map((group) => ({ ...group, hooks: (group.hooks || []).filter((h) => !isOurs(h)) }))
      .filter((group) => group.hooks.length > 0);
    if (hooks[event].length === 0) delete hooks[event];
  }
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
  return settings;
}

export function addHooks(settings, port) {
  removeHooks(settings);
  settings.hooks = settings.hooks || {};
  for (const event of EVENTS) {
    const group = { hooks: [{ type: 'command', command: hookCommand(port), timeout: 2 }] };
    if (MATCHER_EVENTS.has(event)) group.matcher = '*';
    settings.hooks[event] = [...(settings.hooks[event] || []), group];
  }
  return settings;
}

export const DEFAULT_SETTINGS = join(homedir(), '.claude', 'settings.json');

/** True when our hooks for this port are present in the settings file. */
export function hooksInstalled(file = DEFAULT_SETTINGS, port = 4747) {
  try {
    const settings = JSON.parse(readFileSync(file, 'utf8'));
    return EVENTS.every((e) => (settings.hooks?.[e] || []).some((g) => (g.hooks || []).some((h) => h.command === hookCommand(port))));
  } catch {
    return false;
  }
}

/** Install or uninstall our hooks. Makes a backup first. Throws on unreadable settings. */
export function updateSettings(action, { file = DEFAULT_SETTINGS, port = 4747, log = console.log } = {}) {
  let settings = {};
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      throw new Error(`Kan ${file} niet lezen als JSON: ${err.message}. Er is niets gewijzigd.`);
    }
    const backup = `${file}.vao-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    copyFileSync(file, backup);
    log(`Backup: ${backup}`);
  } else {
    mkdirSync(dirname(file), { recursive: true });
  }
  settings = action === 'install' ? addHooks(settings, port) : removeHooks(settings);
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  log(action === 'install'
    ? `Hooks geïnstalleerd in ${file} (${EVENTS.length} events → poort ${port}). Nieuwe sessies worden direct opgepikt.`
    : `Hooks verwijderd uit ${file}.`);
}

function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const file = flag('--settings') || DEFAULT_SETTINGS;
  const port = Number(flag('--port')) || Number(process.env.VAO_PORT) || 4747;

  if (action !== 'install' && action !== 'uninstall') {
    console.error('Gebruik: node hooks/install.js install|uninstall [--settings <pad>] [--port <n>]');
    process.exit(1);
  }
  try {
    updateSettings(action, { file, port });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
