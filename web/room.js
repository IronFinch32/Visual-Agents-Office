// One project office, drawn in fixed layers (ADR-003):
// 0 floor/rugs/light · 1 walls/windows · 2-4 furniture + people sorted by depth ·
// 5 effects · 6 lighting · 7 whiteboards, bubbles, nameplates.
import {
  C, looksFor, outfitFor, toolCategory, rect, drawFloor, drawRug, drawBackWall, drawOuterWalls,
  drawDoor, drawWindow, drawLightBeam, drawClock, drawWhiteboard, drawPlant, drawCoffeeMachine,
  drawSmallTable, drawChair, drawMonitor, drawDesk, drawPerson, drawBadge, drawBubble, drawNameplate,
  drawLighting, minutesSince,
} from './sprites.js';

const MARGIN = 8;
const WALL_H = 40;
const MANAGER_H = 80;
const MANAGER_CELL_W = 88;
const CELL_W = 64;
const ROW_H = 66;
const LOUNGE_W = 60;
const BOTTOM = 8;
const MIN_COLS = 2;
const MAX_COLS = 6;
const WALK_SPEED = 70; // logical px per second
const MAX_PARTICLES = 40;

const STATUS_TEXT = {
  working: () => 'werkt',
  waiting: (a, now) => `wacht op jou · ${minutesSince(a.statusSince, now)}`,
  done: () => 'klaar',
  idle: () => 'niets te doen',
};

function lowestFree(taken) {
  let i = 0;
  while (taken.has(i)) i++;
  return i;
}

