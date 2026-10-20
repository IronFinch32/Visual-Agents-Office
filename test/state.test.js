import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, applyEvent, prune, snapshot, describeTool, truncate, STALE_MS, SUBAGENT_DONE_TTL_MS, projectKeyFor } from '../server/state.js';

const S = { session_id: 's1', cwd: '/Users/x/code/my-app' };
const ev = (name, extra = {}) => ({ ...S, hook_event_name: name, ...extra });
const get = (state, id = 's1') => state.agents.get(id);

test('SessionStart creates an idle session named after the folder', () => {
  const st = createState();
  assert.equal(applyEvent(st, ev('SessionStart'), 1), true);
  const a = get(st);
  assert.equal(a.status, 'idle');
  assert.equal(a.name, 'my-app');
  assert.equal(a.kind, 'session');
});

test('UserPromptSubmit sets working and task', () => {
  const st = createState();
  applyEvent(st, ev('UserPromptSubmit', { prompt: 'Build   the\nthing' }), 1);
  assert.equal(get(st).status, 'working');
  assert.equal(get(st).task, 'Build the thing');
});

test('unknown session is created on demand from any event', () => {
  const st = createState();
  applyEvent(st, ev('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }), 1);
  assert.equal(get(st).status, 'working');
  assert.equal(get(st).activity, 'Draait: ls');
});

test('PermissionRequest -> waiting, PostToolUse -> working again', () => {
  const st = createState();
  applyEvent(st, ev('PermissionRequest', { tool_name: 'Bash', tool_input: { description: 'Deletes stuff' } }), 1);
  assert.equal(get(st).status, 'waiting');
  assert.match(get(st).waitingReason, /Toestemming: Deletes stuff/);
  applyEvent(st, ev('PostToolUse', { tool_name: 'Bash' }), 2);
  assert.equal(get(st).status, 'working');
  assert.equal(get(st).waitingReason, '');
});

test('AskUserQuestion and ExitPlanMode count as waiting', () => {
  for (const tool_name of ['AskUserQuestion', 'ExitPlanMode']) {
    const st = createState();
    applyEvent(st, ev('PreToolUse', { tool_name, tool_input: {} }), 1);
    assert.equal(get(st).status, 'waiting', tool_name);
  }
});

test('Notification permission_prompt -> waiting; idle_prompt after Stop stays done', () => {
  const st = createState();
  applyEvent(st, ev('Notification', { notification_type: 'permission_prompt', message: 'Claude needs permission' }), 1);
  assert.equal(get(st).status, 'waiting');
  assert.equal(get(st).waitingReason, 'Claude needs permission');
  applyEvent(st, ev('Stop'), 2);
  assert.equal(get(st).status, 'done');
  applyEvent(st, ev('Notification', { notification_type: 'idle_prompt', message: 'waiting' }), 3);
  assert.equal(get(st).status, 'done');
  applyEvent(st, ev('Notification', { notification_type: 'auth_success' }), 4);
  assert.equal(get(st).status, 'done');
});

test('Stop -> done, SessionEnd removes session and subagents', () => {
  const st = createState();
  applyEvent(st, ev('UserPromptSubmit', { prompt: 'x' }), 1);
  applyEvent(st, ev('SubagentStart', { agent_id: 'a1', agent_type: 'Explore' }), 2);
  applyEvent(st, ev('Stop'), 3);
  assert.equal(get(st).status, 'done');
  applyEvent(st, ev('SessionEnd', { reason: 'other' }), 4);
  assert.equal(st.agents.size, 0);
});

test('subagents: created with parent link, task from Agent tool description, routed by agent_id', () => {
  const st = createState();
  applyEvent(st, ev('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'Explore', description: 'Find auth code' } }), 1);
  applyEvent(st, ev('SubagentStart', { agent_id: 'a1', agent_type: 'Explore' }), 2);
  const sub = get(st, 's1:a1');
  assert.equal(sub.kind, 'subagent');
  assert.equal(sub.parentId, 's1');
  assert.equal(sub.name, 'Explore');
  assert.equal(sub.task, 'Find auth code');
  applyEvent(st, ev('PreToolUse', { agent_id: 'a1', agent_type: 'Explore', tool_name: 'Grep', tool_input: { pattern: 'login' } }), 3);
  assert.equal(sub.activity, 'Zoekt "login"');
  assert.equal(get(st).activity, 'Start Explore: Find auth code', 'parent activity untouched by subagent tools');
  applyEvent(st, ev('SubagentStop', { agent_id: 'a1', agent_type: 'Explore' }), 4);
  assert.equal(sub.status, 'done');
});

test('subagent without SubagentStart is created on demand', () => {
  const st = createState();
  applyEvent(st, ev('PreToolUse', { agent_id: 'zz', agent_type: 'Plan', tool_name: 'Read', tool_input: { file_path: '/a/b.js' } }), 1);
  assert.equal(get(st, 's1:zz').activity, 'Leest b.js');
  assert.ok(get(st, 's1'));
});

test('prune removes stale sessions, finished subagents after linger, orphans', () => {
  const st = createState();
  applyEvent(st, ev('SubagentStart', { agent_id: 'a1' }), 0);
  applyEvent(st, ev('SubagentStop', { agent_id: 'a1' }), 1000);
  assert.equal(prune(st, 1000 + SUBAGENT_DONE_TTL_MS - 1), false);
  assert.equal(prune(st, 1000 + SUBAGENT_DONE_TTL_MS + 1), true);
  assert.equal(st.agents.has('s1:a1'), false);
  assert.equal(prune(st, 1000 + STALE_MS + 1), true);
  assert.equal(st.agents.size, 0);
});

test('invalid events are ignored', () => {
  const st = createState();
  for (const bad of [null, 'x', {}, { session_id: 's' }, { hook_event_name: 'Stop' }]) {
    assert.equal(applyEvent(st, bad, 1), false);
  }
  assert.equal(st.agents.size, 0);
});

test('long strings are truncated; snapshot hides internals', () => {
  const st = createState();
  applyEvent(st, ev('UserPromptSubmit', { prompt: 'a'.repeat(1000) }), 1);
  assert.equal(get(st).task.length, 140);
  applyEvent(st, ev('PreToolUse', { tool_name: 'Agent', tool_input: { description: 'd' } }), 2);
  assert.equal('pendingSubagentTask' in snapshot(st)[0], false);
  assert.equal(truncate(null, 5), '');
});

test('describeTool covers common tools and MCP', () => {
  assert.equal(describeTool('Bash', { command: 'npm test', description: 'Runs tests' }), 'Runs tests');
  assert.equal(describeTool('Edit', { file_path: '/a/b/server.js' }), 'Bewerkt server.js');
  assert.equal(describeTool('WebFetch', { url: 'https://example.com/x' }), 'Leest example.com');
  assert.equal(describeTool('mcp__github__create_pr', {}), 'create pr · github');
  assert.equal(describeTool('mcp__Claude_Browser__browser_batch', {}), 'browser batch · Claude Browser');
  assert.equal(describeTool('Weird', null), 'Gebruikt Weird');
});

test('projectKeyFor normalizes worktrees and trailing slashes', () => {
  assert.equal(projectKeyFor('/Users/x/code/app'), '/Users/x/code/app');
  assert.equal(projectKeyFor('/Users/x/code/app/'), '/Users/x/code/app');
  assert.equal(projectKeyFor('/Users/x/code/app/.claude/worktrees/feat-1'), '/Users/x/code/app');
  assert.equal(projectKeyFor('/Users/x/code/app/.claude/worktrees/feat-1/src'), '/Users/x/code/app');
  assert.equal(projectKeyFor('/Users/x/code/app/.worktrees/w2'), '/Users/x/code/app');
  assert.equal(projectKeyFor(''), 'unknown');
  assert.equal(projectKeyFor(undefined), 'unknown');
});

test('sessions in the same project (incl. worktree) share projectKey; subagents inherit it', () => {
  const st = createState();
  applyEvent(st, { session_id: 'a', cwd: '/r/app', hook_event_name: 'SessionStart' }, 1);
  applyEvent(st, { session_id: 'b', cwd: '/r/app/.claude/worktrees/x', hook_event_name: 'SessionStart' }, 1);
  applyEvent(st, { session_id: 'b', cwd: '/r/app/.claude/worktrees/x', hook_event_name: 'SubagentStart', agent_id: 's', agent_type: 'Explore' }, 2);
  assert.equal(get(st, 'a').projectKey, get(st, 'b').projectKey);
  assert.equal(get(st, 'b:s').projectKey, '/r/app');
  assert.equal(get(st, 'b:s').project, 'app');
});

test('finished subagents stay until the next prompt of their session', () => {
  const st = createState();
  applyEvent(st, ev('SubagentStart', { agent_id: 'a1' }), 1);
  applyEvent(st, ev('SubagentStart', { agent_id: 'a2' }), 1);
  applyEvent(st, ev('SubagentStop', { agent_id: 'a1' }), 2);
  assert.equal(prune(st, 60_000), false, 'still visible a minute later');
  applyEvent(st, ev('UserPromptSubmit', { prompt: 'next' }), 3);
  assert.equal(st.agents.has('s1:a1'), false, 'done subagent cleared');
  assert.equal(st.agents.has('s1:a2'), true, 'running subagent kept');
});

test('cd inside a session keeps it in the same office; projectRoot is applied', () => {
  const st = createState({ projectRoot: (cwd) => cwd.replace(/\/src.*$/, '') });
  applyEvent(st, { session_id: 'a', cwd: '/r/app/src/lib', hook_event_name: 'SessionStart' }, 1);
  assert.equal(get(st, 'a').projectKey, '/r/app');
  applyEvent(st, { session_id: 'a', cwd: '/r/other', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} }, 2);
  assert.equal(get(st, 'a').projectKey, '/r/app');
});

test('tool field tracks the last tool and clears on prompt/stop', () => {
  const st = createState();
  applyEvent(st, ev('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }), 1);
  assert.equal(get(st).tool, 'Bash');
  applyEvent(st, ev('Stop'), 2);
  assert.equal(get(st).tool, '');
  applyEvent(st, ev('PreToolUse', { agent_id: 'a', tool_name: 'Grep', tool_input: {} }), 3);
  assert.equal(get(st, 's1:a').tool, 'Grep');
  applyEvent(st, ev('SubagentStop', { agent_id: 'a' }), 4);
  assert.equal(get(st, 's1:a').tool, '');
});

test('source: sessions keep their tool, subagents inherit it; Interrupt and Codex tools', () => {
  const st = createState();
  applyEvent(st, { ...ev('SessionStart'), source: 'codex' }, 1);
  applyEvent(st, { ...ev('SubagentStart', { agent_id: 'a' }), source: 'codex' }, 2);
  assert.equal(get(st).source, 'codex');
  assert.equal(get(st, 's1:a').source, 'codex');
  applyEvent(st, { ...ev('PreToolUse', { tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: src/app.ts\n@@' } }), source: 'codex' }, 3);
  assert.equal(get(st).activity, 'Bewerkt app.ts');
  applyEvent(st, { ...ev('PreToolUse', { tool_name: 'update_plan', tool_input: {} }), source: 'codex' }, 4);
  assert.equal(get(st).activity, 'Werkt takenlijst bij');
  applyEvent(st, { ...ev('Interrupt'), source: 'codex' }, 5);
  assert.equal(get(st).status, 'done');
  assert.equal(get(st).activity, 'Onderbroken');
  applyEvent(st, ev('SessionStart', { session_id: 'c2' }), 6);
  assert.equal(get(st, 'c2').source, 'claude');
});
