// CEO floor (ADR-009): the CEO session, a room per 10x work session, and no regression without a CEO.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createState, applyEvent, snapshot, assignRooms, prune, STALE_MS, CEO_STALE_MS, ceoSnapshot, restoreCeo } from '../server/state.js';
import { isCeoSkill, isCeoPrompt, isPlusSignal, createTenx } from '../server/tenx.js';
import { nodeFs, createServer, fileCeoStore } from '../server/server.js';

const skill = (session_id, cwd, name) => ({ session_id, cwd, hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: name } });
const prompt = (session_id, cwd, text) => ({ session_id, cwd, hook_event_name: 'UserPromptSubmit', prompt: text });

test('CEO is recognised by skill and by prompt, case-insensitive', () => {
  assert.equal(isCeoSkill('10x-Team-Plus:ceo'), true);
  assert.equal(isCeoSkill('10x-team-plus:CEO'), true);
  assert.equal(isCeoSkill('10x-Team-Plus:cto'), false);
  assert.equal(isCeoSkill('10x-Team-Plus:10x-team'), false);
  assert.equal(isCeoPrompt('/10x-Team-Plus:ceo Bouw een webshop'), true);
  assert.equal(isCeoPrompt('  /10x-team-plus:ceo'), true);
  assert.equal(isCeoPrompt('/10x-Team-Plus:10x-team ga verder'), false);
  assert.equal(isCeoPrompt('praat met de /10x-Team-Plus:ceo'), false);
  assert.equal(isPlusSignal({ skill: '10x-Team-Plus:ceo' }), false);
  assert.equal(isPlusSignal({ skill: '10x-Team-Plus:sde' }), true);
});

test('a session becomes CEO via its skill and stays CEO; ceoSeen sticks after SessionEnd', () => {
  const st = createState();
  applyEvent(st, { session_id: 'c', cwd: '/u/Projects', hook_event_name: 'SessionStart' }, 1);
  assert.equal(st.agents.get('c').ceo, undefined);
  applyEvent(st, skill('c', '/u/Projects', '10x-Team-Plus:ceo'), 2);
  applyEvent(st, prompt('c', '/u/Projects', 'Nog een idee'), 3);
  assert.equal(st.agents.get('c').ceo, true);
  assert.equal(st.ceoSeen, true);
  applyEvent(st, { session_id: 'c', hook_event_name: 'SessionEnd' }, 4);
  assert.equal(st.agents.has('c'), false);
  assert.equal(st.ceoSeen, true);
});

test('a CEO prompt marks the session; a subagent calling the skill does not', () => {
  const st = createState();
  applyEvent(st, prompt('c', '/u/Projects', '/10x-Team-Plus:ceo Start'), 1);
  assert.equal(st.agents.get('c').ceo, true);
  const st2 = createState();
  applyEvent(st2, { ...skill('w', '/u/app', '10x-Team-Plus:ceo'), agent_id: 'x' }, 1);
  assert.equal(st2.agents.get('w').ceo, undefined);
  assert.equal(st2.ceoSeen, false);
});

test('assignRooms: without a CEO every agent keeps its project room', () => {
  const agents = [
    { id: 'a', sessionId: 'a', kind: 'session', projectKey: '/u/app' },
    { id: 'b', sessionId: 'b', kind: 'session', projectKey: '/u/app' },
    { id: 'a:x', sessionId: 'a', kind: 'subagent', projectKey: '/u/app' },
  ];
  assignRooms(agents, { ceoSeen: false, isTenx: () => true });
  assert.deepEqual(agents.map((a) => a.room), ['/u/app', '/u/app', '/u/app']);
});

