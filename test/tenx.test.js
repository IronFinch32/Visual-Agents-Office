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
  assert.equal(parsePhase('phase: Strategy Complete'), null, 'no phase number → unknown');
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
