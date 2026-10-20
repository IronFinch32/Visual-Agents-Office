// A simulated /10x-team run on a throw-away project with a real .10x/ folder, so the
// 10x office (departments, phases, ADRs, stamps, gatekeeper, handoff) can be tried.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runTenxDemo(send) {
  const root = join(tmpdir(), 'vao-demo-10x', 'checkout');
  rmSync(join(tmpdir(), 'vao-demo-10x'), { recursive: true, force: true });
  mkdirSync(join(root, '.10x'), { recursive: true });
  const s = { session_id: 'demo-10x', cwd: root };
  const ev = (hook_event_name, extra = {}) => send({ ...s, hook_event_name, ...extra });
  const phases = [];
  const status = () => writeFileSync(join(root, '.10x', 'status.md'), `# Status — checkout\n${[0, 1, 2, 3, 4, 5, 6]
    .map((n) => `- [${phases.includes(n) ? 'x' : ' '}] Phase ${n}`).join('\n')}\n`);

  // Write a file the way an agent would: PreToolUse, the write itself, PostToolUse.
  async function write(rel, content, tool = 'Write') {
    const file = join(root, rel);
    await ev('PreToolUse', { tool_name: tool, tool_input: { file_path: file } });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    await ev('PostToolUse', { tool_name: tool });
  }
  async function done(n) {
    phases.push(n);
    await ev('PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, '.10x', 'status.md') } });
    status();
    await ev('PostToolUse', { tool_name: 'Write' });
  }

  status();
  await ev('SessionStart', { source: 'startup' });
  await ev('UserPromptSubmit', { prompt: '/10x-team Bouw een nieuwe checkout met iDEAL en kortingscodes' });
  await sleep(1500);
  await ev('PreToolUse', { tool_name: 'AskUserQuestion', tool_input: {} });
  await sleep(3000);
  await ev('PostToolUse', { tool_name: 'AskUserQuestion' });
  await write('.10x/specs/2026-10-21-checkout-design.md', '# Checkout design\nApproved by user.');
  await done(0);
  await sleep(1500);

  await write('.10x/decisions/cto/checkout.md', '# CTO — checkout\n- Build: checkout is core business.\n- Stack: bestaande Next.js app.');
  await sleep(1200);
  await write('.10x/decisions/product-manager/checkout.md', '# PM — checkout\n## Stories\n1. Als klant betaal ik met iDEAL.\n2. Als klant gebruik ik een kortingscode.');
  // someone jumps the gun: code before there is an ADR
  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'checkout.ts') } });
  await done(1);
  await sleep(2500);

  await write('.10x/adrs/001-payment-provider-adapter.md', '# ADR-001: Payment provider adapter\n**Status:** Accepted');
  await sleep(1200);
  await write('.10x/decisions/architect/checkout.md', '# Architect — checkout\nAdapter per betaalprovider; webhooks idempotent.');
  await write('.10x/adrs/002-idempotent-webhooks.md', '# ADR-002: Idempotent webhooks\n**Status:** Accepted');
  await done(2);
  await write('.10x/handoff.md', '# Handoff → EM\nADR-001, ADR-002.');
  await sleep(3000);

  await ev('PreToolUse', { tool_name: 'Skill', tool_input: { skill: '10x-Team:engineering-manager' } });
  await write('.10x/decisions/engineering-manager/checkout.md', '# EM — checkout\nT1 adapter · T2 webhooks · T3 kortingscodes · T4 UI');
  await done(3);
  await write('.10x/handoff.md', '# Handoff → SDE\nT1–T4.');
  await sleep(2500);

  await ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: join(root, 'src', 'payments', 'ideal.ts') } });
  await ev('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'Explore', description: 'Zoek bestaande betaalcode' } });
  await ev('SubagentStart', { agent_id: 'x1', agent_type: 'Explore' });
  await ev('PreToolUse', { agent_id: 'x1', agent_type: 'Explore', tool_name: 'Grep', tool_input: { pattern: 'payment' } });
  await ev('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', description: 'Schrijf webhook handler' } });
  await ev('SubagentStart', { agent_id: 'x2', agent_type: 'general-purpose' });
  await ev('PreToolUse', { agent_id: 'x2', agent_type: 'general-purpose', tool_name: 'Write', tool_input: { file_path: join(root, 'src', 'webhooks.ts') } });
  await sleep(2500);
  await ev('PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, 'db', 'migrations', '004_discounts.sql') } });
  await sleep(2000);
  await ev('SubagentStop', { agent_id: 'x1', agent_type: 'Explore' });
  await ev('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test', description: 'Draait de tests' } });
  await write('.10x/decisions/sde/checkout.md', '# SDE — checkout\nGebouwd: adapter, webhooks, kortingscodes. Tech debt: retry-queue.');
  await done(4);
  await sleep(2500);

  await ev('SubagentStop', { agent_id: 'x2', agent_type: 'general-purpose' });
  await write('.10x/reviews/2026-10-21-qa-report.md', '# QA report\n42 tests, all pass. Approved.');
  await sleep(1500);
  await ev('PreToolUse', { tool_name: 'Skill', tool_input: { skill: '10x-Team:security-engineer' } });
  await ev('PermissionRequest', { tool_name: 'Bash', tool_input: { description: 'Draait npm audit' } });
  await sleep(3000);
  await ev('PostToolUse', { tool_name: 'Bash' });
  await write('.10x/reviews/2026-10-21-security-review.md', '# Security review\nNo blockers. Approved.');
  await done(5);
  await sleep(2500);

  await write('.10x/decisions/devops/checkout.md', '# DevOps — checkout\nFeature flag + canary 10%.');
  await sleep(1500);
  await done(6);
  await ev('Stop');
}
