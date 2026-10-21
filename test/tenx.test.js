import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  roleFromSkill, roleFromPath, guessRole, parsePhase, isCodeFile, reviewVerdict, createTenx, MEETING,
} from '../server/tenx.js';
import { nodeFs, createServer } from '../server/server.js';

test('roleFromSkill maps plugin skill names to roles', () => {
  assert.equal(roleFromSkill('10x-Team:qa-engineer'), 'qa');
  assert.equal(roleFromSkill('10x-Team:principal-architect'), 'architect');
  assert.equal(roleFromSkill('10x-Team:cto'), 'cto');
  assert.equal(roleFromSkill('10x-Team:10x-team'), null);
  assert.equal(roleFromSkill('anthropic-skills:pdf'), null);
  assert.equal(roleFromSkill(undefined), null);
});

test('roleFromPath reads .10x writes', () => {
  assert.equal(roleFromPath('/r/app/.10x/decisions/security/login.md'), 'security');
  assert.equal(roleFromPath('/r/app/.10x/decisions/dba/_index.md'), 'dba');
  assert.equal(roleFromPath('/r/app/.10x/decisions/hacker/x.md'), null);
  assert.equal(roleFromPath('/r/app/.10x/adrs/001-x.md'), 'architect');
  assert.equal(roleFromPath('/r/app/.10x/specs/2026-x.md'), MEETING);
  assert.equal(roleFromPath('/r/app/.10x/reviews/2026-security-review.md'), 'security');
  assert.equal(roleFromPath('/r/app/.10x/reviews/2026-qa-report.md'), 'qa');
  assert.equal(roleFromPath('/r/app/.10x/status.md'), null);
  assert.equal(roleFromPath('/r/app/src/x.ts'), null);
});

test('guessRole uses phase and the kind of work', () => {
  assert.equal(guessRole(0, 'Read', {}), MEETING);
  assert.equal(guessRole(1, 'Read', {}), 'product-manager');
  assert.equal(guessRole(2, 'Write', { file_path: '/r/a.md' }), 'architect');
  assert.equal(guessRole(4, 'Edit', { file_path: '/r/src/a.ts' }), 'sde');
  assert.equal(guessRole(4, 'Bash', { command: 'npm test' }), 'qa');
  assert.equal(guessRole(4, 'Write', { file_path: '/r/db/migrations/001.sql' }), 'dba');
  assert.equal(guessRole(5, 'Bash', { command: 'npm audit' }), 'security');
  assert.equal(guessRole(5, 'Bash', { command: 'npm test' }), 'qa');
  assert.equal(guessRole(6, 'Write', { file_path: '/r/monitoring/alerts.yml' }), 'sre');
  assert.equal(guessRole(6, 'Write', { file_path: '/r/.github/workflows/ci.yml' }), 'devops');
  assert.equal(guessRole(null, 'Edit', { file_path: '/r/src/a.ts' }), 'sde');
});

test('parsePhase takes the last section that mentions phases', () => {
  const text = `# Status — a
- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy Complete
- [x] Phase 2: Design Complete

# Status — b
- [x] Spec + ADR
`;
  assert.deepEqual(parsePhase(text), { phase: 3, done: [0, 1, 2], complete: false });
  assert.equal(parsePhase('- [ ] Phase 1: Strategy\n').phase, 0);
  assert.deepEqual(parsePhase('phase: Strategy Complete'), { phase: 2, done: [1], complete: false }, 'phase names are understood');
  assert.equal(parsePhase('- [x] Phase 6: Delivery Complete').complete, true);
  assert.equal(parsePhase(''), null);
  assert.equal(parsePhase('no phases here'), null);
});

test('isCodeFile and reviewVerdict', () => {
  assert.equal(isCodeFile('/r/src/a.ts'), true);
  assert.equal(isCodeFile('/r/README.md'), false);
  assert.equal(isCodeFile('/r/.10x/decisions/sde/x.md'), false);
  assert.equal(reviewVerdict('All tests pass. Approved.'), 'approved');
  assert.equal(reviewVerdict('Status: BLOCKER found'), 'rejected');
});

function project() {
  const root = mkdtempSync(join(tmpdir(), 'vao-10x-'));
  const x = join(root, '.10x');
  for (const d of ['decisions/qa', 'decisions/sde', 'adrs', 'reviews']) mkdirSync(join(x, d), { recursive: true });
  writeFileSync(join(x, 'status.md'), '- [x] Phase 0\n- [x] Phase 1: Strategy Complete\n');
  return { root, x };
}

const agent = (root) => ({ sessionId: 's', projectKey: root });
const pre = (tool_name, tool_input, extra = {}) => ({ session_id: 's', hook_event_name: 'PreToolUse', tool_name, tool_input, ...extra });

