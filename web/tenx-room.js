// A 10x-team project office (ADR-006): departments with the 12 team roles, a meeting room for
// phase 0, a lounge, and a shared work floor for real subagents. Same interface as room.js.
import {
  C, looksFor, outfitFor, toolCategory, rect, drawFloor, drawBackWall, drawOuterWalls, drawDoor,
  drawWhiteboard, drawPlant, drawCoffeeMachine, drawSmallTable, drawChair, drawMonitor, drawDesk,
  drawPerson, drawBadge, drawBubble, drawNameplate, drawLighting, minutesSince, FONT,
} from './sprites.js';
import {
  ROLE_INFO, DEPTS, phasesFor, roleLooks, drawAccessory, drawFolder, drawZone,
  drawMeetingTable, drawTimeline, drawAdrFrame, drawBeacon, drawStamp,
} from './tenx-sprites.js';

const MARGIN = 8;
const WALL_H = 40;
const ZONE_W = 80;
const ZONE_H = 76;
// Zone grid per flavor: [col, row, span]. 10x-Team-Plus adds a Design department (ADR-007).
const LAYOUTS = {
  classic: {
    cols: 4,
    zones: { meeting: [0, 0], strategy: [1, 0], architecture: [2, 0], planning: [3, 0], engineering: [0, 1], quality: [1, 1], operations: [2, 1], lounge: [3, 1] },
  },
  plus: {
    cols: 5,
    zones: { meeting: [0, 0], strategy: [1, 0], design: [2, 0], architecture: [3, 0], planning: [4, 0], engineering: [0, 1], quality: [1, 1], operations: [2, 1], lounge: [3, 1, 2] },
  },
};
const MEETING_ROLES = ['product-manager', 'cto', 'ux-designer', 'architect', 'engineering-manager', 'qa'];
const CELL_W = 64;
const ROW_H = 66;
const WORK_COLS = 5;
const BOTTOM = 8;
const WALK_SPEED = 70;
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

