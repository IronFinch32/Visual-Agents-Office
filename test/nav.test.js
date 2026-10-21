import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNav } from '../web/nav.js';

const walk = (nav, path, from) => {
  // every straight segment must stay on walkable ground
  let prev = from;
  for (const p of path) {
    const steps = Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y));
    for (let i = 1; i < steps; i++) {
      const x = prev.x + ((p.x - prev.x) * i) / steps;
      const y = prev.y + ((p.y - prev.y) * i) / steps;
      if (!nav.free(x, y)) return false;
    }
    prev = p;
  }
  return true;
};

test('walks around a desk instead of through it', () => {
  const nav = createNav(100, 60);
  nav.block(30, 10, 40, 30); // a desk in the middle
  const path = nav.findPath(10, 25, 90, 25);
  assert.ok(path.length > 1, 'needs at least one turn');
  assert.deepEqual(path.at(-1), { x: 90, y: 25 });
  assert.ok(walk(nav, path.slice(0, -1), { x: 10, y: 25 }));
});

test('straight line when nothing is in the way', () => {
  const nav = createNav(100, 60);
  assert.deepEqual(nav.findPath(10, 10, 90, 50), [{ x: 90, y: 50 }]);
});

test('start or goal on a blocked cell still works; no route falls back to the goal', () => {
  const nav = createNav(100, 60);
  nav.block(40, 0, 20, 60); // a wall cutting the room in two
  assert.deepEqual(nav.findPath(10, 10, 90, 10), [{ x: 90, y: 10 }]);
  nav.open(40, 20, 20, 8); // a door in that wall
  const path = nav.findPath(10, 10, 90, 10);
  assert.ok(path.length > 1);
  assert.ok(path.some((p) => p.y >= 20 && p.y < 28), 'goes through the door');
});