test('createTenx: enables on .10x, tracks phase, roles, ADRs, reviews and handoff', () => {
  const { root, x } = project();
  let t = 1000;
  const tenx = createTenx({ fs: nodeFs, now: () => t });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  let snap = tenx.snapshot()[root];
  assert.equal(snap.phase, 2);

  tenx.onEvent(pre('Skill', { skill: '10x-Team:qa-engineer' }), agent(root));
  assert.deepEqual(tenx.snapshot()[root].roles.s, { role: 'qa', guessed: false, at: 1000 });

  writeFileSync(join(x, 'adrs', '001-use-sse.md'), '# ADR-001: Use SSE\n');
  writeFileSync(join(x, 'reviews', '2026-security-review.md'), 'Verdict: rejected');
  tenx.onEvent(pre('Write', { file_path: join(x, 'handoff.md') }), agent(root));
  tenx.onEvent({ session_id: 's', hook_event_name: 'PostToolUse', tool_name: 'Write' }, agent(root));
  snap = tenx.snapshot()[root];
  assert.equal(snap.handoffAt, 1000);
  assert.deepEqual(snap.adrs.map((a) => [a.number, a.title]), [['001', 'ADR-001: Use SSE']]);
  assert.equal(snap.reviews.security, 'rejected');

  tenx.onEvent(pre('Edit', { file_path: join(root, 'src', 'a.ts') }), agent(root));
  snap = tenx.snapshot()[root];
  assert.equal(snap.roles.s.role, 'architect', 'phase 2 guess');
  assert.equal(snap.roles.s.guessed, true);
  assert.match(snap.gate.reason, /fase 2/);
  t += 3 * 60 * 1000;
  tenx.tick();
  assert.equal(tenx.snapshot()[root].gate, null, 'gate warning expires');
});

test('createTenx: gate when no ADR exists; subagents keep the session role; non-10x projects ignored', () => {
  const { root, x } = project();
  writeFileSync(join(x, 'status.md'), '- [x] Phase 3: Planning Complete');
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent(pre('Edit', { file_path: join(root, 'src', 'a.ts') }), agent(root));
  assert.match(tenx.snapshot()[root].gate.reason, /geen ADR/);
  tenx.onEvent(pre('Grep', { pattern: 'x' }, { agent_id: 'sub' }), agent(root));
  assert.equal(tenx.snapshot()[root].roles.s.role, 'sde');

  const plain = mkdtempSync(join(tmpdir(), 'vao-plain-'));
  assert.equal(tenx.onEvent(pre('Edit', { file_path: join(plain, 'a.ts') }), agent(plain)), false);
  assert.equal(tenx.snapshot()[plain], undefined);
});

test('readDecision: newest decision of a known role in a known project only', () => {
  const { root, x } = project();
  writeFileSync(join(x, 'decisions', 'qa', '_index.md'), 'index');
  writeFileSync(join(x, 'decisions', 'qa', 'login.md'), '# QA — login\nAll good');
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  assert.deepEqual(tenx.readDecision(root, 'qa'), { role: 'qa', file: 'login.md', text: '# QA — login\nAll good' });
  assert.equal(tenx.readDecision(root, '../../etc'), null);
  assert.equal(tenx.readDecision('/etc', 'qa'), null);
  assert.deepEqual(tenx.readDecision(root, 'dba'), { role: 'dba', file: null, text: '' });
});

