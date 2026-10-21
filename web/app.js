import { createBuilding } from './building.js';
import { minutesSince } from './sprites.js';

const $ = (id) => document.getElementById(id);
const building = createBuilding($('building'), { banner: $('banner'), backButton: $('back'), onRoleClick: showDecision });
const STATUS_LABEL = { working: 'werkt', waiting: 'wacht op jou', done: 'klaar', idle: 'idle' };
const ORDER = { waiting: 0, working: 1, done: 2, idle: 3 };

let agents = [];
let tenx = {};
let decision = null; // { project, role, file, text } shown at the top of the panel
const ROLE_LABEL = {
  cto: 'CTO', 'product-manager': 'Product Manager', architect: 'Architect', 'staff-engineer': 'Staff Engineer',
  'engineering-manager': 'Engineering Manager', 'senior-engineer': 'Senior Engineer', sde: 'SDE', dba: 'DBA',
  qa: 'QA Engineer', security: 'Security Engineer', devops: 'DevOps Engineer', sre: 'SRE',
};

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
  return li;
}

function renderPanel() {
  const now = Date.now() - skew;
  const list = $('list');
  list.replaceChildren();
  if (decision) {
    const li = el('li', 'card decision');
    const row = el('div', 'row');
    row.append(el('span', 'name', `Beslissing · ${ROLE_LABEL[decision.role] || decision.role}`));
    const close = el('button', 'close', '✕');
    close.type = 'button';
    close.title = 'Sluiten';
    close.addEventListener('click', () => { decision = null; renderPanel(); });
    row.append(close);
    li.append(row, el('div', 'task', decision.file ? `.10x/decisions/${decision.role}/${decision.file}` : 'Nog geen beslissing van deze rol.'));
    if (decision.text) li.append(el('pre', 'decision-text', decision.text));
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
    head.title = p.title || p.key;
    head.addEventListener('click', () => building.focus(p.key));
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

  const counts = { waiting: 0, working: 0, done: 0, idle: 0 };
  for (const a of agents) counts[a.status] = (counts[a.status] || 0) + 1;
  const c = $('counts');
  c.replaceChildren();
  for (const k of ['waiting', 'working', 'done', 'idle']) {
    if (!counts[k] && k !== 'waiting') continue;
    const span = el('span', 'count');
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
  building.setAgents(agents, data.now, tenx);
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
