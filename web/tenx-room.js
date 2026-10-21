// A living 10x-team office (ADR-006/007/008): departments with every team role, a meeting room,
// a lounge and the CEO's office (that's you). Subagents get a flex seat next to the role that
// sent them. People walk around furniture (nav.js), hand work over, take coffee breaks, queue
// at the CEO's door when they need you, celebrate a release and go home after a quiet spell.
import {
  C, looksFor, outfitFor, toolCategory, rect, drawFloor, drawBackWall, drawOuterWalls, drawDoor,
  drawWhiteboard, drawPlant, drawCoffeeMachine, drawSmallTable, drawChair, drawMonitor, drawDesk,
  drawPerson, drawBadge, drawBubble, drawNameplate, drawLighting, minutesSince, FONT,
} from './sprites.js';
import {
  ROLE_INFO, DEPTS, phasesFor, roleLooks, drawAccessory, drawFolder, drawZone, drawMeetingTable,
  drawTimeline, drawAdrFrame, drawBeacon, drawStamp, drawCeoDesk, drawInbox, drawSofa, drawMiniDesk, drawDartboard, drawDart,
  drawPaperStack, drawThought, drawSmoke, drawKanban, drawBanner,
} from './tenx-sprites.js';
import { createNav } from './nav.js';

const MARGIN = 8;
const WALL_H = 48;
const ZONE_W = 80;
const ZONE_H = 104;
const BOTTOM = 8;
const WALK_SPEED = 60;
const MAX_PARTICLES = 160;
const QUIET_MS = 10 * 60 * 1000; // a quiet team hangs out in the lounge (ADR-010)
const AWAY_MS = 60 * 60 * 1000; // ...and goes home after an hour
const FAIL_MS = 4000;

// Zone grid per flavor: [col, row, span].
const LAYOUTS = {
  classic: {
    cols: 5,
    zones: { meeting: [0, 0, 2], strategy: [2, 0], architecture: [3, 0], planning: [4, 0], engineering: [0, 1], quality: [1, 1], operations: [2, 1], lounge: [3, 1], ceo: [4, 1] },
  },
  plus: {
    cols: 5,
    zones: { meeting: [0, 0], strategy: [1, 0], design: [2, 0], architecture: [3, 0], planning: [4, 0], engineering: [0, 1], quality: [1, 1], operations: [2, 1], lounge: [3, 1], ceo: [4, 1] },
  },
};
const LOUNGE_SPOTS = [[14, 48], [64, 48], [26, 64], [64, 66], [14, 98], [36, 98], [58, 98]];
// Darts (ADR-010): bullseye and the two throwing spots, relative to the lounge zone.
const DART_BOARD = [38, 14];
const DART_SPOTS = [[31, 46], [47, 46]];
const DART_CHAT = ['180!', 'Bull!', 'Mis…', 'Dubbel 20!', 'Nog een potje?', 'Net ernaast'];
const CHAT = ['☕', 'Mooi werk!', 'Nog koffie?', '…', 'Haha', 'Echt?'];

const STATUS_TEXT = {
  working: () => 'werkt',
  waiting: (a, now, floor) => `${floor ? 'bij de deur' : 'bij de CEO'} · ${minutesSince(a.statusSince, now)}`,
  done: () => 'klaar',
  idle: () => 'niets te doen',
};