test('assignRooms: with a CEO, 10x sessions get their own room, others stay per project', () => {
  const agents = [
    { id: 'c', sessionId: 'c', kind: 'session', projectKey: '/u/Projects', ceo: true },
    { id: 'c:x', sessionId: 'c', kind: 'subagent', projectKey: '/u/Projects' },
    { id: 'a', sessionId: 'a', kind: 'session', projectKey: '/u/app' },
    { id: 'a:x', sessionId: 'a', kind: 'subagent', projectKey: '/u/app' },
    { id: 'b', sessionId: 'b', kind: 'session', projectKey: '/u/app' },
    { id: 'd', sessionId: 'd', kind: 'session', projectKey: '/u/docs' },
  ];
  assignRooms(agents, { ceoSeen: true, isTenx: (k) => k === '/u/app' });
  assert.deepEqual(agents.map((a) => a.room), ['ceo', 'ceo', 'session:a', 'session:a', 'session:b', '/u/docs']);
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'vao-ceo-'));
  const ceoDir = join(root, 'Projects');
  const app = join(ceoDir, 'app');
  mkdirSync(join(app, '.10x'), { recursive: true });
  writeFileSync(join(app, '.10x', 'status.md'), '# Status — shop\n\n- [x] Phase 0: Brainstorming\n- [x] Phase 1: Strategy\n- [ ] Phase 2: Experience Design\n');
  return { ceoDir, app };
}

test('pitfalls: the CEO skill and prompt never make a 10x office or reset a phase', () => {
  const { ceoDir, app } = fixture();
  const st = createState();
  const tenx = createTenx({ fs: nodeFs });
  const feed = (evt) => { applyEvent(st, evt, 1); return tenx.onEvent(evt, st.agents.get(evt.session_id)); };
  feed(prompt('c', ceoDir, '/10x-Team-Plus:ceo Bouw een webshop'));
  feed(skill('c', ceoDir, '10x-Team-Plus:ceo'));
  assert.equal(tenx.snapshot()[ceoDir], undefined);
  // Even a CEO prompt sent from inside a 10x project leaves the phase alone.
  feed({ session_id: 'w', cwd: app, hook_event_name: 'SessionStart' });
  const before = tenx.snapshot()[app].phase;
  feed(prompt('w2', app, '/10x-Team-Plus:ceo kijk even mee'));
  assert.equal(tenx.snapshot()[app].phase, before);
  assert.equal(before, 2);
  // A real /10x-team prompt still starts a brainstorm.
  feed(prompt('w', app, '/10x-Team-Plus:10x-team nieuwe feature'));
  assert.equal(tenx.snapshot()[app].phase, 0);
});

test('server snapshot: CEO floor, rooms per work session, and the room goes on SessionEnd', async () => {
  const { ceoDir, app } = fixture();
  const { server } = createServer({ projectRoot: (cwd) => cwd });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (evt) => fetch(`${base}/event`, { method: 'POST', body: JSON.stringify(evt) });
  const state = async () => (await fetch(`${base}/api/state`)).json();
  try {
    await post({ session_id: 'w1', cwd: app, hook_event_name: 'SessionStart' });
    let s = await state();
    assert.equal(s.agents[0].room, app, 'no CEO yet: per project as before');

    await post(prompt('c', ceoDir, '/10x-Team-Plus:ceo Bouw een webshop'));
    await post({ session_id: 'w2', cwd: app, hook_event_name: 'SessionStart' });
    s = await state();
    const room = Object.fromEntries(s.agents.map((a) => [a.id, a.room]));
    assert.deepEqual(room, { w1: 'session:w1', c: 'ceo', w2: 'session:w2' });
    assert.ok(s.tenx[app]);
    assert.equal(s.tenx[ceoDir], undefined);

    await post({ session_id: 'w1', hook_event_name: 'SessionEnd' });
    s = await state();
    assert.deepEqual(s.agents.map((a) => a.room).sort(), ['ceo', 'session:w2']);
  } finally {
    server.close();
  }
});

