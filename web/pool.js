// A tiny pool game for the lounge (ADR-014): balls roll, bounce off the cushions, hit each other
// and drop into pockets. Pure state, no canvas: coordinates are on the cloth, (0, 0) top-left.

export const CLOTH_W = 40;
export const CLOTH_H = 18;
export const BALL_R = 1.5;
const POCKET_R = 2.4;
const FRICTION = 1.6; // fraction of speed lost per second (exponential)
const STOP = 1.5; // px/s: below this a ball lies still
const SUBSTEP = 1 / 120;
const MAX_DT = 0.1; // a background tab doesn't fire balls through the cushions
const COLORS = ['#f1c40f', '#c0392b', '#2f6fd6', '#1b1b22', '#8e44ad', '#e67e22'];
export const HEAD_SPOT = { x: CLOTH_W * 0.25, y: CLOTH_H / 2 };
const FOOT_SPOT = { x: CLOTH_W * 0.68, y: CLOTH_H / 2 };

export const POCKETS = [0, CLOTH_W / 2, CLOTH_W].flatMap((x) => [{ x, y: 0 }, { x, y: CLOTH_H }]);

export function createPoolGame() {
  let balls = [];

  function rack() {
    const d = BALL_R * 2 + 0.2;
    const tri = [[0, 0], [1, -0.5], [1, 0.5], [2, -1], [2, 0], [2, 1]];
    balls = [{ id: 'cue', x: HEAD_SPOT.x, y: HEAD_SPOT.y, vx: 0, vy: 0, color: '#f4f4f4', in: false }];
    tri.forEach(([c, r], i) => balls.push({ id: i, x: FOOT_SPOT.x + c * d * 0.87, y: FOOT_SPOT.y + r * d, vx: 0, vy: 0, color: COLORS[i], in: false }));
  }

  const onTable = () => balls.filter((b) => !b.in);
  const cue = () => balls[0];
  const moving = () => onTable().some((b) => b.vx || b.vy);
  const left = () => onTable().filter((b) => b.id !== 'cue').length;

  function shoot(angle, speed) {
    const c = cue();
    if (c.in) respot();
    c.vx = Math.cos(angle) * speed;
    c.vy = Math.sin(angle) * speed;
  }

  // the cue ball goes back on the head spot, or as close as it gets without touching another ball
  function respot() {
    const c = cue();
    Object.assign(c, { in: false, vx: 0, vy: 0, x: HEAD_SPOT.x, y: HEAD_SPOT.y });
    for (let k = 0; k < 20 && onTable().some((b) => b !== c && Math.hypot(b.x - c.x, b.y - c.y) < BALL_R * 2); k++) c.x = Math.max(BALL_R, c.x - 1);
  }

  function step(dt) {
    const events = [];
    let rest = Math.min(dt, MAX_DT);
    while (rest > 1e-9) {
      const h = Math.min(SUBSTEP, rest);
      rest -= h;
      substep(h, events);
    }
    return events;
  }

  function substep(h, events) {
    const live = onTable();
    const keep = Math.exp(-FRICTION * h);
    for (const b of live) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.vx *= keep;
      b.vy *= keep;
      if (Math.hypot(b.vx, b.vy) < STOP) { b.vx = 0; b.vy = 0; }
      const pocket = POCKETS.find((p) => Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R);
      if (pocket) {
        Object.assign(b, { in: true, vx: 0, vy: 0, x: pocket.x, y: pocket.y });
        events.push({ type: b.id === 'cue' ? 'scratch' : 'pocket', ball: b.id });
        continue;
      }
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x > CLOTH_W - BALL_R) { b.x = CLOTH_W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.y > CLOTH_H - BALL_R) { b.y = CLOTH_H - BALL_R; b.vy = -Math.abs(b.vy); }
    }
    // equal-mass elastic collisions: swap the velocity components along the line between centres
    const table = onTable();
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        const a = table[i], b = table[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= BALL_R * 2 || dist === 0) continue;
        const nx = dx / dist, ny = dy / dist;
        const push = (BALL_R * 2 - dist) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) continue;
        a.vx -= rel * nx; a.vy -= rel * ny;
        b.vx += rel * nx; b.vy += rel * ny;
      }
    }
  }

  rack();
  return { rack, shoot, step, respot, moving, left, cue, get balls() { return balls; } };
}
