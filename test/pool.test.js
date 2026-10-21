import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoolGame, CLOTH_W, CLOTH_H, BALL_R, POCKETS, HEAD_SPOT } from '../web/pool.js';

const settle = (g, max = 30) => {
  const events = [];
  for (let t = 0; t < max && (t === 0 || g.moving()); t += 1 / 60) events.push(...g.step(1 / 60));
  return events;
};
const inside = (b) => b.x >= BALL_R - 1e-6 && b.x <= CLOTH_W - BALL_R + 1e-6 && b.y >= BALL_R - 1e-6 && b.y <= CLOTH_H - BALL_R + 1e-6;

test('rack puts a cue ball and six colour balls on the cloth, none overlapping', () => {
  const g = createPoolGame();
  assert.equal(g.balls.length, 7);
  assert.equal(g.left(), 6);
  for (const b of g.balls) assert.ok(inside(b), `ball ${b.id} on the cloth`);
  for (const a of g.balls) for (const b of g.balls) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= BALL_R * 2 - 1e-6);
});

test('after a hard break every ball comes to rest and stays on the cloth or in a pocket', () => {
  for (let k = 0; k < 20; k++) {
    const g = createPoolGame();
    g.shoot((Math.random() - 0.5) * 0.3, 90);
    settle(g);
    assert.equal(g.moving(), false);
    for (const b of g.balls) assert.ok(b.in || inside(b), `ball ${b.id} escaped at ${b.x},${b.y}`);
  }
});

test('the break moves the rack: momentum reaches the colour balls', () => {
  const g = createPoolGame();
  const before = g.balls.slice(1).map((b) => ({ x: b.x, y: b.y }));
  g.shoot(0, 80);
  settle(g);
  assert.ok(g.balls.slice(1).some((b, i) => b.in || Math.hypot(b.x - before[i].x, b.y - before[i].y) > 1));
});

test('a ball rolling straight at a corner pocket drops in', () => {
  const g = createPoolGame();
  for (const b of g.balls.slice(1)) b.in = true; // clear the table
  const c = g.cue();
  Object.assign(c, { x: 10, y: 9 });
  const p = POCKETS[0];
  g.shoot(Math.atan2(p.y - c.y, p.x - c.x), 60);
  const events = settle(g);
  assert.deepEqual(events, [{ type: 'scratch', ball: 'cue' }]);
  assert.equal(c.in, true);
});

test('a pocketed cue ball goes back on the head spot when shot again', () => {
  const g = createPoolGame();
  g.cue().in = true;
  g.shoot(0, 0);
  assert.equal(g.cue().in, false);
  assert.ok(Math.hypot(g.cue().x - HEAD_SPOT.x, g.cue().y - HEAD_SPOT.y) < 20);
});

test('a huge frame time is capped instead of tunnelling through the cushion', () => {
  const g = createPoolGame();
  g.shoot(Math.PI / 2, 90);
  g.step(5);
  for (const b of g.balls) assert.ok(b.in || inside(b));
});
