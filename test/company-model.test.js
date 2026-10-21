import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  companyLayout, deriveCases, createStaffing, stableSlots, createProjectColors, unknownRoles, shortName,
  BUILTIN_DEPARTMENTS, PROJECT_COLORS,
} from '../web/company-model.js';

const ids = (L) => L.zones.map((z) => `${z.id}@${z.col},${z.row}x${z.span}`);

test('built-in layout: meeting and four departments on top, three plus flex and lounge below', () => {
  const L = companyLayout(null);
  assert.equal(L.cols, 6);
  assert.deepEqual(ids(L), [
    'meeting@0,0x2', 'strategy@2,0x1', 'design@3,0x1', 'architecture@4,0x1', 'planning@5,0x1',
    'engineering@0,1x1', 'quality@1,1x1', 'operations@2,1x1', 'flex@3,1x1', 'lounge@4,1x2',
  ]);
  assert.equal(L.roleDept.get('sde'), 'engineering');
  assert.equal(L.zones.find((z) => z.id === 'strategy').label, 'Strategie');
});

test('a new department from the plugin becomes a zone; a three-role department is wider', () => {
  const departments = { version: 1, departments: [...BUILTIN_DEPARTMENTS, { id: 'growth', name: 'Growth', phases: [], roles: [{ role: 'marketer' }, { role: 'seo' }, { role: 'analyst' }] }] };
  const L = companyLayout(departments);
  const growth = L.zones.find((z) => z.id === 'growth');
  assert.equal(growth.label, 'Growth');
  assert.equal(growth.span, 2);
  assert.equal(L.roleDept.get('seo'), 'growth');
  // both rows fill the same width
  for (const row of [0, 1]) assert.equal(L.zones.filter((z) => z.row === row).reduce((s, z) => s + z.span, 0), L.cols);
});

test('unknown roles get an "Overig" zone', () => {
  const L = companyLayout(null, ['data-scientist']);
  const other = L.zones.find((z) => z.id === 'other');
  assert.equal(other.label, 'Overig');
  assert.equal(L.roleDept.get('data-scientist'), 'other');
});

const session = (id, projectKey, extra = {}) => ({ kind: 'session', id, sessionId: id, projectKey, project: projectKey.split('/').pop(), status: 'working', startedAt: Number(id.replace(/\D/g, '')) || 0, ...extra });

test('cases: 10x role, own view, meeting, shipped, flex and the CEO left out', () => {
  const agents = [
    session('s1', '/p/a'), session('s2', '/p/a'), session('s3', '/p/b'), session('s4', '/p/c'),
    { ...session('ceo1', '/p'), ceo: true, room: 'ceo' },
    { kind: 'subagent', id: 'x1', parentId: 's1', projectKey: '/p/a' },
  ];
  const tenx = {
    '/p/a': { flavor: 'plus', phase: 5, roles: { s1: { role: 'sde', guessed: false } }, sessions: { s2: { phase: 0, complete: false } } },
    '/p/b': { flavor: 'plus', phase: 7, complete: true, roles: {} },
  };
  const cases = deriveCases(agents, tenx);
  assert.deepEqual(cases.map((c) => c.key), ['session:s1', 'session:s2', 'session:s3', 'session:s4']);
  const [c1, c2, c3, c4] = cases;
  assert.equal(c1.role, 'sde');
  assert.equal(c1.guessed, false);
  assert.equal(c1.subagents.length, 1);
  assert.equal(c2.meeting, true, 'a fresh session view is in the meeting room');
  assert.equal(c2.role, 'product-manager');
  assert.equal(c3.shipped, true);
  assert.equal(c4.kind, 'flex');
});

test('cases: no exact role → default role of the phase; meeting role → meeting', () => {
  const tenx = { '/p/a': { flavor: 'plus', phase: 3, roles: {} }, '/p/b': { flavor: 'plus', phase: 4, roles: { s2: { role: 'meeting' } } } };
  const [a, b] = deriveCases([session('s1', '/p/a'), session('s2', '/p/b')], tenx);
  assert.equal(a.role, 'architect');
  assert.equal(a.guessed, true);
  assert.equal(b.meeting, true);
});

