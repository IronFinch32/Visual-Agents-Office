// Pure state machine: Claude Code hook events -> agents in the office.
// No I/O here so it is easy to test.
import { isCeoSkill, isCeoPrompt } from './tenx.js';

export const LIMITS = { task: 140, activity: 80, reason: 120, name: 40, tool: 60 };
export const STALE_MS = 30 * 60 * 1000;
// The CEO session often waits a long time for the user; it stays until SessionEnd, with this as a crash safety net (ADR-010).
export const CEO_STALE_MS = 12 * 60 * 60 * 1000;
export const SUBAGENT_DONE_TTL_MS = 10 * 60 * 1000;

const WAITING_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);
const WAITING_NOTIFICATIONS = new Set(['permission_prompt', 'idle_prompt', 'elicitation_dialog']);

/**
 * projectRoot(cwd) maps a working directory to its project folder (e.g. the git root).
 * Injected so this module stays free of I/O.
 */
export function createState({ projectRoot = (cwd) => cwd } = {}) {
  // ceoSeen: a CEO session existed since the server started (ADR-009); 10x sessions then get a room each.
  return { agents: new Map(), projectRoot, ceoSeen: false };
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

// Sessions in a worktree belong to the same project as the main checkout.
export function projectKeyFor(cwd) {
  if (!cwd) return 'unknown';
  let key = String(cwd).replace(/[\\/]+$/, '');
  const m = /^(.*?)[\\/]\.(?:claude[\\/])?worktrees[\\/]/.exec(key + '/');
  if (m && m[1]) key = m[1];
  return key || 'unknown';
}

function setProject(state, a, cwd) {
  a.projectKey = projectKeyFor(cwd && state.projectRoot(cwd));
  a.project = truncate(basename(a.projectKey) || 'onbekend', LIMITS.name);
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
    case 'TodoWrite':
    case 'update_plan': return 'Werkt takenlijst bij';
    case 'apply_patch': {
      // Codex: the patch text names the files it touches.
      const m = /\*\*\* (?:Update|Add|Delete) File: (.+)/.exec(typeof i.input === 'string' ? i.input : typeof i.patch === 'string' ? i.patch : typeof i.command === 'string' ? i.command : '');
      return m ? `Bewerkt ${basename(m[1].trim())}` : 'Bewerkt bestanden';
    }
    default: {
      const m = /^mcp__(.+?)__(.+)$/.exec(name || '');
      if (m) {
        const pretty = (s) => s.replace(/^(plugin_[^_]+_|ccd_|mcp_)/, '').replace(/[_-]+/g, ' ').trim();
        return `${pretty(m[2])} · ${pretty(m[1])}`;
      }
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
      source: evt.source === 'codex' ? 'codex' : 'claude',
    };
    setProject(state, a, evt.cwd);
    state.agents.set(id, a);
  }
  if (evt.cwd && evt.cwd !== a.cwd) {
    a.cwd = evt.cwd;
    a.name = truncate(basename(evt.cwd), LIMITS.name);
    // A `cd` inside a session must not move it to another office; only a (re)start or a first real cwd does.
    if (evt.hook_event_name === 'SessionStart' || a.projectKey === 'unknown') setProject(state, a, evt.cwd);
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
  a.projectKey = parent.projectKey;
  a.project = parent.project;
  a.source = parent.source;
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

  // The CEO session is recognised by its skill or prompt and stays CEO until SessionEnd.
  if (!evt.agent_id && ((name === 'PreToolUse' && evt.tool_name === 'Skill' && isCeoSkill(evt.tool_input?.skill || evt.tool_input?.name))
    || (name === 'UserPromptSubmit' && isCeoPrompt(evt.prompt)))) {
    session.ceo = true;
    state.ceoSeen = true;
  }

  // Events coming from inside a subagent carry agent_id.
  const target = evt.agent_id ? subAgent(state, evt, session, now) : session;
  target.updatedAt = now;

  switch (name) {
    case 'SessionStart':
      if (target === session && session.status === 'done') setStatus(session, 'idle', now);
      break;
    case 'UserPromptSubmit':
      if (target === session) {
        // A new prompt starts a new job: the finished team goes home.
        for (const [id, a] of state.agents) {
          if (a.parentId === session.id && a.status === 'done') state.agents.delete(id);
        }
      }
      setStatus(target, 'working', now);
      target.task = truncate(evt.prompt, LIMITS.task);
      target.activity = 'Denkt na';
      target.tool = '';
      break;
    case 'PreToolUse': {
      const desc = truncate(describeTool(evt.tool_name, evt.tool_input), LIMITS.activity);
      target.activity = desc;
      target.tool = truncate(evt.tool_name, LIMITS.tool);
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
      if (name === 'PostToolUseFailure') target.failedAt = now; // shown as a puff of smoke
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
    case 'Interrupt':
      setStatus(target, 'done', now);
      target.activity = 'Onderbroken';
      target.tool = '';
      break;
    case 'Stop':
    case 'StopFailure':
      setStatus(target, 'done', now);
      target.activity = name === 'StopFailure' ? 'Gestopt met fout' : 'Klaar';
      target.tool = '';
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
        target.tool = '';
        target.task = target.task || truncate(evt.last_assistant_message, LIMITS.task);
      }
      break;
    default:
      break; // unknown events only refresh updatedAt
  }
  return true;
}

/**
 * Remove stale sessions (the CEO session only after CEO_STALE_MS) and finished subagents. Returns true when something was removed.
 */
export function prune(state, now = Date.now()) {
  let changed = false;
  for (const [id, a] of state.agents) {
    const stale = now - a.updatedAt > (a.kind === 'session' && a.ceo ? CEO_STALE_MS : STALE_MS);
    const finishedSub = a.kind === 'subagent' && a.status === 'done' && now - a.statusSince > SUBAGENT_DONE_TTL_MS;
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

// Fields of a CEO session that survive a restart (ADR-011).
const CEO_FIELDS = ['id', 'name', 'cwd', 'projectKey', 'project', 'task', 'activity', 'status', 'startedAt', 'updatedAt', 'statusSince', 'source'];

/** The CEO sessions as plain objects, to remember across a restart (ADR-011). */
export function ceoSnapshot(state) {
  return [...state.agents.values()]
    .filter((a) => a.kind === 'session' && a.ceo)
    .map((a) => Object.fromEntries(CEO_FIELDS.map((k) => [k, a[k]])));
}

/**
 * Put remembered CEO sessions back after a restart (ADR-011). Ignores anything malformed or older than
 * CEO_STALE_MS; a session that was working is shown idle until it sends something again.
 */
export function restoreCeo(state, saved, now = Date.now()) {
  if (!Array.isArray(saved)) return false;
  let restored = false;
  for (const s of saved) {
    if (!s || typeof s.id !== 'string' || !s.id || typeof s.updatedAt !== 'number' || now - s.updatedAt > CEO_STALE_MS) continue;
    if (state.agents.has(s.id)) continue;
    const str = (v, max) => truncate(typeof v === 'string' ? v : '', max);
    const path = (v) => (typeof v === 'string' ? v.slice(0, 4096) : '');
    const num = (v) => (typeof v === 'number' ? v : s.updatedAt);
    state.agents.set(s.id, {
      id: s.id, sessionId: s.id, parentId: null, kind: 'session', ceo: true,
      name: str(s.name, LIMITS.name) || 'sessie', cwd: path(s.cwd), projectKey: path(s.projectKey) || 'unknown', project: str(s.project, LIMITS.name),
      task: str(s.task, LIMITS.task), activity: '', waitingReason: '',
      status: ['waiting', 'done', 'idle'].includes(s.status) ? s.status : 'idle',
      startedAt: num(s.startedAt), updatedAt: s.updatedAt, statusSince: num(s.statusSince),
      source: s.source === 'codex' ? 'codex' : 'claude',
    });
    restored = true;
  }
  if (restored) state.ceoSeen = true;
  return restored;
}

/**
 * Which room each agent is drawn in (ADR-009): the CEO session and its subagents on the CEO floor,
 * a session in a 10x project its own room once a CEO has been seen, everything else per project.
 * Mutates and returns the snapshot agents.
 */
export function assignRooms(agents, { ceoSeen = false, isTenx = () => false } = {}) {
  const ceoSessions = new Set(agents.filter((a) => a.kind === 'session' && a.ceo).map((a) => a.id));
  for (const a of agents) {
    if (ceoSessions.has(a.sessionId)) a.room = 'ceo';
    else if (ceoSeen && isTenx(a.projectKey)) a.room = `session:${a.sessionId}`;
    else a.room = a.projectKey;
  }
  return agents;
}
