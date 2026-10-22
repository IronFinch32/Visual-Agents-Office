import { createBuilding } from './building.js';
import { minutesSince } from './sprites.js';
import { parseMarkdown } from './markdown.js';

const $ = (id) => document.getElementById(id);
const building = createBuilding($('building'), { banner: $('banner'), backButton: $('back'), onRoleClick: showDecision, onHover: showHover });
const STATUS_LABEL = { working: 'werkt', waiting: 'wacht op jou', done: 'klaar', idle: 'idle' };
const ORDER = { waiting: 0, working: 1, done: 2, idle: 3 };

let agents = [];
let tenx = {};
let decision = null; // { project, role, file, text } shown at the top of the panel
const ROLE_LABEL = {
  cto: 'CTO', 'product-manager': 'Product Manager', 'ux-designer': 'UX Designer', 'ui-designer': 'UI Designer', architect: 'Architect', 'staff-engineer': 'Staff Engineer',
  'engineering-manager': 'Engineering Manager', 'senior-engineer': 'Senior Engineer', sde: 'SDE', dba: 'DBA',
  qa: 'QA Engineer', security: 'Security Engineer', devops: 'DevOps Engineer', sre: 'SRE',
  'product-marketing-manager': 'Product Marketing Manager', 'sales-lead': 'Sales Lead',
  'customer-success-manager': 'Customer Success Manager', 'legal-counsel': 'Legal Counsel', cfo: 'CFO',
};
let roleTitles = new Map(); // role -> title from the plugin's departments.json
const roleName = (role) => roleTitles.get(role) || ROLE_LABEL[role] || role;

