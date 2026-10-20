// Pure state machine: Claude Code hook events -> agents in the office.
// No I/O here so it is easy to test.

export const LIMITS = { task: 140, activity: 80, reason: 120, name: 40 };
export const STALE_MS = 30 * 60 * 1000;
export const SUBAGENT_LINGER_MS = 20 * 1000;

const WAITING_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);
const WAITING_NOTIFICATIONS = new Set(['permission_prompt', 'idle_prompt', 'elicitation_dialog']);

export function createState() {
  return { agents: new Map() };
}

export function truncate(value, max) {
  if (value == null) return '';
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function basename(p) {
  if (!p) return '';
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function host(url) {
  try { return new URL(url).host; } catch { return truncate(url, 40); }
}

export function describeTool(name, input = {}) {
  const i = input && typeof input === 'object' ? input : {};
  switch (name) {
    case 'Bash': return i.description ? i.description : `Draait: ${i.command || ''}`;
    case 'Read': return `Leest ${basename(i.file_path)}`;
    case 'Edit':
    case 'MultiEdit': return `Bewerkt ${basename(i.file_path)}`;
    case 'Write': return `Schrijft ${basename(i.file_path)}`;
    case 'NotebookEdit': return `Bewerkt ${basename(i.notebook_path)}`;
    case 'Grep': return `Zoekt "${i.pattern || ''}"`;
    case 'Glob': return `Zoekt bestanden ${i.pattern || ''}`;
    case 'WebFetch': return `Leest ${host(i.url)}`;
    case 'WebSearch': return `Zoekt online: ${i.query || ''}`;
    case 'Agent':
    case 'Task': return `Start ${i.subagent_type || 'subagent'}: ${i.description || ''}`;
    case 'AskUserQuestion': return 'Stelt je een vraag';
    case 'ExitPlanMode': return 'Wacht op akkoord voor plan';
    case 'TodoWrite': return 'Werkt takenlijst bij';
    default: {
      const m = /^mcp__(.+?)__(.+)$/.exec(name || '');
      if (m) return `${m[2]} (${m[1]})`;
      return name ? `Gebruikt ${name}` : 'Aan het werk';
    }
  }
}

function sessionAgent(state, evt, now) {
  const id = String(evt.session_id);
  let a = state.agents.get(id);
  if (!a) {
    a = {
      id,
      sessionId: id,
      parentId: null,
      kind: 'session',
      name: truncate(basename(evt.cwd) || 'sessie', LIMITS.name),
      cwd: evt.cwd || '',
      status: 'idle',
      task: '',
      activity: '',
      waitingReason: '',
      startedAt: now,
      updatedAt: now,
      statusSince: now,
    };
    state.agents.set(id, a);
  }
  if (evt.cwd && evt.cwd !== a.cwd) {
    a.cwd = evt.cwd;
    a.name = truncate(basename(evt.cwd), LIMITS.name);
  }
  if (evt.session_title) a.title = truncate(evt.session_title, LIMITS.name);
  return a;
}

function subAgent(state, evt, parent, now) {
  const id = `${parent.id}:${evt.agent_id}`;
  let a = state.agents.get(id);
  if (!a) {
    a = {
      id,
      sessionId: parent.id,
      parentId: parent.id,
      kind: 'subagent',
      name: truncate(evt.agent_type || 'subagent', LIMITS.name),
      cwd: parent.cwd,
      status: 'working',
      task: parent.pendingSubagentTask || '',
      activity: '',
      waitingReason: '',
      startedAt: now,
      updatedAt: now,
      statusSince: now,
    };
    parent.pendingSubagentTask = '';
    state.agents.set(id, a);
  }
  if (evt.agent_type) a.name = truncate(evt.agent_type, LIMITS.name);
  return a;
}

function setStatus(a, status, now) {
  if (a.status !== status) {
    a.status = status;
    a.statusSince = now;
  }
  if (status !== 'waiting') a.waitingReason = '';
}

/**
 * Apply one hook event. Returns true when the state changed.
 */
export function applyEvent(state, evt, now = Date.now()) {
  if (!evt || typeof evt !== 'object' || !evt.session_id || !evt.hook_event_name) return false;
  const name = evt.hook_event_name;
  const session = sessionAgent(state, evt, now);
  session.updatedAt = now;

  if (name === 'SessionEnd') {
    for (const [id, a] of state.agents) if (a.sessionId === session.id) state.agents.delete(id);
    return true;
  }

  // Events coming from inside a subagent carry agent_id.
  const target = evt.agent_id ? subAgent(state, evt, session, now) : session;
  target.updatedAt = now;

  switch (name) {
    case 'SessionStart':
      if (target === session && session.status === 'done') setStatus(session, 'idle', now);
      break;
    case 'UserPromptSubmit':
      setStatus(target, 'working', now);
      target.task = truncate(evt.prompt, LIMITS.task);
      target.activity = 'Denkt na';
      break;
    case 'PreToolUse': {
      const desc = truncate(describeTool(evt.tool_name, evt.tool_input), LIMITS.activity);
      target.activity = desc;
      if (WAITING_TOOLS.has(evt.tool_name)) {
        setStatus(target, 'waiting', now);
        target.waitingReason = desc;
      } else {
        setStatus(target, 'working', now);
      }
      if (evt.tool_name === 'Agent' || evt.tool_name === 'Task') {
        target.pendingSubagentTask = truncate(evt.tool_input?.description || evt.tool_input?.prompt, LIMITS.task);
      }
      break;
    }
    case 'PostToolUse':
    case 'PostToolUseFailure':
      setStatus(target, 'working', now);
      break;
    case 'PermissionRequest':
      setStatus(target, 'waiting', now);
      target.waitingReason = truncate(`Toestemming: ${describeTool(evt.tool_name, evt.tool_input)}`, LIMITS.reason);
      break;
    case 'Elicitation':
      setStatus(target, 'waiting', now);
      target.waitingReason = truncate(evt.message || 'Vraagt om input', LIMITS.reason);
      break;
    case 'Notification':
      if (WAITING_NOTIFICATIONS.has(evt.notification_type) || !evt.notification_type) {
        // idle_prompt after Stop means "done and waiting for your next prompt": keep it done.
        if (evt.notification_type === 'idle_prompt' && target.status === 'done') break;
        setStatus(target, 'waiting', now);
        target.waitingReason = truncate(evt.message || 'Wacht op input', LIMITS.reason);
      }
      break;
    case 'Stop':
    case 'StopFailure':
      setStatus(target, 'done', now);
      target.activity = name === 'StopFailure' ? 'Gestopt met fout' : 'Klaar';
      break;
    case 'SubagentStart': {
      const sub = evt.agent_id ? target : null;
      if (sub) { setStatus(sub, 'working', now); sub.activity = 'Begint'; }
      break;
    }
    case 'SubagentStop':
      if (target.kind === 'subagent') {
        setStatus(target, 'done', now);
        target.activity = 'Klaar';
        target.task = target.task || truncate(evt.last_assistant_message, LIMITS.task);
      }
      break;
    default:
      break; // unknown events only refresh updatedAt
  }
  return true;
}

/**
 * Remove stale sessions and finished subagents. Returns true when something was removed.
 */
export function prune(state, now = Date.now()) {
  let changed = false;
  for (const [id, a] of state.agents) {
    const stale = now - a.updatedAt > STALE_MS;
    const finishedSub = a.kind === 'subagent' && a.status === 'done' && now - a.statusSince > SUBAGENT_LINGER_MS;
    const orphan = a.kind === 'subagent' && !state.agents.has(a.parentId);
    if (stale || finishedSub || orphan) {
      state.agents.delete(id);
      changed = true;
    }
  }
  return changed;
}

export function snapshot(state) {
  return [...state.agents.values()].map(({ pendingSubagentTask, ...a }) => a);
}
