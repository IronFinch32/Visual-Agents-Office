// Pixel-art office renderer. Everything is drawn procedurally in "logical pixels"
// and scaled up, so there are no image assets.

const SLOT_W = 100;
const SLOT_H = 84;
const WALL_H = 30;
const MARGIN = 14;
const BOTTOM = 14;
const WALK_SPEED = 70; // logical px per second
const MAX_SUBS_SHOWN = 3;

const C = {
  floorA: '#b98a5a', floorB: '#ad7f50', floorLine: '#9a6f45',
  wall: '#5a5f86', wallDark: '#474b6d', trim: '#2f3250',
  window: '#9fd6ff', windowFrame: '#e9ecff',
  deskTop: '#d9a066', deskFront: '#8f5a2e', deskLeg: '#5e3a1d',
  chair: '#3a3f5c', monitor: '#30344a', monitorEdge: '#1d2030',
  plant: '#3fa34d', plantDark: '#2b7a37', pot: '#c0603b',
  skin: ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'],
  hair: ['#2b1d0e', '#6b4423', '#d6b25e', '#a33b20', '#1c1c1c', '#7c7c8a'],
  pants: '#2f3550', shoe: '#1b1b22', eye: '#1b1b22',
  working: '#4ea3ff', waiting: '#ff4d5e', done: '#3ddc84', idle: '#8a8fa8',
  bubble: '#ffffff', bubbleText: '#1b1d2a', text: '#ffffff', shadow: 'rgba(0,0,0,.25)',
};

const FONT = "'Pixelify Sans', ui-monospace, Menlo, monospace";

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function looksFor(id) {
  const h = hash(id);
  const hue = h % 360;
  return {
    shirt: `hsl(${hue} 60% 55%)`,
    shirtDark: `hsl(${hue} 55% 40%)`,
    skin: C.skin[(h >>> 8) % C.skin.length],
    hair: C.hair[(h >>> 12) % C.hair.length],
  };
}

function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