test('stableSlots keeps indexes, fills gaps and overflows', () => {
  const first = stableSlots(new Map(), ['a', 'b'], 2);
  assert.deepEqual([...first.slots], [['a', 0], ['b', 1]]);
  const second = stableSlots(first.slots, ['b', 'c', 'd'], 2);
  assert.deepEqual([...second.slots], [['b', 1], ['c', 0]]);
  assert.deepEqual(second.overflow, ['d']);
});

const tenxCase = (key, role, extra = {}) => ({ key, kind: 'tenx', role, meeting: false, shipped: false, ...extra });

test('staffing: a colleague for the second project in one role, a pile for the third', () => {
  const staff = createStaffing();
  const r = staff.assign([tenxCase('a', 'sde'), tenxCase('b', 'sde'), tenxCase('c', 'sde'), tenxCase('d', 'qa')]);
  assert.deepEqual(r.place.get('a'), { role: 'sde', slot: 0, pile: false, meeting: false, table: undefined });
  assert.equal(r.place.get('b').slot, 1);
  assert.equal(r.place.get('c').pile, true);
  assert.deepEqual(r.piles.get('sde'), ['c']);
  assert.equal(r.place.get('d').slot, 0);
});

test('staffing: slots stay stable and a role change is reported as a move', () => {
  const staff = createStaffing();
  staff.assign([tenxCase('a', 'sde'), tenxCase('b', 'sde')]);
  const r = staff.assign([tenxCase('a', 'qa'), tenxCase('b', 'sde')]);
  assert.equal(r.place.get('b').slot, 1, 'b keeps the colleague desk');
  assert.equal(r.place.get('a').slot, 0);
  assert.equal(r.moves.length, 1);
  assert.equal(r.moves[0].from.role, 'sde');
  assert.equal(r.moves[0].to.role, 'qa');
  // shipped and gone cases free their slot
  const r2 = staff.assign([tenxCase('a', 'qa', { shipped: true }), tenxCase('c', 'sde')]);
  assert.equal(r2.place.has('a'), false);
  assert.equal(r2.place.get('c').slot, 0);
});

test('staffing: meeting cases get a table and the PM pool; flex cases a desk', () => {
  const staff = createStaffing();
  const r = staff.assign([
    tenxCase('m1', 'product-manager', { meeting: true }), tenxCase('m2', 'product-manager', { meeting: true }),
    tenxCase('m3', 'product-manager', { meeting: true }), tenxCase('m4', 'product-manager', { meeting: true }),
    { key: 'f1', kind: 'flex' }, { key: 'f2', kind: 'flex' },
  ], { flexCapacity: 1 });
  assert.equal(r.place.get('m1').table, 0);
  assert.equal(r.place.get('m3').table, 2);
  assert.equal(r.tableOverflow, 1);
  assert.equal(r.place.get('m2').slot, 1);
  assert.equal(r.flex.get('f1'), 0);
  assert.equal(r.flexOverflow, 1);
  // leaving the meeting for the PM's desk is a move too
  const r2 = staff.assign([tenxCase('m1', 'product-manager')]);
  assert.equal(r2.moves[0].from.meeting, true);
  assert.equal(r2.moves[0].to.meeting, false);
});

test('project colours are handed out in order and stay put', () => {
  const color = createProjectColors();
  assert.equal(color('/a'), PROJECT_COLORS[0]);
  assert.equal(color('/b'), PROJECT_COLORS[1]);
  assert.equal(color('/a'), PROJECT_COLORS[0]);
});

test('unknownRoles and shortName', () => {
  assert.deepEqual(unknownRoles([tenxCase('a', 'sde'), tenxCase('b', 'data-scientist'), tenxCase('c', 'x', { shipped: true })], null), ['data-scientist']);
  assert.equal(shortName('Visual Agents Office'), 'Visual …');
  assert.equal(shortName('Aruba'), 'Aruba');
});