test('the CEO session survives a long wait; a normal session is still pruned (ADR-010)', () => {
  const st = createState();
  applyEvent(st, skill('c', '/u/Projects', '10x-Team-Plus:ceo'), 1);
  applyEvent(st, { session_id: 'w', cwd: '/u/app', hook_event_name: 'SessionStart' }, 1);
  assert.equal(prune(st, 1 + STALE_MS + 1), true);
  assert.equal(st.agents.has('w'), false, 'normal session pruned after 30 min');
  assert.equal(st.agents.has('c'), true, 'CEO session kept after 30 min');
  assert.equal(prune(st, 1 + CEO_STALE_MS - 1), false);
  assert.equal(st.agents.has('c'), true);
  assert.equal(prune(st, 1 + CEO_STALE_MS + 1), true);
  assert.equal(st.agents.has('c'), false, 'safety net after 12 h');
});

test('the CEO session still leaves on SessionEnd', () => {
  const st = createState();
  applyEvent(st, skill('c', '/u/Projects', '10x-Team-Plus:ceo'), 1);
  applyEvent(st, { session_id: 'c', cwd: '/u/Projects', hook_event_name: 'SessionEnd' }, 2);
  assert.equal(st.agents.has('c'), false);
});

test('CEO sessions round-trip through ceoSnapshot/restoreCeo; junk and old entries are ignored (ADR-011)', () => {
  const st = createState();
  applyEvent(st, skill('c', '/u/Projects', '10x-Team-Plus:ceo'), 1000);
  applyEvent(st, { session_id: 'w', cwd: '/u/app', hook_event_name: 'SessionStart' }, 1000);
  const saved = ceoSnapshot(st);
  assert.deepEqual(saved.map((a) => a.id), ['c']);

  const fresh = createState();
  assert.equal(restoreCeo(fresh, [...saved, null, { id: 5 }, { id: 'old', updatedAt: 0 }, 'x'], 1000 + CEO_STALE_MS - 1), true);
  assert.equal(fresh.ceoSeen, true);
  assert.deepEqual([...fresh.agents.keys()], ['c']);
  const c = fresh.agents.get('c');
  assert.equal(c.ceo, true);
  assert.equal(c.cwd, '/u/Projects');
  assert.equal(c.status, 'idle', 'working is not restored');
  assert.deepEqual(assignRooms(snapshot(fresh)).map((a) => a.room), ['ceo']);

  assert.equal(restoreCeo(createState(), 'garbage'), false);
  assert.equal(restoreCeo(createState(), saved, 1000 + CEO_STALE_MS + 1), false, 'too old');
});

test('the server remembers the CEO across a restart and forgets it on SessionEnd (ADR-011)', async () => {
  const { ceoDir, app } = fixture();
  const file = join(mkdtempSync(join(tmpdir(), 'vao-ceo-')), 'ceo.json');
  const start = async () => {
    const { server } = createServer({ projectRoot: (cwd) => cwd, ceoStore: fileCeoStore(file) });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    return {
      server,
      post: (evt) => fetch(`${base}/event`, { method: 'POST', body: JSON.stringify(evt) }),
      state: async () => (await fetch(`${base}/api/state`)).json(),
    };
  };
  let o = await start();
  try {
    await o.post(prompt('c', ceoDir, '/10x-Team-Plus:ceo Bouw een webshop'));
  } finally { o.server.close(); }

  o = await start();
  try {
    await o.post({ session_id: 'w1', cwd: app, hook_event_name: 'SessionStart' });
    const s = await o.state();
    const room = Object.fromEntries(s.agents.map((a) => [a.id, a.room]));
    assert.deepEqual(room, { c: 'ceo', w1: 'session:w1' }, 'floor is back without a new CEO skill call');
    await o.post({ session_id: 'c', hook_event_name: 'SessionEnd' });
  } finally { o.server.close(); }

  o = await start();
  try {
    const s = await o.state();
    assert.deepEqual(s.agents, [], 'gone after SessionEnd');
  } finally { o.server.close(); }
});
