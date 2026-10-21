// 10x mode (ADR-006): derive which 10x-team role is working from hook events and the
// project's .10x/ folder. Read-only, optional: projects without .10x/ are left alone.
import { join } from 'node:path';

export const ROLES = [
  { id: 'cto', label: 'CTO', skill: 'cto', dept: 'strategy' },
  { id: 'product-manager', label: 'PM', skill: 'product-manager', dept: 'strategy' },
  // 10x-Team-Plus only (ADR-007)
  { id: 'ux-designer', label: 'UX', skill: 'ux-designer', dept: 'design' },
  { id: 'ui-designer', label: 'UI', skill: 'ui-designer', dept: 'design' },
  { id: 'architect', label: 'Architect', skill: 'principal-architect', dept: 'architecture' },
  { id: 'staff-engineer', label: 'Staff', skill: 'staff-engineer', dept: 'architecture' },
  { id: 'engineering-manager', label: 'EM', skill: 'engineering-manager', dept: 'planning' },
  { id: 'senior-engineer', label: 'Senior', skill: 'senior-engineer', dept: 'planning' },
  { id: 'sde', label: 'SDE', skill: 'sde', dept: 'engineering' },
  { id: 'dba', label: 'DBA', skill: 'dba', dept: 'engineering' },
  { id: 'qa', label: 'QA', skill: 'qa-engineer', dept: 'quality' },
  { id: 'security', label: 'Security', skill: 'security-engineer', dept: 'quality' },
  { id: 'devops', label: 'DevOps', skill: 'devops-engineer', dept: 'operations' },
  { id: 'sre', label: 'SRE', skill: 'sre', dept: 'operations' },
];
export const ROLE_IDS = new Set(ROLES.map((r) => r.id));
export const MEETING = 'meeting';

// Department per phase; phase 0 is the brainstorm meeting. 10x-Team-Plus adds Experience Design.
export const FLAVORS = {
  classic: { depts: ['meeting', 'strategy', 'architecture', 'planning', 'engineering', 'quality', 'operations'], implPhase: 4 },
  plus: { depts: ['meeting', 'strategy', 'design', 'architecture', 'planning', 'engineering', 'quality', 'operations'], implPhase: 5 },
};
export const lastPhase = (flavor) => FLAVORS[flavor].depts.length - 1;
export const PHASE_NAMES = {
  classic: ['Brainstorming', 'Strategy', 'Design', 'Planning', 'Implementation', 'Verification', 'Delivery'],
  plus: ['Brainstorming', 'Strategy', 'Experience Design', 'Design', 'Planning', 'Implementation', 'Verification', 'Delivery'],
};
const ACTIVE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
// Kept for compatibility with ADR-006 callers.
export const PHASE_DEPT = FLAVORS.classic.depts;

// CEO mode (ADR-009): one session above all projects that starts a work session per idea.
// It is not 10x work itself, so these must never enable a 10x office or reset its phase.
export const isCeoSkill = (skill) => /^10x-team-plus:ceo$/i.test(String(skill || '').trim());
export const isCeoPrompt = (prompt) => /^\s*\/10x-team-plus:ceo\b/i.test(String(prompt || ''));

