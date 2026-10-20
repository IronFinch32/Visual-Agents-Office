// The building: one room per project, laid out to fit the screen, with click-to-focus.
import { createRoom } from './room.js';
import { createTenxRoom } from './tenx-room.js';
import { DEPTS, PHASE_DEPT } from './tenx-sprites.js';
import { timePhase } from './sprites.js';

const timeOverride = new URLSearchParams(location.search).get('tijd') || '';
const phase = () => timePhase(new Date(), timeOverride);

const GAP = 16;
const PAD = 16;
const HEADER_H = 30; // room header + borders, in CSS px
const BORDER = 6;

const STATUS_ICON = { waiting: '!', working: '●', done: '✓', idle: 'z' };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function createBuilding(container, { banner, backButton, onRoleClick } = {}) {
  const rooms = new Map(); // projectKey -> { el, room, title, counts, name, waiting }
  const order = [];
  let present = new Set();
  let focusKey = null;
  let last = performance.now();

  function makeRoom(key, name) {
    const section = el('section', 'room');
    section.dataset.key = key;
    section.title = key;
    const header = el('header');
    const title = el('span', 'room-title', name);
    const counts = el('span', 'room-counts');
    header.append(title, counts);
    const canvas = el('canvas');
    canvas.setAttribute('aria-label', `Kantoor ${name}`);
    section.append(header, canvas);
    section.addEventListener('click', () => focus(focusKey === key ? null : key));
    container.append(section);
    const entry = { el: section, canvas, room: createRoom(canvas, { phase }), title, counts, name, waiting: false };
    rooms.set(key, entry);
    order.push(key);
    return entry;
  }

  // A project in 10x mode gets the department office; switching type swaps the canvas.
  function ensureType(key, r, wantTenx) {
    if ((r.room.kind === 'tenx') === wantTenx) return;
    const canvas = el('canvas');
    canvas.setAttribute('aria-label', `Kantoor ${r.name}`);
    r.canvas.replaceWith(canvas);
    r.canvas = canvas;
    r.room = wantTenx
      ? createTenxRoom(canvas, { phase, onRoleClick: (role) => onRoleClick?.(key, role) })
      : createRoom(canvas, { phase });
  }

  function setAgents(list, serverNow, tenx = {}) {
    const groups = new Map();
    for (const a of list) {
      const key = a.projectKey || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    present = new Set(groups.keys());
    for (const [key, group] of groups) {
      const name = group.find((a) => a.project)?.project || key;
      if (!rooms.has(key)) makeRoom(key, name);
    }
    for (const [key, r] of rooms) {
      const group = groups.get(key) || [];
      ensureType(key, r, !!tenx[key]);
      r.room.setAgents(group, serverNow);
      r.room.setTenx?.(tenx[key]);
      r.el.classList.toggle('gate', !!tenx[key]?.gate);
      const c = { waiting: 0, working: 0, done: 0, idle: 0 };
      for (const a of group) c[a.status] = (c[a.status] || 0) + 1;
      r.waiting = c.waiting > 0;
      r.el.classList.toggle('waiting', r.waiting);
      r.counts.replaceChildren();
      const tx = tenx[key];
      if (tx) {
        const label = tx.complete ? '10x · klaar' : `10x · fase ${tx.phase ?? '?'}${tx.phase != null ? ` ${DEPTS[PHASE_DEPT[tx.phase]].label}` : ''}`;
        r.counts.append(el('span', 'chip tenx', label));
      }
      for (const k of ['waiting', 'working', 'done']) {
        if (!c[k]) continue;
        const chip = el('span', `chip ${k}`, `${STATUS_ICON[k]} ${c[k]}`);
        r.counts.append(chip);
      }
    }
    container.classList.toggle('alert', [...rooms.values()].some((r) => r.waiting));
    if (focusKey && !rooms.has(focusKey)) focus(null);
    updateBanner();
    layout();
  }

  // Find the largest scale at which all visible rooms fit, wrapping like flexbox.
  function layout() {
    const keys = focusKey ? [focusKey] : order;
    if (!keys.length) return;
    const cw = container.clientWidth - PAD * 2;
    const ch = container.clientHeight - PAD * 2;
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
    keys.forEach((k, i) => {
      const { el: section } = rooms.get(k);
      const canvas = section.querySelector('canvas');
      canvas.style.width = `${Math.floor(sizes[i].W * s)}px`;
      canvas.style.height = `${Math.floor(sizes[i].H * s)}px`;
    });
  }

  function focus(key) {
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
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const t = nowMs / 1000;
    let removed = false;
    for (const [key, r] of rooms) {
      r.room.frame(t, dt);
      if (!present.has(key) && r.room.isEmpty()) {
        r.el.remove();
        rooms.delete(key);
        order.splice(order.indexOf(key), 1);
        removed = true;
      }
    }
    if (removed) {
      if (focusKey && !rooms.has(focusKey)) focus(null); else layout();
    }
    requestAnimationFrame(tick);
  }

  new ResizeObserver(() => layout()).observe(container);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && focusKey) focus(null); });
  backButton?.addEventListener('click', () => focus(null));
  requestAnimationFrame(tick);

  return { setAgents, focus, roomCount: () => rooms.size };
}
