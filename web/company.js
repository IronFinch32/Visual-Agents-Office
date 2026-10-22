// One company (ADR-016): every department with its permanent employees, a meeting room, flex desks
// for plain sessions and a lounge. Each work session is a project folder in its own colour that lies
// on the desk of the role working on it and is walked to the next desk when the role changes. A second
// project for a busy role gets a colleague; who has nothing to do takes coffee, darts, pool or table tennis.
import {
  C, looksFor, outfitFor, toolCategory, rect, drawFloor, drawBackWall, drawOuterWalls, drawDoor, drawPlant,
  drawCoffeeMachine, drawSmallTable, drawChair, drawMonitor, drawDesk, drawPerson, drawBadge, drawBubble,
  drawNameplate, drawLighting, FONT,
} from './sprites.js';
import {
  roleInfo, roleLooks, drawAccessory, drawFolder, drawZone, drawMeetingTable, drawBeacon, drawStamp, drawSofa,
  drawDartboard, drawDart, drawPoolTable, drawCue, POOL_W, POOL_H, drawPingPongTable, drawPaddle,
  drawPingPongBall, TT_W, TT_H, drawThought, drawSmoke, drawBanner,
} from './tenx-sprites.js';
import { createNav } from './nav.js';
import { fullCam, clampCam, viewFor, focusRect, zoomAt, panCam, stepCam, isZoomed } from './camera.js';
import { createPoolGame, POCKETS, BALL_R } from './pool.js';
import { createRally } from './pingpong.js';
import {
  WALL_H, SLOTS, TABLES, FLEX_PER_SPAN, companyLayout, deriveCases, unknownRoles, createStaffing,
  createProjectColors, shortName, bubbleHeader,
} from './company-model.js';

const WALK_SPEED = 60;
const MAX_PARTICLES = 160;
const QUIET_MS = 10 * 60 * 1000; // a quiet company hangs out in the lounge
const AWAY_MS = 60 * 60 * 1000; // ...and goes home after an hour
const FAIL_MS = 4000;
const HIGHLIGHT_S = 5;
const MAX_HANDOFFS = 3;
const COL_W = 38;

const LOUNGE_SPOTS = [[14, 48], [64, 48], [26, 64], [64, 66], [14, 104], [36, 104], [52, 122], [148, 112], [24, 124]];
const DART_BOARD = [38, 14];
const DART_SPOTS = [[31, 46], [47, 46]];
const DART_CHAT = ['180!', 'Bull!', 'Mis…', 'Dubbel 20!', 'Nog een potje?', 'Net ernaast'];
const POOL_TABLE = [90, 56];
const POOL_SPOTS = [[82, 78], [148, 78]];
const POOL_AIM = 1.1;
const POOL_CHAT = ['In de hoek!', 'Mooie bank!', 'Net niet', 'Zag je dat?', 'Nog een potje?'];
const TT_TABLE = [78, 98];
const TT_SPOTS = [[70, 112], [120, 112]];
const TT_CHAT = ['Punt!', 'Net!', 'Smash!', 'Uit…', 'Nog een potje?'];
const CHAT = ['☕', 'Mooi werk!', 'Nog koffie?', '…', 'Haha', 'Echt?'];
const ZONE_RUG = { flex: '#4f5a6e', other: '#5a5a5a' };

const DRAG_PX = 4;
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const STATUS_TEXT = { working: 'werkt', waiting: 'wacht op jou', done: 'klaar', idle: 'idle' };