export function minutesSince(ts, now) {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return 'net';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}u${String(m % 60).padStart(2, '0')}`;
}

export function createOffice(canvas) {
  const ctx = canvas.getContext('2d');
  const chars = new Map(); // id -> character
  const seats = new Map(); // session id -> slot index
  let agents = [];
  let clockSkew = 0;
  let layout = { cols: 2, rows: 1, slots: 2, W: 0, H: 0, scale: 1, ox: 0, oy: 0 };
  let last = performance.now();

  function computeLayout() {
    const used = seats.size ? Math.max(...seats.values()) + 1 : 0;
    const slots = Math.max(4, used);
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    let best = null;
    for (let cols = 1; cols <= slots; cols++) {
      const rows = Math.ceil(slots / cols);
      const W = MARGIN * 2 + cols * SLOT_W;
      const H = WALL_H + rows * SLOT_H + BOTTOM;
      const score = Math.min(canvas.clientWidth / W, canvas.clientHeight / H) * (1 - 0.02 * Math.abs(W / H - aspect));
      if (!best || score > best.score) best = { cols, rows, W, H, score };
    }
    const dpr = window.devicePixelRatio || 1;
    const fitScale = Math.min(canvas.clientWidth / best.W, canvas.clientHeight / best.H) * dpr;
    const scale = fitScale >= 2 ? Math.floor(fitScale) : fitScale;
    layout = {
      ...best,
      slots: best.cols * best.rows,
      scale,
      ox: Math.round((canvas.width - best.W * scale) / 2),
      oy: Math.round((canvas.height - best.H * scale) / 2),
    };
  }

  function slotOrigin(i) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    return { x: MARGIN + col * SLOT_W, y: WALL_H + row * SLOT_H };
  }

  const door = () => ({ x: MARGIN + 10, y: WALL_H + 2 });

  function seatPos(slot) {
    const o = slotOrigin(slot);
    return { x: o.x + 30, y: o.y + 52 };
  }

  function subPos(parentSlot, index) {
    const o = slotOrigin(parentSlot);
    return { x: o.x + 66 + index * 11, y: o.y + 66 };
  }

  function setAgents(list, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const present = new Set(list.map((a) => a.id));

    for (const id of [...seats.keys()]) if (!present.has(id)) seats.delete(id);
    const sessions = list.filter((a) => a.kind === 'session').sort((a, b) => a.startedAt - b.startedAt);
    for (const s of sessions) {
      if (seats.has(s.id)) continue;
      const taken = new Set(seats.values());
      let i = 0;
      while (taken.has(i)) i++;
      seats.set(s.id, i);
    }
    computeLayout();

    const subsByParent = new Map();
    for (const a of list) {
      if (a.kind !== 'subagent') continue;
      if (!subsByParent.has(a.parentId)) subsByParent.set(a.parentId, []);
      subsByParent.get(a.parentId).push(a);
    }
    for (const subs of subsByParent.values()) subs.sort((a, b) => a.startedAt - b.startedAt);

    for (const a of list) {
      let target;
      let hidden = false;
      if (a.kind === 'session') {
        target = seatPos(seats.get(a.id));
      } else {
        const slot = seats.get(a.parentId);
        if (slot === undefined) continue;
        const idx = subsByParent.get(a.parentId).indexOf(a);
        hidden = idx >= MAX_SUBS_SHOWN;
        target = subPos(slot, Math.min(idx, MAX_SUBS_SHOWN - 1));
      }
      let ch = chars.get(a.id);
      if (!ch) {
        const start = a.kind === 'subagent' && chars.has(a.parentId) ? { ...chars.get(a.parentId) } : door();
        ch = { id: a.id, x: start.x, y: start.y, looks: looksFor(a.parentId || a.id), leaving: false, phase: Math.random() * 10 };
        chars.set(a.id, ch);
      }
      Object.assign(ch, { agent: a, tx: target.x, ty: target.y, leaving: false, hidden });
    }
    for (const ch of chars.values()) {
      if (!present.has(ch.id) && !ch.leaving) {
        const d = door();
        Object.assign(ch, { leaving: true, tx: d.x, ty: d.y, hidden: false });
      }
    }
  }

  function step(dt) {
    for (const ch of [...chars.values()]) {
      const dx = ch.tx - ch.x;
      const dy = ch.ty - ch.y;
      const dist = Math.hypot(dx, dy);
      const move = WALK_SPEED * dt;
      ch.walking = dist > 0.5;
      if (dist <= move) { ch.x = ch.tx; ch.y = ch.ty; } else { ch.x += (dx / dist) * move; ch.y += (dy / dist) * move; }
      if (ch.walking) ch.phase += dt * 8;
      if (ch.leaving && !ch.walking) chars.delete(ch.id);
    }
  }

  // ---------- drawing helpers ----------
  const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  function drawRoom(t) {
    const { W, H } = layout;
    // floor planks
    for (let y = WALL_H; y < H; y += 6) {
      r(0, y, W, 6, ((y - WALL_H) / 6) % 2 ? C.floorA : C.floorB);
      const off = ((y / 6) % 3) * 13;
      for (let x = off; x < W; x += 40) r(x, y, 1, 6, C.floorLine);
    }
    // wall
    r(0, 0, W, WALL_H, C.wall);
    r(0, WALL_H - 4, W, 4, C.wallDark);
    r(0, WALL_H - 1, W, 1, C.trim);
    // windows
    for (let x = MARGIN + 40; x + 30 < W - 30; x += 70) {
      r(x - 1, 5, 32, 16, C.windowFrame);
      r(x, 6, 30, 14, C.window);
      r(x + 14, 6, 2, 14, C.windowFrame);
      r(x + 3, 8, 6, 2, '#d8f0ff');
    }
    // door
    const d = door();
    r(d.x - 8, 6, 16, WALL_H - 6, C.trim);
    r(d.x - 7, 7, 14, WALL_H - 7, '#7a4a26');
    r(d.x + 3, 17, 2, 2, '#e8c35a');
    // clock
    const cx = W - 22, cy = 13;
    r(cx - 6, cy - 6, 12, 12, C.windowFrame);
    r(cx - 5, cy - 5, 10, 10, '#fff');
    const now = new Date();
    const hAng = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
    const mAng = now.getMinutes() / 60 * Math.PI * 2;
    ctx.strokeStyle = '#1b1d2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hAng) * 3, cy - Math.cos(hAng) * 3);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(mAng) * 4.5, cy - Math.cos(mAng) * 4.5);
    ctx.stroke();
    // plants
    drawPlant(4, WALL_H + 2);
    drawPlant(W - 12, H - 22);
  }

  function drawPlant(x, y) {
    r(x + 1, y + 12, 7, 8, C.pot);
    r(x, y + 11, 9, 2, '#d9774f');
    r(x + 2, y + 2, 5, 9, C.plant);
    r(x, y + 5, 3, 5, C.plantDark);
    r(x + 6, y + 4, 3, 6, C.plantDark);
    r(x + 3, y, 3, 3, C.plant);
  }

  function drawDesk(slot, agent, t) {
    const o = slotOrigin(slot);
    // floor glow for waiting
    if (agent && agent.status === 'waiting') {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 6);
      ctx.fillStyle = C.waiting;
      ctx.beginPath();
      ctx.ellipse(o.x + 34, o.y + 62, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // desk
    r(o.x + 8, o.y + 52, 48, 5, C.deskTop);
    r(o.x + 8, o.y + 57, 48, 10, C.deskFront);
    r(o.x + 10, o.y + 67, 3, 4, C.deskLeg);
    r(o.x + 51, o.y + 67, 3, 4, C.deskLeg);
    r(o.x + 20, o.y + 60, 24, 1, C.deskLeg);
    // monitor (seen from behind, right side of the desk)
    r(o.x + 38, o.y + 37, 16, 13, C.monitorEdge);
    r(o.x + 39, o.y + 38, 14, 11, C.monitor);
    r(o.x + 44, o.y + 50, 4, 2, C.monitorEdge);
    if (agent && agent.status === 'working') {
      // screen light spilling around the edges
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10 + slot);
      r(o.x + 37, o.y + 37, 1, 13, C.working);
      r(o.x + 38, o.y + 36, 16, 1, C.working);
      ctx.globalAlpha = 1;
    }
    if (agent && agent.status === 'done') {
      // coffee mug
      r(o.x + 14, o.y + 48, 5, 5, '#f4f4f4');
      r(o.x + 19, o.y + 49, 2, 3, '#f4f4f4');
      r(o.x + 15, o.y + 48, 3, 1, '#6b3e1f');
      ctx.globalAlpha = 0.6;
      r(o.x + 15 + Math.round(Math.sin(t * 3)), o.y + 44, 1, 3, '#ffffff');
      ctx.globalAlpha = 1;
    }
    // papers
    r(o.x + 22, o.y + 53, 8, 3, '#f0f0f0');
  }

  function drawChair(slot) {
    const o = slotOrigin(slot);
    r(o.x + 22, o.y + 28, 16, 24, C.chair);
    r(o.x + 23, o.y + 29, 14, 2, '#4a5070');
  }

  function drawNameplate(slot, agent, now) {
    const o = slotOrigin(slot);
    const color = C[agent.status] || C.idle;
    ctx.font = `600 7px ${FONT}`;
    ctx.textBaseline = 'top';
    const label = fit(ctx, agent.title || agent.name, SLOT_W - 18);
    r(o.x + 6, o.y + 73, 5, 5, color);
    ctx.fillStyle = C.shadow;
    ctx.fillText(label, o.x + 14, o.y + 72.5);
    ctx.fillStyle = C.text;
    ctx.fillText(label, o.x + 13, o.y + 72);
    const status = {
      working: 'werkt',
      waiting: `wacht op jou · ${minutesSince(agent.statusSince, now)}`,
      done: 'klaar',
      idle: 'niets te doen',
    }[agent.status] || agent.status;
    ctx.font = `5px ${FONT}`;
    ctx.fillStyle = agent.status === 'waiting' ? '#ffd1d6' : '#2a1b10';
    ctx.fillText(status, o.x + 13, o.y + 79);
  }

  function drawPerson(x, y, looks, { pose, t, seated, walkPhase = 0 }) {
    // (x, y) = bottom-centre of the feet for standing, seat point when seated.
    const left = Math.round(x) - 5;
    const top = Math.round(y) - (seated ? 17 : 20);
    const p = (dx, dy, w, h, c) => r(left + dx, top + dy, w, h, c);
    const lean = pose === 'done' ? -1 : 0;
    const L = (dx, dy, w, h, c) => p(dx, dy + lean, w, h, c);

    if (!seated) {
      // legs
      const a = Math.round(Math.sin(walkPhase)) ;
      p(2, 14, 2, 5 - Math.max(0, a), C.pants);
      p(6, 14, 2, 5 - Math.max(0, -a), C.pants);
      p(2, 19 - Math.max(0, a), 2, 1, C.shoe);
      p(6, 19 - Math.max(0, -a), 2, 1, C.shoe);
    }
    // body
    L(1, 7, 8, 8, looks.shirt);
    L(4, 7, 2, 1, '#ffffff');
    // head
    L(2, 1, 6, 6, looks.skin);
    L(2, 0, 6, 2, looks.hair);
    L(1, 1, 1, 3, looks.hair);
    L(8, 1, 1, 3, looks.hair);
    if (pose === 'idle') {
      L(3, 4, 2, 1, C.eye);
      L(6, 4, 2, 1, C.eye);
    } else {
      const blink = Math.sin(t * 1.3 + x) > 0.97;
      L(3, 3, 1, blink ? 1 : 2, C.eye);
      L(6, 3, 1, blink ? 1 : 2, C.eye);
    }
    if (pose === 'done') L(4, 5, 2, 1, '#a0522d'); // smile
    // arms
    if (pose === 'working' && seated) {
      const bob = Math.sin(t * 14) > 0 ? 0 : 1;
      L(0, 8, 1, 5, looks.shirtDark);
      L(9, 8, 1, 5, looks.shirtDark);
      L(1, 13 + bob, 2, 1, looks.skin);
      L(7, 14 - bob, 2, 1, looks.skin);
    } else if (pose === 'waiting') {
      const wave = Math.sin(t * 8) > 0 ? 0 : 1;
      L(0, 8, 1, 5, looks.shirtDark);
      L(0, 13, 1, 1, looks.skin);
      L(9 + wave, -1, 1, 8, looks.shirtDark);
      L(9 + wave, -2, 1, 1, looks.skin);
    } else if (pose === 'done') {
      // hands behind the head
      L(0, 2, 1, 6, looks.shirtDark);
      L(9, 2, 1, 6, looks.shirtDark);
      L(1, 1, 1, 2, looks.skin);
      L(8, 1, 1, 2, looks.skin);
    } else {
      L(0, 8, 1, 6, looks.shirtDark);
      L(9, 8, 1, 6, looks.shirtDark);
      L(0, 14, 1, 1, looks.skin);
      L(9, 14, 1, 1, looks.skin);
    }
  }

  function drawMini(x, y, looks, agent, t, walking, phase) {
    const left = Math.round(x) - 3;
    const top = Math.round(y) - 13;
    const p = (dx, dy, w, h, c) => r(left + dx, top + dy, w, h, c);
    // shadow
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x, y, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    const a = walking ? Math.round(Math.sin(phase)) : 0;
    p(1, 9, 2, 4 - Math.max(0, a), C.pants);
    p(4, 9, 2, 4 - Math.max(0, -a), C.pants);
    p(0, 5, 7, 5, looks.shirt);
    p(1, 1, 5, 4, looks.skin);
    p(0, 0, 7, 2, looks.shirtDark); // cap in the parent's colour
    p(5, 1, 3, 1, looks.shirtDark);
    p(2, 3, 1, 1, C.eye);
    p(4, 3, 1, 1, C.eye);
    if (agent.status === 'working' && !walking) {
      const bob = Math.sin(t * 12 + x) > 0 ? 0 : 1;
      p(-1, 6 + bob, 1, 3, looks.skin);
    }
    // status pip + label
    const color = C[agent.status] || C.idle;
    if (agent.status === 'waiting') {
      if (Math.sin(t * 8) > -0.3) drawBadge(x, top - 6, '!', C.waiting, 5);
    } else {
      r(left + 2, top - 4, 3, 3, color);
    }
  }

  function drawBadge(cx, cy, text, color, size = 7) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx - size / 2) - 1, Math.round(cy - size / 2) - 1, size + 2, size + 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 0.5);
    ctx.textAlign = 'left';
  }

  function drawBubble(cx, bottomY, text, { border = C.trim, bold = false, maxW = SLOT_W - 8, minX = 0 } = {}) {
    ctx.font = `${bold ? '600 ' : ''}6px ${FONT}`;
    const label = fit(ctx, text, maxW - 8);
    const w = Math.ceil(ctx.measureText(label).width) + 8;
    const h = 11;
    let x = Math.round(cx - w / 2);
    x = Math.max(minX + 2, Math.min(x, layout.W - w - 2));
    const y = Math.round(bottomY - h - 3);
    r(x - 1, y - 1, w + 2, h + 2, border);
    r(x, y, w, h, C.bubble);
    // tail
    r(Math.round(cx) - 1, y + h, 3, 1, border);
    r(Math.round(cx), y + h + 1, 1, 2, border);
    r(Math.round(cx) - 0, y + h, 1, 1, C.bubble);
    ctx.fillStyle = C.bubbleText;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 4, y + h / 2 + 0.5);
  }

  function drawSessionOverlay(ch, t, now) {
    const a = ch.agent;
    const headY = ch.y - 17;
    const slot = seats.get(a.id);
    const minX = slotOrigin(slot).x;
    if (a.status === 'waiting') {
      const on = Math.sin(t * 7) > -0.2;
      drawBubble(ch.x + 12, headY - 2, a.waitingReason || 'Wacht op je input', { border: C.waiting, bold: true, minX });
      if (on) drawBadge(ch.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (a.status === 'working') {
      drawBubble(ch.x + 12, headY - 2, a.activity || 'Aan het werk', { border: C.working, minX });
    } else if (a.status === 'done') {
      drawBubble(ch.x + 12, headY - 2, a.task ? `Klaar: ${a.task}` : 'Klaar!', { border: C.done, minX });
      drawBadge(ch.x - 9, headY - 2, '✓', C.done, 7);
    } else {
      ctx.font = `600 6px ${FONT}`;
      ctx.fillStyle = '#e8eaff';
      const k = (t * 0.8) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillText('z', ch.x + 6 + k * 4, headY - k * 8);
      ctx.fillText('Z', ch.x + 10 + k * 3, headY - 6 - k * 6);
      ctx.globalAlpha = 1;
    }
  }

  function render(nowMs) {
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const t = nowMs / 1000;
    const now = Date.now() - clockSkew;

    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== chh) {
      canvas.width = cw;
      canvas.height = chh;
      computeLayout();
      setAgents(agents); // re-target with the new layout
    }
    step(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.ox, layout.oy);
    ctx.imageSmoothingEnabled = false;

    drawRoom(t);

    const bySlot = new Map();
    for (const [id, slot] of seats) bySlot.set(slot, id);
    const seated = new Set();

    for (let slot = 0; slot < layout.slots; slot++) {
      const id = bySlot.get(slot);
      const ch = id && chars.get(id);
      const agent = ch?.agent;
      drawChair(slot);
      if (ch && !ch.walking && !ch.leaving) {
        seated.add(id);
        const pose = agent.status;
        drawPerson(ch.x, ch.y, ch.looks, { pose, t: t + slot, seated: true });
      }
      drawDesk(slot, ch && !ch.leaving ? agent : null, t);
      if (agent && !ch.leaving) drawNameplate(slot, agent, now);
    }

    // walkers and subagents, sorted by depth
    const others = [...chars.values()].filter((ch) => !seated.has(ch.id) && !ch.hidden).sort((a, b) => a.y - b.y);
    for (const ch of others) {
      if (ch.agent.kind === 'subagent') {
        drawMini(ch.x, ch.y, ch.looks, ch.agent, t, ch.walking, ch.phase);
      } else {
        ctx.fillStyle = C.shadow;
        ctx.beginPath(); ctx.ellipse(ch.x, ch.y, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
        drawPerson(ch.x, ch.y, ch.looks, { pose: 'walk', t, seated: false, walkPhase: ch.phase });
      }
    }

    // "+n" for subagents that don't fit next to the desk
    const extra = new Map();
    for (const ch of chars.values()) if (ch.hidden) extra.set(ch.agent.parentId, (extra.get(ch.agent.parentId) || 0) + 1);
    for (const [parentId, n] of extra) {
      const slot = seats.get(parentId);
      if (slot === undefined) continue;
      const p = subPos(slot, MAX_SUBS_SHOWN - 1);
      ctx.font = `600 6px ${FONT}`;
      ctx.fillStyle = C.text;
      ctx.textBaseline = 'top';
      ctx.fillText(`+${n}`, p.x + 6, p.y - 10);
    }

    // bubbles on top of everything
    for (const id of seated) {
      const ch = chars.get(id);
      if (ch.agent.kind === 'session') drawSessionOverlay(ch, t, now);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  return { setAgents };
}