test('server exposes tenx in the snapshot and /api/decision', async () => {
  const { root, x } = project();
  writeFileSync(join(x, 'decisions', 'sde', 'x.md'), 'built it');
  const { server } = createServer({ projectRoot: (c) => c });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fetch(`${base}/event`, { method: 'POST', body: JSON.stringify({ session_id: 's', cwd: root, hook_event_name: 'SessionStart' }) });
    const state = await (await fetch(`${base}/api/state`)).json();
    assert.equal(state.tenx[root].phase, 2);
    const d = await (await fetch(`${base}/api/decision?project=${encodeURIComponent(root)}&role=sde`)).json();
    assert.equal(d.text, 'built it');
    assert.equal((await fetch(`${base}/api/decision?project=%2Fetc&role=sde`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

test('bookkeeping writes (status.md, handoff.md) keep the current role', () => {
  const { root, x } = project();
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent(pre('Write', { file_path: join(x, 'decisions', 'qa', 'a.md') }), agent(root));
  tenx.onEvent(pre('Write', { file_path: join(x, 'status.md') }), agent(root));
  tenx.onEvent(pre('Write', { file_path: join(x, 'handoff.md') }), agent(root));
  assert.deepEqual(
    { role: tenx.snapshot()[root].roles.s.role, guessed: tenx.snapshot()[root].roles.s.guessed },
    { role: 'qa', guessed: false },
  );
});

test('10x-Team-Plus: skills, UX/UI folders and guesses per department', async () => {
  const { isPlusSignal, FLAVORS, lastPhase } = await import('../server/tenx.js');
  assert.equal(roleFromSkill('10x-Team-Plus:ux-designer'), 'ux-designer');
  assert.equal(roleFromSkill('10x-Team-Plus:ui-designer'), 'ui-designer');
  assert.equal(roleFromSkill('10x-Team-Plus:qa-engineer'), 'qa');
  assert.equal(roleFromSkill('10x-Team-Plus:10x-team'), null);
  assert.equal(roleFromPath('/r/.10x/decisions/ux-designer/flows.md'), 'ux-designer');
  assert.equal(isPlusSignal({ skill: '10x-Team-Plus:sde' }), true);
  assert.equal(isPlusSignal({ skill: '10x-Team:sde' }), false);
  assert.equal(isPlusSignal({ path: '/r/.10x/decisions/ui-designer/x.md' }), true);
  assert.equal(isPlusSignal({ statusText: '- [ ] Phase 7: Delivery' }), true);
  assert.equal(lastPhase('plus'), 7);
  assert.equal(FLAVORS.plus.implPhase, 5);
  assert.equal(guessRole(2, 'Write', { file_path: '/r/docs/flows.md' }, 'plus'), 'ux-designer');
  assert.equal(guessRole(2, 'Write', { file_path: '/r/src/theme/tokens.css' }, 'plus'), 'ui-designer');
  assert.equal(guessRole(3, 'Write', {}, 'plus'), 'architect');
  assert.equal(guessRole(5, 'Edit', { file_path: '/r/src/a.ts' }, 'plus'), 'sde');
  assert.equal(guessRole(7, 'Write', { file_path: '/r/ci.yml' }, 'plus'), 'devops');
  assert.equal(guessRole(3, 'Write', {}, 'classic'), 'engineering-manager', 'classic unchanged');
});

test('Plus project: flavor detected from folders, phases 0–7, gate before phase 5', () => {
  const { root, x } = project();
  mkdirSync(join(x, 'decisions', 'ux-designer'), { recursive: true });
  writeFileSync(join(x, 'adrs', '001-a.md'), '# ADR-001');
  writeFileSync(join(x, 'status.md'), [0, 1, 2, 3].map((n) => `- [x] Phase ${n}`).join('\n'));
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  let snap = tenx.snapshot()[root];
  assert.equal(snap.flavor, 'plus');
  assert.equal(snap.phase, 4);
  tenx.onEvent(pre('Edit', { file_path: join(root, 'src', 'a.ts') }), agent(root));
  snap = tenx.snapshot()[root];
  assert.match(snap.gate.reason, /fase 4/, 'planning is still before implementation in Plus');
  assert.equal(snap.roles.s.role, 'engineering-manager');
  writeFileSync(join(x, 'status.md'), [0, 1, 2, 3, 4, 5, 6, 7].map((n) => `- [x] Phase ${n}`).join('\n'));
  tenx.refresh(root);
  assert.equal(tenx.snapshot()[root].complete, true);
});

test('Classic project stays classic and completes at phase 6', () => {
  const { root, x } = project();
  writeFileSync(join(x, 'status.md'), [0, 1, 2, 3, 4, 5, 6].map((n) => `- [x] Phase ${n}`).join('\n'));
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  const snap = tenx.snapshot()[root];
  assert.equal(snap.flavor, 'classic');
  assert.equal(snap.complete, true);
});


test('phase names: Experience Design is not read as Design', () => {
  const text = '# Status — x\n- [x] Brainstorming\n- [x] Strategy\n- [x] Experience Design\n- [ ] Design\n';
  assert.deepEqual(parsePhase(text, 7, 'plus'), { phase: 3, done: [0, 1, 2], complete: false });
});

test('parseActive validates the plugin contract', async () => {
  const { parseActive } = await import('../server/tenx.js');
  const ok = parseActive('{ "role": "ux-designer", "phase": 2, "phaseName": "Experience Design", "feature": "c", "task": "Wireframes", "updatedAt": "2026-10-21T10:00:00Z" }');
  assert.equal(ok.role, 'ux-designer');
  assert.equal(ok.phase, 2);
  assert.equal(ok.at, Date.parse('2026-10-21T10:00:00Z'));
  assert.equal(parseActive('{ "role": "meeting", "phase": 0 }').role, 'meeting');
  assert.equal(parseActive('{ "role": "hacker", "phase": 1 }'), null);
  assert.equal(parseActive('not json'), null);
  assert.equal(parseActive('{ "role": "sde", "phase": 42 }').phase, null);
});

test('parseTasks + taskDone read the EM plan', async () => {
  const { parseTasks, taskDone } = await import('../server/tenx.js');
  const em = '| # | Task |\n|---|---|\n| T1 | Adapter |\n| T2 | Webhooks |\n- T3: Kortingscodes\n**T4** — UI';
  assert.deepEqual(parseTasks(em).map((t) => t.id), ['T1', 'T2', 'T3', 'T4']);
  assert.equal(parseTasks(em)[1].title, 'Webhooks');
  assert.equal(taskDone('T1', '- [x] T1 adapter', ''), true);
  assert.equal(taskDone('T2', '- [ ] T2', 'built T1'), false);
  assert.equal(taskDone('T2', '', 'Built T2 and T1'), true);
  assert.equal(taskDone('T1', '', 'T10 done'), false, 'word boundary');
});

test('active.json wins; a new /10x-team prompt shows a meeting until real .10x work starts', () => {
  const { root, x } = project();
  writeFileSync(join(x, 'status.md'), [0, 1, 2, 3, 4, 5, 6].map((n) => `- [x] Phase ${n}`).join('\n'));
  let t = Date.parse('2026-10-21T10:00:00Z');
  const tenx = createTenx({ fs: nodeFs, now: () => t });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  assert.equal(tenx.snapshot()[root].complete, true);

  t += 1000;
  tenx.onEvent({ session_id: 's', hook_event_name: 'UserPromptSubmit', prompt: '/10x-Team-Plus:10x-team nieuw idee' }, agent(root));
  let snap = tenx.snapshot()[root];
  assert.equal(snap.phase, 0);
  assert.equal(snap.complete, false);
  assert.deepEqual([snap.roles.s.role, snap.roles.s.guessed], ['meeting', false]);
  tenx.onEvent(pre('AskUserQuestion', {}), agent(root));
  assert.equal(tenx.snapshot()[root].roles.s.role, 'meeting', 'questions during the new run stay in the meeting');

  t += 1000;
  tenx.onEvent(pre('Bash', { command: 'echo {...} > .10x/active.json' }), agent(root));
  writeFileSync(join(x, 'active.json'), JSON.stringify({ role: 'ux-designer', phase: 2, phaseName: 'Experience Design', feature: 'idee', task: 'Flows', updatedAt: new Date(t).toISOString() }));
  tenx.onEvent({ session_id: 's', hook_event_name: 'PostToolUse', tool_name: 'Bash' }, agent(root));
  snap = tenx.snapshot()[root];
  assert.equal(snap.flavor, 'plus');
  assert.equal(snap.phase, 2);
  assert.equal(snap.complete, false);
  assert.deepEqual([snap.roles.s.role, snap.roles.s.guessed, snap.active.task], ['ux-designer', false, 'Flows']);

  t += 7 * 60 * 60 * 1000;
  tenx.refresh(root);
  assert.equal(tenx.snapshot()[root].active, null, 'stale after 6 h');
});

test('workload counts tool calls and resets on phase change; kanban comes from the EM decision', () => {
  const { root, x } = project();
  writeFileSync(join(x, 'status.md'), '# Status — f\n- [x] Phase 0\n- [x] Phase 1\n- [x] Phase 2\n- [x] Phase 3\n- [ ] Phase 4\n- [x] T1 adapter');
  mkdirSync(join(x, 'decisions', 'engineering-manager'), { recursive: true });
  writeFileSync(join(x, 'decisions', 'engineering-manager', 'f.md'), '| T1 | Adapter |\n| T2 | Webhooks |');
  const tenx = createTenx({ fs: nodeFs });
  tenx.onEvent({ session_id: 's', hook_event_name: 'SessionStart' }, agent(root));
  tenx.onEvent(pre('Edit', { file_path: join(root, 'src', 'a.ts') }), agent(root));
  tenx.onEvent(pre('Bash', { command: 'npm test' }), agent(root));
  let snap = tenx.snapshot()[root];
  assert.equal(snap.workload, 2);
  assert.deepEqual(snap.kanban.map((k) => [k.id, k.done]), [['T1', true], ['T2', false]]);
  writeFileSync(join(x, 'status.md'), '# Status — f\n' + [0, 1, 2, 3, 4].map((n) => `- [x] Phase ${n}`).join('\n'));
  tenx.refresh(root);
  assert.equal(tenx.snapshot()[root].workload, 0);
});

test('unknown phase: guess only from the kind of work', () => {
  assert.equal(guessRole(null, 'Read', { file_path: '/r/README.md' }), 'product-manager');
  assert.equal(guessRole(null, 'Edit', { file_path: '/r/src/a.ts' }), 'sde');
  assert.equal(guessRole(null, 'Bash', { command: 'npm test' }), 'qa');
});
