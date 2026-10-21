// One company (ADR-016), the pure part: which zones the company has, which work session ("case")
// lies in which department, and which employee works on it. No canvas here, so it runs under node:test.
import { ROLE_INFO, DEPTS, phasesFor } from './tenx-sprites.js';

export const ZONE_W = 80;
export const ZONE_H = 134;
export const WALL_H = 22;
export const MARGIN = 8;
export const BOTTOM = 6;
export const SLOTS = 2; // permanent employee + one colleague; more work piles up on the main desk
export const TABLES = 3; // meeting tables
export const FLEX_PER_SPAN = 4;

export const PROJECT_COLORS = ['#4ea3ff', '#f1c40f', '#3ddc84', '#e87fb0', '#ff8c42', '#a78bfa', '#2dd4bf', '#ff5c7a'];

// The built-in company when the plugin's departments.json can't be read (10x-Team-Plus layout).
export const BUILTIN_DEPARTMENTS = ['meeting', 'strategy', 'design', 'architecture', 'planning', 'engineering', 'quality', 'operations']
  .map((id, i) => ({ id, name: DEPTS[id].label, phases: [i], roles: DEPTS[id].roles.map((role) => ({ role, title: ROLE_INFO[role].label })) }));

const LABELS = { other: 'Overig', flex: 'Flexwerkplek', lounge: 'Lounge' };

/** The departments to draw: the plugin's list if usable, else the built-in one. */
export function departmentList(departments) {
  const list = Array.isArray(departments?.departments) ? departments.departments : null;
  return list && list.some((d) => d.roles?.length) ? list : BUILTIN_DEPARTMENTS;
}

/**
 * Zones in two rows: meeting + the first half of the departments on top; the rest, "Overig" (roles
 * nobody knows yet), the flex desks and the lounge below. The shorter row widens meeting or flex.
 */
export function companyLayout(departments, extraRoles = []) {
  const depts = departmentList(departments).filter((d) => d.id !== 'meeting' && d.roles.length);
  const zone = (id, kind, roles = [], name) => ({
    id, kind, roles, label: DEPTS[id]?.label || LABELS[id] || name || id,
    span: kind === 'dept' ? Math.max(1, Math.ceil(roles.length / 2)) : kind === 'lounge' || kind === 'meeting' ? 2 : 1,
  });
  const half = Math.ceil(depts.length / 2);
  const top = [zone('meeting', 'meeting'), ...depts.slice(0, half).map((d) => zone(d.id, 'dept', d.roles.map((r) => r.role), d.name))];
  const bottom = depts.slice(half).map((d) => zone(d.id, 'dept', d.roles.map((r) => r.role), d.name));
  if (extraRoles.length) bottom.push({ ...zone('other', 'dept', extraRoles), id: 'other' });
  bottom.push(zone('flex', 'flex'), zone('lounge', 'lounge'));
  const width = (row) => row.reduce((s, z) => s + z.span, 0);
  const cols = Math.max(width(top), width(bottom));
  top[0].span += cols - width(top);
  bottom.at(-2).span += cols - width(bottom);
  const zones = [];
  for (const [row, list] of [top, bottom].entries()) {
    let col = 0;
    for (const z of list) {
      zones.push({ ...z, col, row, x: MARGIN + col * ZONE_W, y: WALL_H + 2 + row * ZONE_H, w: z.span * ZONE_W, h: ZONE_H });
      col += z.span;
    }
  }
  const roleDept = new Map();
  for (const z of zones) for (const r of z.roles) roleDept.set(r, z.id);
  return { cols, zones, roleDept, W: MARGIN * 2 + cols * ZONE_W, H: WALL_H + 2 + 2 * ZONE_H + BOTTOM };
}

/** Roles in cases that no department knows (a newer plugin): drawn in "Overig". */
export function unknownRoles(cases, departments) {
  const known = new Set(departmentList(departments).flatMap((d) => d.roles.map((r) => r.role)));
  return [...new Set(cases.filter((c) => c.kind === 'tenx' && !c.meeting && !c.shipped && !known.has(c.role)).map((c) => c.role))].sort();
}

/**
 * One case per work session (not the CEO): a 10x session with its own view (ADR-015) and role, or a
 * plain session for the flex desks. Subagents belong to their session's case.
 */
