#!/usr/bin/env node
// One command to run the office:
//   visual-agents-office            start the server, offer to install hooks, open the browser
//   visual-agents-office setup      install the Claude Code hooks
//   visual-agents-office uninstall  remove the hooks
//   visual-agents-office demo       send simulated agents to a running office
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from '../server/server.js';
import { hooksInstalled, updateSettings, DEFAULT_SETTINGS } from '../hooks/install.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const command = args.find((a) => !a.startsWith('-') && a !== flag('--port')) || 'start';
const port = Number(flag('--port')) || Number(process.env.VAO_PORT) || 4747;
const url = `http://127.0.0.1:${port}`;

const HELP = `Visual Agents Office — een pixel-art kantoor met je Claude Code agents

Gebruik:
  visual-agents-office [start]     start het kantoor (en open de browser)
  visual-agents-office setup       installeer de Claude Code hooks
  visual-agents-office uninstall   verwijder de hooks
  visual-agents-office demo        stuur nep-agents naar een draaiend kantoor

Opties:
  --port <n>    poort (standaard 4747, of VAO_PORT)
  --no-open     open de browser niet
  --yes         installeer ontbrekende hooks zonder te vragen`;

function openBrowser(target) {
  const [cmd, cmdArgs] = process.platform === 'darwin' ? ['open', [target]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', target]]
      : ['xdg-open', [target]];
  try {
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* no browser available: the URL is printed anyway */ }
}

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === '' || answer === 'j' || answer === 'y' || answer === 'ja' || answer === 'yes';
}

async function ensureHooks() {
  if (hooksInstalled(DEFAULT_SETTINGS, port)) return;
  console.log(`\nDe Claude Code hooks zijn nog niet geïnstalleerd voor poort ${port}.`);
  console.log(`Zonder hooks blijft het kantoor leeg. Ze komen in ${DEFAULT_SETTINGS} (met backup).`);
  const yes = args.includes('--yes') || await ask('Nu installeren? [J/n] ');
  if (yes) {
    updateSettings('install', { port });
  } else {
    console.log('Overgeslagen. Later installeren kan met: visual-agents-office setup');
  }
}

async function alreadyRunning() {
  try {
    const res = await fetch(`${url}/api/state`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function start() {
  await ensureHooks();
  if (await alreadyRunning()) {
    console.log(`\nHet kantoor draait al op ${url}`);
    if (!args.includes('--no-open')) openBrowser(url);
    return;
  }
  const { server } = createServer({ debug: process.env.VAO_DEBUG === '1' });
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Poort ${port} is al in gebruik door een ander programma. Kies een andere met --port.` : err.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`\nVisual Agents Office draait op ${url}  (stoppen: Ctrl+C)`);
    if (!args.includes('--no-open')) openBrowser(url);
  });
}

function demo() {
  const child = spawn(process.execPath, [join(ROOT, 'scripts', 'demo.js')], {
    stdio: 'inherit',
    env: { ...process.env, VAO_PORT: String(port) },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

try {
  switch (command) {
    case 'start': await start(); break;
    case 'setup': updateSettings('install', { port }); break;
    case 'uninstall': updateSettings('uninstall', { port }); break;
    case 'demo': demo(); break;
    case 'help': console.log(HELP); break;
    default:
      console.error(`Onbekend commando: ${command}\n\n${HELP}`);
      process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
