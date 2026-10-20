// One project office: managers (sessions) along the top, a desk per subagent below.
import {
  C, looksFor, rect, drawFloor, drawWall, drawPlant, drawChair, drawDesk, drawPerson,
  drawStatusOverlay, drawNameplate, minutesSince,
} from './sprites.js';

const MARGIN = 8;
const WALL_H = 24;
const MANAGER_H = 78;
const MANAGER_CELL_W = 88;
const CELL_W = 64;
const ROW_H = 66;
const BOTTOM = 4;
const MIN_COLS = 3;
const MAX_COLS = 6;
const WALK_SPEED = 70; // logical px per second

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

export function createRoom(canvas) {
  const ctx = canvas.getContext('2d');
  const chars = new Map(); // agent id -> character
  const managerSeats = new Map(); // session id -> slot
  const workerSeats = new Map(); // subagent id -> slot
  let agents = [];
  let clockSkew = 0;
  let L = { cols: MIN_COLS, rows: 1, mSlots: 1, W: 0, H: 0 };

  function computeLayout() {
    const workers = workerSeats.size ? Math.max(...workerSeats.values()) + 1 : 0;
    const need = workers + 2; // always a couple of free desks
    const cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.ceil(Math.sqrt(need * 2))));
    const rows = Math.max(1, Math.ceil(need / cols));
    const mSlots = Math.max(1, managerSeats.size ? Math.max(...managerSeats.values()) + 1 : 1);
    const W = MARGIN * 2 + Math.max(cols * CELL_W, mSlots * MANAGER_CELL_W);
    const H = WALL_H + MANAGER_H + rows * ROW_H + BOTTOM;
    L = { cols, rows, mSlots, W, H };
  }
  computeLayout();

  const door = () => ({ x: MARGIN + 10, y: WALL_H + 2 });

  function managerCell(i) {
    const w = (L.W - MARGIN * 2) / L.mSlots;
    const x0 = MARGIN + i * w;
    return { x0, w, cx: Math.round(x0 + w / 2) };
  }
  const managerDeskY = () => WALL_H + 46;
  const managerSeat = (i) => ({ x: managerCell(i).cx - 10, y: managerDeskY() });

  function workerCell(i) {
    const areaX = Math.round((L.W - L.cols * CELL_W) / 2);
    const col = i % L.cols;
    const row = Math.floor(i / L.cols);
    return { x0: areaX + col * CELL_W, y0: WALL_H + MANAGER_H + row * ROW_H };
  }
  const workerSeat = (i) => { const c = workerCell(i); return { x: c.x0 + 22, y: c.y0 + 36 }; };

  function setAgents(list, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const present = new Set(list.map((a) => a.id));
    for (const seats of [managerSeats, workerSeats]) {
      for (const id of [...seats.keys()]) if (!present.has(id)) seats.delete(id);
    }
    const byStart = (a, b) => a.startedAt - b.startedAt;
    for (const a of list.filter((x) => x.kind === 'session').sort(byStart)) {
      if (!managerSeats.has(a.id)) managerSeats.set(a.id, lowestFree(new Set(managerSeats.values())));
    }
    for (const a of list.filter((x) => x.kind === 'subagent').sort(byStart)) {
      if (!workerSeats.has(a.id)) workerSeats.set(a.id, lowestFree(new Set(workerSeats.values())));
    }
    computeLayout();
    retarget();
  }

  function retarget() {
    const present = new Set(agents.map((a) => a.id));
    for (const a of agents) {
      const isManager = a.kind === 'session';
      const target = isManager ? managerSeat(managerSeats.get(a.id)) : workerSeat(workerSeats.get(a.id));
      let ch = chars.get(a.id);
      if (!ch) {
        // Workers are sent out by their manager; everyone else comes in through the door.
        const boss = chars.get(a.parentId);
        const start = boss ? { x: boss.x, y: boss.y + 4 } : door();
        ch = { id: a.id, x: start.x, y: start.y, phase: Math.random() * 10, looks: looksFor(a.id) };
        chars.set(a.id, ch);
      }
      const bossLooks = a.parentId ? looksFor(a.parentId) : null;
      Object.assign(ch, { agent: a, tx: target.x, ty: target.y, leaving: false, cap: bossLooks?.shirt });
    }
    for (const ch of chars.values()) {
      if (!present.has(ch.id) && !ch.leaving) {
        const d = door();
        Object.assign(ch, { leaving: true, tx: d.x, ty: d.y });
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

  function seatedChar(id) {
    const ch = id && chars.get(id);
    return ch && !ch.walking && !ch.leaving ? ch : null;
  }

  function frame(t, dt) {
    const now = Date.now() - clockSkew;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    step(dt);

    const scale = Math.min(cw / L.W, chh / L.H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, Math.round((cw - L.W * scale) / 2), Math.round((chh - L.H * scale) / 2));
    ctx.imageSmoothingEnabled = false;

    drawFloor(ctx, 0, WALL_H, L.W, L.H - WALL_H);
    rect(ctx, MARGIN, WALL_H + 4, L.W - MARGIN * 2, MANAGER_H - 8, C.carpet);
    rect(ctx, MARGIN, WALL_H + MANAGER_H - 5, L.W - MARGIN * 2, 1, C.carpetEdge);
    drawWall(ctx, L.W, WALL_H, door().x);
    drawPlant(ctx, L.W - 16, WALL_H + 4);

    const overlays = [];
    const runningBySession = new Map();
    for (const a of agents) {
      if (a.kind === 'subagent' && a.status !== 'done') runningBySession.set(a.parentId, (runningBySession.get(a.parentId) || 0) + 1);
    }

    // Managers
    const managerBySlot = new Map([...managerSeats].map(([id, s]) => [s, id]));
    for (let i = 0; i < L.mSlots; i++) {
      const id = managerBySlot.get(i);
      const ch = seatedChar(id);
      const a = ch?.agent;
      const cell = managerCell(i);
      const seat = managerSeat(i);
      const deskX = cell.cx - 28;
      drawChair(ctx, seat.x, seat.y);
      if (ch) drawPerson(ctx, ch.x, ch.y, ch.looks, { pose: a.status, t: t + i, seated: true });
      drawDesk(ctx, deskX, managerDeskY(), 56, { status: a?.status, t, seed: i });
      if (a) {
        const team = runningBySession.get(a.id);
        const statusText = STATUS_TEXT[a.status]?.(a, now) + (team ? ` · team ${team}` : '');
        drawNameplate(ctx, deskX, managerDeskY() + 18, cell.w - 4, a.title || `Manager ${i + 1}`, statusText, a.status, { light: true });
        overlays.push(() => drawStatusOverlay(ctx, ch.x, ch.y - 17, a, t, {
          maxW: cell.w - 4, minX: cell.x0, maxX: cell.x0 + cell.w,
          doneText: a.task ? `Klaar: ${a.task}` : 'Klaar!',
        }));
      }
    }

    // Workers
    const workerBySlot = new Map([...workerSeats].map(([id, s]) => [s, id]));
    for (let i = 0; i < L.cols * L.rows; i++) {
      const id = workerBySlot.get(i);
      const ch = seatedChar(id);
      const a = ch?.agent;
      const cell = workerCell(i);
      const seat = workerSeat(i);
      drawChair(ctx, seat.x, seat.y);
      if (ch) drawPerson(ctx, ch.x, ch.y, ch.looks, { pose: a.status, t: t + i * 0.7, seated: true, cap: ch.cap });
      drawDesk(ctx, cell.x0 + 6, cell.y0 + 36, 48, { status: a?.status, t, accent: ch?.cap, seed: i });
      if (a) {
        drawNameplate(ctx, cell.x0 + 4, cell.y0 + 54, CELL_W - 4, a.name, STATUS_TEXT[a.status]?.(a, now), a.status);
        overlays.push(() => drawStatusOverlay(ctx, ch.x, ch.y - 17, a, t, {
          maxW: CELL_W - 2, minX: cell.x0, maxX: cell.x0 + CELL_W, doneText: 'Klaar',
        }));
      }
    }

    // People walking around, back to front
    const walkers = [...chars.values()].filter((ch) => ch.walking || ch.leaving).sort((a, b) => a.y - b.y);
    for (const ch of walkers) {
      drawPerson(ctx, ch.x, ch.y + 3, ch.looks, { pose: 'walk', t, seated: false, walkPhase: ch.phase, cap: ch.cap });
    }

    for (const draw of overlays) draw();
  }

  return {
    setAgents,
    frame,
    size: () => ({ W: L.W, H: L.H }),
    isEmpty: () => chars.size === 0,
  };
}
