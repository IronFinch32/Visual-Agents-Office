// The building: one room per project, laid out to fit the screen, with click-to-focus.
// With a CEO session (ADR-009) a CEO floor spans the top and every 10x work session has its own room.
import { createRoom } from './room.js';
import { createTenxRoom } from './tenx-room.js';
import { createCeoFloor } from './ceo-floor.js';
import { createCompany } from './company.js';
import { deriveCases } from './company-model.js';
import { DEPTS, phasesFor } from './tenx-sprites.js';
import { timePhase } from './sprites.js';

const timeOverride = new URLSearchParams(location.search).get('tijd') || '';
const phase = () => timePhase(new Date(), timeOverride);

const GAP = 16;
const PAD = 16;
const HEADER_H = 30; // room header + borders, in CSS px
const BORDER = 6;

const STATUS_ICON = { waiting: '!', working: '●', done: '✓', idle: 'z' };
const FLOOR = 'ceo';
const COMPANY = 'company';
// One company with departments (ADR-016); ?weergave=kamers keeps the old room per project/session.
const ROOMS_VIEW = new URLSearchParams(location.search).get('weergave') === 'kamers';
const FLOOR_MAX_SHARE = 0.3; // of the building height

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** Board line on the CEO floor: "Phase 3 Design" or SHIPPED. */
function phaseText(tx) {
  if (tx.complete) return 'SHIPPED';
  if (tx.phase == null) return 'Phase ?';
  const name = tx.active?.phaseName || DEPTS[phasesFor(tx.flavor).depts[tx.phase]]?.label || '';
  return `Phase ${tx.phase} ${name}`.trim();
}

