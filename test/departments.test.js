import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDepartments, loadDepartments, departmentsSource } from '../server/departments.js';

const contract = {
  version: 1,
  phases: [{ phase: 0, name: 'Brainstorming' }],
  departments: [
    { id: 'meeting', name: 'Meeting Room', phases: [0], roles: [] },
    { id: 'strategy', name: 'Strategy', phases: [1], roles: [{ role: 'cto', skill: 'cto', title: 'CTO' }] },
  ],
};

test('sanitize keeps a valid contract', () => {
  const d = sanitizeDepartments(contract);
  assert.deepEqual(d.departments.map((x) => x.id), ['meeting', 'strategy']);
  assert.deepEqual(d.departments[1].roles, [{ role: 'cto', title: 'CTO' }]);
});

test('sanitize drops bad ids, duplicate roles, control characters and caps sizes', () => {
  const d = sanitizeDepartments({
    version: 1,
    departments: [
      { id: 'Bad Id', roles: [{ role: 'x' }] },
      { id: 'growth', name: 'Gr\u0007owth'.padEnd(80, '!'), phases: [9, 'x', -1], roles: [{ role: 'cto' }, { role: 'cto' }, { role: '<script>' }, { role: 'meeting' }, ...Array.from({ length: 10 }, (_, i) => ({ role: `r${i}` }))] },
    ],
  });
  assert.equal(d.departments[0].id, 'meeting', 'meeting is added when missing');
  const g = d.departments[1];
  assert.equal(g.id, 'growth');
  assert.equal(g.name.length, 40);
  assert.ok(!/\u0007/.test(g.name));
  assert.deepEqual(g.phases, [9]);
  assert.equal(g.roles.length, 6);
  assert.deepEqual(g.roles.slice(0, 2).map((r) => r.role), ['cto', 'r0']);
});

test('sanitize rejects other versions and contracts without roles', () => {
  assert.equal(sanitizeDepartments({ ...contract, version: 2 }), null);
  assert.equal(sanitizeDepartments({ version: 1, departments: [{ id: 'meeting', roles: [] }] }), null);
  assert.equal(sanitizeDepartments(null), null);
});

test('load: TENX_DEPARTMENTS wins, then installed_plugins.json (newest)', () => {
  const files = {
    '/env/departments.json': JSON.stringify(contract),
    '/home/.claude/plugins/installed_plugins.json': JSON.stringify({
      plugins: {
        '10x-Team-Plus@local': [
          { installPath: '/old', lastUpdated: '2026-01-01' },
          { installPath: '/new', lastUpdated: '2026-10-01' },
        ],
        'other@x': [{ installPath: '/other', lastUpdated: '2027-01-01' }],
      },
    }),
    '/new/departments.json': JSON.stringify({ ...contract, departments: [...contract.departments, { id: 'ops', roles: [{ role: 'sre' }] }] }),
  };
  const readText = (p) => files[p] ?? '';
  assert.equal(loadDepartments({ env: { TENX_DEPARTMENTS: '/env/departments.json' }, home: '/home', readText }).departments.length, 2);
  assert.equal(loadDepartments({ env: {}, home: '/home', readText }).departments.length, 3);
  assert.equal(loadDepartments({ env: {}, home: '/nobody', readText }), null);
  assert.equal(loadDepartments({ env: { TENX_DEPARTMENTS: '/env/broken' }, home: '/home', readText: () => '{nope' }), null);
});

test('source caches and re-reads after the ttl', () => {
  let reads = 0;
  let t = 0;
  const get = departmentsSource({ ttl: 1000, now: () => t, env: { TENX_DEPARTMENTS: '/f' }, home: '/h', readText: () => { reads++; return JSON.stringify(contract); } });
  get(); get();
  assert.equal(reads, 1);
  t = 1500;
  get();
  assert.equal(reads, 2);
});