/** Hover label next to the cursor for a person or department in the company (ADR-019). */
function showHover(info, x, y) {
  const box = $('hover');
  if (!info) { box.hidden = true; return; }
  const rows = [el('div', 'hover-title', info.title)];
  if (info.kind === 'zone') rows.push(el('div', 'hover-muted', info.hint));
  else {
    if (info.project) {
      const line = el('div', 'hover-project');
      const sw = el('span', 'swatch');
      if (info.color) sw.style.background = info.color;
      line.append(sw, document.createTextNode(info.project));
      rows.push(line);
    }
    const status = [info.status, info.task].filter(Boolean).join(' · ');
    if (status) rows.push(el('div', 'hover-muted', status));
    if (info.clickable) rows.push(el('div', 'hover-hint', 'Klik: laatste beslissing'));
  }
  box.replaceChildren(...rows);
  box.hidden = false;
  const pad = 14;
  const w = box.offsetWidth, h = box.offsetHeight;
  box.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, x + pad))}px`;
  box.style.top = `${Math.max(8, y + pad + h > innerHeight - 8 ? y - h - pad : y + pad)}px`;
}

/** Decision markdown as DOM: never innerHTML, the file is just text. */
function decisionBody(text) {
  const body = el('div', 'decision-body');
  const inline = (node, spans) => {
    for (const sp of spans) node.append(sp.bold ? el('strong', null, sp.t) : sp.code ? el('code', null, sp.t) : document.createTextNode(sp.t));
    return node;
  };
  for (const b of parseMarkdown(text)) {
    if (b.type === 'h') body.append(inline(el('div', `md-h md-h${Math.min(b.level, 3)}`), b.spans));
    else if (b.type === 'li') { const li = inline(el('div', 'md-li'), b.spans); li.style.marginLeft = `${b.depth * 12}px`; body.append(li); }
    else if (b.type === 'code') body.append(el('pre', 'md-code', b.text));
    else body.append(inline(el('p', 'md-p'), b.spans));
  }
  return body;
}

/** Make a list item act like a button (click and Enter/Space). */
function clickable(node, fn) {
  node.tabIndex = 0;
  node.classList.add('clickable');
  node.addEventListener('click', fn);
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}

async function showDecision(project, role) {
  try {
    const res = await fetch(`/api/decision?project=${encodeURIComponent(project)}&role=${encodeURIComponent(role)}`);
    const d = res.ok ? await res.json() : { text: '' };
    decision = { project, role, file: d.file, text: d.text };
  } catch {
    decision = { project, role, file: null, text: '' };
  }
  $('panel').classList.remove('hidden');
  renderPanel();
}
let skew = 0;
let soundOn = false;
let audio = null;
const wasWaiting = new Set();

function readPref(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function chime() {
  if (!soundOn || !audio) return;
  const t = audio.currentTime;
  for (const [i, f] of [[0, 880], [1, 1320]]) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'square';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.15);
    g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.15 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.14);
    o.connect(g).connect(audio.destination);
    o.start(t + i * 0.15);
    o.stop(t + i * 0.15 + 0.15);
  }
}

function setSound(on) {
  soundOn = on;
  if (on && !audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  $('sound').textContent = on ? '🔔 Geluid aan' : '🔕 Geluid uit';
  $('sound').setAttribute('aria-pressed', String(on));
  writePref('vao-sound', on ? '1' : '0');
}

function card(a, now) {
  const li = el('li', `card ${a.status}${a.kind === 'subagent' ? ' sub' : ''}`);
  const row = el('div', 'row');
  row.append(el('span', `dot ${a.status}`), el('span', 'name', a.kind === 'session' ? (a.title || (a.ceo ? 'CEO' : 'Manager')) : a.name));
  if (a.source) row.append(el('span', `src ${a.source}`, a.source));
  row.append(el('span', 'status', `${STATUS_LABEL[a.status] || a.status} · ${minutesSince(a.statusSince, now)}`));
  li.append(row);
  if (a.status === 'waiting') li.append(el('div', 'reason', a.waitingReason || 'Wacht op je input'));
  if (a.task) li.append(el('div', 'task', a.task));
  if (a.activity && a.status !== 'waiting') li.append(el('div', 'activity', a.activity));
  if (a.kind === 'session' && a.cwd) li.title = a.cwd;
  clickable(li, () => building.focus(a.room || a.projectKey));
  li.dataset.focusKey = `a:${a.id}`;
  return li;
}

function renderPanel() {
  const now = Date.now() - skew;
  const list = $('list');
  const focused = list.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
  list.replaceChildren();
  if (decision) {
    const li = el('li', 'card decision');
    const row = el('div', 'row');
    row.append(el('span', 'name', `Beslissing · ${roleName(decision.role)}`));
    const close = el('button', 'close', '✕');
    close.type = 'button';
    close.title = 'Sluiten';
    close.setAttribute('aria-label', 'Beslissing sluiten');
    close.addEventListener('click', () => { decision = null; renderPanel(); });
    row.append(close);
    li.append(row, el('div', 'task', decision.file ? `.10x/decisions/${decision.role}/${decision.file}` : 'Nog geen beslissing van deze rol.'));
    if (decision.text) li.append(decisionBody(decision.text));
    list.append(li);
  }
  for (const [key, tx] of Object.entries(tenx)) {
    if (!tx.gate) continue;
    const li = el('li', 'card waiting gate-card');
    li.append(el('div', 'name', `⚠ Gate overgeslagen · ${key.split('/').pop()}`), el('div', 'reason', tx.gate.reason));
    list.append(li);
  }
  const projects = new Map();
  for (const a of agents) {
    const key = a.room || a.projectKey || 'unknown';
    if (!projects.has(key)) projects.set(key, { key, name: key === 'ceo' ? 'CEO-verdieping' : a.project || key, title: a.projectKey, agents: [] });
    projects.get(key).agents.push(a);
  }
  const rank = (p) => Math.min(...p.agents.map((a) => ORDER[a.status] ?? 9));
  for (const p of [...projects.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))) {
    const head = el('li', 'project');
    head.append(el('span', null, p.name), el('span', null, `${p.agents.length} agent${p.agents.length === 1 ? '' : 's'}`));
    head.title = `${p.title || p.key} — klik om op te lichten`;
    clickable(head, () => building.focus(p.key));
    head.dataset.focusKey = `p:${p.key}`;
    list.append(head);
    const sessions = p.agents.filter((a) => a.kind === 'session')
      .sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || (a.startedAt - b.startedAt));
    for (const s of sessions) {
      list.append(card(s, now));
      for (const sub of p.agents.filter((a) => a.parentId === s.id).sort((a, b) => a.startedAt - b.startedAt)) {
        list.append(card(sub, now));
      }
    }
  }

  // the list is rebuilt on every snapshot: keep keyboard focus on the same card
  if (focused) [...list.querySelectorAll('[data-focus-key]')].find((n) => n.dataset.focusKey === focused)?.focus();

  const counts = { waiting: 0, working: 0, done: 0, idle: 0 };
  for (const a of agents) counts[a.status] = (counts[a.status] || 0) + 1;
  const c = $('counts');
  c.replaceChildren();
  for (const k of ['waiting', 'working', 'done', 'idle']) {
    if (!counts[k] && k !== 'waiting') continue;
    const span = el('span', counts[k] ? 'count' : 'count zero');
    span.append(el('span', `dot ${k}`), document.createTextNode(`${counts[k]} ${STATUS_LABEL[k]}`));
    c.append(span);
  }
  document.title = counts.waiting ? `(${counts.waiting}) wacht — Visual Agents Office` : 'Visual Agents Office';
  $('empty').hidden = agents.length > 0;
}

function onSnapshot(data) {
  agents = Array.isArray(data.agents) ? data.agents : [];
  skew = Date.now() - (data.now || Date.now());
  let newlyWaiting = false;
  const waitingNow = new Set(agents.filter((a) => a.status === 'waiting').map((a) => a.id));
  for (const id of waitingNow) if (!wasWaiting.has(id)) newlyWaiting = true;
  wasWaiting.clear();
  for (const id of waitingNow) wasWaiting.add(id);
  tenx = data.tenx || {};
  roleTitles = new Map((data.departments?.departments || []).flatMap((d) => d.roles.map((r) => [r.role, r.title])).filter(([r, t]) => t && t !== r));
  building.setAgents(agents, data.now, tenx, data.departments || null);
  renderPanel();
  if (newlyWaiting) chime();
}

function connect() {
  const es = new EventSource('/stream');
  es.addEventListener('snapshot', (e) => {
    try { onSnapshot(JSON.parse(e.data)); } catch (err) { console.error('Bad snapshot', err); }
  });
  es.onopen = () => { $('offline').hidden = true; };
  es.onerror = () => { $('offline').hidden = false; };
}

$('sound').addEventListener('click', () => setSound(!soundOn));

// Legend (ux-polish): what the colours mean and how to zoom and click.
function setHelp(open) {
  $('help').hidden = !open;
  $('helpToggle').setAttribute('aria-expanded', String(open));
  (open ? $('helpClose') : $('helpToggle')).focus();
}
$('helpToggle').addEventListener('click', (e) => { e.stopPropagation(); setHelp($('help').hidden); });
$('helpClose').addEventListener('click', () => setHelp(false));
document.addEventListener('click', (e) => { if (!$('help').hidden && !$('help').contains(e.target)) setHelp(false); });
// capture: closing the legend wins over the building's Escape (zoom out, unfocus)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('help').hidden) { e.preventDefault(); e.stopImmediatePropagation(); setHelp(false); }
  else if (e.key === '?' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) setHelp($('help').hidden);
}, true);
$('panelToggle').addEventListener('click', () => {
  const hidden = $('panel').classList.toggle('hidden');
  writePref('vao-panel', hidden ? '0' : '1');
});
if (readPref('vao-panel', '1') === '0') $('panel').classList.add('hidden');
// Browsers only allow audio after a user gesture, so restore the preference on first click.
if (readPref('vao-sound', '0') === '1') {
  $('sound').textContent = '🔔 Klik om geluid te activeren';
  document.addEventListener('click', () => { if (!soundOn) setSound(true); }, { once: true });
}
setInterval(renderPanel, 30_000); // keep "wacht 3m" timers fresh

document.fonts?.ready.finally(connect) ?? connect();