export function createBuilding(container, { banner, backButton, onRoleClick, onHover } = {}) {
  const rooms = new Map(); // room key -> { el, room, title, counts, name, projectKey, waiting }
  const order = []; // team rooms; the CEO floor is laid out on its own
  let present = new Set();
  let focusKey = null;
  let last = performance.now();

  function makeRoom(key, name, projectKey) {
    const floor = key === FLOOR;
    const section = el('section', floor ? 'room floor' : 'room');
    section.dataset.key = key;
    section.title = floor ? 'CEO-verdieping' : projectKey;
    const header = el('header');
    const title = el('span', 'room-title', floor ? 'CEO-verdieping' : name);
    const counts = el('span', 'room-counts');
    header.append(title, counts);
    const canvas = el('canvas');
    canvas.setAttribute('aria-label', floor ? 'CEO-verdieping' : `Kantoor ${name}`);
    section.append(header, canvas);
    section.addEventListener('click', () => focus(focusKey === key ? null : key));
    const entry = { el: section, canvas, title, counts, name: floor ? 'CEO' : name, projectKey, waiting: false };
    if (floor) {
      // The floor sits on top, on a row of its own.
      entry.extra = el('div', 'floor-break');
      container.prepend(section, entry.extra);
      entry.room = createCeoFloor(canvas, { phase, onFocus: (k) => focus(k) });
    } else if (key === COMPANY) {
      title.textContent = 'Bedrijf';
      section.title = 'Eén bedrijf met afdelingen';
      canvas.setAttribute('aria-label', 'Bedrijf met afdelingen; wie aan welk project werkt staat ook in de lijst');
      entry.name = 'Bedrijf';
      container.append(section);
      // zoom controls in the header (ADR-019); they never toggle the building focus
      const bar = el('span', 'zoombar');
      const zbtn = (text, label, fn) => {
        const b = el('button', 'zoom-btn', text);
        b.type = 'button';
        b.title = label;
        b.setAttribute('aria-label', label);
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        bar.append(b);
        return b;
      };
      zbtn('−', 'Uitzoomen (-)', () => entry.room.zoomBy(1 / 1.5));
      zbtn('+', 'Inzoomen (+)', () => entry.room.zoomBy(1.5));
      const whole = zbtn('Heel bedrijf', 'Heel bedrijf tonen (0)', () => entry.room.resetZoom());
      whole.hidden = true;
      header.insertBefore(bar, counts);
      entry.room = createCompany(canvas, {
        phase,
        onRoleClick: (project, role) => onRoleClick?.(project, role),
        onHover,
        onZoomChange: (zoomed) => { whole.hidden = !zoomed; section.classList.toggle('zoomed', zoomed); },
        onWantFocus: () => { if (focusKey !== COMPANY) focus(COMPANY); },
      });
      order.push(key);
    } else {
      container.append(section);
      entry.room = createRoom(canvas, { phase });
      order.push(key);
    }
    rooms.set(key, entry);
    return entry;
  }

  const removeRoom = (key) => {
    const r = rooms.get(key);
    r.el.remove();
    r.extra?.remove();
    rooms.delete(key);
    if (order.includes(key)) order.splice(order.indexOf(key), 1);
  };

  // A project in 10x mode gets the department office; switching type swaps the canvas.
  function ensureType(key, r, wantTenx) {
    if ((r.room.kind === 'tenx') === wantTenx) return;
    const canvas = el('canvas');
    canvas.setAttribute('aria-label', `Kantoor ${r.name}`);
    r.canvas.replaceWith(canvas);
    r.canvas = canvas;
    r.room = wantTenx
      ? createTenxRoom(canvas, { phase, onRoleClick: (role) => onRoleClick?.(r.projectKey, role) })
      : createRoom(canvas, { phase });
  }

  function setAgents(list, serverNow, tenx = {}, departments = null) {
    if (!ROOMS_VIEW) return setCompany(list, serverNow, tenx, departments);
    const groups = new Map();
    for (const a of list) {
      const key = a.room || a.projectKey || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    present = new Set(groups.keys());
    const hadFloor = rooms.has(FLOOR);
    for (const [key, group] of groups) {
      const projectKey = group[0].projectKey || key;
      const name = group.find((a) => a.project)?.project || key;
      if (!rooms.has(key)) {
        makeRoom(key, name, projectKey);
        // the CEO hands a new work session its folder
        if (hadFloor && key.startsWith('session:')) rooms.get(FLOOR).room.handoff();
      }
      rooms.get(key).projectKey = projectKey;
    }
    const floorOn = present.has(FLOOR);
    const board = [];
    for (const [key, r] of rooms) {
      const group = groups.get(key) || [];
      if (key === FLOOR) { r.room.setAgents(group, serverNow); continue; }
      // A work session that doesn't own the project's live state shows its own fresh or frozen view (ADR-015).
      const own = key.startsWith('session:') && tenx[r.projectKey]?.sessions?.[key.slice('session:'.length)];
      const tx = own ? { ...tenx[r.projectKey], ...own } : tenx[r.projectKey];
      ensureType(key, r, !!tx);
      r.room.setAgents(group, serverNow);
      r.room.setTenx?.(tx);
      r.room.setFloor?.(floorOn);
      r.el.classList.toggle('gate', !!tx?.gate);
      const c = { waiting: 0, working: 0, done: 0, idle: 0 };
      for (const a of group) c[a.status] = (c[a.status] || 0) + 1;
      r.waiting = c.waiting > 0;
      r.el.classList.toggle('waiting', r.waiting);
      if (key.startsWith('session:')) {
        const project = group.find((a) => a.project)?.project || r.name.split(' · ')[0];
        r.name = tx?.active?.feature ? `${project} · ${tx.active.feature}` : project;
        r.title.textContent = r.name;
        if (present.has(key) && tx) board.push({ key, label: r.name, phase: phaseText(tx), status: r.waiting ? 'waiting' : tx.complete ? 'shipped' : 'working' });
      }
      r.counts.replaceChildren();
      if (tx) {
        const label = tx.complete ? `${tx.flavor === 'plus' ? '10x+' : '10x'} · klaar` : `${tx.flavor === 'plus' ? '10x+' : '10x'} · fase ${tx.phase ?? '?'}${tx.phase != null ? ` ${DEPTS[phasesFor(tx.flavor).depts[tx.phase]]?.label ?? ''}` : ''}`;
        r.counts.append(el('span', 'chip tenx', label));
      }
      for (const k of ['waiting', 'working', 'done']) {
        if (!c[k]) continue;
        const chip = el('span', `chip ${k}`, `${STATUS_ICON[k]} ${c[k]}`);
        r.counts.append(chip);
      }
    }
    rooms.get(FLOOR)?.room.setRooms(board);
    container.classList.toggle('alert', [...rooms.values()].some((r) => r.waiting));
    if (focusKey && !rooms.has(focusKey)) focus(null);
    updateBanner();
    layout();
  }

  // Company view: the CEO floor (if any) on top, one company below with every other agent.
  function setCompany(list, serverNow, tenx, departments) {
    const ceoAgents = list.filter((a) => a.room === FLOOR);
    const rest = list.filter((a) => a.room !== FLOOR);
    const hadFloor = rooms.has(FLOOR);
    present = new Set([COMPANY, ...(ceoAgents.length ? [FLOOR] : [])]);
    if (ceoAgents.length && !hadFloor) makeRoom(FLOOR, 'CEO', FLOOR);
    if (!rooms.has(COMPANY)) makeRoom(COMPANY, 'Bedrijf', COMPANY);
    const company = rooms.get(COMPANY);
    company.room.setData(rest, tenx, departments, serverNow);
    const cases = deriveCases(rest, tenx);
    const known = new Set(prevCaseKeys);
    prevCaseKeys = new Set(cases.map((c) => c.key));
    if (hadFloor && cases.some((c) => c.kind === 'tenx' && !known.has(c.key)) && known.size) rooms.get(FLOOR).room.handoff();
    const board = [];
    for (const c of cases) {
      if (c.kind !== 'tenx') continue;
      const tx = { ...tenx[c.projectKey], ...(tenx[c.projectKey]?.sessions?.[c.sessionId] || {}) };
      const label = c.feature ? `${c.project} · ${c.feature}` : c.project;
      board.push({ key: c.key, label, phase: phaseText(tx), color: company.room.colorOf(c.projectKey), status: c.status === 'waiting' ? 'waiting' : tx.gate ? 'waiting' : c.shipped ? 'shipped' : 'working', gate: !!tx.gate });
    }
    rooms.get(FLOOR)?.room.setAgents(ceoAgents, serverNow);
    rooms.get(FLOOR)?.room.setRooms(board);
    const c = { waiting: 0, working: 0, done: 0, idle: 0 };
    for (const a of rest) c[a.status] = (c[a.status] || 0) + 1;
    company.waiting = c.waiting > 0;
    company.el.classList.toggle('waiting', company.waiting);
    company.el.classList.toggle('gate', cases.some((x) => x.gate));
    company.counts.replaceChildren();
    const projects = new Set(cases.map((x) => x.projectKey)).size;
    if (projects) company.counts.append(el('span', 'chip tenx', `${projects} project${projects === 1 ? '' : 'en'}`));
    for (const k of ['waiting', 'working', 'done']) if (c[k]) company.counts.append(el('span', `chip ${k}`, `${STATUS_ICON[k]} ${c[k]}`));
    if (rooms.has(FLOOR)) rooms.get(FLOOR).waiting = ceoAgents.some((a) => a.status === 'waiting');
    container.classList.toggle('alert', [...rooms.values()].some((r) => r.waiting));
    if (focusKey && !rooms.has(focusKey)) focus(null);
    updateBanner();
    layout();
  }
  let prevCaseKeys = new Set();

  const sizeCanvas = (k, { W, H }, s) => {
    const canvas = rooms.get(k).el.querySelector('canvas');
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
  };

  // Find the largest scale at which all visible rooms fit, wrapping like flexbox.
  function layout() {
    const keys = focusKey ? [focusKey] : order;
    const cw = container.clientWidth - PAD * 2;
    let ch = container.clientHeight - PAD * 2 - 2; // a little slack against rounding
    // The CEO floor spans the width on top; the team rooms share the height that's left.
    if (!focusKey && rooms.has(FLOOR)) {
      const size = rooms.get(FLOOR).room.size();
      const share = keys.length ? FLOOR_MAX_SHARE : 1;
      const s = Math.max(0.3, Math.min((cw - BORDER) / size.W, (ch * share - HEADER_H) / size.H));
      sizeCanvas(FLOOR, size, s);
      ch -= size.H * s + HEADER_H + GAP;
    }
    if (!keys.length) return;
    const sizes = keys.map((k) => rooms.get(k).room.size());
    const fits = (s) => {
      let x = 0, rowH = 0, total = 0;
      for (const { W, H } of sizes) {
        const w = W * s + BORDER;
        const h = H * s + HEADER_H;
        if (w > cw) return false;
        if (x > 0 && x + GAP + w > cw) { total += rowH + GAP; x = 0; rowH = 0; }
        x += (x > 0 ? GAP : 0) + w;
        rowH = Math.max(rowH, h);
      }
      return total + rowH <= ch;
    };
    let lo = 0.3, hi = 8;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    const s = lo >= 4 ? Math.floor(lo) : lo; // integer scales keep big pixels crisp
    keys.forEach((k, i) => sizeCanvas(k, sizes[i], s));
  }

  function focus(key) {
    // In the company view a project or work session isn't a room: light it up instead (ADR-016).
    if (!ROOMS_VIEW && key && key !== FLOOR && key !== COMPANY) {
      rooms.get(COMPANY)?.room.highlight(key);
      if (focusKey === FLOOR) focus(null);
      return;
    }
    if (!key) rooms.get(COMPANY)?.room.resetZoom?.();
    // FLIP: remember where rooms were, change the layout, then animate from old to new.
    const before = new Map([...rooms].map(([k, r]) => [k, r.el.getBoundingClientRect()]));
    focusKey = key;
    container.classList.toggle('focused', !!key);
    for (const [k, r] of rooms) r.el.classList.toggle('focus', k === key);
    if (backButton) backButton.hidden = !key;
    updateBanner();
    layout();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [k, r] of rooms) {
      const to = r.el.getBoundingClientRect();
      const from = before.get(k);
      if (!to.width) continue;
      if (!from || !from.width) {
        r.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
        continue;
      }
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const sx = from.width / to.width;
      const sy = from.height / to.height;
      r.el.animate([
        { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: 'top left', transform: 'none' },
      ], { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    }
  }

  function updateBanner() {
    if (!banner) return;
    const others = focusKey ? [...rooms].filter(([k, r]) => k !== focusKey && r.waiting) : [];
    banner.hidden = others.length === 0;
    banner.replaceChildren(document.createTextNode('Wacht op jou in: '));
    others.forEach(([k, r], i) => {
      const b = el('button', 'banner-link', r.name);
      b.type = 'button';
      b.addEventListener('click', () => focus(k));
      if (i) banner.append(document.createTextNode(' · '));
      banner.append(b);
    });
  }

  function tick(nowMs) {
    requestAnimationFrame(tick); // schedule first: one failing room must not stop the whole building
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const t = nowMs / 1000;
    let removed = false;
    for (const [key, r] of rooms) {
      try {
        r.room.frame(t, dt);
      } catch (err) {
        if (!r.failed) console.error(`Kantoor ${key} kon niet tekenen`, err);
        r.failed = true;
      }
      if (!present.has(key) && r.room.isEmpty()) {
        removeRoom(key);
        removed = true;
      }
    }
    if (removed) {
      if (focusKey && !rooms.has(focusKey)) focus(null); else layout();
    }
  }

  new ResizeObserver(() => layout()).observe(container);
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
    const company = !ROOMS_VIEW && rooms.get(COMPANY)?.room;
    if (e.key === 'Escape') {
      if (company?.isZoomed()) company.resetZoom();
      else if (focusKey) focus(null);
      return;
    }
    if (!company) return;
    if (e.key === '+' || e.key === '=') company.zoomBy(1.5);
    else if (e.key === '-') company.zoomBy(1 / 1.5);
    else if (e.key === '0') company.resetZoom();
  });
  backButton?.addEventListener('click', () => focus(null));
  requestAnimationFrame(tick);

  if (/[?&]debug\b/.test(location.search)) window.__vaoRooms = rooms; // inspect from the console
  return { setAgents, focus, roomCount: () => rooms.size };
}
