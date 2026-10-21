// A simulated /10x-team run on a throw-away project with a real .10x/ folder, so the living
// 10x office can be tried: stand-ups, handoffs, flex seats, the CEO queue, a failing test,
// the kanban board and the release party.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = {
  plus: ['Brainstorming', 'Strategy', 'Experience Design', 'Design', 'Planning', 'Implementation', 'Verification', 'Delivery'],
  classic: ['Brainstorming', 'Strategy', 'Design', 'Planning', 'Implementation', 'Verification', 'Delivery'],
};

export async function runTenxDemo(send, { flavor = 'plus' } = {}) {
  // 10x-Team-Plus adds an Experience Design phase (UX + UI) after Strategy, shifting later phases by one.
  const plus = flavor === 'plus';
  const o = plus ? 1 : 0;
  const plugin = plus ? '10x-Team-Plus' : '10x-Team';
  const names = NAMES[flavor];
  const root = join(tmpdir(), 'vao-demo-10x', plus ? 'checkout-plus' : 'checkout');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, '.10x'), { recursive: true });
  const s = { session_id: `demo-10x-${flavor}`, cwd: root };
  const ev = (hook_event_name, extra = {}) => send({ ...s, hook_event_name, ...extra });
  const phases = [];
  const status = () => writeFileSync(join(root, '.10x', 'status.md'),
    `# Status — checkout\n\n${names.map((n, i) => `- [${phases.includes(i) ? 'x' : ' '}] Phase ${i}: ${n}`).join('\n')}\n`);

  // Write a file the way an agent would: PreToolUse, the write itself, PostToolUse.
  async function write(rel, content, tool = 'Write') {
    const file = join(root, rel);
    await ev('PreToolUse', { tool_name: tool, tool_input: { file_path: file } });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    await ev('PostToolUse', { tool_name: tool });
  }
  // The plugin's own record of who is working (10x-Team-Plus ≥ 0.4.0-plus.2).
  const active = (role, phase, task) => write('.10x/active.json', JSON.stringify({
    role, phase, phaseName: names[phase], feature: 'checkout', task, updatedAt: new Date().toISOString(),
  }));
  async function done(n) {
    phases.push(n);
    await ev('PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, '.10x', 'status.md') } });
    status();
    await ev('PostToolUse', { tool_name: 'Write' });
  }

  status();
  await ev('SessionStart', { source: 'startup' });
  await sleep(1500);
  // The CEO (you) sends the assignment → stand-up in the meeting room
  await ev('UserPromptSubmit', { prompt: `/${plugin}:10x-team Bouw een nieuwe checkout met iDEAL en kortingscodes` });
  await active('meeting', 0, 'Brainstorm: wat moet de checkout kunnen?');
  await sleep(5000);
  await ev('PreToolUse', { tool_name: 'AskUserQuestion', tool_input: {} });
  await sleep(5000);
  await ev('PostToolUse', { tool_name: 'AskUserQuestion' });
  await write('.10x/specs/2026-10-21-checkout-design.md', '# Checkout design\nApproved by user.');
  await done(0);
  await active('cto', 1, 'Build vs buy voor betalingen');
  await sleep(4000);

  await write('.10x/decisions/cto/checkout.md', '# CTO — checkout\n- Build: checkout is core business.');
  await active('product-manager', 1, 'User stories voor de checkout');
  await write('.10x/decisions/product-manager/checkout.md', '# PM — checkout\n1. Betalen met iDEAL.\n2. Kortingscode gebruiken.');
  // someone jumps the gun: code before there is an ADR
  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'checkout.ts') } });
  await done(1);
  await sleep(6000);

  if (plus) {
    await active('ux-designer', 2, 'Flow: winkelwagen → betalen');
    await write('.10x/decisions/ux-designer/checkout.md', '# UX — checkout\nFlow: winkelwagen → adres → betalen → bevestiging.');
    await sleep(3000);
    await active('ui-designer', 2, 'Design tokens en knoppen');
    await write('.10x/decisions/ui-designer/checkout.md', '# UI — checkout\nTokens: brand blauw, 8px grid.');
    await done(2);
    await sleep(6000);
  }

  await active('architect', 2 + o, 'ADR voor betaalproviders');
  await write('.10x/adrs/001-payment-provider-adapter.md', '# ADR-001: Payment provider adapter\n**Status:** Accepted');
  await sleep(2000);
  await write('.10x/decisions/architect/checkout.md', '# Architect — checkout\nAdapter per betaalprovider.');
  await write('.10x/adrs/002-idempotent-webhooks.md', '# ADR-002: Idempotent webhooks\n**Status:** Accepted');
  await done(2 + o);
  await sleep(6000);

  await active('engineering-manager', 3 + o, 'Taken opknippen');
  await write('.10x/decisions/engineering-manager/checkout.md', '# EM — checkout\n| # | Task |\n|---|---|\n| T1 | Adapter |\n| T2 | Webhooks |\n| T3 | Kortingscodes |\n| T4 | Checkout-UI |');
  await done(3 + o);
  await sleep(6000);

  await active('sde', 4 + o, 'T1: betaaladapter bouwen');
  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'payments', 'ideal.ts') } });
  await ev('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'Explore', description: 'Zoek bestaande betaalcode' } });
  await ev('SubagentStart', { agent_id: 'x1', agent_type: 'Explore' });
  await ev('PreToolUse', { agent_id: 'x1', agent_type: 'Explore', tool_name: 'Grep', tool_input: { pattern: 'payment' } });
  await ev('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', description: 'Schrijf webhook handler' } });
  await ev('SubagentStart', { agent_id: 'x2', agent_type: 'general-purpose' });
  await ev('PreToolUse', { agent_id: 'x2', agent_type: 'general-purpose', tool_name: 'Write', tool_input: { file_path: join(root, 'src', 'webhooks.ts') } });
  await sleep(4000);
  await ev('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test', description: 'Draait de tests' } });
  await sleep(1500);
  await ev('PostToolUseFailure', { tool_name: 'Bash' }); // a failing test: smoke and frustration
  await sleep(3000);
  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'payments', 'ideal.ts') } });
  await write('.10x/decisions/sde/checkout.md', '# SDE — checkout\nGebouwd: T1, T2.');
  await ev('SubagentStop', { agent_id: 'x1', agent_type: 'Explore' });
  await sleep(2500);
  // the CEO adds something mid-way → another stand-up
  await ev('UserPromptSubmit', { prompt: 'Voeg ook Apple Pay toe aan de checkout' });
  await sleep(4000);
  await active('sde', 4 + o, 'T3 en T4 afronden');
  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'discounts.ts') } });
  await write('.10x/decisions/sde/checkout.md', '# SDE — checkout\nGebouwd: T1, T2, T3, T4 en Apple Pay.');
  await ev('SubagentStop', { agent_id: 'x2', agent_type: 'general-purpose' });
  await done(4 + o);
  await sleep(6000);

  await active('qa', 5 + o, 'Testplan en regressie');
  await write('.10x/reviews/2026-10-21-qa-report.md', '# QA report\n42 tests, all pass. Approved.');
  await sleep(2000);
  await active('security', 5 + o, 'Threat model betalingen');
  await ev('PermissionRequest', { tool_name: 'Bash', tool_input: { description: 'Draait npm audit' } });
  await sleep(6000); // security waits at the CEO's door
  await ev('PostToolUse', { tool_name: 'Bash' });
  await write('.10x/reviews/2026-10-21-security-review.md', '# Security review\nNo blockers. Approved.');
  await done(5 + o);
  await sleep(6000);

  await active('devops', 6 + o, 'Canary release 10%');
  await write('.10x/decisions/devops/checkout.md', '# DevOps — checkout\nFeature flag + canary 10%.');
  await sleep(2000);
  await done(6 + o); // complete → party
  await ev('Stop');
}
