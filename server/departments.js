// The company's departments (ADR-016): read 10x-Team-Plus's departments.json (contract v1) so new
// departments and roles appear without a code change. Read-only; null means "use the built-in layout".
import { join } from 'node:path';

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_DEPTS = 16;
const MAX_ROLES = 6;
const MAX_TEXT = 40;

const text = (v) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, MAX_TEXT);

/** Keep only well-formed departments and roles; anything odd is dropped, not trusted. */
export function sanitizeDepartments(contract) {
  if (!contract || contract.version !== 1 || !Array.isArray(contract.departments)) return null;
  const seenDept = new Set();
  const seenRole = new Set();
  const departments = [];
  for (const d of contract.departments) {
    if (departments.length >= MAX_DEPTS) break;
    if (!d || !ID.test(d.id) || seenDept.has(d.id)) continue;
    seenDept.add(d.id);
    const roles = [];
    for (const r of Array.isArray(d.roles) ? d.roles : []) {
      if (roles.length >= MAX_ROLES) break;
      if (!r || !ID.test(r.role) || r.role === 'meeting' || seenRole.has(r.role)) continue;
      seenRole.add(r.role);
      roles.push({ role: r.role, title: text(r.title) || r.role });
    }
    const phases = (Array.isArray(d.phases) ? d.phases : []).filter((p) => Number.isInteger(p) && p >= 0 && p <= 20);
    departments.push({ id: d.id, name: text(d.name) || d.id, phases, roles: d.id === 'meeting' ? [] : roles });
  }
  if (!departments.some((d) => d.roles.length)) return null;
  if (!seenDept.has('meeting')) departments.unshift({ id: 'meeting', name: 'Meeting Room', phases: [0], roles: [] });
  return { version: 1, departments };
}

/** Find and read departments.json: TENX_DEPARTMENTS, then the installed 10x-Team-Plus plugin. */
export function loadDepartments({ env = process.env, home, readText }) {
  try {
    let file = env.TENX_DEPARTMENTS;
    if (!file) {
      const installed = JSON.parse(readText(join(home, '.claude', 'plugins', 'installed_plugins.json')) || '{}');
      const entries = Object.entries(installed.plugins || {})
        .filter(([key]) => key.startsWith('10x-Team-Plus@'))
        .flatMap(([, list]) => (Array.isArray(list) ? list : []))
        .filter((e) => typeof e?.installPath === 'string')
        .sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)));
      if (!entries.length) return null;
      file = join(entries[0].installPath, 'departments.json');
    }
    return sanitizeDepartments(JSON.parse(readText(file) || 'null'));
  } catch {
    return null;
  }
}

/** Cached loader: re-reads at most once per `ttl` ms (a plugin update moves the file). */
export function departmentsSource({ ttl = 60_000, now = () => Date.now(), ...opts }) {
  let value = null;
  let at = -Infinity;
  return () => {
    if (now() - at >= ttl) { value = loadDepartments(opts); at = now(); }
    return value;
  };
}