/** Signals that a project uses 10x-Team-Plus. */
export function isPlusSignal({ skill, path, statusText } = {}) {
  if (skill && /^10x-team-plus:/i.test(skill) && !isCeoSkill(skill)) return true;
  if (path && /\/\.10x\/decisions\/(ux|ui)-designer\//.test(norm(path))) return true;
  if (statusText && /phase\s*7|experience design/i.test(statusText)) return true;
  return false;
}

const GATE_MS = 2 * 60 * 1000;
const MAX_DECISION_BYTES = 4096;

/** `10x-Team:qa-engineer` → 'qa'. Unknown skills → null. */
export function roleFromSkill(skill) {
  if (!skill) return null;
  const name = String(skill).split(':').pop().toLowerCase();
  if (name === '10x-team') return null;
  return ROLES.find((r) => r.skill === name || r.id === name)?.id ?? null;
}

const norm = (p) => String(p || '').replace(/\\/g, '/');

/** Writes inside .10x/ tell exactly which role is working. */
export function roleFromPath(path) {
  const p = norm(path);
  const i = p.lastIndexOf('/.10x/');
  if (i < 0) return null;
  const rest = p.slice(i + 6);
  const m = /^decisions\/([^/]+)\//.exec(rest);
  if (m) return ROLE_IDS.has(m[1]) ? m[1] : null;
  if (rest.startsWith('adrs/')) return 'architect';
  if (rest.startsWith('specs/')) return MEETING;
  if (rest.startsWith('reviews/')) {
    if (/secur/i.test(rest)) return 'security';
    if (/qa/i.test(rest)) return 'qa';
  }
  return null;
}

export function isTenxPath(path) {
  return norm(path).includes('/.10x/');
}

/** Code = anything outside .10x/ that isn't prose. */
export function isCodeFile(path) {
  const p = norm(path);
  if (!p || isTenxPath(p)) return false;
  return !/\.(md|mdx|txt|rst|png|jpe?g|gif|svg)$/i.test(p);
}

function toolPath(input) {
  if (!input || typeof input !== 'object') return '';
  if (input.file_path || input.notebook_path) return input.file_path || input.notebook_path;
  const patch = typeof input.command === 'string' ? input.command : typeof input.input === 'string' ? input.input : '';
  const m = /\*\*\* (?:Update|Add|Delete) File: (.+)/.exec(patch);
  return m ? m[1].trim() : '';
}

/** Best guess when no exact signal: what does this kind of work look like in this phase's department? */
export function guessRole(phase, toolName, toolInput = {}, flavor = 'classic') {
  const depts = FLAVORS[flavor].depts;
  const path = norm(toolPath(toolInput));
  const cmd = String(toolInput?.command || '');
  const isTest = /\b(test|spec|jest|vitest|pytest|playwright)\b/i.test(cmd) || /(\.|_)(test|spec)\./i.test(path);
  if (/\.(sql)$|migrat|schema/i.test(path) || /\b(psql|mysql|prisma migrate|alembic)\b/.test(cmd)) return 'dba';
  if (!Number.isInteger(phase)) {
    // No phase known: only the kind of work says something.
    if (isTest && toolName === 'Bash') return 'qa';
    if (isCodeFile(path) && ['Write', 'Edit', 'MultiEdit', 'apply_patch', 'NotebookEdit'].includes(toolName)) return 'sde';
    return 'product-manager';
  }
  const dept = depts[Math.min(phase, depts.length - 1)];
  switch (dept) {
    case 'meeting': return MEETING;
    case 'strategy': return 'product-manager';
    case 'design': return /\.(css|scss|svg)$|token|theme|style|figma/i.test(path) ? 'ui-designer' : 'ux-designer';
    case 'architecture': return 'architect';
    case 'planning': return 'engineering-manager';
    case 'engineering': return isTest && toolName === 'Bash' ? 'qa' : 'sde';
    case 'quality': return /secur|audit|auth/i.test(path + cmd) ? 'security' : 'qa';
    default: return /monitor|alert|slo|grafana|prometheus/i.test(path + cmd) ? 'sre' : 'devops';
  }
}

/**
 * Phase from a free-form status.md: use the last section that mentions phases, take the
 * highest "Phase N" marked done ([x] or "complete") and return the next one (max 6).
 */
function phaseFromName(line, flavor) {
  const names = PHASE_NAMES[flavor] || PHASE_NAMES.classic;
  // Longest names first, so "Experience Design" isn't read as "Design".
  const order = names.map((n, i) => [n, i]).sort((a, b) => b[0].length - a[0].length);
  for (const [name, i] of order) if (new RegExp(`\\b${name}\\b`, 'i').test(line)) return i;
  return null;
}

export function parsePhase(text, maxPhase = 6, flavor = maxPhase === 7 ? 'plus' : 'classic') {
  if (!text) return null;
  const sections = String(text).split(/^(?=#\s)/m).reverse();
  for (const section of sections) {
    const all = section.split('\n');
    let lines = all.filter((l) => /phase\s*\d/i.test(l)).map((l) => [Number(/phase\s*(\d)/i.exec(l)[1]), l]);
    // Legacy layouts: "- [x] Strategy" or "phase: Strategy Complete".
    if (!lines.length) {
      lines = all
        .filter((l) => /\[[x ]\]|\bcomplete\b/i.test(l))
        .map((l) => [phaseFromName(l, flavor), l])
        .filter(([n]) => n !== null);
    }
    if (!lines.length) continue;
    const done = [];
    for (const [n, line] of lines) {
      if (/\[x\]|complete/i.test(line) && !/\[ \]/.test(line)) done.push(n);
    }
    const highest = done.length ? Math.max(...done) : -1;
    return { phase: Math.min(maxPhase, highest + 1), done: [...new Set(done)].sort(), complete: highest >= maxPhase };
  }
  return null;
}

export function reviewVerdict(text) {
  return /afgekeurd|rejected|blocker|\bfail(ed)?\b|not approved|niet goedgekeurd/i.test(text || '') ? 'rejected' : 'approved';
}

/** Parse .10x/active.json (10x-Team-Plus ≥ 0.4.0-plus.2). Invalid → null. */
export function parseActive(text) {
  let a;
  try { a = JSON.parse(text); } catch { return null; }
  if (!a || typeof a !== 'object') return null;
  const role = String(a.role || '');
  if (role !== MEETING && !ROLE_IDS.has(role)) return null;
  const phase = Number.isInteger(a.phase) && a.phase >= 0 && a.phase <= 7 ? a.phase : null;
  const at = Date.parse(a.updatedAt);
  return {
    role,
    phase,
    phaseName: String(a.phaseName || '').slice(0, 40),
    feature: String(a.feature || '').slice(0, 60),
    task: String(a.task || '').slice(0, 100),
    at: Number.isFinite(at) ? at : null,
  };
}

/** Tasks "T1 …" from an engineering-manager decision (table rows or list items). */
export function parseTasks(text) {
  const tasks = [];
  const seen = new Set();
  for (const line of String(text || '').split('\n')) {
    const m = /^\s*\|\s*(T\d+)\s*\|\s*([^|]+?)\s*\|/.exec(line) || /^\s*(?:[-*]|\d+\.)?\s*\**(T\d+)\**[\s:.)—–-]+(.+?)\s*$/.exec(line);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    tasks.push({ id: m[1], title: m[2].replace(/[*`]/g, '').slice(0, 40) });
    if (tasks.length >= 12) break;
  }
  return tasks;
}

/** A task is done when a ticked line in status.md or the SDE decision mentions its id. */
export function taskDone(id, statusSection, sdeText) {
  const re = new RegExp(`\\b${id}\\b`);
  const ticked = String(statusSection || '').split('\n').some((l) => /\[x\]/i.test(l) && re.test(l));
  return ticked || re.test(String(sdeText || ''));
}

/**
 * Per-project 10x state. `fs` is injected: { exists(p), readText(p), list(dir) → [{ name, mtimeMs }] }.
 */
export function createTenx({ fs, now = () => Date.now() }) {
  const projects = new Map(); // projectKey -> project state

  function project(key) {
    let p = projects.get(key);
    if (!p) {
      p = {
        key, enabled: false, flavor: 'classic', phase: null, done: [], complete: false, adrs: [], reviews: {}, gate: null,
        handoffAt: 0, roles: new Map(), lastRefresh: 0, active: null, activeOwner: null, lastSession: null, newRun: null,
        workload: 0, workPhase: null, kanban: [],
      };
      projects.set(key, p);
    }
    return p;
  }

  function refresh(key) {
    const p = projects.get(key);
    if (!p) return;
    const dir = join(key, '.10x');
    p.lastRefresh = now();
    if (!p.enabled && fs.exists(dir)) p.enabled = true;
    if (!p.enabled) return;
    const statusText = fs.readText(join(dir, 'status.md'));
    if (isPlusSignal({ statusText }) || fs.exists(join(dir, 'decisions', 'ux-designer')) || fs.exists(join(dir, 'decisions', 'ui-designer'))) p.flavor = 'plus';
    const status = parsePhase(statusText, lastPhase(p.flavor), p.flavor);
    if (status) Object.assign(p, status);
    p.adrs = fs.list(join(dir, 'adrs'))
      .filter((f) => f.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => {
        const title = /^#\s*(.+)$/m.exec(fs.readText(join(dir, 'adrs', f.name)) || '')?.[1] || f.name.replace(/\.md$/, '');
        return { file: f.name, number: /^(\d+)/.exec(f.name)?.[1] || '', title: title.slice(0, 80), mtimeMs: f.mtimeMs };
      });
    const reviews = {};
    for (const f of fs.list(join(dir, 'reviews')).sort((a, b) => a.mtimeMs - b.mtimeMs)) {
      const kind = /secur/i.test(f.name) ? 'security' : /qa/i.test(f.name) ? 'qa' : null;
      if (kind) reviews[kind] = reviewVerdict(fs.readText(join(dir, 'reviews', f.name)));
    }
    p.reviews = reviews;

    // The plugin's own record of who is working (ADR-008).
    const activeFile = fs.list(dir).find((f) => f.name === 'active.json');
    const active = activeFile ? parseActive(fs.readText(join(dir, 'active.json'))) : null;
    if (active) active.at = active.at ?? activeFile.mtimeMs;
    p.active = active && now() - active.at < ACTIVE_MAX_AGE_MS ? active : null;
    if (p.active && (p.active.phase === 7 || /^u[xi]-designer$/.test(p.active.role) || /experience design/i.test(p.active.phaseName))) p.flavor = 'plus';

    // Kanban: tasks from the newest engineering-manager decision.
    const newest = (role) => fs.list(join(dir, 'decisions', role))
      .filter((f) => f.name.endsWith('.md') && f.name !== '_index.md')
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
    const em = newest('engineering-manager');
    const sde = newest('sde');
    const sdeText = sde ? fs.readText(join(dir, 'decisions', 'sde', sde.name)) : '';
    const lastSection = String(statusText || '').split(/^(?=#\s)/m).pop();
    p.kanban = em ? parseTasks(fs.readText(join(dir, 'decisions', 'engineering-manager', em.name)))
      .map((t) => ({ ...t, done: taskDone(t.id, lastSection, sdeText) })) : [];

    const phase = effectivePhase(p);
    if (phase !== p.workPhase) { p.workPhase = phase; p.workload = 0; }
  }

  /** Phase to show: a fresh /10x-team prompt (phase 0) beats active.json, which beats status.md. */
  function effectivePhase(p) {
    if (p.newRun && !(p.active?.at >= p.newRun.at)) return 0;
    if (p.active && p.active.phase !== null) return Math.min(p.active.phase, lastPhase(p.flavor));
    return p.phase;
  }

  /** Feed a hook event (after the agent state was updated). Returns true when 10x state changed. */
  function onEvent(evt, agent) {
    if (!agent?.projectKey || agent.projectKey === 'unknown' || agent.ceo) return false;
    const p = project(agent.projectKey);
    const t = now();
    let exact = null;
    if (!evt.agent_id) p.lastSession = agent.sessionId;
    if (evt.hook_event_name === 'UserPromptSubmit' && /10x-team/i.test(evt.prompt || '') && !isCeoPrompt(evt.prompt)) {
      // A new /10x-team run starts with a brainstorm, whatever status.md says about earlier features.
      p.enabled = true;
      p.newRun = { session: agent.sessionId, at: t };
      p.workload = 0;
      return true;
    }
    if (evt.hook_event_name === 'PreToolUse') {
      const input = evt.tool_input || {};
      if (evt.tool_name === 'Skill') {
        exact = roleFromSkill(input.skill || input.name);
        if (/^10x-team(-plus)?:/i.test(input.skill || '') && !isCeoSkill(input.skill)) p.enabled = true;
        if (isPlusSignal({ skill: input.skill })) p.flavor = 'plus';
      }
      const path = toolPath(input);
      const cmd = evt.tool_name === 'Bash' ? String(input.command || '') : '';
      if (!exact && path) exact = roleFromPath(path);
      if (isPlusSignal({ path })) p.flavor = 'plus';
      const touchesActive = /\/\.10x\/active\.json$/.test(norm(path)) || /\.10x\/active\.json/.test(cmd);
      if (touchesActive) p.activeOwner = agent.sessionId;
      if ((path && isTenxPath(path)) || /\.10x\//.test(cmd)) {
        p.enabled = true;
        if (/\/\.10x\/handoff\.md$/.test(norm(path))) p.handoffAt = t;
        if (!touchesActive) p.newRun = null; // real 10x work has started; follow the files again
        p.dirty = true; // re-read after the write lands (PostToolUse)
      }
      if (!p.lastRefresh) refresh(p.key);
      if (!p.enabled) return false;
      if (path && isCodeFile(path) && ['Write', 'Edit', 'MultiEdit', 'apply_patch', 'NotebookEdit'].includes(evt.tool_name)) {
        if (!p.adrs.length) p.gate = { at: t, reason: 'Code geschreven terwijl er nog geen ADR is' };
        else if (effectivePhase(p) !== null && effectivePhase(p) < FLAVORS[p.flavor].implPhase && !p.complete) p.gate = { at: t, reason: `Code geschreven in fase ${p.phase}, vóór de implementatiefase` };
      }
      // Subagents work on the shared floor; only the session itself plays a team role.
      // Bookkeeping in .10x (status.md, handoff.md) doesn't say who is working: keep the current role.
      const bookkeeping = (path && isTenxPath(path) && !exact) || touchesActive;
      if (!bookkeeping) p.workload++;
      if (!evt.agent_id && !bookkeeping) {
        const role = exact || guessRole(effectivePhase(p), evt.tool_name, input, p.flavor);
        p.roles.set(agent.sessionId, { role, guessed: !exact, at: t });
      }
      return true;
    }
    if (evt.hook_event_name === 'PostToolUse' && p.dirty) {
      p.dirty = false;
      refresh(p.key);
      return true;
    }
    if (evt.hook_event_name === 'SessionEnd') p.roles.delete(agent.sessionId);
    if (!p.lastRefresh) { refresh(p.key); return p.enabled; }
    return false;
  }

  function tick() {
    const t = now();
    let changed = false;
    for (const p of projects.values()) {
      if (p.gate && t - p.gate.at > GATE_MS) { p.gate = null; changed = true; }
      if (t - p.lastRefresh > 15_000) { refresh(p.key); changed = changed || p.enabled; }
    }
    return changed;
  }

  function snapshot(activeKeys) {
    const out = {};
    for (const p of projects.values()) {
      if (!p.enabled || (activeKeys && !activeKeys.has(p.key))) continue;
      const roles = Object.fromEntries(p.roles);
      const owner = p.activeOwner && p.roles.has(p.activeOwner) ? p.activeOwner : p.lastSession;
      const fromActive = p.active && !(p.newRun && p.active.at < p.newRun.at);
      if (fromActive && owner) roles[owner] = { role: p.active.role, guessed: false, at: p.active.at, source: 'active.json' };
      if (p.newRun && !fromActive) roles[p.newRun.session] = { role: MEETING, guessed: false, at: p.newRun.at };
      const phase = effectivePhase(p);
      out[p.key] = {
        flavor: p.flavor,
        phase,
        done: p.newRun && !fromActive ? [] : p.done,
        complete: p.complete && !(p.newRun && !fromActive) && !(fromActive && p.active.phase !== null && p.active.phase < lastPhase(p.flavor)),
        active: fromActive ? { feature: p.active.feature, task: p.active.task, phaseName: p.active.phaseName } : null,
        workload: p.workload,
        kanban: p.kanban,
        adrs: p.adrs.map(({ number, title, mtimeMs }) => ({ number, title, mtimeMs })),
        reviews: p.reviews,
        gate: p.gate,
        handoffAt: p.handoffAt,
        roles,
      };
    }
    return out;
  }

  /** Start of the newest decision of a role. Only known projects and known roles. */
  function readDecision(key, role) {
    const p = projects.get(key);
    if (!p?.enabled || !ROLE_IDS.has(role)) return null;
    const dir = join(key, '.10x', 'decisions', role);
    const files = fs.list(dir).filter((f) => f.name.endsWith('.md') && /^[\w.-]+$/.test(f.name));
    if (!files.length) return { role, file: null, text: '' };
    const pick = files.filter((f) => f.name !== '_index.md').sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || files[0];
    const text = (fs.readText(join(dir, pick.name)) || '').slice(0, MAX_DECISION_BYTES);
    return { role, file: pick.name, text };
  }

  return { onEvent, tick, refresh, snapshot, readDecision, projects };
}