export function createTenxRoom(canvas, { phase: getPhase, onRoleClick } = {}) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  const chars = new Map(); // 'm:<role>' team members, 'ceo', agent id for subagents
  const particles = [];
  const adrGlow = new Map();
  const prevTask = new Map(); // session id -> last seen task (stand-up on a new prompt)
  let seenAdrs = null;
  let prev = null; // previous tenx snapshot for this project
  let agents = [];
  let tenx = {};
  let driven = new Map(); // role -> { agent, guessed }
  let lastDrivenRole = null;
  let meetingMode = false;
  let clockSkew = 0;
  let view = { scale: 1, ox: 0, oy: 0 };
  let L = {};
  let nav = null;
  let flavor = null;
  let LAY = LAYOUTS.classic;
  let ROLES = [];
  let PH = phasesFor('classic');
  let standup = null; // { until, roles: Set, say }
  let handoff = null; // { giver, receiver, stage, until, label }
  let partyUntil = 0;
  let chatAt = 0;
  let floor = false; // a CEO floor exists above the building (ADR-009): no CEO office in this room
  let quietNow = false;
  let shippedHome = false;
  let lullNow = false;
  let darts = { turn: 0, next: 0, stuck: [], flying: null };

  // ---------- geometry ----------
  const zone = (name) => {
    const [col, row, span = 1] = LAY.zones[name];
    return { x: MARGIN + col * ZONE_W, y: WALL_H + 2 + row * ZONE_H, w: span * ZONE_W };
  };
  const door = () => ({ x: L.W - 20, y: WALL_H + 3 });
  // Who needs you queues at the CEO's desk, or at the door when the CEO is upstairs.
  const queueSpot = (i) => (floor ? { x: L.W - 20 - i * 14, y: WALL_H + 12 } : ceoGeo().queue[i]);
  function desk(role) {
    const dept = ROLE_INFO[role].dept;
    const z = zone(dept);
    const i = DEPTS[dept].roles.indexOf(role);
    const x = z.x + 6 + i * 38;
    const y = z.y + 44;
    return { x, y, w: 30, seat: { x: x + 8, y }, front: { x: x + 15, y: y + 24 }, z };
  }
  const flexSpot = (role, k = 0) => { const d = desk(role); return { x: d.x + 15 + k * 12, y: d.z.y + 92, deskX: d.x + 7, deskY: d.z.y + 92 }; };
  function meetingGeo() {
    const z = zone('meeting');
    const tw = Math.min(z.w - 28, 110);
    const tx = Math.round(z.x + (z.w - tw) / 2);
    const n = 4;
    const gap = tw / n;
    const top = Array.from({ length: n }, (_, i) => ({ x: Math.round(tx + gap / 2 + i * gap), y: z.y + 52, seated: true }));
    const bottom = Array.from({ length: n }, (_, i) => ({ x: Math.round(tx + gap / 2 + i * gap), y: z.y + 86, seated: false }));
    return { z, tx, tw, ty: z.y + 54, seats: [...top, ...bottom], head: { x: tx - 7, y: z.y + 72 } };
  }
  const dartBoard = () => { const z = zone('lounge'); return { x: z.x + DART_BOARD[0], y: z.y + DART_BOARD[1] }; };
  const dartSpot = (i) => { const z = zone('lounge'); const [dx, dy] = DART_SPOTS[i]; return { x: z.x + dx, y: z.y + dy }; };
  const loungeSpot = (i) => { const z = zone('lounge'); const [dx, dy] = LOUNGE_SPOTS[i % LOUNGE_SPOTS.length]; return { x: z.x + dx, y: z.y + dy }; };
  function ceoGeo() {
    const z = zone('ceo');
    return {
      z, desk: { x: z.x + 18, y: z.y + 44, w: 44 }, seat: { x: z.x + 32, y: z.y + 44 },
      // in front of the desk, below the name plate, so the visitor is never hidden by furniture
      queue: [{ x: z.x + 44, y: z.y + 96 }, { x: z.x + 30, y: z.y + 98 }, { x: z.x + 16, y: z.y + 98 }, { x: z.x + 58, y: z.y + 98 }, { x: z.x + 70, y: z.y + 90 }],
    };
  }

  function buildNav() {
    nav = createNav(L.W, L.H);
    nav.block(0, 0, L.W, WALL_H);
    nav.block(0, 0, 5, L.H);
    nav.block(L.W - 5, 0, 5, L.H);
    nav.block(0, L.H - 6, L.W, 6);
    for (const role of ROLES) {
      const d = desk(role);
      nav.block(d.x - 1, d.y + 2, d.w + 2, 14);
      const f = flexSpot(role);
      nav.block(f.deskX, f.deskY + 1, 16, 7);
    }
    const m = meetingGeo();
    nav.block(m.tx, m.ty, m.tw, 12);
    const lz = zone('lounge');
    nav.block(lz.x + lz.w - 24, lz.y + 18, 16, 18); // coffee machine
    nav.block(lz.x + 6, lz.y + 77, 38, 11); // sofa
    nav.block(lz.x + 44, lz.y + 58, 12, 7); // table
    nav.block(lz.x + DART_BOARD[0] - 5, lz.y + DART_BOARD[1] + 12, 10, 6); // dartboard stand
    if (floor) return;
    const c = ceoGeo();
    nav.block(c.desk.x, c.desk.y + 2, c.desk.w, 14);
  }

  function applyFlavor(next) {
    flavor = next === 'plus' ? 'plus' : 'classic';
    LAY = LAYOUTS[flavor];
    if (floor) {
      // no CEO office: the lounge takes its place
      const { ceo: _, ...zones } = LAY.zones;
      LAY = { ...LAY, zones: { ...zones, lounge: [3, 1, 2] } };
    }
    ROLES = Object.keys(ROLE_INFO).filter((r) => flavor === 'plus' || ROLE_INFO[r].dept !== 'design');
    PH = phasesFor(flavor);
    L = { W: MARGIN * 2 + LAY.cols * ZONE_W, H: WALL_H + 2 + 2 * ZONE_H + BOTTOM };
    for (const [id, ch] of [...chars]) if (ch.member && !ROLES.includes(ch.member)) chars.delete(id);
    for (const role of ROLES) {
      const s = desk(role).seat;
      const ch = chars.get(`m:${role}`);
      if (ch) { Object.assign(ch, { x: s.x, y: s.y, path: [], goal: null }); continue; }
      chars.set(`m:${role}`, {
        id: `m:${role}`, member: role, x: s.x, y: s.y, path: [], phase: Math.random() * 10, mode: 'home',
        looks: roleLooks(role, looksFor(role)), outfit: ROLE_INFO[role].outfit, accent: ROLE_INFO[role].accent, lastSpark: 0,
      });
    }
    if (floor) { chars.delete('ceo'); buildNav(); return; }
    const s = ceoGeo().seat;
    if (!chars.has('ceo')) {
      chars.set('ceo', {
        id: 'ceo', ceo: true, x: s.x, y: s.y, path: [], phase: 0, mode: 'home',
        looks: { ...looksFor('ceo-you'), shirt: '#1d2030', shirtDark: '#14161f' }, outfit: 'manager', accent: '#e8c35a',
      });
    } else {
      Object.assign(chars.get('ceo'), { x: s.x, y: s.y, path: [], goal: null });
    }
    buildNav();
  }
  applyFlavor('classic');

  // ---------- movement ----------
  function goTo(ch, x, y) {
    if (ch.goal && Math.abs(ch.goal.x - x) < 0.5 && Math.abs(ch.goal.y - y) < 0.5) return;
    ch.goal = { x, y };
    ch.path = nav.findPath(ch.x, ch.y, x, y);
  }
  const arrived = (ch) => !ch.path.length;

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

  // ---------- who is doing what ----------
  const currentPhase = () => (Number.isInteger(tenx.phase) ? tenx.phase : null);

  function computeDriven() {
    driven = new Map();
    meetingMode = currentPhase() === 0;
    const sessions = agents.filter((a) => a.kind === 'session').sort((a, b) => a.updatedAt - b.updatedAt);
    for (const a of sessions) {
      const info = tenx.roles?.[a.id];
      let role = info?.role ?? PH.defaults[currentPhase() ?? PH.implPhase];
      if (role === 'meeting') { meetingMode = true; role = 'product-manager'; }
      if (!ROLE_INFO[role] || !ROLES.includes(role)) role = 'product-manager';
      driven.set(role, { agent: a, guessed: info ? info.guessed : true });
    }
    const latest = [...driven.keys()].at(-1);
    if (latest) lastDrivenRole = latest;
  }

  function setAgents(list, serverNow) {
    agents = list;
    if (serverNow) clockSkew = Date.now() - serverNow;
    const t = performance.now() / 1000;
    // a new prompt from the CEO → short stand-up in the meeting room
    for (const a of list) {
      if (a.kind !== 'session') continue;
      const before = prevTask.get(a.id);
      prevTask.set(a.id, a.task);
      if (before !== undefined && a.task && a.task !== before) {
        computeDriven();
        const roles = new Set(['product-manager', 'engineering-manager', 'cto', ...driven.keys()]);
        standup = { until: t + 9, roles, say: a.task };
      }
    }
    const present = new Set(list.map((a) => a.id));
    for (const a of list) {
      if (a.kind !== 'subagent') continue;
      let ch = chars.get(a.id);
      if (!ch) {
        computeDriven();
        const bossRole = [...driven].find(([, d]) => d.agent.id === a.parentId)?.[0] || lastDrivenRole || 'sde';
        const boss = chars.get(`m:${bossRole}`);
        const start = boss ? { x: boss.x, y: boss.y + 4 } : door();
        ch = { id: a.id, x: start.x, y: start.y, path: [], phase: Math.random() * 10, looks: looksFor(a.id), flexRole: bossRole, lastSpark: 0 };
        chars.set(a.id, ch);
      }
      Object.assign(ch, { agent: a, accent: looksFor(a.parentId || a.id).shirt, outfit: outfitFor(a) });
    }
    for (const ch of chars.values()) {
      if (ch.member || ch.ceo || present.has(ch.id) || ch.leaving) continue;
      ch.leaving = true;
      goTo(ch, door().x, door().y);
    }
    computeDriven();
  }

  function setTenx(info) {
    tenx = info || {};
    if ((tenx.flavor || 'classic') !== flavor) applyFlavor(tenx.flavor);
    const t = performance.now() / 1000;
    const numbers = (tenx.adrs || []).map((a) => a.number || a.title);
    if (seenAdrs) for (const n of numbers) if (!seenAdrs.has(n)) adrGlow.set(n, Date.now() + 10_000);
    seenAdrs = new Set(numbers);
    if (prev) {
      const phaseUp = Number.isInteger(tenx.phase) && Number.isInteger(prev.phase) && tenx.phase > prev.phase;
      const handoffWrite = tenx.handoffAt > (prev.handoffAt || 0);
      if ((phaseUp || handoffWrite) && !tenx.complete) startHandoff(prev.phase, tenx.phase, t);
      if (!prev.complete && tenx.complete) partyUntil = t + 16;
    }
    prev = { phase: tenx.phase, handoffAt: tenx.handoffAt || 0, complete: !!tenx.complete };
    computeDriven();
  }

  function startHandoff(fromPhase, toPhase, t) {
    let giver = lastDrivenRole || PH.defaults[fromPhase ?? 0];
    computeDriven();
    let receiver = [...driven.keys()].at(-1);
    if (!receiver || receiver === giver) receiver = PH.defaults[Math.min(PH.depts.length - 1, (toPhase ?? 0))];
    if (giver === 'meeting') giver = 'product-manager';
    if (!ROLES.includes(giver) || !ROLES.includes(receiver) || giver === receiver) return;
    handoff = { giver, receiver, stage: 'walk', until: t + 25, label: tenx.active?.phaseName || DEPTS[PH.depts[toPhase ?? 0]]?.label || 'werk' };
  }

  function setFloor(on) {
    if (!!on === floor) return;
    floor = !!on;
    applyFlavor(flavor);
  }

  // ---------- behaviour: decide where everybody goes ----------
  function think(t, dt) {
    const now = Date.now() - clockSkew;
    const party = partyUntil > t;
    const idle = agents.every((a) => a.status !== 'working' && a.status !== 'waiting');
    // Under a CEO floor a shipped team goes home after the party; the room stays until the session ends.
    shippedHome = floor && !!tenx.complete && !party && agents.length > 0 && idle;
    const silentFor = (ms) => agents.length > 0 && idle && agents.every((a) => now - a.updatedAt > ms);
    const quiet = shippedHome || silentFor(AWAY_MS);
    const lull = !quiet && silentFor(QUIET_MS);
    quietNow = quiet;
    lullNow = lull;
    if (standup && standup.until < t) standup = null;
    if (handoff && handoff.until < t) handoff = null;

    const members = ROLES.map((r) => chars.get(`m:${r}`));
    const ceo = chars.get('ceo');

    // waiting sessions queue at the CEO's door, in order of waiting time
    const queue = [...driven].filter(([, d]) => d.agent.status === 'waiting').sort((a, b) => a[1].agent.statusSince - b[1].agent.statusSince).map(([r]) => r);
    const meeting = meetingGeo();
    const meetingRoles = standup ? [...standup.roles] : meetingMode && !lull ? ['product-manager', 'cto', ...(flavor === 'plus' ? ['ux-designer'] : []), 'architect', 'engineering-manager', 'qa'] : [];
    const loungeTaken = new Map(); // spot index -> id

    // finished subagents get the lounge first
    for (const ch of chars.values()) {
      if (!ch.agent || ch.leaving) continue;
      if (ch.agent.status === 'done') {
        const spot = ch.loungeSpot ?? [...Array(LOUNGE_SPOTS.length).keys()].find((i) => !loungeTaken.has(i));
        if (spot !== undefined) { loungeTaken.set(spot, ch.id); ch.loungeSpot = spot; ch.inLounge = true; } else ch.inLounge = false;
      } else { ch.loungeSpot = undefined; ch.inLounge = false; }
    }
    const takeLounge = (ch) => {
      if (ch.loungeSpot !== undefined && !loungeTaken.has(ch.loungeSpot)) { loungeTaken.set(ch.loungeSpot, ch.id); return ch.loungeSpot; }
      const i = [...Array(LOUNGE_SPOTS.length).keys()].find((k) => !loungeTaken.has(k));
      if (i !== undefined) { loungeTaken.set(i, ch.id); ch.loungeSpot = i; }
      return i;
    };

    const finished = new Set((tenx.done || []).map((p) => PH.depts[p]));
    const inLounge = (mb) => mb.mode === 'coffee' || mb.mode === 'darts';
    let loungeCount = members.filter(inLounge).length;
    const dartsTaken = new Set(members.filter((mb) => mb.mode === 'darts' && t < mb.modeUntil).map((mb) => mb.dartSpot));
    let meetingSeat = 0;
    for (const ch of members) {
      const role = ch.member;
      const d = driven.get(role);
      const busy = d && (d.agent.status === 'working' || d.agent.status === 'waiting');
      let mode = 'home';
      if (quiet) mode = 'away';
      else if (party) mode = 'party';
      else if (handoff && (handoff.giver === role || handoff.receiver === role)) mode = 'handoff';
      else if (queue.includes(role)) mode = 'ceo';
      else if (meetingRoles.includes(role)) mode = 'meeting';
      else if (inLounge(ch) && t < ch.modeUntil) mode = ch.mode;
      else if (!busy && loungeCount < (lull ? 5 : 3) && Math.random() < dt / (lull ? 8 : finished.has(ROLE_INFO[role].dept) ? 15 : 40)) {
        const free = [0, 1].find((i) => !dartsTaken.has(i));
        if (free !== undefined && Math.random() < 0.4) { mode = 'darts'; ch.dartSpot = free; dartsTaken.add(free); } else mode = 'coffee';
        ch.modeUntil = t + (lull ? 15 + Math.random() * 20 : 12 + Math.random() * 13);
        loungeCount++;
      }
      if (ch.mode === 'away' && mode !== 'away') { ch.hidden = false; const dd = door(); Object.assign(ch, { x: dd.x, y: dd.y, path: [], goal: null }); }
      ch.mode = mode;
      ch.seatAt = null;

      if (mode === 'home') { const s = desk(role).seat; goTo(ch, s.x, s.y); ch.seatAt = s; }
      else if (mode === 'away') goTo(ch, door().x, door().y);
      else if (mode === 'ceo') { const q = queueSpot(Math.min(queue.indexOf(role), 4)); goTo(ch, q.x, q.y); }
      else if (mode === 'meeting') { const s = meeting.seats[meetingSeat++ % meeting.seats.length]; goTo(ch, s.x, s.y); if (s.seated) ch.seatAt = s; }
      else if (mode === 'coffee' || mode === 'party') {
        const i = takeLounge(ch);
        if (i !== undefined) { const s = loungeSpot(i); goTo(ch, s.x, s.y); }
        else { const s = meeting.seats[meetingSeat++ % meeting.seats.length]; goTo(ch, s.x, s.y); } // party overflow in the meeting room
      } else if (mode === 'darts') { const s = dartSpot(ch.dartSpot); goTo(ch, s.x, s.y); }
      else if (mode === 'handoff') runHandoff(ch, role, t);
      if (mode !== 'coffee' && mode !== 'party') ch.loungeSpot = undefined;
      if (mode !== 'darts') ch.dartSpot = undefined;
    }

    playDarts(members.filter((mb) => mb.mode === 'darts' && !mb.walking && !mb.hidden), t);

    // the CEO (upstairs when there is a CEO floor)
    if (!ceo) { /* nothing to do */ } else if (quiet) { ceo.mode = 'away'; goTo(ceo, door().x, door().y); }
    else {
      if (ceo.mode === 'away') { ceo.hidden = false; const dd = door(); Object.assign(ceo, { x: dd.x, y: dd.y, path: [], goal: null }); }
      if (standup) { ceo.mode = 'meeting'; goTo(ceo, meeting.head.x, meeting.head.y); ceo.seatAt = null; }
      else if (party) { ceo.mode = 'party'; const i = takeLounge(ceo); const s = i !== undefined ? loungeSpot(i) : meeting.head; goTo(ceo, s.x, s.y); ceo.seatAt = null; }
      else { ceo.mode = 'home'; const s = ceoGeo().seat; goTo(ceo, s.x, s.y); ceo.seatAt = s; }
    }

    // subagents: flex seat next to the role that sent them, lounge when done
    const perRole = new Map();
    for (const ch of chars.values()) {
      if (!ch.agent || ch.leaving) continue;
      if (quiet) { goTo(ch, door().x, door().y); continue; }
      if (ch.inLounge) { const s = loungeSpot(ch.loungeSpot); goTo(ch, s.x, s.y); continue; }
      const k = perRole.get(ch.flexRole) || 0;
      perRole.set(ch.flexRole, k + 1);
      ch.flexIndex = k;
      const f = flexSpot(ch.flexRole, Math.min(k, 2));
      goTo(ch, f.x, f.y);
    }
  }

  // One game at a time: the players take turns, a dart flies and sticks; after three darts they're pulled out.
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
    const r = Math.random() < 0.12 ? 7 : Math.random() * 5; // now and then a miss on the backboard
    const ang = Math.random() * Math.PI * 2;
    const info = ROLE_INFO[p.member];
    p.throwUntil = t + 0.3;
    darts.flying = {
      from: { x: p.x + 4, y: p.y - 24 }, to: { x: b.x + Math.cos(ang) * r, y: b.y + Math.sin(ang) * r - 3 },
      start: t + 0.1, dur: 0.22, color: info.accent || info.shirt, by: p,
    };
    darts.next = t + 1.3 + Math.random() * 0.7;
  }

  function runHandoff(ch, role, t) {
    const h = handoff;
    const rd = desk(h.receiver);
    if (role === h.receiver) {
      // the receiver stays at their desk and gets up when the folder arrives
      goTo(ch, rd.seat.x, rd.seat.y);
      ch.seatAt = h.stage === 'walk' ? rd.seat : null;
      if (h.stage === 'exchange' && !ch.say) ch.say = { text: 'Ik pak het op!', until: h.until };
      if (h.stage === 'done') { ch.carry = t + 3; ch.say = null; }
      return;
    }
    // the giver walks over with the folder
    if (h.stage === 'walk') {
      ch.carry = Infinity;
      goTo(ch, rd.front.x, rd.front.y);
      if (arrived(ch) && Math.hypot(ch.x - rd.front.x, ch.y - rd.front.y) < 1) {
        h.stage = 'exchange';
        h.until = t + 2.4;
        ch.say = { text: `Overdracht: ${h.label}`, until: t + 2.4 };
      }
    } else if (h.stage === 'exchange' && t > h.until - 0.1) {
      ch.carry = 0;
      ch.mode = 'coffee';
      ch.modeUntil = t + 12;
      h.stage = 'done';
      h.until = t + 0.4;
    }
  }

  // ---------- drawing ----------
  function drawSay(ch, t) {
    if (!ch.say || ch.say.until < t || ch.hidden) return;
    drawBubble(ctx, ch.x + 6, ch.y - (ch.seatedNow ? 19 : 22), ch.say.text, { maxW: 110, minX: 0, maxX: L.W, border: '#f1c40f', bold: true });
  }

  function drawAgentBubble(ch, agent, minX, maxX, maxW, t, doneText) {
    const headY = ch.y - (ch.seatedNow ? 17 : 20);
    const opts = { maxW, minX, maxX };
    if (agent.status === 'waiting') {
      drawBubble(ctx, ch.x + 10, headY - 2, agent.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
      if (Math.sin(t * 7) > -0.2) drawBadge(ctx, ch.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (agent.status === 'working') {
      if (/^denkt na/i.test(agent.activity || '')) drawThought(ctx, ch.x + 4, headY - 1, t);
      else drawBubble(ctx, ch.x + 10, headY - 2, agent.activity || 'Aan het werk', { ...opts, border: C.working });
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
    // behaviour keeps running while the room is hidden (e.g. another room is focused)
    think(t, dt);
    step(dt);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    const quiet = quietNow;
    const lightPhase = quiet ? 'nacht' : getPhase ? getPhase() : 'dag';
    const phase = currentPhase();
    const party = partyUntil > t;
    const activeDept = meetingMode ? 'meeting' : phase !== null ? PH.depts[phase] : null;

    const scale = Math.min(cw / L.W, chh / L.H);
    view = { scale, ox: Math.round((cw - L.W * scale) / 2), oy: Math.round((chh - L.H * scale) / 2) };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;

    // ----- floor + zones -----
    drawFloor(ctx, 0, WALL_H, L.W, L.H - WALL_H);
    for (const name of Object.keys(LAY.zones)) {
      const z = zone(name);
      drawZone(ctx, z.x, z.y, z.w, ZONE_H, name, { active: name === activeDept && !tenx.complete && !quiet, t });
    }

    // ----- wall: task board, ADRs, kanban, timeline, door -----
    drawBackWall(ctx, L.W, WALL_H);
    const lead = driven.get('product-manager')?.agent || [...driven.values()].at(-1)?.agent;
    let board = tenx.active?.task || lead?.task || '';
    if (meetingMode && lead?.status === 'waiting') board = `Vraag: ${lead.waitingReason || 'wacht op jouw antwoord'}`;
    drawWhiteboard(ctx, 12, 6, 64, 36, board, lead ? looksFor(lead.id).shirt : null);
    const adrs = (tenx.adrs || []).slice(-4);
    adrs.forEach((a, i) => drawAdrFrame(ctx, 84 + (i % 2) * 17, 8 + Math.floor(i / 2) * 15, a.number, (adrGlow.get(a.number || a.title) || 0) > Date.now() && Math.sin(t * 6) > -0.3));
    ctx.font = `4px ${FONT}`;
    ctx.textBaseline = 'top';
    if ((tenx.adrs || []).length > 4) { ctx.fillStyle = '#e4defa'; ctx.fillText(`+${tenx.adrs.length - 4}`, 86, 38); }
    if (!adrs.length) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillText('geen ADR', 86, 20); }
    const implActive = phase !== null && phase >= PH.implPhase;
    drawKanban(ctx, 124, 6, 84, 36, tenx.kanban || [], implActive);
    const last = PH.depts.length - 1;
    const tlX = L.W - 40 - last * 12;
    ctx.font = `600 4px ${FONT}`;
    ctx.fillStyle = '#e4defa';
    ctx.textBaseline = 'top';
    const phaseLabel = tenx.complete ? 'FASE · KLAAR' : `FASE ${phase ?? '?'}${tenx.active?.phaseName ? ` · ${tenx.active.phaseName.toUpperCase()}` : ''}`;
    ctx.fillText(phaseLabel, tlX - 4, 6);
    drawTimeline(ctx, tlX, 21, { phase, done: tenx.done || [], complete: tenx.complete, last, t });
    drawDoor(ctx, door().x, WALL_H);
    if (tenx.gate) drawBeacon(ctx, door().x - 16, 10, t);
    drawOuterWalls(ctx, L.W, L.H, WALL_H);

    // ----- furniture and people, back to front -----
    const scene = [];
    const overlays = [];
    const lamps = [];
    const spots = [];

    const lz = zone('lounge');
    scene.push({ y: lz.y + 36, draw: () => drawCoffeeMachine(ctx, lz.x + lz.w - 22, lz.y + 16, t) });
    scene.push({ y: lz.y + 65, draw: () => drawSmallTable(ctx, lz.x + 44, lz.y + 58) });
    scene.push({ y: lz.y + 88, draw: () => drawSofa(ctx, lz.x + 8, lz.y + 77, 34) });
    scene.push({ y: lz.y + 34, draw: () => drawPlant(ctx, lz.x + 6, lz.y + 14, t) });
    const db = dartBoard();
    scene.push({ y: db.y + 17, draw: () => drawDartboard(ctx, db.x, db.y, darts.stuck) });
    const fl = darts.flying;
    if (fl && t >= fl.start) {
      const k = Math.min(1, (t - fl.start) / fl.dur);
      overlays.push(() => drawDart(ctx, fl.from.x + (fl.to.x - fl.from.x) * k, fl.from.y + (fl.to.y - fl.from.y) * k, fl.color));
    }
    if (Math.random() < dt * 2) spawn(lz.x + lz.w - 16, lz.y + 22, 'rgba(255,255,255,.55)', 0, -8, 1);
    const m = meetingGeo();
    scene.push({ y: m.ty + 12, draw: () => drawMeetingTable(ctx, m.tx, m.ty, m.tw) });
    for (const s of m.seats.filter((x) => x.seated)) scene.push({ y: s.y - 3, draw: () => drawChair(ctx, s.x, s.y) });
    if (!floor) {
      const cg = ceoGeo();
      scene.push({ y: cg.seat.y - 3, draw: () => drawChair(ctx, cg.seat.x, cg.seat.y) });
      scene.push({ y: cg.desk.y + 15, draw: () => { drawCeoDesk(ctx, cg.desk.x, cg.desk.y, cg.desk.w); drawInbox(ctx, cg.desk.x + 30, cg.desk.y - 3, agents.filter((a) => a.status === 'waiting').length, t); } });
      scene.push({ y: cg.z.y + 34, draw: () => drawPlant(ctx, cg.z.x + cg.z.w - 14, cg.z.y + 14, t) });
      overlays.push(() => drawNameplate(ctx, cg.desk.x, cg.desk.y + 18, 60, 'CEO (jij)', '', 'idle', { light: true }));
    }

    const drawChar = (ch, role, pose, seated) => () => {
      drawPerson(ctx, ch.x, ch.y, ch.looks, { pose, t: t + ch.x, seated, walkPhase: ch.phase, outfit: ch.outfit, accent: ch.accent, sipping: pose === 'sip' && (t + ch.phase) % 6 < 1.2, throwing: pose === 'throw' && ch.throwUntil > t });
      if (role) drawAccessory(ctx, ch.x, ch.y, role, { seated, pose, t });
      if (ch.carry && ch.carry > t) drawFolder(ctx, ch.x, ch.y - (seated ? 19 : 22));
    };

    for (const role of ROLES) {
      const d = desk(role);
      const ch = chars.get(`m:${role}`);
      const drive = driven.get(role);
      const a = drive?.agent;
      ch.seatedNow = !ch.walking && !!ch.seatAt && Math.hypot(ch.x - ch.seatAt.x, ch.y - ch.seatAt.y) < 1;
      const home = ch.mode === 'home' && ch.seatedNow;
      const busy = a && a.status === 'working';
      const failed = a?.failedAt && now - a.failedAt < FAIL_MS;
      let pose = 'stand';
      if (ch.walking) pose = 'walk';
      else if (ch.mode === 'coffee' || ch.mode === 'party') pose = 'sip';
      else if (ch.mode === 'darts') pose = 'throw';
      else if (ch.mode === 'ceo') pose = 'waiting';
      else if (failed && home) pose = 'stretch';
      else if (ch.seatedNow) pose = a && home ? (a.status === 'idle' ? 'read' : a.status) : 'read';
      scene.push({ y: d.seat.y - 3, draw: () => drawChair(ctx, d.seat.x, d.seat.y) });
      if (!ch.hidden) scene.push({ y: ch.seatedNow ? ch.y - 2 : ch.y, draw: drawChar(ch, role, pose, ch.seatedNow) });
      const status = home && a ? (a.status === 'waiting' ? 'waiting' : a.status === 'done' ? 'done' : undefined) : undefined;
      const category = home && a && a.status !== 'idle' ? toolCategory(a.tool) : 'idle';
      const sheets = home && a ? Math.min(8, Math.ceil((tenx.workload || 0) / 4)) : 0;
      scene.push({
        y: d.y + 13,
        draw: () => {
          drawDesk(ctx, d.x, d.y, d.w, { compact: true, mug: home && a?.status === 'done', accent: busy && home ? C.working : null, t });
          drawMonitor(ctx, d.x + d.w - 16, d.y - 14, { category, status, t, seed: d.x });
          if (sheets) drawPaperStack(ctx, d.x + 1, d.y + 1, sheets);
        },
      });
      const f = flexSpot(role);
      scene.push({ y: f.deskY + 7, draw: () => drawMiniDesk(ctx, f.deskX, f.deskY) });
      if (busy && home && lightPhase !== 'dag') lamps.push({ x: ch.x, y: ch.y - 6 });
      if (busy && home && !failed && t - ch.lastSpark > 0.2) {
        ch.lastSpark = t;
        spawn(ch.x + Math.random() * 6 - 3, d.y, ['#ffffff', '#9fd6ff', '#f1fa8c'][Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 10, -16, 0.6);
      }
      if (ch.mode === 'ceo' && !ch.walking) spots.push({ x: ch.x, y: ch.y - 10 });
      const label = `${ROLE_INFO[role].label}${drive?.guessed ? ' ~' : ''}`;
      overlays.push(() => drawNameplate(ctx, d.x - 2, d.y + 18, 40, label, a ? STATUS_TEXT[a.status]?.(a, now, floor) : '', a ? a.status : 'idle', { light: true }));
      if (failed && home) overlays.push(() => drawSmoke(ctx, ch.x, ch.y - 18, (now - a.failedAt) / 1000));
      if (a && !ch.walking && !ch.hidden && (home || ch.mode === 'meeting' || ch.mode === 'ceo')) {
        const firstInQueue = ch.mode === 'ceo' && Math.hypot(ch.x - queueSpot(0).x, ch.y - queueSpot(0).y) < 2;
        if (ch.mode !== 'ceo' || firstInQueue) overlays.push(() => drawAgentBubble(ch, a, 0, L.W, 110, t, home && a.task ? `Klaar: ${a.task}` : null));
        else overlays.push(() => drawBadge(ctx, ch.x, ch.y - 25, '!', C.waiting, 6));
      }
      overlays.push(() => drawSay(ch, t));
    }

    // the CEO
    const ceo = chars.get('ceo');
    if (ceo) ceo.seatedNow = !ceo.walking && !!ceo.seatAt && Math.hypot(ceo.x - ceo.seatAt.x, ceo.y - ceo.seatAt.y) < 1;
    if (ceo && !ceo.hidden) {
      const pose = ceo.walking ? 'walk' : ceo.mode === 'party' ? 'sip' : ceo.seatedNow ? 'read' : 'stand';
      scene.push({ y: ceo.seatedNow ? ceo.y - 2 : ceo.y, draw: drawChar(ceo, null, pose, ceo.seatedNow) });
      if (standup && ceo.mode === 'meeting' && !ceo.walking) overlays.push(() => drawBubble(ctx, ceo.x + 10, ceo.y - 24, standup.say, { maxW: 130, minX: 0, maxX: L.W, border: '#e8c35a', bold: true }));
    }

    // subagents on flex seats or in the lounge
    const extra = new Map();
    for (const ch of chars.values()) {
      if (!ch.agent || ch.hidden) continue;
      const a = ch.agent;
      const atFlex = !ch.walking && !ch.inLounge && !ch.leaving;
      if (atFlex && ch.flexIndex > 1) { extra.set(ch.flexRole, (extra.get(ch.flexRole) || 0) + 1); continue; }
      const seated = atFlex && ch.flexIndex === 0;
      const pose = ch.walking ? 'walk' : ch.inLounge ? 'sip' : seated ? (a.status === 'idle' ? 'read' : a.status) : 'stand';
      scene.push({ y: seated ? ch.y - 2 : ch.y, draw: drawChar(ch, null, pose, seated) });
      if (seated && a.status === 'working' && t - ch.lastSpark > 0.25) { ch.lastSpark = t; spawn(ch.x + 2, ch.y + 1, '#9fd6ff', (Math.random() - 0.5) * 8, -14, 0.5); }
      if (a.status === 'waiting' && !ch.walking) { spots.push({ x: ch.x, y: ch.y - 8 }); overlays.push(() => drawBadge(ctx, ch.x, ch.y - (seated ? 22 : 25), '!', C.waiting, 6)); }
      if (ch.inLounge && !ch.walking) overlays.push(() => drawBadge(ctx, ch.x, ch.y - 25, '✓', C.done, 6));
      if (atFlex) {
        overlays.push(() => {
          ctx.font = `4px ${FONT}`;
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          ctx.fillText((a.name || '').slice(0, 10), ch.x - 8, ch.y + (seated ? 8 : 2));
        });
      }
    }
    for (const [role, n] of extra) {
      const f = flexSpot(role, 2);
      overlays.push(() => { ctx.font = `600 5px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.fillText(`+${n}`, f.x - 4, f.y - 14); });
    }

    // a bit of chatter in the lounge
    const lounging = [...chars.values()].filter((c) => !c.hidden && !c.walking && (c.mode === 'coffee' || c.mode === 'party' || c.inLounge));
    if (lounging.length >= 2 && t > chatAt) {
      chatAt = t + 2.5;
      const who = lounging[Math.floor(Math.random() * lounging.length)];
      who.say = { text: CHAT[Math.floor(Math.random() * CHAT.length)], until: t + 1.8 };
    }
    for (const c of lounging) if (!c.member) overlays.push(() => drawSay(c, t));

    scene.sort((a, b) => a.y - b.y);
    for (const item of scene) item.draw();

    // departments that aren't on turn are a little quieter
    if (activeDept && !tenx.complete && !quiet) {
      for (const name of Object.keys(LAY.zones)) {
        if (name === activeDept || name === 'lounge' || name === 'ceo') continue;
        const z = zone(name);
        ctx.fillStyle = 'rgba(10,10,30,.12)';
        ctx.fillRect(z.x + 2, z.y + 2, z.w - 4, ZONE_H - 4);
      }
    }

    // effects
    if (party) {
      for (let i = 0; i < 3; i++) spawn(Math.random() * L.W, WALL_H, ['#ff4d5e', '#f1c40f', '#3ddc84', '#4ea3ff', '#e87fb0'][Math.floor(Math.random() * 5)], (Math.random() - 0.5) * 20, 10 + Math.random() * 20, 4, 6);
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.5));
      rect(ctx, p.x, p.y, p.g ? 2 : 1, 1, p.color);
    }
    ctx.globalAlpha = 1;

    drawLighting(ctx, shade, L.W, L.H, { phase: lightPhase, lamps: quiet ? [] : lamps, spots, t });
    if (quiet) {
      ctx.fillStyle = 'rgba(5,6,20,.35)';
      ctx.fillRect(0, 0, L.W, L.H);
      ctx.font = `600 6px ${FONT}`;
      ctx.fillStyle = '#e4defa';
      ctx.textBaseline = 'top';
      ctx.fillText(shippedHome ? 'Opgeleverd · iedereen is naar huis' : 'Iedereen is naar huis · komt terug bij nieuwe activiteit', 14, L.H - 16);
    } else if (lullNow) {
      ctx.font = `600 6px ${FONT}`;
      ctx.fillStyle = '#e4defa';
      ctx.textBaseline = 'top';
      ctx.fillText('Rustig · het team hangt in de lounge', 14, L.H - 16);
    }

    // ----- information on top -----
    const qz = zone('quality');
    if (tenx.reviews?.qa) drawStamp(ctx, qz.x + 36, qz.y + 6, 'QA', tenx.reviews.qa);
    if (tenx.reviews?.security) drawStamp(ctx, qz.x + 54, qz.y + 16, 'SEC', tenx.reviews.security);
    if (tenx.gate && Math.sin(t * 6) > -0.4) {
      ctx.font = `600 5px ${FONT}`;
      ctx.textBaseline = 'top';
      const msg = 'GATE OVERGESLAGEN';
      const w = Math.ceil(ctx.measureText(msg).width) + 6;
      rect(ctx, door().x - 18 - w, 35, w, 8, C.waiting);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(msg, door().x - 15 - w, 36);
    }
    for (const draw of overlays) draw();
    if (party) drawBanner(ctx, L.W / 2, WALL_H + 6, 'SHIPPED!', t);
  }

  // Click on a team member → read that role's latest decision.
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const lx = ((e.clientX - r.left) * dpr - view.ox) / view.scale;
    const ly = ((e.clientY - r.top) * dpr - view.oy) / view.scale;
    for (const ch of chars.values()) {
      if (!ch.member || ch.hidden) continue;
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
    setFloor,
    frame,
    size: () => ({ W: L.W, H: L.H }),
    isEmpty: () => ![...chars.values()].some((ch) => ch.agent),
    debug: () => ({ chars: [...chars.values()].map(({ id, x, y, mode, path, goal, flexRole, flexIndex, hidden, walking }) => ({ id, x, y, mode, path: path.length, goal, flexRole, flexIndex, hidden, walking })), driven: [...driven.keys()], L, darts: { stuck: darts.stuck.length, flying: !!darts.flying, turn: darts.turn } }),
  };
}
