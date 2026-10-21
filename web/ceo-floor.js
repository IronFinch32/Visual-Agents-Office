// The CEO floor (ADR-009): one floor above every room for the session that runs 10x-Team-Plus as CEO.
// The CEO sits at a big desk with an inbox (work sessions waiting for you) and a board with one line
// per work session. A new work session → the CEO walks a folder down the stairs.
import { C, FONT, looksFor, rect, fit, drawFloor, drawBackWall, drawOuterWalls, drawPlant, drawChair, drawPerson, drawBadge, drawBubble, drawNameplate, drawLighting } from './sprites.js';
import { drawCeoDesk, drawInbox, drawFolder, drawThought } from './tenx-sprites.js';

const W = 416;
const H = 100;
const WALL_H = 46;
const SPEED = 70;
const BOARD = { x: 96, y: 5, w: 264, h: 38 };
const MAX_LINES = 5;
const DESK = { x: 24, y: 64, w: 44 };
const SEAT = { x: 38, y: 64 };
const STAIRS = { x: 96, y: H - 30, w: 34, h: 24 };
const LINE_COLOR = { working: '#e4defa', waiting: C.waiting, shipped: C.done };

export function createCeoFloor(canvas, { phase: getPhase, onFocus } = {}) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas');
  const ceo = {
    x: SEAT.x, y: SEAT.y, path: [], phase: 0,
    looks: { ...looksFor('ceo-you'), shirt: '#1d2030', shirtDark: '#14161f' },
  };
  let agents = [];
  let lines = []; // [{ key, label, phase, status }]
  let hits = [];
  let hover = -1;
  let handoff = null; // { stage: 'go' | 'drop' | 'back', until }
  let view = { scale: 1, ox: 0, oy: 0 };

  const session = () => agents.find((a) => a.kind === 'session');

  function setAgents(list) { agents = list; }
  function setRooms(next) { lines = next; }

  // A new work session: carry a folder to the stairs and come back. Cosmetic, a few seconds.
  function startHandoff() {
    if (handoff) return;
    handoff = { stage: 'go' };
    ceo.path = [{ x: DESK.x + DESK.w + 10, y: SEAT.y }, { x: STAIRS.x + STAIRS.w / 2, y: STAIRS.y + 2 }];
  }

  function step(t, dt) {
    let move = SPEED * dt;
    while (move > 0 && ceo.path.length) {
      const p = ceo.path[0];
      const dx = p.x - ceo.x;
      const dy = p.y - ceo.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= move) { ceo.x = p.x; ceo.y = p.y; ceo.path.shift(); move -= dist; } else { ceo.x += (dx / dist) * move; ceo.y += (dy / dist) * move; move = 0; }
    }
    ceo.walking = ceo.path.length > 0;
    if (ceo.walking) ceo.phase += dt * 8;
    if (!handoff || ceo.walking) return;
    if (handoff.stage === 'go') { handoff = { stage: 'drop', until: t + 0.8 }; }
    else if (handoff.stage === 'drop' && t > handoff.until) {
      handoff = { stage: 'back' };
      ceo.path = [{ x: DESK.x + DESK.w + 10, y: SEAT.y }, { x: SEAT.x, y: SEAT.y }];
    } else if (handoff.stage === 'back') handoff = null;
  }

  function drawStairs() {
    const { x, y, w, h } = STAIRS;
    rect(ctx, x - 1, y - 1, w + 2, h + 2, C.trim);
    for (let i = 0; i < 6; i++) rect(ctx, x, y + i * 4, w, 4, i % 2 ? '#3a3d55' : '#2c2f45');
    rect(ctx, x, y, w, 1, '#7d82ab');
    rect(ctx, x - 2, y - 3, 2, h + 3, '#8f5a2e'); // railing
    rect(ctx, x + w, y - 3, 2, h + 3, '#8f5a2e');
    ctx.font = `4px ${FONT}`;
    ctx.fillStyle = '#e4defa';
    ctx.textBaseline = 'top';
    ctx.fillText('↓ teams', x + w + 5, y + 8);
  }

  function drawBoard() {
    const { x, y, w, h } = BOARD;
    rect(ctx, x - 1, y - 1, w + 2, h + 2, '#9aa0b8');
    rect(ctx, x, y, w, h, '#22283a');
    ctx.textBaseline = 'top';
    ctx.font = `600 4px ${FONT}`;
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('WERKSESSIES', x + 3, y + 2);
    hits = [];
    if (!lines.length) {
      ctx.font = `5px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillText('Nog geen werksessies', x + 3, y + 12);
      return;
    }
    const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES - 1) : lines;
    shown.forEach((l, i) => {
      const ly = y + 8 + i * 6;
      if (i === hover) rect(ctx, x + 1, ly - 0.5, w - 2, 6, 'rgba(255,255,255,.14)');
      ctx.font = `5px ${FONT}`;
      ctx.fillStyle = LINE_COLOR[l.status] || LINE_COLOR.working;
      const right = l.status === 'waiting' ? `! ${l.phase}` : l.phase;
      const rw = Math.ceil(ctx.measureText(right).width);
      ctx.fillText(right, x + w - 3 - rw, ly);
      ctx.fillStyle = l.status === 'waiting' ? '#ffd1d6' : '#ffffff';
      ctx.fillText(fit(ctx, l.label, w - rw - 12), x + 3, ly);
      hits.push({ key: l.key, x, y: ly - 0.5, w, h: 6 });
    });
    if (shown.length < lines.length) {
      ctx.font = `5px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillText(`+${lines.length - shown.length} meer`, x + 3, y + 8 + shown.length * 6);
    }
  }

  function drawCeoBubble(a, t) {
    const headY = ceo.y - (ceo.seated ? 17 : 20);
    const opts = { maxW: 150, minX: 0, maxX: W };
    if (a.status === 'waiting') {
      drawBubble(ctx, ceo.x + 10, headY - 2, a.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
      if (Math.sin(t * 7) > -0.2) drawBadge(ctx, ceo.x - 9, headY - 2, '!', C.waiting, 8);
    } else if (a.status === 'working') {
      if (/^denkt na/i.test(a.activity || '')) drawThought(ctx, ceo.x + 4, headY - 1, t);
      else drawBubble(ctx, ceo.x + 10, headY - 2, a.activity || 'Aan het werk', { ...opts, border: C.working });
    } else if (a.status === 'done') {
      drawBadge(ctx, ceo.x - 9, headY - 2, '✓', C.done, 7);
    }
  }

  function frame(t, dt) {
    step(t, dt);
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const chh = Math.round(canvas.clientHeight * dpr);
    if (!cw || !chh) return;
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    const scale = Math.min(cw / W, chh / H);
    view = { scale, ox: Math.round((cw - W * scale) / 2), oy: Math.round((chh - H * scale) / 2) };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11131d';
    ctx.fillRect(0, 0, cw, chh);
    ctx.setTransform(scale, 0, 0, scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;

    drawFloor(ctx, 0, WALL_H, W, H - WALL_H);
    rect(ctx, 8, WALL_H + 4, 80, H - WALL_H - 12, '#6a5440'); // carpet under the desk
    rect(ctx, 9, WALL_H + 5, 78, H - WALL_H - 14, '#7a6450');
    drawBackWall(ctx, W, WALL_H);
    // plaque
    rect(ctx, 14, 12, 60, 14, '#b8902f');
    rect(ctx, 15, 13, 58, 12, '#ecd27a');
    ctx.font = `600 6px ${FONT}`;
    ctx.fillStyle = '#3a2a10';
    ctx.textBaseline = 'top';
    ctx.fillText('DIRECTIE', 24, 16);
    drawBoard();
    drawOuterWalls(ctx, W, H, WALL_H);
    drawStairs();

    const a = session();
    ceo.seated = !ceo.walking && !handoff && Math.hypot(ceo.x - SEAT.x, ceo.y - SEAT.y) < 1;
    const waiting = lines.filter((l) => l.status === 'waiting').length;
    const scene = [
      { y: SEAT.y - 3, draw: () => drawChair(ctx, SEAT.x, SEAT.y) },
      { y: DESK.y + 15, draw: () => { drawCeoDesk(ctx, DESK.x, DESK.y, DESK.w); drawInbox(ctx, DESK.x + 30, DESK.y - 3, waiting, t); } },
      { y: WALL_H + 24, draw: () => drawPlant(ctx, W - 22, WALL_H + 4, t) },
      { y: WALL_H + 24, draw: () => drawPlant(ctx, 76, WALL_H + 4, t) },
    ];
    const pose = ceo.walking ? 'walk' : ceo.seated ? (a?.status === 'working' ? 'working' : 'read') : 'stand';
    scene.push({
      y: ceo.seated ? ceo.y - 2 : ceo.y,
      draw: () => {
        drawPerson(ctx, ceo.x, ceo.y, ceo.looks, { pose, t, seated: ceo.seated, walkPhase: ceo.phase, outfit: 'manager', accent: '#e8c35a' });
        if (handoff && handoff.stage !== 'back') drawFolder(ctx, ceo.x, ceo.y - 22);
      },
    });
    scene.sort((p, q) => p.y - q.y);
    for (const item of scene) item.draw();

    const lightPhase = getPhase ? getPhase() : 'dag';
    drawLighting(ctx, shade, W, H, { phase: lightPhase, lamps: a ? [{ x: ceo.x, y: ceo.y - 6 }] : [], spots: [], t });

    drawNameplate(ctx, DESK.x, DESK.y + 18, 70, 'CEO (jij)', waiting ? `${waiting} ${waiting === 1 ? 'team wacht' : 'teams wachten'}` : '', waiting ? 'waiting' : a?.status || 'idle', { light: true });
    if (handoff?.stage === 'drop') drawBubble(ctx, ceo.x + 10, ceo.y - 22, 'Nieuw team!', { maxW: 80, minX: 0, maxX: W, border: '#e8c35a', bold: true });
    else if (a && !ceo.walking && !handoff) drawCeoBubble(a, t);
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: ((e.clientX - r.left) * dpr - view.ox) / view.scale, y: ((e.clientY - r.top) * dpr - view.oy) / view.scale };
  }
  const hitAt = (p) => hits.findIndex((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);

  // Click on a board line → focus that team room.
  canvas.addEventListener('click', (e) => {
    const i = hitAt(toLogical(e));
    if (i < 0) return;
    e.stopPropagation();
    onFocus?.(hits[i].key);
  });
  canvas.addEventListener('mousemove', (e) => {
    hover = hitAt(toLogical(e));
    canvas.style.cursor = hover >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('mouseleave', () => { hover = -1; canvas.style.cursor = ''; });

  return {
    kind: 'ceo',
    setAgents,
    setRooms,
    handoff: startHandoff,
    frame,
    size: () => ({ W, H }),
    isEmpty: () => agents.length === 0,
  };
}