export function createRoom(canvas, { phase: getPhase } = {}) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  const chars = new Map(); // agent id -> character
  const managerSeats = new Map(); // session id -> slot
  const workerSeats = new Map(); // subagent id -> desk slot
  const loungeSeats = new Map(); // finished subagent id -> lounge spot
  const particles = [];
  let agents = [];
  let clockSkew = 0;
  let L = {};

  function computeLayout() {
    const desks = workerSeats.size ? Math.max(...workerSeats.values()) + 1 : 0;
    const need = desks + 1; // one free desk is enough; the rest of the floor is lounge
    const cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.ceil(Math.sqrt(need * 2))));
    const rows = Math.max(1, Math.ceil(need / cols));
    const mSlots = Math.max(1, managerSeats.size ? Math.max(...managerSeats.values()) + 1 : 1);
    const W = MARGIN * 2 + Math.max(cols * CELL_W + LOUNGE_W, mSlots * MANAGER_CELL_W);
    const H = WALL_H + MANAGER_H + rows * ROW_H + BOTTOM;
    L = { cols, rows, need, mSlots, W, H, floorY: WALL_H + MANAGER_H };
  }
  computeLayout();

  const door = () => ({ x: MARGIN + 12, y: WALL_H + 2 });

  function managerCell(i) {
    const w = (L.W - MARGIN * 2) / L.mSlots;
    const x0 = MARGIN + i * w;
    return { x0, w, cx: Math.round(x0 + w / 2) };
  }
  const managerDeskY = () => WALL_H + 46;
  const managerSeat = (i) => ({ x: managerCell(i).cx - 10, y: managerDeskY() });

  function workerCell(i) {
    const areaW = L.W - MARGIN * 2 - LOUNGE_W;
    const areaX = MARGIN + Math.round((areaW - L.cols * CELL_W) / 2);
    const col = i % L.cols;
    const row = Math.floor(i / L.cols);
    return { x0: areaX + col * CELL_W, y0: L.floorY + row * ROW_H };
  }
  const workerSeat = (i) => { const c = workerCell(i); return { x: c.x0 + 22, y: c.y0 + 36 }; };

  const lounge = () => ({ x: L.W - MARGIN - LOUNGE_W, y: L.floorY + 2 });
  function loungeSpot(i) {
    const l = lounge();
    return [{ x: l.x + 12, y: l.y + 34 }, { x: l.x + 34, y: l.y + 36 }, { x: l.x + 12, y: l.y + 56 }, { x: l.x + 34, y: l.y + 58 }][i];
  }

  function setAgents(list, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const present = new Set(list.map((a) => a.id));
    for (const seats of [managerSeats, workerSeats, loungeSeats]) {
      for (const id of [...seats.keys()]) if (!present.has(id)) seats.delete(id);
    }
    const byStart = (a, b) => a.startedAt - b.startedAt;
    for (const a of list.filter((x) => x.kind === 'session').sort(byStart)) {
      if (!managerSeats.has(a.id)) managerSeats.set(a.id, lowestFree(new Set(managerSeats.values())));
    }
    for (const a of list.filter((x) => x.kind === 'subagent').sort(byStart)) {
      if (!workerSeats.has(a.id)) workerSeats.set(a.id, lowestFree(new Set(workerSeats.values())));
      if (a.status === 'done' && !loungeSeats.has(a.id)) {
        const spot = lowestFree(new Set(loungeSeats.values()));
        if (spot < 4) loungeSeats.set(a.id, spot);
      } else if (a.status !== 'done') {
        loungeSeats.delete(a.id);
      }
    }
    computeLayout();
    retarget();
  }

  function retarget() {
    const present = new Set(agents.map((a) => a.id));
    for (const a of agents) {
      let target;
      if (a.kind === 'session') target = managerSeat(managerSeats.get(a.id));
      else if (loungeSeats.has(a.id)) target = loungeSpot(loungeSeats.get(a.id));
      else target = workerSeat(workerSeats.get(a.id));
      let ch = chars.get(a.id);
      if (!ch) {
        // Workers are sent out by their manager; everyone else comes in through the door.
        const boss = chars.get(a.parentId);
        const start = boss ? { x: boss.x, y: boss.y + 4 } : door();
        ch = { id: a.id, x: start.x, y: start.y, phase: Math.random() * 10, looks: looksFor(a.id), lastSpark: 0 };
        chars.set(a.id, ch);
      }
      const accent = looksFor(a.parentId || a.id).shirt; // manager colour: tie, caps, armbands, desk trim
      Object.assign(ch, { agent: a, tx: target.x, ty: target.y, leaving: false, accent, outfit: outfitFor(a), inLounge: loungeSeats.has(a.id) });
    }
    for (const ch of chars.values()) {
      if (!present.has(ch.id) && !ch.leaving) {
        const d = door();
        Object.assign(ch, { leaving: true, tx: d.x, ty: d.y, inLounge: false });
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
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function spawn(x, y, color, vx, vy, life) {
    if (particles.length < MAX_PARTICLES) particles.push({ x, y, color, vx, vy, life, max: life });
  }

  const seatedAtDesk = (ch) => ch && !ch.walking && !ch.leaving && !ch.inLounge;

  function frame(t, dt) {
    const now = Date.now() - clockSkew;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    step(dt);
    const phase = getPhase ? getPhase() : 'dag';

    const scale = Math.min(cw / L.W, chh / L.H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, Math.round((cw - L.W * scale) / 2), Math.round((chh - L.H * scale) / 2));
    ctx.imageSmoothingEnabled = false;

    // ----- layer 0: floor -----
    drawFloor(ctx, 0, WALL_H, L.W, L.H - WALL_H);
    rect(ctx, MARGIN, WALL_H + 4, L.W - MARGIN * 2, MANAGER_H - 8, C.carpet);
    rect(ctx, MARGIN, WALL_H + MANAGER_H - 5, L.W - MARGIN * 2, 1, C.carpetEdge);
    const lg = lounge();
    drawRug(ctx, lg.x + 2, lg.y + 22, LOUNGE_W - 6, 44);

    // ----- layer 1: walls -----
    drawBackWall(ctx, L.W, WALL_H);
    drawDoor(ctx, door().x, WALL_H);
    const boards = [];
    for (let i = 0; i < L.mSlots; i++) boards.push({ x: managerCell(i).cx - 23, w: 46 });
    // windows in the gaps between whiteboards
    let from = door().x + 12;
    const gaps = [...boards, { x: L.W - 26, w: 0 }];
    for (const b of gaps) {
      const gap = b.x - from - 4;
      if (gap >= 20) {
        const ww = Math.min(30, gap - 4);
        const wx = Math.round(from + (gap - ww) / 2 + 2);
        drawWindow(ctx, wx, 8, ww, 18, phase, t);
        drawLightBeam(ctx, wx, ww, WALL_H, 36, phase);
      }
      from = b.x + b.w;
    }
    drawClock(ctx, L.W - 15, 15);
    drawOuterWalls(ctx, L.W, L.H, WALL_H);

    // ----- layers 2-4: furniture and people, sorted back to front -----
    const scene = []; // { y, draw }
    const overlays = [];
    const lamps = [];
    const spots = [];
    const runningBySession = new Map();
    for (const a of agents) {
      if (a.kind === 'subagent' && a.status !== 'done') runningBySession.set(a.parentId, (runningBySession.get(a.parentId) || 0) + 1);
    }

    scene.push({ y: lg.y + 22, draw: () => drawCoffeeMachine(ctx, lg.x + LOUNGE_W - 18, lg.y + 2, t) });
    scene.push({ y: lg.y + 46, draw: () => drawSmallTable(ctx, lg.x + 17, lg.y + 40) });
    scene.push({ y: lg.y + 22, draw: () => drawPlant(ctx, lg.x + 2, lg.y + 2, t) });

    const addDesk = (seat, deskX, deskY, deskW, ch, opts) => {
      const a = ch?.agent;
      const busy = a && (a.status === 'working' || a.status === 'waiting');
      scene.push({ y: seat.y - 3, draw: () => drawChair(ctx, seat.x, seat.y) });
      if (seatedAtDesk(ch)) {
        let pose = a.status;
        if (a.status === 'idle' && (t + opts.seed * 3) % 9 < 1.2) pose = 'stretch';
        scene.push({ y: seat.y - 2, draw: () => drawPerson(ctx, ch.x, ch.y, ch.looks, { pose, t: t + opts.seed, seated: true, outfit: ch.outfit, accent: ch.accent }) });
        if (a.status === 'working' && t - ch.lastSpark > 0.18) {
          ch.lastSpark = t;
          spawn(deskX + 26 + Math.random() * 6, deskY, ['#ffffff', '#9fd6ff', '#f1fa8c'][Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 12, -18, 0.6);
        }
      }
      const monitorStatus = a ? (a.status === 'done' ? 'done' : a.status === 'waiting' ? 'waiting' : undefined) : undefined;
      const category = a && a.status !== 'idle' ? toolCategory(a.tool) : 'idle';
      scene.push({
        y: deskY + 13,
        draw: () => {
          drawDesk(ctx, deskX, deskY, deskW, { accent: opts.accent, mug: a?.status === 'done' && seatedAtDesk(ch), lampOn: busy && phase !== 'dag', t });
          drawMonitor(ctx, deskX + deskW - 18, deskY - 14, { category, status: monitorStatus, t, seed: opts.seed });
        },
      });
      if (busy) lamps.push({ x: deskX + 4, y: deskY - 4 });
      if (a?.status === 'done' && seatedAtDesk(ch) && Math.random() < dt * 3) spawn(deskX + 9, deskY - 6, 'rgba(255,255,255,.7)', 0, -8, 1);
    };

    // managers
    const managerBySlot = new Map([...managerSeats].map(([id, s]) => [s, id]));
    for (let i = 0; i < L.mSlots; i++) {
      const id = managerBySlot.get(i);
      const ch = id ? chars.get(id) : null;
      const a = ch?.agent;
      const cell = managerCell(i);
      const seat = managerSeat(i);
      const deskX = cell.cx - 28;
      addDesk(seat, deskX, managerDeskY(), 56, ch, { seed: i, accent: null });
      overlays.push(() => drawWhiteboard(ctx, cell.cx - 23, 6, 46, 26, a?.task || '', a ? looksFor(a.id).shirt : null));
      if (!a || ch.leaving) continue;
      if (a.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 8 });
      const team = runningBySession.get(a.id);
      const statusText = STATUS_TEXT[a.status]?.(a, now) + (team ? ` · team ${team}` : '');
      overlays.push(() => drawNameplate(ctx, deskX, managerDeskY() + 18, cell.w - 4, a.title || `Manager ${i + 1}`, statusText, a.status, { light: true }));
      if (seatedAtDesk(ch)) overlays.push(() => drawAgentOverlay(ch, cell.x0, cell.x0 + cell.w, cell.w - 4, t));
    }

    // worker desks
    const workerBySlot = new Map([...workerSeats].map(([id, s]) => [s, id]));
    for (let i = 0; i < L.need; i++) {
      const id = workerBySlot.get(i);
      const ch = id ? chars.get(id) : null;
      const a = ch?.agent;
      const cell = workerCell(i);
      addDesk(workerSeat(i), cell.x0 + 6, cell.y0 + 36, 48, ch, { seed: i + 10, accent: ch && !ch.leaving ? ch.accent : null });
      if (!a || ch.leaving) continue;
      if (a.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 8 });
      overlays.push(() => drawNameplate(ctx, cell.x0 + 4, cell.y0 + 54, CELL_W - 4, a.name, STATUS_TEXT[a.status]?.(a, now), a.status));
      if (seatedAtDesk(ch)) overlays.push(() => drawAgentOverlay(ch, cell.x0, cell.x0 + CELL_W, CELL_W - 2, t));
    }

    // people walking or in the lounge
    for (const ch of chars.values()) {
      if (seatedAtDesk(ch)) continue;
      const lounging = ch.inLounge && !ch.walking;
      const sipping = lounging && (t + ch.phase) % 6 < 1.2;
      scene.push({
        y: ch.y,
        draw: () => drawPerson(ctx, ch.x, ch.y, ch.looks, {
          pose: lounging ? 'sip' : 'walk', t, seated: false, walkPhase: ch.phase, outfit: ch.outfit, accent: ch.accent, sipping,
        }),
      });
      if (lounging) {
        overlays.push(() => drawBadge(ctx, ch.x, ch.y - 25, '✓', C.done, 6));
        if (Math.random() < dt * 2) spawn(ch.x + 6, ch.y - 10, 'rgba(255,255,255,.6)', 0, -7, 0.9);
      }
    }
    if (Math.random() < dt * 2) spawn(lg.x + LOUNGE_W - 12, lg.y + 8, 'rgba(255,255,255,.55)', 0, -8, 1);

    scene.sort((a, b) => a.y - b.y);
    for (const item of scene) item.draw();

    // ----- layer 5: effects -----
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      rect(ctx, p.x, p.y, 1, 1, p.color);
    }
    ctx.globalAlpha = 1;

    // ----- layer 6: light -----
    drawLighting(ctx, shade, L.W, L.H, { phase, lamps, spots, t });

    // ----- layer 7: information on top -----
    for (const draw of overlays) draw();
  }

  function drawAgentOverlay(ch, minX, maxX, maxW, t) {
    const a = ch.agent;
    const headY = ch.y - 17;
    const opts = { maxW, minX, maxX };
    if (a.status === 'waiting') {
      drawBubble(ctx, ch.x + 10, headY - 2, a.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
      if (Math.sin(t * 7) > -0.2) drawBadge(ctx, ch.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (a.status === 'working') {
      drawBubble(ctx, ch.x + 10, headY - 2, a.activity || 'Aan het werk', { ...opts, border: C.working });
    } else if (a.status === 'done') {
      drawBadge(ctx, ch.x - 9, headY - 2, '✓', C.done, 7);
    } else {
      ctx.font = `600 6px 'Pixelify Sans', monospace`;
      ctx.fillStyle = '#e8eaff';
      const k = (t * 0.8) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillText('z', ch.x + 6 + k * 4, headY - k * 8);
      ctx.fillText('Z', ch.x + 10 + k * 3, headY - 6 - k * 6);
      ctx.globalAlpha = 1;
    }
  }

  return {
    setAgents,
    frame,
    size: () => ({ W: L.W, H: L.H }),
    isEmpty: () => chars.size === 0,
  };
}