export function deriveCases(agents, tenx = {}) {
  const cases = [];
  const sessions = agents.filter((a) => a.kind === 'session' && !a.ceo && a.room !== 'ceo')
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0) || String(a.id).localeCompare(String(b.id)));
  for (const a of sessions) {
    const base = {
      key: `session:${a.id}`, sessionId: a.id, projectKey: a.projectKey, project: a.project || a.projectKey || '?',
      agent: a, status: a.status, subagents: agents.filter((s) => s.kind === 'subagent' && s.parentId === a.id),
    };
    const tx = tenx[a.projectKey];
    if (!tx) { cases.push({ ...base, kind: 'flex' }); continue; }
    const view = { ...tx, ...(tx.sessions?.[a.id] || {}) };
    const PH = phasesFor(tx.flavor);
    const phase = Number.isInteger(view.phase) ? view.phase : null;
    const info = tx.roles?.[a.id];
    let role = info?.role || null;
    const meeting = role === 'meeting' || phase === 0;
    if (meeting) role = 'product-manager';
    else if (!role) role = PH.defaults[phase ?? PH.implPhase];
    cases.push({
      ...base, kind: 'tenx', role, meeting, shipped: !!view.complete, guessed: info ? !!info.guessed : true,
      phase, phaseName: view.active?.phaseName || DEPTS[PH.depts[phase]]?.label || '', feature: view.active?.feature || '',
      task: view.active?.task || '', flavor: tx.flavor, gate: tx.gate || null, reviews: tx.reviews || {}, handoffAt: view.handoffAt || 0,
    });
  }
  return cases;
}

/** Keep each key on the index it had; new keys take the lowest free index; the rest overflow. */
export function stableSlots(prev, keys, capacity) {
  const next = new Map();
  const used = new Set();
  for (const k of keys) if (prev.has(k) && prev.get(k) < capacity && !used.has(prev.get(k))) { next.set(k, prev.get(k)); used.add(prev.get(k)); }
  const overflow = [];
  for (const k of keys) {
    if (next.has(k)) continue;
    const i = [...Array(capacity).keys()].find((n) => !used.has(n));
    if (i === undefined) { overflow.push(k); continue; }
    next.set(k, i);
    used.add(i);
  }
  return { slots: next, overflow };
}

/**
 * Who works on what, stable across snapshots. Every active 10x case gets a slot of its role
 * (0 = the permanent employee, 1 = a colleague); a meeting case is the PM's and sits at a table.
 * `assign` reports cases that moved to another role or place, so a folder can walk over.
 */
export function createStaffing({ slots = SLOTS, tables = TABLES } = {}) {
  let byRole = new Map(); // role -> Map(caseKey -> slot)
  let place = new Map(); // caseKey -> { role, slot, meeting }
  let tableOf = new Map();
  let flexOf = new Map();

  function assign(cases, { flexCapacity = FLEX_PER_SPAN } = {}) {
    const active = cases.filter((c) => c.kind === 'tenx' && !c.shipped);
    const roles = new Map();
    for (const c of active) {
      if (!roles.has(c.role)) roles.set(c.role, []);
      roles.get(c.role).push(c.key);
    }
    const nextByRole = new Map();
    const piles = new Map();
    for (const [role, keys] of roles) {
      const { slots: s, overflow } = stableSlots(byRole.get(role) || new Map(), keys, slots);
      nextByRole.set(role, s);
      if (overflow.length) piles.set(role, overflow);
    }
    const meet = stableSlots(tableOf, active.filter((c) => c.meeting).map((c) => c.key), tables);
    const flex = stableSlots(flexOf, cases.filter((c) => c.kind === 'flex').map((c) => c.key), flexCapacity);

    const nextPlace = new Map();
    const moves = [];
    for (const c of active) {
      const slot = nextByRole.get(c.role).get(c.key);
      const p = { role: c.role, slot: slot ?? 0, pile: slot === undefined, meeting: c.meeting, table: meet.slots.get(c.key) };
      nextPlace.set(c.key, p);
      const before = place.get(c.key);
      if (before && (before.role !== p.role || before.meeting !== p.meeting)) moves.push({ key: c.key, from: before, to: p });
    }
    byRole = nextByRole;
    place = nextPlace;
    tableOf = meet.slots;
    flexOf = flex.slots;
    return { place, byRole, piles, tables: meet.slots, tableOverflow: meet.overflow.length, flex: flex.slots, flexOverflow: flex.overflow.length, moves };
  }

  return { assign };
}

/** A colour per project, handed out in order of appearance so the first eight never clash. */
export function createProjectColors(palette = PROJECT_COLORS) {
  const given = new Map();
  return (projectKey) => {
    if (!given.has(projectKey)) given.set(projectKey, palette[given.size % palette.length]);
    return given.get(projectKey);
  };
}

/** Short project label for nameplates: "Visual Agents Office" → "Visual A…" at 8 characters. */
export function shortName(name, max = 8) {
  const s = String(name || '?');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
