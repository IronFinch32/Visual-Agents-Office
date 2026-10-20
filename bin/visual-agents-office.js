#!/usr/bin/env node
// One command to run the office:
//   visual-agents-office            start the server, offer to install hooks, open the browser
//   visual-agents-office setup      choose Claude Code and/or Codex and install their hooks
//   visual-agents-office uninstall  remove the hooks
//   visual-agents-office demo       send simulated agents to a running office
//   visual-agents-office autostart  start the office at every login (--off to remove)
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from '../server/server.js';
import { existsSync } from 'node:fs';
import { TARGETS, hooksInstalled, updateSettings, detectTools, defaultChoice, parseToolChoice } from '../hooks/install.js';
import { enableAutostart, disableAutostart } from '../service/autostart.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const command = args.find((a) => !a.startsWith('-') && a !== flag('--port')) || 'start';
const port = Number(flag('--port')) || Number(process.env.VAO_PORT) || 4747;
const url = `http://127.0.0.1:${port}`;

const HELP = `Visual Agents Office — een pixel-art kantoor met je Claude Code- en Codex-agents

Gebruik:
  visual-agents-office [start]     start het kantoor (en open de browser)
  visual-agents-office setup       kies Claude Code en/of Codex en installeer de hooks
  visual-agents-office uninstall   verwijder de hooks (uit beide)
  visual-agents-office demo        stuur nep-agents naar een draaiend kantoor
  visual-agents-office autostart   start het kantoor automatisch bij elke login
  visual-agents-office autostart --off   zet automatisch starten weer uit

Opties:
  --port <n>    poort (standaard 4747, of VAO_PORT)
  --no-open     open de browser niet
  --yes         installeer ontbrekende hooks zonder te vragen
  --claude, --codex, --all   kies de tool(s) voor setup zonder menu`;

function openBrowser(target) {
  const [cmd, cmdArgs] = process.platform === 'darwin' ? ['open', [target]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', target]]
      : ['xdg-open', [target]];
  try {
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* no browser available: the URL is printed anyway */ }
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

/** Which tools to install for: flags first, then an interactive menu, else whatever is installed. */
async function chooseTargets() {
  if (args.includes('--all')) return ['claude', 'codex'];
  const flagged = ['claude', 'codex'].filter((t) => args.includes(`--${t}`));
  if (flagged.length) return flagged;
  const detected = detectTools();
  const def = defaultChoice(detected);
  if (!process.stdin.isTTY || args.includes('--yes')) return parseToolChoice(def);
  const found = (t) => (detected[t] ? 'gevonden' : 'niet gevonden');
  console.log('\nMet welke agent-tool werk je?');
  console.log(`  1) Claude Code   (${found('claude')})`);
  console.log(`  2) Codex         (${found('codex')})`);
  console.log('  3) Allebei');
  for (;;) {
    const choice = parseToolChoice(await prompt(`Keuze [${def}]: `), def);
    if (choice) return choice;
    console.log('Kies 1, 2 of 3.');
  }
}

async function setup() {
  const targets = await chooseTargets();
  for (const target of targets) updateSettings('install', { target, port });
  if (targets.includes('codex')) {
    console.log('\nCodex voert nieuwe hooks pas uit als je ze vertrouwt: open Codex, typ /hooks en markeer de');
    console.log('Visual Agents Office-hooks als vertrouwd. Dat hoeft maar één keer (en opnieuw na een update van de hooks).');
  }
  console.log('Nieuwe en lopende sessies verschijnen bij hun volgende actie.');
}

function uninstall() {
  let any = false;
  for (const target of Object.keys(TARGETS)) {
    if (!existsSync(TARGETS[target].file())) continue;
    updateSettings('uninstall', { target, port });
    any = true;
  }
  if (!any) console.log('Geen hooks gevonden om te verwijderen.');
}

async function ensureHooks() {
  const installed = Object.keys(TARGETS).some((t) => hooksInstalled(TARGETS[t].file(), port, t));
  if (installed) return;
  console.log(`\nEr zijn nog geen hooks geïnstalleerd voor poort ${port}; zonder hooks blijft het kantoor leeg.`);
  if (!process.stdin.isTTY && !args.includes('--yes')) {
    console.log('Installeer ze met: visual-agents-office setup');
    return;
  }
  await setup();
}

async function alreadyRunning() {
  try {
    const res = await fetch(`${url}/api/state`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start() {
  const service = args.includes('--service');
  if (!service) await ensureHooks();
  // As a login service, don't fight an office someone started by hand: take over once it stops.
  if (service) while (await alreadyRunning()) await sleep(30_000);
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
    case 'setup': await setup(); break;
    case 'uninstall': uninstall(); break;
    case 'demo': demo(); break;
    case 'autostart':
      if (args.includes('--off')) {
        disableAutostart({ port });
      } else {
        await ensureHooks();
        enableAutostart({ root: ROOT, port });
      }
      break;
    case 'help': console.log(HELP); break;
    default:
      console.error(`Onbekend commando: ${command}\n\n${HELP}`);
      process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
