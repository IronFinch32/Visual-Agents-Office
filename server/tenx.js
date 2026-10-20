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
// Kept for compatibility with ADR-006 callers.
export const PHASE_DEPT = FLAVORS.classic.depts;

/** Signals that a project uses 10x-Team-Plus. */
export function isPlusSignal({ skill, path, statusText } = {}) {
  if (skill && /^10x-team-plus:/i.test(skill)) return true;
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
  const dept = Number.isInteger(phase) ? depts[Math.min(phase, depts.length - 1)] : 'engineering';
  const path = norm(toolPath(toolInput));
  const cmd = String(toolInput?.command || '');
  const isTest = /\b(test|spec|jest|vitest|pytest|playwright)\b/i.test(cmd) || /(\.|_)(test|spec)\./i.test(path);
  if (/\.(sql)$|migrat|schema/i.test(path) || /\b(psql|mysql|prisma migrate|alembic)\b/.test(cmd)) return 'dba';
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
export function parsePhase(text, maxPhase = 6) {
  if (!text) return null;
  const sections = String(text).split(/^(?=#\s)/m).reverse();
  for (const section of sections) {
    const lines = section.split('\n').filter((l) => /phase\s*\d/i.test(l));
    if (!lines.length) continue;
    const done = [];
    for (const line of lines) {
      const n = Number(/phase\s*(\d)/i.exec(line)[1]);
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

/**
 * Per-project 10x state. `fs` is injected: { exists(p), readText(p), list(dir) → [{ name, mtimeMs }] }.
 */
export function createTenx({ fs, now = () => Date.now() }) {
  const projects = new Map(); // projectKey -> project state

  function project(key) {
    let p = projects.get(key);
    if (!p) {
      p = { key, enabled: false, flavor: 'classic', phase: null, done: [], complete: false, adrs: [], reviews: {}, gate: null, handoffAt: 0, roles: new Map(), lastRefresh: 0 };
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
    const status = parsePhase(statusText, lastPhase(p.flavor));
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
  }

  /** Feed a hook event (after the agent state was updated). Returns true when 10x state changed. */
  function onEvent(evt, agent) {
    if (!agent?.projectKey || agent.projectKey === 'unknown') return false;
    const p = project(agent.projectKey);
    const t = now();
    let exact = null;
    if (evt.hook_event_name === 'UserPromptSubmit' && /10x-team/i.test(evt.prompt || '')) p.enabled = true;
    if (evt.hook_event_name === 'PreToolUse') {
      const input = evt.tool_input || {};
      if (evt.tool_name === 'Skill') {
        exact = roleFromSkill(input.skill || input.name);
        if (/^10x-team(-plus)?:/i.test(input.skill || '')) p.enabled = true;
        if (isPlusSignal({ skill: input.skill })) p.flavor = 'plus';
      }
      const path = toolPath(input);
      if (!exact && path) exact = roleFromPath(path);
      if (isPlusSignal({ path })) p.flavor = 'plus';
      if (path && isTenxPath(path)) {
        p.enabled = true;
        if (/\/\.10x\/handoff\.md$/.test(norm(path))) p.handoffAt = t;
        p.dirty = true; // re-read after the write lands (PostToolUse)
      }
      if (!p.lastRefresh) refresh(p.key);
      if (!p.enabled) return false;
      if (path && isCodeFile(path) && ['Write', 'Edit', 'MultiEdit', 'apply_patch', 'NotebookEdit'].includes(evt.tool_name)) {
        if (!p.adrs.length) p.gate = { at: t, reason: 'Code geschreven terwijl er nog geen ADR is' };
        else if (p.phase !== null && p.phase < FLAVORS[p.flavor].implPhase && !p.complete) p.gate = { at: t, reason: `Code geschreven in fase ${p.phase}, vóór de implementatiefase` };
      }
      // Subagents work on the shared floor; only the session itself plays a team role.
      // Bookkeeping in .10x (status.md, handoff.md) doesn't say who is working: keep the current role.
      const bookkeeping = path && isTenxPath(path) && !exact;
      if (!evt.agent_id && !bookkeeping) {
        const role = exact || guessRole(p.phase, evt.tool_name, input, p.flavor);
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
      out[p.key] = {
        flavor: p.flavor,
        phase: p.phase,
        done: p.done,
        complete: p.complete,
        adrs: p.adrs.map(({ number, title, mtimeMs }) => ({ number, title, mtimeMs })),
        reviews: p.reviews,
        gate: p.gate,
        handoffAt: p.handoffAt,
        roles: Object.fromEntries(p.roles),
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