export function createCompany(canvas, { phase: getPhase, onRoleClick, onHover, onZoomChange, onWantFocus } = {}) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  const dim = document.createElement('canvas');
  const chars = new Map(); // 'm:<role>:<slot>' employees, 'f:<sessionId>' flex managers, agent id for subagents
  const particles = [];
  const staffing = createStaffing();
  const colorOf = createProjectColors();
  let L = companyLayout(null);
  let layoutKey = '';
  let nav = null;
  let agents = [];
  let cases = [];
  let caseByKey = new Map();
  let staff = { place: new Map(), byRole: new Map(), piles: new Map(), tables: new Map(), tableOverflow: 0, flex: new Map(), flexOverflow: 0, moves: [] };
  let handoffs = []; // { key, giver, receiver, stage, until, label, color }
  let clockSkew = 0;
  let view = { scale: 1, ox: 0, oy: 0 };
  // camera (ADR-019): `cam` is drawn, `camTarget` is where it eases to
  let cam = fullCam(L.W, L.H);
  let camTarget = cam;
  let camZone = null; // department the camera was sent to by a click
  let zoomedBefore = false;
  let party = null; // { until, label }
  let highlight = null; // { key, until }
  let chatAt = 0;
  let quietNow = false;
  let lullNow = false;
  let shipped = new Set();
  let darts = { turn: 0, next: 0, stuck: [], flying: null };
  let pingpong = { rally: createRally(), players: '', swing: [0, 0], folded: null };
  let pool = { game: createPoolGame(), turn: 0, next: 0, shots: 0, shooter: null, stay: null, aim: 0, angle: 0, stance: null, by: null, held: null };

  // ---------- geometry ----------
  const zone = (id) => L.zones.find((z) => z.id === id);
  const deptZones = () => L.zones.filter((z) => z.kind === 'dept');
  const roles = () => deptZones().flatMap((z) => z.roles);
  const door = () => ({ x: L.W - 20, y: WALL_H + 3 });
  // slot 0 at the top of the zone, the colleague desk at the bottom; stools for subagents in between
  function desk(role, slot = 0) {
    const z = zone(L.roleDept.get(role));
    const i = z.roles.indexOf(role);
    const colX = z.x + 4 + i * COL_W;
    const x = colX + 2;
    const y = z.y + (slot ? 104 : 36);
    return { x, y, w: 30, colX, z, seat: { x: x + 8, y }, front: { x: x + 15, y: y + 24 } };
  }
  const stool = (role, k) => { const d = desk(role); return { x: d.colX + 7 + k * 11, y: d.z.y + 82 }; };
  function flexDesk(i) {
    const z = zone('flex');
    const perRow = Math.max(1, Math.floor((z.w - 4) / COL_W));
    const colX = z.x + 4 + (i % perRow) * COL_W;
    const x = colX + 2;
    const y = z.y + (Math.floor(i / perRow) ? 92 : 36);
    return { x, y, w: 30, seat: { x: x + 8, y }, front: { x: x + 15, y: y + 26 } };
  }
  const flexCapacity = () => { const z = zone('flex'); return Math.max(1, Math.floor((z.w - 4) / COL_W)) * 2; };
  function table(i) {
    const z = zone('meeting');
    const cw = (z.w - 12) / TABLES;
    const tw = 34;
    const tx = Math.round(z.x + 6 + i * cw + (cw - tw) / 2);
    const ty = z.y + 58;
    return { tx, ty, tw, seat: { x: tx + 10, y: ty - 4 }, guest: { x: tx + 24, y: ty - 4 }, front: { x: tx + tw / 2, y: ty + 26 } };
  }
  const lounge = () => zone('lounge');
  const loungeSpot = (i) => { const z = lounge(); const [dx, dy] = LOUNGE_SPOTS[i % LOUNGE_SPOTS.length]; return { x: z.x + dx, y: z.y + dy }; };
  const dartBoard = () => { const z = lounge(); return { x: z.x + DART_BOARD[0], y: z.y + DART_BOARD[1] }; };
  const dartSpot = (i) => { const z = lounge(); const [dx, dy] = DART_SPOTS[i]; return { x: z.x + dx, y: z.y + dy }; };
  const poolTable = () => { const z = lounge(); return { x: z.x + POOL_TABLE[0], y: z.y + POOL_TABLE[1] }; };
  const poolSpot = (i) => { const z = lounge(); const [dx, dy] = POOL_SPOTS[i]; return { x: z.x + dx, y: z.y + dy }; };
  const ttTable = () => { const z = lounge(); return { x: z.x + TT_TABLE[0], y: z.y + TT_TABLE[1] }; };
  const ttSpot = (i) => { const z = lounge(); const [dx, dy] = TT_SPOTS[i]; return { x: z.x + dx, y: z.y + dy }; };
  function poolStance(angle) {
    const tb = poolTable();
    const c = pool.game.cue();
    const bx = tb.x + 3 + c.x, by = tb.y + 3 + c.y;
    const z = lounge();
    let hx = bx, hy = by;
    for (let d = 6; d < 90; d++) {
      hx = bx - Math.cos(angle) * d;
      hy = by - Math.sin(angle) * d;
      if (hx <= tb.x - 5 || hx >= tb.x + POOL_W + 5 || hy <= tb.y - 12 || hy >= tb.y + POOL_H) break;
    }
    return { x: Math.max(z.x + 8, Math.min(z.x + z.w - 8, hx)), y: Math.max(z.y + 28, Math.min(z.y + 104, hy + 9)) };
  }

  function buildNav() {
    nav = createNav(L.W, L.H);
    nav.block(0, 0, L.W, WALL_H);
    nav.block(0, 0, 5, L.H);
    nav.block(L.W - 5, 0, 5, L.H);
    nav.block(0, L.H - 6, L.W, 6);
    for (const role of roles()) for (let s = 0; s < SLOTS; s++) { const d = desk(role, s); nav.block(d.x - 1, d.y + 2, d.w + 2, 14); }
    for (let i = 0; i < flexCapacity(); i++) { const d = flexDesk(i); nav.block(d.x - 1, d.y + 2, d.w + 2, 14); }
    for (let i = 0; i < TABLES; i++) { const m = table(i); nav.block(m.tx, m.ty, m.tw, 12); }
    const lz = lounge();
    nav.block(lz.x + lz.w - 24, lz.y + 18, 16, 18); // coffee machine
    nav.block(lz.x + 6, lz.y + 77, 38, 11); // sofa
    nav.block(lz.x + 44, lz.y + 58, 12, 7); // table
    nav.block(lz.x + DART_BOARD[0] - 5, lz.y + DART_BOARD[1] + 12, 10, 6);
    const pt = poolTable();
    nav.block(pt.x - 1, pt.y, POOL_W + 2, POOL_H + 6);
    const tt = ttTable();
    nav.block(tt.x, tt.y, TT_W, TT_H + 5);
  }

  function relayout(departments, extra) {
    const key = JSON.stringify([departments?.departments?.map((d) => [d.id, d.roles.map((r) => r.role)]) || null, extra]);
    if (key === layoutKey) return;
    layoutKey = key;
    L = companyLayout(departments, extra);
    buildNav();
    cam = clampCam(cam, L.W, L.H);
    camTarget = clampCam(camTarget, L.W, L.H);
    // employees whose role is gone leave; everybody else is put back at their desk
    for (const [id, ch] of [...chars]) {
      if (!ch.member) continue;
      if (!L.roleDept.has(ch.member)) { chars.delete(id); continue; }
      const s = desk(ch.member, ch.slot).seat;
      Object.assign(ch, { x: s.x, y: s.y, path: [], goal: null });
    }
    for (const role of roles()) ensureMember(role, 0, true);
  }

  function ensureMember(role, slot, atDesk) {
    const id = `m:${role}:${slot}`;
    let ch = chars.get(id);
    if (ch) { ch.leaving = false; return ch; }
    const s = atDesk ? desk(role, slot).seat : door();
    const info = roleInfo(role, roleTitle(role));
    ch = {
      id, member: role, slot, x: s.x, y: s.y, path: [], phase: Math.random() * 10, mode: 'home',
      looks: roleLooks(role, looksFor(slot ? `${role}#${slot}` : role)), outfit: info.outfit, accent: info.accent, lastSpark: 0,
    };
    chars.set(id, ch);
    return ch;
  }
  let titles = new Map();
  const roleTitle = (role) => titles.get(role) || role;
  const roleLabel = (role, slot) => `${roleInfo(role, roleTitle(role)).label}${slot ? ` ${slot + 1}` : ''}`;

  // ---------- movement ----------
  function goTo(ch, x, y) {
    if (ch.goal && Math.abs(ch.goal.x - x) < 0.5 && Math.abs(ch.goal.y - y) < 0.5) return;
    ch.goal = { x, y };
    ch.path = nav.findPath(ch.x, ch.y, x, y);
  }
  const arrived = (ch, p) => !ch.path.length && Math.hypot(ch.x - p.x, ch.y - p.y) < 1.5;

  function step(dt) {
    for (const ch of [...chars.values()]) {
      let move = WALK_SPEED * dt;
      while (move > 0 && ch.path.length) {
        const p = ch.path[0];
        const dx = p.x - ch.x;
        const dy = p.y - ch.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= move) { ch.x = p.x; ch.y = p.y; ch.path.shift(); move -= dist; } else { ch.x += (dx / dist) * move; ch.y += (dy / dist) * move; move = 0; }
      }
      ch.walking = ch.path.length > 0;
      if (ch.walking) ch.phase += dt * 8;
      if (ch.leaving && !ch.walking) chars.delete(ch.id);
      if (ch.mode === 'away' && !ch.walking) ch.hidden = true;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function spawn(x, y, color, vx, vy, life, g = 0) {
    if (particles.length < MAX_PARTICLES) particles.push({ x, y, color, vx, vy, life, max: life, g });
  }

  // ---------- data in ----------
  function setData(list, tenx = {}, departments = null, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const t = performance.now() / 1000;
    cases = deriveCases(list, tenx);
    titles = new Map((departments?.departments || []).flatMap((d) => d.roles.map((r) => [r.role, r.title])));
    relayout(departments, unknownRoles(cases, departments));
    for (const c of cases) c.color = colorOf(c.projectKey);
    caseByKey = new Map(cases.map((c) => [c.key, c]));
    staff = staffing.assign(cases, { flexCapacity: flexCapacity() });

    // colleagues come in through the door when needed and leave when their project moves on
    const needed = new Set(roles().map((r) => `m:${r}:0`));
    for (const [role, slots] of staff.byRole) {
      if (!L.roleDept.has(role)) continue;
      for (const slot of slots.values()) { needed.add(`m:${role}:${slot}`); ensureMember(role, slot, false); }
    }
    for (const move of staff.moves) startHandoff(move, t);
    neededMembers = needed;

    // a release party when a project ships
    for (const c of cases) {
      if (c.kind === 'tenx' && c.shipped && !shipped.has(c.key) && seenOnce) party = { until: t + 14, label: `SHIPPED! ${shortName(c.project, 14)}` };
    }
    shipped = new Set(cases.filter((c) => c.shipped).map((c) => c.key));
    seenOnce = true;

    // flex managers and subagents
    const present = new Set();
    for (const c of cases) {
      if (c.kind === 'flex') {
        const id = `f:${c.sessionId}`;
        present.add(id);
        let ch = chars.get(id);
        if (!ch) {
          const i = staff.flex.get(c.key);
          const s = i !== undefined ? flexDesk(i).seat : door();
          ch = { id, flex: true, x: s.x, y: s.y, path: [], phase: Math.random() * 10, looks: looksFor(c.sessionId), outfit: 'manager', lastSpark: 0 };
          chars.set(id, ch);
        }
        ch.case = c;
      }
      for (const a of c.subagents) {
        present.add(a.id);
        let ch = chars.get(a.id);
        if (!ch) {
          const boss = holderOf(c);
          const start = boss ? { x: boss.x, y: boss.y + 4 } : door();
          ch = { id: a.id, x: start.x, y: start.y, path: [], phase: Math.random() * 10, looks: looksFor(a.id), lastSpark: 0 };
          chars.set(a.id, ch);
        }
        Object.assign(ch, { agent: a, case: c, accent: c.color, outfit: outfitFor(a) });
      }
    }
    for (const ch of chars.values()) {
      if (ch.member || present.has(ch.id) || ch.leaving) continue;
      ch.leaving = true;
      goTo(ch, door().x, door().y);
    }
  }
  let seenOnce = false;
  let neededMembers = new Set();

  const memberId = (p) => `m:${p.role}:${p.pile ? 0 : p.slot}`;
  /** The employee who has this case now. */
  const holderOf = (c) => { const p = staff.place.get(c.key); return p ? chars.get(memberId(p)) : null; };
  /** The case an employee works on (the one in their slot; piles count for slot 0). */
  function caseOf(ch) {
    const slots = staff.byRole.get(ch.member);
    if (!slots) return null;
    for (const [key, slot] of slots) if (slot === ch.slot) return caseByKey.get(key) || null;
    return null;
  }

  function startHandoff(move, t) {
    const c = caseByKey.get(move.key);
    if (!c) return;
    const giver = memberId(move.from);
    const receiver = memberId(move.to);
    if (giver === receiver || !L.roleDept.has(move.from.role) || !L.roleDept.has(move.to.role)) return;
    handoffs = handoffs.filter((h) => h.giver !== giver && h.receiver !== giver && h.key !== move.key);
    if (handoffs.length >= MAX_HANDOFFS) return;
    ensureMember(move.from.role, move.from.pile ? 0 : move.from.slot, true);
    handoffs.push({ key: move.key, giver, receiver, stage: 'walk', until: t + 25, label: c.phaseName || 'werk', color: c.color });
  }

  // ---------- behaviour ----------
  /** Where an employee belongs when at work: their desk, or the meeting table of their case. */
  function homeOf(ch) {
    const c = caseOf(ch);
    const p = c && staff.place.get(c.key);
    if (p?.meeting && p.table !== undefined) return table(p.table).seat;
    return desk(ch.member, ch.slot).seat;
  }

  function think(t, dt) {
    const now = Date.now() - clockSkew;
    const partyOn = party && party.until > t;
    if (party && !partyOn) party = null;
    if (highlight && highlight.until < t) highlight = null;
    handoffs = handoffs.filter((h) => h.until > t && h.stage !== 'gone');
    // a colleague nobody needs any more (and who isn't carrying a folder) goes home
    const busyHandoff = new Set(handoffs.flatMap((h) => [h.giver, h.receiver]));
    for (const ch of chars.values()) {
      if (ch.member && !ch.leaving && !neededMembers.has(ch.id) && !busyHandoff.has(ch.id)) { ch.leaving = true; ch.mode = 'leave'; ch.carry = null; goTo(ch, door().x, door().y); }
    }
    const idle = agents.every((a) => a.status !== 'working' && a.status !== 'waiting');
    const silentFor = (ms) => idle && agents.every((a) => now - (a.updatedAt || 0) > ms);
    const quiet = !agents.length || silentFor(AWAY_MS);
    const lull = !quiet && silentFor(QUIET_MS);
    quietNow = quiet;
    lullNow = lull;

    const taken = new Map(); // lounge spot -> id
    for (const ch of chars.values()) {
      if (!ch.agent || ch.leaving) continue;
      if (ch.agent.status === 'done') {
        const spot = ch.loungeSpot ?? [...Array(LOUNGE_SPOTS.length).keys()].find((i) => !taken.has(i));
        if (spot !== undefined) { taken.set(spot, ch.id); ch.loungeSpot = spot; ch.inLounge = true; } else ch.inLounge = false;
      } else { ch.loungeSpot = undefined; ch.inLounge = false; }
    }
    const takeLounge = (ch) => {
      if (ch.loungeSpot !== undefined && !taken.has(ch.loungeSpot)) { taken.set(ch.loungeSpot, ch.id); return ch.loungeSpot; }
      const i = [...Array(LOUNGE_SPOTS.length).keys()].find((k) => !taken.has(k));
      if (i !== undefined) { taken.set(i, ch.id); ch.loungeSpot = i; }
      return i;
    };

    const members = [...chars.values()].filter((c) => c.member && !c.leaving);
    const inLounge = (mb) => mb.mode === 'coffee' || mb.mode === 'darts' || mb.mode === 'pool' || mb.mode === 'pingpong';
    let loungeCount = members.filter(inLounge).length;
    const dartsTaken = new Set(members.filter((mb) => mb.mode === 'darts' && t < mb.modeUntil).map((mb) => mb.dartSpot));
    const poolTaken = new Set(members.filter((mb) => mb.mode === 'pool' && t < mb.modeUntil).map((mb) => mb.poolSpot));
    const ttTaken = new Set(members.filter((mb) => mb.mode === 'pingpong' && t < mb.modeUntil).map((mb) => mb.ttSpot));
    for (const ch of members) {
      const c = caseOf(ch);
      const busy = c && (c.status === 'working' || c.status === 'waiting');
      const h = handoffs.find((x) => x.giver === ch.id || x.receiver === ch.id);
      let mode = 'home';
      if (quiet) mode = 'away';
      else if (h) mode = 'handoff';
      else if (busy) mode = 'home';
      else if (partyOn) mode = 'party';
      else if (inLounge(ch) && t < ch.modeUntil) mode = ch.mode;
      else if (loungeCount < (lull ? 8 : 4) && Math.random() < dt / (lull ? 8 : c ? 40 : 25)) {
        const free = [0, 1].find((i) => !dartsTaken.has(i));
        const freeCue = [0, 1].find((i) => !poolTaken.has(i));
        const freeBat = [0, 1].find((i) => !ttTaken.has(i));
        const r = Math.random();
        if (free !== undefined && r < 0.25) { mode = 'darts'; ch.dartSpot = free; dartsTaken.add(free); }
        else if (freeCue !== undefined && r < 0.5) { mode = 'pool'; ch.poolSpot = freeCue; poolTaken.add(freeCue); }
        else if (freeBat !== undefined && r < 0.75) { mode = 'pingpong'; ch.ttSpot = freeBat; ttTaken.add(freeBat); }
        else mode = 'coffee';
        ch.modeUntil = t + (lull ? 15 + Math.random() * 20 : 12 + Math.random() * 13);
        loungeCount++;
      }
      if (ch.mode === 'away' && mode !== 'away') { ch.hidden = false; const dd = door(); Object.assign(ch, { x: dd.x, y: dd.y, path: [], goal: null }); }
      ch.mode = mode;
      ch.seatAt = null;
      if (mode === 'home') { const s = homeOf(ch); goTo(ch, s.x, s.y); ch.seatAt = s; }
      else if (mode === 'away') goTo(ch, door().x, door().y);
      else if (mode === 'coffee' || mode === 'party') { const i = takeLounge(ch); const s = i !== undefined ? loungeSpot(i) : homeOf(ch); goTo(ch, s.x, s.y); }
      else if (mode === 'darts') { const s = dartSpot(ch.dartSpot); goTo(ch, s.x, s.y); }
      else if (mode === 'pool') { const s = (pool.shooter === ch || pool.stay === ch) && pool.stance ? pool.stance : poolSpot(ch.poolSpot); goTo(ch, s.x, s.y); }
      else if (mode === 'pingpong') { const s = ttSpot(ch.ttSpot); goTo(ch, s.x, s.y); }
      else if (mode === 'handoff') runHandoff(ch, h, t);
      if (mode !== 'coffee' && mode !== 'party') ch.loungeSpot = undefined;
      if (mode !== 'darts') ch.dartSpot = undefined;
      if (mode !== 'pool') ch.poolSpot = undefined;
      if (mode !== 'pingpong') ch.ttSpot = undefined;
    }
    playDarts(members.filter((mb) => mb.mode === 'darts' && !mb.walking && !mb.hidden), t);
    playPool(members.filter((mb) => mb.mode === 'pool' && !mb.hidden), t, dt);
    playPingPong(members.filter((mb) => mb.mode === 'pingpong' && !mb.walking && !mb.hidden), t);

    // flex managers sit at their desk; subagents on a stool next to whoever has their case
    const stools = new Map(); // role -> used stool indexes
    for (const ch of chars.values()) {
      if (ch.member || ch.leaving) continue;
      if (quiet) { goTo(ch, door().x, door().y); continue; }
      if (ch.flex) {
        const i = staff.flex.get(ch.case.key);
        ch.flexIndex = i;
        if (i === undefined) { ch.overflow = true; continue; }
        ch.overflow = false;
        const s = flexDesk(i).seat;
        goTo(ch, s.x, s.y);
        ch.seatAt = s;
        continue;
      }
      if (ch.inLounge) { const s = loungeSpot(ch.loungeSpot); goTo(ch, s.x, s.y); continue; }
      ch.seatAt = null;
      ch.overflow = false;
      const c = ch.case;
      if (c.kind === 'flex') {
        const i = staff.flex.get(c.key);
        if (i === undefined) { ch.overflow = true; continue; }
        const used = stools.get(c.key) || 0;
        stools.set(c.key, used + 1);
        if (used > 1) { ch.overflow = true; continue; }
        const f = flexDesk(i).front;
        goTo(ch, f.x - 6 + used * 12, f.y);
        continue;
      }
      const p = staff.place.get(c.key);
      if (!p) { ch.overflow = true; continue; }
      if (p.meeting) {
        const m = p.table !== undefined ? table(p.table) : null;
        const used = stools.get(c.key) || 0;
        stools.set(c.key, used + 1);
        if (!m || used > 1) { ch.overflow = true; continue; }
        goTo(ch, m.front.x - 6 + used * 12, m.front.y);
        continue;
      }
      if (p.pile || !L.roleDept.has(p.role)) { ch.overflow = true; continue; }
      // the main desk takes stools from the left, the colleague from the right
      const used = stools.get(p.role) || new Set();
      stools.set(p.role, used);
      const order = p.slot ? [2, 1, 0] : [0, 1, 2];
      const k = order.find((i) => !used.has(i));
      if (k === undefined) { ch.overflow = true; continue; }
      used.add(k);
      const s = stool(p.role, k);
      goTo(ch, s.x, s.y);
      ch.seatAt = s;
    }
  }

  function runHandoff(ch, h, t) {
    const receiver = chars.get(h.receiver);
    const target = receiver ? homeOf(receiver) : null;
    if (!target) { h.stage = 'gone'; return; }
    if (ch.id === h.receiver) {
      goTo(ch, target.x, target.y);
      ch.seatAt = h.stage === 'walk' ? target : null;
      if (h.stage === 'exchange' && !ch.say) ch.say = { text: 'Ik pak het op!', until: h.until };
      return;
    }
    const front = { x: target.x + 7, y: target.y + 24 };
    if (h.stage === 'walk') {
      ch.carry = h.color;
      goTo(ch, front.x, front.y);
      if (arrived(ch, front)) {
        h.stage = 'exchange';
        h.until = t + 2.4;
        ch.say = { text: `Overdracht: ${h.label}`, until: t + 2.4 };
      }
    } else if (h.stage === 'exchange' && t > h.until - 0.1) {
      ch.carry = null;
      h.stage = 'gone';
      ch.mode = 'coffee';
      ch.modeUntil = t + 12;
    }
  }

  function playDarts(players, t) {
    const f = darts.flying;
    if (f && t >= f.start + f.dur) {
      if (darts.stuck.length >= 3) darts.stuck = [];
      darts.stuck.push({ x: f.to.x, y: f.to.y, color: f.color });
      darts.flying = null;
      if (darts.stuck.length === 3 && Math.random() < 0.35) f.by.say = { text: DART_CHAT[Math.floor(Math.random() * DART_CHAT.length)], until: t + 1.8 };
    }
    if (!players.length || darts.flying || t < darts.next) return;
    const p = players.sort((a, b) => a.dartSpot - b.dartSpot)[darts.turn++ % players.length];
    const b = dartBoard();
    const r = Math.random() < 0.12 ? 7 : Math.random() * 5;
    const ang = Math.random() * Math.PI * 2;
    const info = roleInfo(p.member);
    p.throwUntil = t + 0.3;
    darts.flying = { from: { x: p.x + 4, y: p.y - 24 }, to: { x: b.x + Math.cos(ang) * r, y: b.y + Math.sin(ang) * r - 3 }, start: t + 0.1, dur: 0.22, color: info.accent || info.shirt, by: p };
    darts.next = t + 1.3 + Math.random() * 0.7;
  }

  function playPool(players, t, dt) {
    const g = pool.game;
    for (const e of g.step(dt)) {
      const by = pool.by;
      if (by && Math.random() < (e.type === 'scratch' ? 0.7 : 0.45)) by.say = { text: e.type === 'scratch' ? 'Scratch…' : POOL_CHAT[Math.floor(Math.random() * POOL_CHAT.length)], until: t + 1.8 };
    }
    if (!players.includes(pool.stay)) pool.stay = null;
    const s = pool.shooter;
    if (s && !players.includes(s)) { pool.shooter = null; pool.aim = 0; }
    else if (s) {
      if (s.walking || g.moving()) return;
      if (!pool.aim) pool.aim = t;
      if (t >= pool.aim + POOL_AIM) {
        g.shoot(pool.angle, 55 + Math.random() * 35);
        Object.assign(pool, { shots: pool.shots + 1, by: s, stay: s, shooter: null, aim: 0, next: t + 1.2 });
      }
      return;
    }
    if (g.moving() || t < pool.next) return;
    if (!g.left() || pool.shots >= 14) { g.rack(); Object.assign(pool, { shots: 0, next: t + 1.5, stay: null }); return; }
    const ready = players.filter((p) => !p.walking).sort((a, b) => a.poolSpot - b.poolSpot);
    if (!ready.length) return;
    const p = ready[pool.turn++ % ready.length];
    if (g.cue().in) g.respot();
    const c = g.cue();
    const targets = g.balls.filter((b) => !b.in && b.id !== 'cue');
    const tb = targets[Math.floor(Math.random() * targets.length)];
    pool.angle = Math.atan2(tb.y - c.y, tb.x - c.x) + (Math.random() - 0.5) * 0.3;
    Object.assign(pool, { shooter: p, stay: null, aim: 0, stance: poolStance(pool.angle) });
  }

  // table tennis (ADR-021): a new rally whenever the players at the table change
  function playPingPong(players, t) {
    const pp = pingpong;
    const key = players.map((p) => `${p.id}@${p.ttSpot}`).sort().join();
    if (key !== pp.players) {
      pp.players = key;
      pp.folded = players.length === 1 ? 1 - players[0].ttSpot : null; // practising against the other half
      if (!players.length) pp.rally.stop();
      else {
        const side = players.length === 1 ? players[0].ttSpot : Math.round(Math.random());
        pp.rally.serve(t, side, players.length === 1);
        pp.swing[side] = t;
      }
    }
    for (const e of pp.rally.update(t)) {
      if (e.type === 'hit') { pp.swing[e.side] = t; continue; }
      const by = players.find((p) => p.ttSpot === e.side);
      if (e.type === 'point' && by && Math.random() < 0.45) by.say = { text: TT_CHAT[Math.floor(Math.random() * TT_CHAT.length)], until: t + 1.8 };
      if (e.type === 'miss' && by && Math.random() < 0.3) by.say = { text: 'Oeps', until: t + 1.8 };
    }
  }

  function cueLine(ch, t) {
    const tb = poolTable();
    const c = pool.game.cue();
    const bx = tb.x + 3 + c.x, by = tb.y + 3 + c.y;
    const hx = ch.x, hy = ch.y - 9;
    const len = Math.hypot(bx - hx, by - hy) || 1;
    const ux = (bx - hx) / len, uy = (by - hy) / len;
    const k = pool.aim ? Math.min(1, (t - pool.aim) / POOL_AIM) : 0;
    const pull = k < 0.8 ? (4 * k) / 0.8 : 4 * (1 - (k - 0.8) / 0.2);
    const gap = BALL_R + 1 + pull;
    return { x1: hx - ux * (pull + 4), y1: hy - uy * (pull + 4), x2: bx - ux * gap, y2: by - uy * gap };
  }

  // ---------- drawing ----------
  function drawSay(ch, t) {
    if (!ch.say || ch.say.until < t || ch.hidden) return;
    drawBubble(ctx, ch.x + 6, ch.y - (ch.seatedNow ? 19 : 22), ch.say.text, { maxW: 110, minX: 0, maxX: L.W, border: '#f1c40f', bold: true });
  }

  function drawAgentBubble(ch, a, t, doneText, c) {
    const headY = ch.y - (ch.seatedNow ? 17 : 20);
    const opts = { maxW: 110, minX: 0, maxX: L.W, header: bubbleHeader(c) };
    if (a.status === 'waiting') {
      drawBubble(ctx, ch.x + 10, headY - 2, a.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
      if (Math.sin(t * 7) > -0.2) drawBadge(ctx, ch.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (a.status === 'working') {
      if (/^denkt na/i.test(a.activity || '')) drawThought(ctx, ch.x + 4, headY - 1, t);
      else drawBubble(ctx, ch.x + 10, headY - 2, a.activity || 'Aan het werk', { ...opts, border: C.working });
    } else if (a.status === 'done' && doneText) {
      drawBubble(ctx, ch.x + 10, headY - 2, doneText, { ...opts, border: C.done });
    }
  }

  function drawProjectTag(x, y, c, maxW = 34) {
    ctx.font = `4px ${FONT}`;
    ctx.textBaseline = 'top';
    rect(ctx, x, y + 0.5, 3, 3, c.color);
    ctx.fillStyle = '#ffffff';
    let s = shortName(c.feature ? `${c.project} · ${c.feature}` : c.project, 18);
    while (s.length > 1 && ctx.measureText(s).width > maxW - 5) s = `${s.slice(0, -2)}…`;
    ctx.fillText(s, x + 5, y);
  }

  function frame(t, dt) {
    const now = Date.now() - clockSkew;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    think(t, dt);
    step(dt);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    const quiet = quietNow;
    const lightPhase = quiet ? 'nacht' : getPhase ? getPhase() : 'dag';
    const partyOn = party && party.until > t;
    cam = reducedMotion.matches ? camTarget : stepCam(cam, camTarget, dt);
    view = viewFor(cam, L.W, L.H, cw, chh);
    const { scale } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;

    // ----- floor, zones, wall -----
    drawFloor(ctx, 0, WALL_H, L.W, L.H - WALL_H);
    const busyDepts = new Set(cases.filter((c) => c.kind === 'tenx' && !c.shipped && c.status === 'working').map((c) => (c.meeting ? 'meeting' : L.roleDept.get(c.role))));
    if (cases.some((c) => c.kind === 'flex' && c.status === 'working')) busyDepts.add('flex');
    for (const z of L.zones) drawZone(ctx, z.x, z.y, z.w, z.h, z.id, { active: busyDepts.has(z.id) && !quiet, t, label: z.label, rug: ZONE_RUG[z.id] });
    drawBackWall(ctx, L.W, WALL_H);
    rect(ctx, 10, 5, 52, 11, '#b8902f');
    rect(ctx, 11, 6, 50, 9, '#ecd27a');
    ctx.font = `600 5px ${FONT}`;
    ctx.fillStyle = '#3a2a10';
    ctx.textBaseline = 'top';
    ctx.fillText('10x BEDRIJF', 15, 8);
    drawDoor(ctx, door().x, WALL_H);
    drawOuterWalls(ctx, L.W, L.H, WALL_H);

    const scene = [];
    const overlays = [];
    const lamps = [];
    const spots = [];
    const glow = []; // highlight holes: { x, y, w, h, color }
    const hl = highlight ? (c) => c && (c.key === highlight.key || c.projectKey === highlight.key) : () => false;

    // ----- lounge furniture -----
    const lz = lounge();
    scene.push({ y: lz.y + 36, draw: () => drawCoffeeMachine(ctx, lz.x + lz.w - 22, lz.y + 16, t) });
    scene.push({ y: lz.y + 65, draw: () => drawSmallTable(ctx, lz.x + 44, lz.y + 58) });
    scene.push({ y: lz.y + 88, draw: () => drawSofa(ctx, lz.x + 8, lz.y + 77, 34) });
    scene.push({ y: lz.y + 34, draw: () => drawPlant(ctx, lz.x + 6, lz.y + 14, t) });
    const pt = poolTable();
    scene.push({ y: pt.y + POOL_H + 4, draw: () => drawPoolTable(ctx, pt.x, pt.y, pool.game.balls, POCKETS) });
    const sh = pool.shooter;
    if (sh && !sh.walking && !sh.hidden) pool.held = cueLine(sh, t);
    if ((sh && !sh.walking && !sh.hidden) || (pool.stay && !pool.stay.walking && pool.held)) { const h = pool.held; overlays.push(() => drawCue(ctx, h.x1, h.y1, h.x2, h.y2)); }
    for (const ch of chars.values()) {
      if (ch.mode !== 'pool' || ch.walking || ch.hidden || ch === sh || ch === pool.stay) continue;
      overlays.push(() => drawCue(ctx, ch.x + 6, ch.y - 22, ch.x + 6, ch.y - 2));
    }
    const tt = ttTable();
    const ttFolded = pingpong.folded;
    scene.push({ y: tt.y + TT_H + 4, draw: () => drawPingPongTable(ctx, tt.x, tt.y, ttFolded) });
    for (const ch of chars.values()) {
      if (ch.mode !== 'pingpong' || ch.walking || ch.hidden || ch.ttSpot === undefined) continue;
      const dir = ch.ttSpot ? -1 : 1;
      const reach = t - pingpong.swing[ch.ttSpot] < 0.15 ? 2 : 0;
      overlays.push(() => drawPaddle(ctx, ch.x + dir * (6 + reach), ch.y - 10));
    }
    const ball = pingpong.rally.ball(t);
    if (ball) {
      const onTable = ball.u >= 0 && ball.u <= 1;
      const bx = tt.x + ball.u * TT_W;
      const top = tt.y + 2 + ball.v * (TT_H - 4);
      overlays.push(() => drawPingPongBall(ctx, bx, top - ball.h, onTable ? top : top + 6));
    }
    const db = dartBoard();
    scene.push({ y: db.y + 17, draw: () => drawDartboard(ctx, db.x, db.y, darts.stuck) });
    const fl = darts.flying;
    if (fl && t >= fl.start) {
      const k = Math.min(1, (t - fl.start) / fl.dur);
      overlays.push(() => drawDart(ctx, fl.from.x + (fl.to.x - fl.from.x) * k, fl.from.y + (fl.to.y - fl.from.y) * k, fl.color));
    }
    if (Math.random() < dt * 2) spawn(lz.x + lz.w - 16, lz.y + 22, 'rgba(255,255,255,.55)', 0, -8, 1);

    // ----- meeting tables with their project's folder -----
    const transit = new Set(handoffs.filter((h) => h.stage !== 'gone').map((h) => h.key));
    for (let i = 0; i < TABLES; i++) {
      const m = table(i);
      const key = [...staff.tables].find(([, n]) => n === i)?.[0];
      const c = key && caseByKey.get(key);
      scene.push({ y: m.ty + 12, draw: () => { drawMeetingTable(ctx, m.tx, m.ty, m.tw); if (c && !transit.has(c.key)) drawFolder(ctx, m.tx + m.tw / 2, m.ty + 6, c.color); } });
      scene.push({ y: m.seat.y - 3, draw: () => drawChair(ctx, m.seat.x, m.seat.y) });
      scene.push({ y: m.guest.y - 3, draw: () => drawChair(ctx, m.guest.x, m.guest.y) });
      if (c) {
        overlays.push(() => drawProjectTag(m.tx, m.ty + 14, c, m.tw + 6));
        if (hl(c)) glow.push({ x: m.tx - 4, y: m.ty - 24, w: m.tw + 8, h: 46, color: c.color });
      }
    }
    if (staff.tableOverflow) overlays.push(() => { const z = zone('meeting'); ctx.font = `600 5px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(`+${staff.tableOverflow} vergadering`, z.x + z.w - 50, z.y + 5); });

    const drawChar = (ch, role, pose, seated) => () => {
      drawPerson(ctx, ch.x, ch.y, ch.looks, { pose, t: t + ch.x, seated, walkPhase: ch.phase, outfit: ch.outfit, accent: ch.accent, sipping: pose === 'sip' && (t + ch.phase) % 6 < 1.2, throwing: pose === 'throw' && ch.throwUntil > t });
      if (role) drawAccessory(ctx, ch.x, ch.y, role, { seated, pose, t });
      if (ch.carry) drawFolder(ctx, ch.x, ch.y - (seated ? 19 : 22), ch.carry);
    };
    const poseOf = (ch, a, home) => {
      const failed = a?.failedAt && now - a.failedAt < FAIL_MS;
      if (ch.walking) return 'walk';
      if (ch.mode === 'coffee' || ch.mode === 'party') return 'sip';
      if (ch.mode === 'darts') return 'throw';
      if (ch.mode === 'pingpong') return 'stand';
      if (ch.mode === 'pool') return ch === pool.shooter || ch === pool.stay ? 'cue' : 'stand';
      if (failed && home) return 'stretch';
      if (ch.seatedNow) return a && home ? (a.status === 'idle' ? 'read' : a.status) : 'read';
      return a?.status === 'waiting' && home ? 'waiting' : 'stand';
    };

    // ----- departments: desks, employees, folders -----
    for (const z of deptZones()) {
      for (const role of z.roles) {
        for (let slot = 0; slot < SLOTS; slot++) {
          const d = desk(role, slot);
          const ch = chars.get(`m:${role}:${slot}`);
          if (slot && !ch) continue; // the colleague desk only when somebody needs it
          const c = ch ? caseOf(ch) : null;
          const p = c && staff.place.get(c.key);
          const atTable = p?.meeting;
          const a = c?.agent;
          if (ch) ch.seatedNow = !ch.walking && !!ch.seatAt && Math.hypot(ch.x - ch.seatAt.x, ch.y - ch.seatAt.y) < 1;
          const home = ch && ch.mode === 'home' && !ch.walking;
          const atDesk = home && !atTable;
          const busy = atDesk && a?.status === 'working';
          const failed = a?.failedAt && now - a.failedAt < FAIL_MS;
          scene.push({ y: d.seat.y - 3, draw: () => drawChair(ctx, d.seat.x, d.seat.y) });
          const pile = slot === 0 ? staff.piles.get(role)?.map((k) => caseByKey.get(k)).filter(Boolean) || [] : [];
          const folder = c && !atTable && !transit.has(c.key) ? c.color : null;
          scene.push({
            y: d.y + 13,
            draw: () => {
              drawDesk(ctx, d.x, d.y, d.w, { compact: true, mug: atDesk && a?.status === 'done', accent: c && !atTable ? c.color : null, t });
              drawMonitor(ctx, d.x + d.w - 16, d.y - 14, { category: atDesk && a && a.status !== 'idle' ? toolCategory(a.tool) : 'idle', status: atDesk && a ? (a.status === 'waiting' ? 'waiting' : a.status === 'done' ? 'done' : undefined) : undefined, t, seed: d.x });
              pile.forEach((pc, i) => drawFolder(ctx, d.x + 4, d.y + 1 - i * 2, pc.color));
              if (folder) drawFolder(ctx, d.x + 9, d.y + 1, folder);
            },
          });
          if (pile.length) overlays.push(() => { ctx.font = `600 5px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.fillText(`+${pile.length}`, d.x + 1, d.y - 12); });
          if (ch && !ch.hidden) scene.push({ y: ch.seatedNow ? ch.y - 2 : ch.y, draw: drawChar(ch, role, poseOf(ch, a, home), ch.seatedNow) });
          // nameplate: role, and the project it works on
          overlays.push(() => {
            drawNameplate(ctx, d.colX, d.y + 18, COL_W, roleLabel(role, slot), '', a ? a.status : 'idle', { light: true });
            if (c) drawProjectTag(d.colX, d.y + 25, c, COL_W);
          });
          if (!ch) continue;
          if (c?.gate && atDesk) overlays.push(() => drawBeacon(ctx, d.x + d.w + 2, d.y - 10, t));
          if (c && atDesk && (role === 'qa' || role === 'security') && c.reviews?.[role]) overlays.push(() => drawStamp(ctx, d.x - 1, d.y - 22, role === 'qa' ? 'QA' : 'SEC', c.reviews[role]));
          if (busy && lightPhase !== 'dag') lamps.push({ x: ch.x, y: ch.y - 6 });
          if (busy && !failed && t - ch.lastSpark > 0.2) { ch.lastSpark = t; spawn(ch.x + Math.random() * 6 - 3, d.y, ['#ffffff', '#9fd6ff', '#f1fa8c'][Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 10, -16, 0.6); }
          if (failed && atDesk) overlays.push(() => drawSmoke(ctx, ch.x, ch.y - 18, (now - a.failedAt) / 1000));
          if (a && home && !ch.hidden) {
            if (a.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 10 });
            overlays.push(() => drawAgentBubble(ch, a, t, a.task ? `Klaar: ${a.task}` : null, c));
          }
          overlays.push(() => drawSay(ch, t));
          if (hl(c)) glow.push(atTable ? null : { x: d.colX - 1, y: d.y - 24, w: COL_W, h: 56, color: c.color });
        }
      }
    }
    // ----- flex desks -----
    for (let i = 0; i < flexCapacity(); i++) {
      const d = flexDesk(i);
      const key = [...staff.flex].find(([, n]) => n === i)?.[0];
      const c = key && caseByKey.get(key);
      const ch = c && chars.get(`f:${c.sessionId}`);
      const a = c?.agent;
      if (ch) ch.seatedNow = !ch.walking && !!ch.seatAt && Math.hypot(ch.x - ch.seatAt.x, ch.y - ch.seatAt.y) < 1;
      const home = ch && ch.seatedNow;
      scene.push({ y: d.seat.y - 3, draw: () => drawChair(ctx, d.seat.x, d.seat.y) });
      scene.push({
        y: d.y + 13,
        draw: () => {
          drawDesk(ctx, d.x, d.y, d.w, { compact: true, mug: home && a?.status === 'done', accent: c ? c.color : null, t });
          drawMonitor(ctx, d.x + d.w - 16, d.y - 14, { category: home && a && a.status !== 'idle' ? toolCategory(a.tool) : 'idle', status: home && a?.status === 'waiting' ? 'waiting' : undefined, t, seed: d.x });
        },
      });
      if (!c) continue;
      overlays.push(() => {
        drawNameplate(ctx, d.x - 2, d.y + 18, COL_W, c.project, '', a.status, { light: true });
        drawProjectTag(d.x - 2, d.y + 25, { ...c, project: a.source || 'claude', feature: '' }, COL_W);
      });
      if (ch && !ch.hidden) {
        scene.push({ y: ch.seatedNow ? ch.y - 2 : ch.y, draw: drawChar(ch, null, poseOf(ch, a, home), ch.seatedNow) });
        if (home) {
          if (a.status === 'waiting') spots.push({ x: ch.x, y: ch.y - 10 });
          overlays.push(() => drawAgentBubble(ch, a, t, null, c));
          if (a.status === 'working' && lightPhase !== 'dag') lamps.push({ x: ch.x, y: ch.y - 6 });
        }
      }
      if (hl(c)) glow.push({ x: d.x - 3, y: d.y - 24, w: COL_W, h: 56, color: c.color });
    }
    if (staff.flexOverflow) overlays.push(() => { const z = zone('flex'); ctx.font = `600 5px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.fillText(`+${staff.flexOverflow}`, z.x + z.w - 14, z.y + 5); });

    // ----- subagents -----
    const extra = new Map();
    for (const ch of chars.values()) {
      if (!ch.agent || ch.hidden) continue;
      const a = ch.agent;
      if (ch.overflow && !ch.walking && !ch.inLounge) { extra.set(ch.case.key, (extra.get(ch.case.key) || 0) + 1); continue; }
      const seated = !ch.walking && !!ch.seatAt && Math.hypot(ch.x - ch.seatAt.x, ch.y - ch.seatAt.y) < 1;
      ch.seatedNow = seated;
      const pose = ch.walking ? 'walk' : ch.inLounge ? 'sip' : seated ? (a.status === 'idle' ? 'read' : a.status) : 'stand';
      if (seated) scene.push({ y: ch.y - 3, draw: () => drawChair(ctx, ch.x, ch.y) });
      scene.push({ y: seated ? ch.y - 2 : ch.y, draw: drawChar(ch, null, pose, seated) });
      if (seated && a.status === 'working' && t - ch.lastSpark > 0.25) { ch.lastSpark = t; spawn(ch.x + 2, ch.y + 1, '#9fd6ff', (Math.random() - 0.5) * 8, -14, 0.5); }
      if (a.status === 'waiting' && !ch.walking) { spots.push({ x: ch.x, y: ch.y - 8 }); overlays.push(() => drawBadge(ctx, ch.x, ch.y - (seated ? 22 : 25), '!', C.waiting, 6)); }
      if (ch.inLounge && !ch.walking) overlays.push(() => drawBadge(ctx, ch.x, ch.y - 25, '✓', C.done, 6));
    }
    for (const [key, n] of extra) {
      const c = caseByKey.get(key);
      const boss = c && (c.kind === 'flex' ? chars.get(`f:${c.sessionId}`) : holderOf(c));
      if (boss) overlays.push(() => { ctx.font = `600 5px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.fillText(`+${n}`, boss.x + 8, boss.y - 4); });
    }

    // a bit of chatter in the lounge
    const lounging = [...chars.values()].filter((c) => !c.hidden && !c.walking && (c.mode === 'coffee' || c.mode === 'party' || c.inLounge));
    if (lounging.length >= 2 && t > chatAt) {
      chatAt = t + 2.5;
      const who = lounging[Math.floor(Math.random() * lounging.length)];
      who.say = { text: CHAT[Math.floor(Math.random() * CHAT.length)], until: t + 1.8 };
    }
    for (const c of lounging) if (!c.member) overlays.push(() => drawSay(c, t));

    scene.sort((p, q) => p.y - q.y);
    for (const item of scene) item.draw();

    if (partyOn) for (let i = 0; i < 3; i++) spawn(Math.random() * L.W, WALL_H, ['#ff4d5e', '#f1c40f', '#3ddc84', '#4ea3ff', '#e87fb0'][Math.floor(Math.random() * 5)], (Math.random() - 0.5) * 20, 10 + Math.random() * 20, 4, 6);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.5));
      rect(ctx, p.x, p.y, p.g ? 2 : 1, 1, p.color);
    }
    ctx.globalAlpha = 1;

    drawLighting(ctx, shade, L.W, L.H, { phase: lightPhase, lamps: quiet ? [] : lamps, spots, t });
    if (quiet || lullNow) {
      if (quiet) { ctx.fillStyle = 'rgba(5,6,20,.35)'; ctx.fillRect(0, 0, L.W, L.H); }
      ctx.font = `600 6px ${FONT}`;
      ctx.fillStyle = '#e4defa';
      ctx.textBaseline = 'top';
      const msg = !agents.length ? 'Nog geen agents · het bedrijf is dicht' : quiet ? 'Iedereen is naar huis · komt terug bij nieuwe activiteit' : 'Rustig · het team hangt in de lounge';
      ctx.fillText(msg, 70, 8);
    }

    // highlight: dim everything except the chosen project's places
    const holes = glow.filter(Boolean);
    if (highlight && holes.length) {
      if (dim.width !== L.W || dim.height !== L.H) { dim.width = L.W; dim.height = L.H; }
      const d = dim.getContext('2d');
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, L.W, L.H);
      d.fillStyle = 'rgba(10,10,30,.45)';
      d.fillRect(0, 0, L.W, L.H);
      d.globalCompositeOperation = 'destination-out';
      for (const g of holes) d.fillRect(g.x, g.y, g.w, g.h);
      ctx.drawImage(dim, 0, 0);
    }
    for (const draw of overlays) draw();
    if (highlight) {
      const pulse = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.6 + 0.4 * Math.sin(t * 5);
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 1;
      for (const g of holes) { ctx.strokeStyle = g.color; ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1); }
      ctx.globalAlpha = 1;
    }
    if (partyOn) drawBanner(ctx, L.W / 2, WALL_H + 6, party.label, t);
  }

  // ---------- pointer: hover, click, drag, wheel, pinch (ADR-019) ----------
  const toLogical = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: ((clientX - r.left) * dpr - view.ox) / view.scale, y: ((clientY - r.top) * dpr - view.oy) / view.scale };
  };
  const cssToLogical = (px) => (px * (window.devicePixelRatio || 1)) / view.scale;

  /** The person nearest to (x, y) within a generous box around their body. */
  function hitPerson(x, y) {
    let best = null, bestD = Infinity;
    for (const ch of chars.values()) {
      if (ch.hidden || (!ch.member && !ch.flex && !ch.agent)) continue;
      const top = ch.y - (ch.seatedNow ? 19 : 22);
      if (Math.abs(x - ch.x) > 8 || y < top - 6 || y > ch.y + 6) continue;
      const d = Math.hypot(x - ch.x, y - (top + ch.y) / 2);
      if (d < bestD) { best = ch; bestD = d; }
    }
    return best;
  }
  const hitZone = (x, y) => L.zones.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) || null;

  /** What the hover label says about a person. */
  function personInfo(ch) {
    const c = ch.member ? caseOf(ch) : ch.case;
    const a = ch.agent || c?.agent;
    const title = ch.member ? `${titles.get(ch.member) || roleLabel(ch.member, 0)}${ch.slot ? ` ${ch.slot + 1}` : ''}` : ch.flex ? `Sessie · ${c?.agent?.source || 'claude'}` : `Subagent · ${a?.name || ''}`;
    const project = c ? [c.project, c.feature].filter(Boolean).join(' · ') : '';
    const status = a?.status ? STATUS_TEXT[a.status] || a.status : ch.member ? 'vrij' : '';
    return { kind: 'person', title, project, color: c?.color || null, status, task: a?.task || '', clickable: !!ch.member };
  }

  function setTarget(next, zoneId = null) {
    camTarget = clampCam(next, L.W, L.H);
    camZone = zoneId;
    const z = isZoomed(camTarget);
    if (z && !zoomedBefore) onWantFocus?.();
    if (z !== zoomedBefore) { zoomedBefore = z; onZoomChange?.(z); }
  }
  function zoomTo(zoneId) {
    const z = zoneId && zone(zoneId);
    setTarget(z ? focusRect(z, L.W, L.H) : fullCam(L.W, L.H), z ? zoneId : null);
  }
  function zoomBy(factor) {
    setTarget(zoomAt(camTarget, factor, camTarget.cx, camTarget.cy, L.W, L.H));
  }

  const pointers = new Map(); // pointerId -> { x, y } in client px
  let drag = null; // { x, y, moved, pinch }
  let suppressClick = false;
  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false, pinch: null };
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      drag = { ...drag, moved: true, pinch: Math.hypot(p.x - q.x, p.y - q.y) };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (prev && drag) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && drag.pinch) {
        const [p, q] = [...pointers.values()];
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        const mid = toLogical((p.x + q.x) / 2, (p.y + q.y) / 2);
        setTarget(zoomAt(camTarget, dist / drag.pinch, mid.x, mid.y, L.W, L.H));
        cam = camTarget;
        drag.pinch = dist;
        return;
      }
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > DRAG_PX) {
        drag.moved = true;
        canvas.setPointerCapture?.(e.pointerId);
      }
      if (drag.moved && isZoomed(camTarget)) {
        setTarget(panCam(camTarget, cssToLogical(e.clientX - prev.x), cssToLogical(e.clientY - prev.y), L.W, L.H), camZone);
        cam = camTarget;
        canvas.style.cursor = 'grabbing';
        onHover?.(null);
        return;
      }
    }
    const { x, y } = toLogical(e.clientX, e.clientY);
    const ch = hitPerson(x, y);
    if (ch) {
      canvas.style.cursor = ch.member ? 'pointer' : 'default';
      onHover?.(personInfo(ch), e.clientX, e.clientY);
      return;
    }
    const z = hitZone(x, y);
    canvas.style.cursor = z ? (camZone === z.id ? 'zoom-out' : 'zoom-in') : 'default';
    onHover?.(z ? { kind: 'zone', title: z.label, hint: camZone === z.id ? 'Klik: heel bedrijf' : 'Klik om in te zoomen' } : null, e.clientX, e.clientY);
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (!pointers.size && drag) { suppressClick = drag.moved; drag = null; canvas.style.cursor = ''; }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (!drag) onHover?.(null); });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { x, y } = toLogical(e.clientX, e.clientY);
    const factor = Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.0025));
    setTarget(zoomAt(camTarget, factor, x, y, L.W, L.H));
  }, { passive: false });

  // Click on an employee → their latest decision; on a department → zoom in (again: whole company).
  canvas.addEventListener('click', (e) => {
    e.stopPropagation(); // the company decides itself; a missed click must not toggle the building focus
    if (suppressClick) { suppressClick = false; return; }
    const { x: lx, y: ly } = toLogical(e.clientX, e.clientY);
    const ch = hitPerson(lx, ly);
    if (ch?.member) {
      const c = caseOf(ch);
      if (c) ch.lastProject = c.projectKey;
      const project = c?.projectKey || ch.lastProject || cases.find((x) => x.kind === 'tenx')?.projectKey;
      if (project) onRoleClick?.(project, ch.member);
      return;
    }
    if (ch) return;
    const z = hitZone(lx, ly);
    if (!z) return;
    zoomTo(camZone === z.id ? null : z.id);
  });

  return {
    kind: 'company',
    setData,
    setAgents: (list, serverNow) => setData(list, {}, null, serverNow),
    colorOf: (projectKey) => colorOf(projectKey),
    highlight: (key) => { highlight = key ? { key, until: performance.now() / 1000 + HIGHLIGHT_S } : null; },
    frame,
    zoomTo,
    zoomBy,
    resetZoom: () => zoomTo(null),
    isZoomed: () => isZoomed(camTarget),
    size: () => ({ W: L.W, H: L.H }),
    isEmpty: () => false,
    debug: () => ({
      L: { W: L.W, H: L.H, zones: L.zones.map((z) => z.id) },
      cam: { ...camTarget },
      cases: cases.map(({ key, kind, role, meeting, shipped: s, status, color }) => ({ key, kind, role, meeting, shipped: s, status, color })),
      place: [...staff.place],
      handoffs: handoffs.map(({ key, giver, receiver, stage }) => ({ key, giver, receiver, stage })),
      chars: [...chars.values()].map(({ id, x, y, mode, path, hidden, walking, leaving }) => ({ id, x: Math.round(x), y: Math.round(y), mode, path: path.length, hidden, walking, leaving })),
    }),
  };
}

