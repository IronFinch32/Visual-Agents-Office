// The CEO demo (ADR-009, VAO_DEMO_10X=ceo): one CEO session above the building that starts two
// 10x work sessions. Shows the CEO floor, the board, the inbox, the folder handoff, SHIPPED and
// a team room that disappears when its session ends.
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTenxDemo } from './demo-10x.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runCeoDemo(send) {
  const base = join(tmpdir(), 'vao-demo-ceo');
  rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  const ceo = { session_id: 'demo-ceo', cwd: base };
  const ev = (hook_event_name, extra = {}) => send({ ...ceo, hook_event_name, ...extra });
  const tool = (tool_name, tool_input = {}) => ev('PreToolUse', { tool_name, tool_input });

  await ev('SessionStart', { source: 'startup' });
  await ev('UserPromptSubmit', { prompt: '/10x-Team-Plus:ceo Ik wil een webshop met een nieuwe checkout en een klantenportaal' });
  await tool('Skill', { skill: '10x-Team-Plus:ceo' });
  await sleep(3000);
  await tool('AskUserQuestion', { questions: [] }); // the CEO asks you which idea goes first
  await sleep(4000);
  await ev('PostToolUse', { tool_name: 'AskUserQuestion' });

  const work = (name, feature, prompt) => {
    const root = join(base, name);
    mkdirSync(join(root, '.10x'), { recursive: true });
    return { root, sessionId: `demo-work-${name}`, feature, prompt: `/10x-Team-Plus:10x-team ${prompt}` };
  };
  const shop = work('webshop', 'checkout', 'Bouw een nieuwe checkout met iDEAL');
  const portal = work('portaal', 'klantenportaal', 'Bouw een klantenportaal met bestellingen');

  await tool('mcp__ccd_session__start_session', { title: 'webshop · checkout' });
  const runShop = runTenxDemo(send, { flavor: 'plus', ...shop });
  await sleep(12000);
  await tool('mcp__ccd_session__start_session', { title: 'portaal · klantenportaal' });
  const runPortal = runTenxDemo(send, { flavor: 'plus', ...portal });
  await sleep(2000);
  await ev('Stop');

  await Promise.all([runShop, runPortal]);
  console.log('Beide teams zijn klaar. Over 25 seconden archiveer je de webshop-sessie.');
  await sleep(25000);
  await send({ session_id: shop.sessionId, cwd: shop.root, hook_event_name: 'SessionEnd', reason: 'other' });
}
