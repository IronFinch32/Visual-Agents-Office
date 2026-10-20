// Adds or removes the Visual Agents Office hooks for Claude Code (~/.claude/settings.json)
// and Codex (~/.codex/hooks.json). Both use the same hooks.<Event>[].hooks[] shape (ADR-005).
// Usage: node hooks/install.js install|uninstall [--target claude|codex] [--settings <path>] [--port <n>]
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVENTS = [
  'SessionStart', 'SessionEnd', 'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'PermissionRequest', 'Notification', 'Elicitation',
  'Stop', 'StopFailure', 'SubagentStart', 'SubagentStop',
];
export const CODEX_EVENTS = [
  'SessionStart', 'SessionEnd', 'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PermissionRequest',
  'Stop', 'SubagentStart', 'SubagentStop', 'Interrupt',
];

export const TARGETS = {
  claude: {
    label: 'Claude Code',
    file: (home = homedir()) => join(home, '.claude', 'settings.json'),
    events: EVENTS,
    // Claude accepts '*' as "all tools"; Codex matchers are regexes, so it gets none.
    matcherEvents: new Set(['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest']),
  },
  codex: {
    label: 'Codex',
    file: (home = homedir()) => join(home, '.codex', 'hooks.json'),
    events: CODEX_EVENTS,
    matcherEvents: new Set(),
  },
};
const MARKER = '/event'; // combined with the host below to recognise our entries

export function hookCommand(port, target = 'claude') {
  // Silent and bounded: never blocks the agent, never prints (stdout of some hooks reaches the model's context).
  // Claude keeps the original URL so hooks installed by earlier versions stay valid.
  const url = `http://127.0.0.1:${port}/event${target === 'claude' ? '' : `?src=${target}`}`;
  return `curl -s -m 1 -X POST -H 'content-type: application/json' --data-binary @- ${url} >/dev/null 2>&1 || true`;
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

export function addHooks(settings, port, target = 'claude') {
  const t = TARGETS[target];
  removeHooks(settings);
  settings.hooks = settings.hooks || {};
  for (const event of t.events) {
    const group = { hooks: [{ type: 'command', command: hookCommand(port, target), timeout: 2 }] };
    if (t.matcherEvents.has(event)) group.matcher = '*';
    settings.hooks[event] = [...(settings.hooks[event] || []), group];
  }
  return settings;
}

function onPath(name) {
  return (process.env.PATH || '').split(delimiter).some((dir) => dir && (existsSync(join(dir, name)) || existsSync(join(dir, `${name}.exe`)) || existsSync(join(dir, `${name}.cmd`))));
}

/** Which agent tools look installed on this machine. */
export function detectTools(home = homedir()) {
  return {
    claude: existsSync(join(home, '.claude')) || onPath('claude'),
    codex: existsSync(join(home, '.codex')) || onPath('codex'),
  };
}

/** Default menu choice from what is installed: both → 3, only Codex → 2, otherwise Claude → 1. */
export function defaultChoice(detected) {
  if (detected.claude && detected.codex) return '3';
  if (detected.codex) return '2';
  return '1';
}

/** Turn a menu answer into targets; null when the answer isn't understood. */
export function parseToolChoice(answer, fallback = '1') {
  const a = String(answer ?? '').trim().toLowerCase() || fallback;
  if (['1', 'claude', 'claude code'].includes(a)) return ['claude'];
  if (['2', 'codex'].includes(a)) return ['codex'];
  if (['3', 'beide', 'allebei', 'both', 'all', 'alle'].includes(a)) return ['claude', 'codex'];
  return null;
}

export const DEFAULT_SETTINGS = TARGETS.claude.file();

/** True when our hooks for this port are present in the settings file. */
export function hooksInstalled(file = DEFAULT_SETTINGS, port = 4747, target = 'claude') {
  try {
    const settings = JSON.parse(readFileSync(file, 'utf8'));
    const cmd = hookCommand(port, target);
    return TARGETS[target].events.every((e) => (settings.hooks?.[e] || []).some((g) => (g.hooks || []).some((h) => h.command === cmd)));
  } catch {
    return false;
  }
}

/** Install or uninstall our hooks. Makes a backup first. Throws on unreadable settings. */
export function updateSettings(action, { target = 'claude', file = TARGETS[target].file(), port = 4747, log = console.log } = {}) {
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
  settings = action === 'install' ? addHooks(settings, port, target) : removeHooks(settings);
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  log(action === 'install'
    ? `${TARGETS[target].label}: hooks geïnstalleerd in ${file} (${TARGETS[target].events.length} events → poort ${port}).`
    : `${TARGETS[target].label}: hooks verwijderd uit ${file}.`);
}

function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const target = flag('--target') || 'claude';
  if (!TARGETS[target]) {
    console.error(`Onbekend --target: ${target} (claude of codex)`);
    process.exit(1);
  }
  const file = flag('--settings') || TARGETS[target].file();
  const port = Number(flag('--port')) || Number(process.env.VAO_PORT) || 4747;

  if (action !== 'install' && action !== 'uninstall') {
    console.error('Gebruik: node hooks/install.js install|uninstall [--target claude|codex] [--settings <pad>] [--port <n>]');
    process.exit(1);
  }
  try {
    updateSettings(action, { target, file, port });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