export function createTenxRoom(canvas, { phase: getPhase, onRoleClick } = {}) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  const chars = new Map(); // 'm:<role>' for team members, agent id for subagents
  const workerSeats = new Map();
  const loungeSeats = new Map();
  const particles = [];
  const adrGlow = new Map(); // ADR number -> glow until (ms)
  let seenAdrs = null;
  let lastHandoff = null;
  let courier = null; // { role, stage, until, target }
  let agents = [];
  let tenx = {};
  let driven = new Map(); // role -> { agent, guessed }
  let meetingMode = false;
  let clockSkew = 0;
  let view = { scale: 1, ox: 0, oy: 0 };
  let L = {};

  let flavor = 'classic';
  let LAY = LAYOUTS.classic;
  let ZONE_ORDER = Object.keys(LAY.zones);
  let ROLES = Object.keys(ROLE_INFO).filter((r) => ROLE_INFO[r].dept !== 'design');
  let PH = phasesFor('classic');
  let W = MARGIN * 2 + LAY.cols * ZONE_W;
  const floorY = WALL_H + 2 + 2 * ZONE_H + 4;

  function computeLayout() {
    const desks = workerSeats.size ? Math.max(...workerSeats.values()) + 1 : 0;
    const need = desks + 1;
    const rows = Math.max(1, Math.ceil(need / WORK_COLS));
    L = { need, rows, W, H: floorY + rows * ROW_H + BOTTOM };
  }
  computeLayout();

  const zone = (name) => {
    const [col, row, span = 1] = LAY.zones[name];
    return { x: MARGIN + col * ZONE_W, y: WALL_H + 2 + row * ZONE_H, w: span * ZONE_W };
  };
  const door = () => ({ x: W - 20, y: WALL_H + 2 });
  function desk(role) {
    const dept = ROLE_INFO[role].dept;
    const z = zone(dept);
    const idx = DEPTS[dept].roles.indexOf(role);
    const x = z.x + 6 + idx * 38;
    const y = z.y + 46;
    return { x, y, w: 30, seat: { x: x + 8, y }, z };
  }
  function meetingSeat(i) {
    const z = zone('meeting');
    return i < 3 ? { x: z.x + 22 + i * 18, y: z.y + 44, seated: true } : { x: z.x + 22 + (i - 3) * 18, y: z.y + 70, seated: false };
  }
  function workerCell(i) {
    const areaX = MARGIN + Math.round((W - 2 * MARGIN - WORK_COLS * CELL_W) / 2);
    return { x0: areaX + (i % WORK_COLS) * CELL_W, y0: floorY + Math.floor(i / WORK_COLS) * ROW_H };
  }
  const workerSeat = (i) => { const c = workerCell(i); return { x: c.x0 + 22, y: c.y0 + 36 }; };
  function loungeSpot(i) {
    const z = zone('lounge');
    return [{ x: z.x + 16, y: z.y + 50 }, { x: z.x + 34, y: z.y + 54 }, { x: z.x + 16, y: z.y + 70 }, { x: z.x + 34, y: z.y + 72 }][i];
  }

  // The whole team is always in the office; Plus brings the two designers.
  function applyFlavor(next) {
    flavor = next === 'plus' ? 'plus' : 'classic';
    LAY = LAYOUTS[flavor];
    ZONE_ORDER = Object.keys(LAY.zones);
    ROLES = Object.keys(ROLE_INFO).filter((r) => flavor === 'plus' || ROLE_INFO[r].dept !== 'design');
    PH = phasesFor(flavor);
    W = MARGIN * 2 + LAY.cols * ZONE_W;
    for (const [id, ch] of [...chars]) if (ch.member && !ROLES.includes(ch.member)) chars.delete(id);
    for (const role of ROLES) {
      const s = desk(role).seat;
      const ch = chars.get(`m:${role}`);
      if (ch) { ch.x = s.x; ch.y = s.y; continue; } // the grid moved: everyone takes their seat again
      chars.set(`m:${role}`, {
        id: `m:${role}`, member: role, x: s.x, y: s.y, tx: s.x, ty: s.y, phase: Math.random() * 10,
        looks: roleLooks(role, looksFor(role)), outfit: ROLE_INFO[role].outfit, accent: ROLE_INFO[role].accent, lastSpark: 0,
      });
    }
    computeLayout();
  }
  applyFlavor('classic');

  const currentPhase = () => (Number.isInteger(tenx.phase) ? tenx.phase : null);

  function computeDriven() {
    driven = new Map();
    meetingMode = currentPhase() === 0;
    const sessions = agents.filter((a) => a.kind === 'session').sort((a, b) => a.updatedAt - b.updatedAt);
    for (const a of sessions) {
      const info = tenx.roles?.[a.id];
      let role = info?.role ?? PH.defaults[currentPhase() ?? PH.implPhase];
      if (role === 'meeting') { meetingMode = true; role = 'product-manager'; }
      if (!ROLE_INFO[role] || !ROLES.includes(role)) role = 'sde';
      driven.set(role, { agent: a, guessed: info ? info.guessed : true });
    }
  }

  function setAgents(list, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const present = new Set(list.map((a) => a.id));
    for (const seats of [workerSeats, loungeSeats]) {
      for (const id of [...seats.keys()]) if (!present.has(id)) seats.delete(id);
    }
    for (const a of list.filter((x) => x.kind === 'subagent').sort((x, y) => x.startedAt - y.startedAt)) {
      if (!workerSeats.has(a.id)) workerSeats.set(a.id, lowestFree(new Set(workerSeats.values())));
      if (a.status === 'done' && !loungeSeats.has(a.id)) {
        const spot = lowestFree(new Set(loungeSeats.values()));
        if (spot < 4) loungeSeats.set(a.id, spot);
      } else if (a.status !== 'done') loungeSeats.delete(a.id);
    }
    computeLayout();
    retarget();
  }

  function setTenx(info) {
    tenx = info || {};
    if ((tenx.flavor || 'classic') !== flavor) applyFlavor(tenx.flavor);
    const t = Date.now();
    const numbers = (tenx.adrs || []).map((a) => a.number || a.title);
    if (seenAdrs) for (const n of numbers) if (!seenAdrs.has(n)) adrGlow.set(n, t + 10_000);
    seenAdrs = new Set(numbers);
    if (lastHandoff !== null && tenx.handoffAt > lastHandoff) startCourier();
    lastHandoff = tenx.handoffAt || 0;
    retarget();
  }

  function startCourier() {
    computeDriven();
    const phase = currentPhase() ?? 0;
    const from = [...driven.keys()][0] || PH.defaults[phase];
    let toDept = PH.depts[phase];
    if (ROLE_INFO[from].dept === toDept || toDept === 'meeting') toDept = PH.depts[Math.min(PH.depts.length - 1, phase + 1)];
    const d = desk(DEPTS[toDept].roles[0]);
    courier = { role: from, stage: 'go', target: { x: d.x + 15, y: d.y + 22 } };
  }

  function retarget() {
    computeDriven();
    let m = 0;
    for (const role of ROLES) {
      const ch = chars.get(`m:${role}`);
      let target = desk(role).seat;
      ch.meetingSeat = null;
      if (meetingMode && MEETING_ROLES.includes(role)) {
        const s = meetingSeat(m++);
        target = s;
        ch.meetingSeat = s;
      }
      if (courier && courier.role === role) target = courier.stage === 'back' ? target : courier.target;
      ch.tx = target.x;
      ch.ty = target.y;
      ch.drive = driven.get(role) || null;
    }
    const present = new Set(agents.map((a) => a.id));
    for (const a of agents) {
      if (a.kind !== 'subagent') continue;
      const target = loungeSeats.has(a.id) ? loungeSpot(loungeSeats.get(a.id)) : workerSeat(workerSeats.get(a.id));
      let ch = chars.get(a.id);
      if (!ch) {
        // Sent out by the team member their session is playing.
        const bossRole = [...driven].find(([, d]) => d.agent.id === a.parentId)?.[0];
        const boss = bossRole && chars.get(`m:${bossRole}`);
        const start = boss ? { x: boss.x, y: boss.y + 4 } : door();
        ch = { id: a.id, x: start.x, y: start.y, phase: Math.random() * 10, looks: looksFor(a.id), lastSpark: 0 };
        chars.set(a.id, ch);
      }
      Object.assign(ch, {
        agent: a, tx: target.x, ty: target.y, leaving: false, accent: looksFor(a.parentId || a.id).shirt,
        outfit: outfitFor(a), inLounge: loungeSeats.has(a.id),
      });
    }
    for (const ch of chars.values()) {
      if (ch.member || present.has(ch.id) || ch.leaving) continue;
      const d = door();
      Object.assign(ch, { leaving: true, tx: d.x, ty: d.y, inLounge: false });
    }
  }

  function step(dt, t) {
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
    if (courier) {
      const ch = chars.get(`m:${courier.role}`);
      if (courier.stage === 'go' && !ch.walking) { courier.stage = 'wait'; courier.until = t + 1.5; }
      else if (courier.stage === 'wait' && t > courier.until) { courier.stage = 'back'; retarget(); }
      else if (courier.stage === 'back' && !ch.walking) { courier = null; retarget(); }
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

  const atHome = (ch) => !ch.walking && !ch.leaving && !ch.inLounge && !(ch.member && (ch.meetingSeat || courier?.role === ch.member));

  function drawOverlay(ch, agent, minX, maxX, maxW, t, doneText) {
    const headY = ch.y - (ch.seatedNow ? 17 : 20);
    const opts = { maxW, minX, maxX };
    if (agent.status === 'waiting') {
      drawBubble(ctx, ch.x + 10, headY - 2, agent.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
      if (Math.sin(t * 7) > -0.2) drawBadge(ctx, ch.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (agent.status === 'working') {
      drawBubble(ctx, ch.x + 10, headY - 2, agent.activity || 'Aan het werk', { ...opts, border: C.working });
    } else if (agent.status === 'done') {
      if (doneText) drawBubble(ctx, ch.x + 10, headY - 2, doneText, { ...opts, border: C.done });
      drawBadge(ctx, ch.x - 9, headY - 2, '✓', C.done, 7);
    }
  }

  function frame(t, dt) {
    const now = Date.now() - clockSkew;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    step(dt, t);
    const lightPhase = getPhase ? getPhase() : 'dag';
    const phase = currentPhase();
    const activeDept = meetingMode ? 'meeting' : phase !== null ? PH.depts[phase] : null;

    const scale = Math.min(cw / L.W, chh / L.H);
    view = { scale, ox: Math.round((cw - L.W * scale) / 2), oy: Math.round((chh - L.H * scale) / 2) };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;

    // ----- floor + departments -----
    drawFloor(ctx, 0, WALL_H, L.W, L.H - WALL_H);
    for (const name of ZONE_ORDER) {
      const z = zone(name);
      drawZone(ctx, z.x, z.y, z.w, ZONE_H, name, { active: name === activeDept && !tenx.complete, t });
    }
    ctx.font = `600 5px ${FONT}`;
    ctx.textBaseline = 'top';
    rect(ctx, MARGIN + 2, floorY - 3, 40, 7, 'rgba(0,0,0,.35)');
    ctx.fillStyle = '#ffffff';
    ctx.fillText('WERKVLOER', MARGIN + 4, floorY - 2);

    // ----- wall: task board, ADR frames, phase timeline, door -----
    drawBackWall(ctx, L.W, WALL_H);
    const lead = driven.get('product-manager')?.agent || [...driven.values()][0]?.agent;
    let board = lead?.task || '';
    if (meetingMode && lead?.status === 'waiting') board = `Vraag: ${lead.waitingReason || 'wacht op jouw antwoord'}`;
    const boardX = MARGIN + 4;
    const last = PH.depts.length - 1;
    const tlX = L.W - 34 - last * 12;
    const adrs = (tenx.adrs || []).slice(-Math.floor((tlX - 12 - (boardX + 66)) / 16));
    adrs.forEach((a, i) => drawAdrFrame(ctx, boardX + 66 + i * 16, 10, a.number, (adrGlow.get(a.number || a.title) || 0) > Date.now() && Math.sin(t * 6) > -0.3));
    if (!adrs.length) {
      ctx.font = `5px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillText('nog geen ADR', boardX + 68, 14);
    }
    ctx.font = `600 4px ${FONT}`;
    ctx.fillStyle = '#e4defa';
    ctx.textBaseline = 'top';
    ctx.fillText(tenx.complete ? 'FASE · KLAAR' : `FASE ${phase ?? '?'}`, tlX - 4, 5);
    drawTimeline(ctx, tlX, 20, { phase, done: tenx.done || [], complete: tenx.complete, last, t });
    drawDoor(ctx, door().x, WALL_H);
    if (tenx.gate) drawBeacon(ctx, door().x - 16, 8, t);
    drawOuterWalls(ctx, L.W, L.H, WALL_H);

    // ----- furniture and people, back to front -----
    const scene = [];
    const overlays = [];
    const lamps = [];
    const spots = [];

    const lz = zone('lounge');
    scene.push({ y: lz.y + 30, draw: () => drawCoffeeMachine(ctx, lz.x + lz.w - 22, lz.y + 12, t) });
    scene.push({ y: lz.y + 64, draw: () => drawSmallTable(ctx, lz.x + 19, lz.y + 58) });
    scene.push({ y: lz.y + 32, draw: () => drawPlant(ctx, lz.x + 6, lz.y + 12, t) });
    if (Math.random() < dt * 2) spawn(lz.x + lz.w - 16, lz.y + 18, 'rgba(255,255,255,.55)', 0, -8, 1);
    const mz = zone('meeting');
    scene.push({ y: mz.y + 56, draw: () => drawMeetingTable(ctx, mz.x + 10, mz.y + 46, 60) });
    for (let i = 0; i < 3; i++) { const s = meetingSeat(i); scene.push({ y: s.y - 3, draw: () => drawChair(ctx, s.x, s.y) }); }

    for (const role of ROLES) {
      const d = desk(role);
      const ch = chars.get(`m:${role}`);
      const drive = ch.drive;
      const a = drive?.agent;
      const busy = a && (a.status === 'working' || a.status === 'waiting');
      const home = atHome(ch);
      ch.seatedNow = home || (ch.meetingSeat?.seated && !ch.walking);
      scene.push({ y: d.seat.y - 3, draw: () => drawChair(ctx, d.seat.x, d.seat.y) });
      const pose = ch.walking ? 'walk' : a ? (a.status === 'idle' ? 'read' : a.status) : 'read';
      scene.push({
        y: ch.seatedNow ? ch.y - 2 : ch.y,
        draw: () => {
          drawPerson(ctx, ch.x, ch.y, ch.looks, { pose, t: t + d.x, seated: ch.seatedNow, walkPhase: ch.phase, outfit: ch.outfit, accent: ch.accent });
          drawAccessory(ctx, ch.x, ch.y, role, { seated: ch.seatedNow, pose, t });
          if (courier?.role === role && courier.stage !== 'back') drawFolder(ctx, ch.x, ch.y - (ch.seatedNow ? 19 : 22));
        },
      });
      const status = a?.status === 'waiting' ? 'waiting' : a?.status === 'done' ? 'done' : undefined;
      const category = home && a && a.status !== 'idle' ? toolCategory(a.tool) : 'idle';
      scene.push({
        y: d.y + 13,
        draw: () => {
          drawDesk(ctx, d.x, d.y, d.w, { compact: true, mug: home && a?.status === 'done', accent: busy ? C.working : null, t });
          drawMonitor(ctx, d.x + d.w - 16, d.y - 14, { category, status: home ? status : undefined, t, seed: d.x });
        },
      });
      if (busy && home && lightPhase !== 'dag') lamps.push({ x: ch.x, y: ch.y - 6 });
      if (a?.status === 'working' && ch.seatedNow && t - ch.lastSpark > 0.2) {
        ch.lastSpark = t;
        spawn(ch.x + Math.random() * 6 - 3, d.y, ['#ffffff', '#9fd6ff', '#f1fa8c'][Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 10, -16, 0.6);
      }
      if (a?.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 8 });
      const label = `${ROLE_INFO[role].label}${drive?.guessed ? ' ~' : ''}`;
      overlays.push(() => drawNameplate(ctx, d.x - 2, d.y + 18, 40, label, a ? STATUS_TEXT[a.status]?.(a, now) : '', a ? a.status : 'idle', { light: true }));
      if (a && !ch.walking) overlays.push(() => drawOverlay(ch, a, d.z.x - 14, d.z.x + ZONE_W + 14, 96, t, a.task ? `Klaar: ${a.task}` : 'Klaar!'));
    }

    // work floor: one desk per real subagent
    const workerBySlot = new Map([...workerSeats].map(([id, s]) => [s, id]));
    for (let i = 0; i < L.need; i++) {
      const id = workerBySlot.get(i);
      const ch = id ? chars.get(id) : null;
      const a = ch?.agent;
      const cell = workerCell(i);
      const seat = workerSeat(i);
      const seated = ch && !ch.walking && !ch.leaving && !ch.inLounge;
      scene.push({ y: seat.y - 3, draw: () => drawChair(ctx, seat.x, seat.y) });
      if (seated) {
        scene.push({ y: seat.y - 2, draw: () => drawPerson(ctx, ch.x, ch.y, ch.looks, { pose: a.status, t: t + i, seated: true, outfit: ch.outfit, accent: ch.accent }) });
        if (a.status === 'working' && t - ch.lastSpark > 0.2) { ch.lastSpark = t; spawn(cell.x0 + 30 + Math.random() * 6, cell.y0 + 36, '#9fd6ff', (Math.random() - 0.5) * 10, -16, 0.6); }
      }
      const status = seated ? (a.status === 'done' ? 'done' : a.status === 'waiting' ? 'waiting' : undefined) : undefined;
      const category = seated && a.status !== 'idle' ? toolCategory(a.tool) : 'idle';
      scene.push({
        y: cell.y0 + 49,
        draw: () => {
          drawDesk(ctx, cell.x0 + 6, cell.y0 + 36, 48, { accent: ch && !ch.leaving ? ch.accent : null, mug: seated && a.status === 'done', lampOn: seated && a.status === 'working' && lightPhase !== 'dag', t });
          drawMonitor(ctx, cell.x0 + 36, cell.y0 + 22, { category, status, t, seed: i + 20 });
        },
      });
      if (seated && a.status === 'working' && lightPhase !== 'dag') lamps.push({ x: cell.x0 + 10, y: cell.y0 + 32 });
      if (!a || ch.leaving) continue;
      if (a.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 8 });
      overlays.push(() => drawNameplate(ctx, cell.x0 + 4, cell.y0 + 54, CELL_W - 4, a.name, STATUS_TEXT[a.status]?.(a, now), a.status, { source: a.source }));
      if (seated) { ch.seatedNow = true; overlays.push(() => drawOverlay(ch, a, cell.x0, cell.x0 + CELL_W, CELL_W - 2, t, null)); }
    }

    // subagents walking or in the lounge
    for (const ch of chars.values()) {
      if (ch.member || (!ch.walking && !ch.leaving && !ch.inLounge)) continue;
      const lounging = ch.inLounge && !ch.walking;
      scene.push({
        y: ch.y,
        draw: () => drawPerson(ctx, ch.x, ch.y, ch.looks, {
          pose: lounging ? 'sip' : 'walk', t, seated: false, walkPhase: ch.phase, outfit: ch.outfit, accent: ch.accent, sipping: lounging && (t + ch.phase) % 6 < 1.2,
        }),
      });
      if (lounging) overlays.push(() => drawBadge(ctx, ch.x, ch.y - 25, '✓', C.done, 6));
    }

    scene.sort((a, b) => a.y - b.y);
    for (const item of scene) item.draw();

    // quieter light on departments that aren't on turn
    if (activeDept && !tenx.complete) {
      for (const name of ZONE_ORDER) {
        if (name === activeDept || name === 'lounge') continue;
        const z = zone(name);
        ctx.fillStyle = 'rgba(10,10,30,.14)';
        ctx.fillRect(z.x + 2, z.y + 2, z.w - 4, ZONE_H - 4);
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      rect(ctx, p.x, p.y, 1, 1, p.color);
    }
    ctx.globalAlpha = 1;

    drawLighting(ctx, shade, L.W, L.H, { phase: lightPhase, lamps, spots, t });

    // ----- information on top -----
    drawWhiteboard(ctx, boardX, 6, 60, 28, board, lead ? looksFor(lead.id).shirt : null);
    const qz = zone('quality');
    if (tenx.reviews?.qa) drawStamp(ctx, qz.x + 36, qz.y + 8, 'QA', tenx.reviews.qa);
    if (tenx.reviews?.security) drawStamp(ctx, qz.x + 54, qz.y + 18, 'SEC', tenx.reviews.security);
    if (tenx.gate) {
      ctx.font = `600 5px ${FONT}`;
      ctx.textBaseline = 'top';
      const msg = 'GATE OVERGESLAGEN';
      const w = Math.ceil(ctx.measureText(msg).width) + 6;
      if (Math.sin(t * 6) > -0.4) {
        rect(ctx, door().x - 18 - w, 29, w, 8, C.waiting); // below the phase timeline
        ctx.fillStyle = '#ffffff';
        ctx.fillText(msg, door().x - 15 - w, 30);
      }
    }
    for (const draw of overlays) draw();
  }

  // Click on a team member → read that role's latest decision.
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const lx = ((e.clientX - r.left) * dpr - view.ox) / view.scale;
    const ly = ((e.clientY - r.top) * dpr - view.oy) / view.scale;
    for (const ch of chars.values()) {
      if (!ch.member) continue;
      const top = ch.y - (ch.seatedNow ? 19 : 22);
      if (Math.abs(lx - ch.x) <= 9 && ly >= top - 2 && ly <= ch.y + 4) {
        e.stopPropagation();
        onRoleClick?.(ch.member);
        return;
      }
    }
  });

  return {
    kind: 'tenx',
    setAgents,
    setTenx,
    frame,
    size: () => ({ W: L.W, H: L.H }),
    isEmpty: () => ![...chars.values()].some((ch) => !ch.member),
  };
}
