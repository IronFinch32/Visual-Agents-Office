import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fullCam, clampCam, viewFor, focusRect, zoomAt, panCam, stepCam, isZoomed, MAX_ZOOM } from '../web/camera.js';

const W = 640, H = 300;

test('the full camera shows the whole company, centred like before (ADR-019)', () => {
  const v = viewFor(fullCam(W, H), W, H, 1280, 700);
  assert.equal(v.scale, 2);
  assert.equal(v.ox, 0);
  assert.equal(v.oy, 50);
  assert.equal(isZoomed(fullCam(W, H)), false);
});

test('zoom stays between 1x and the maximum and the view stays inside the company', () => {
  assert.equal(clampCam({ cx: 0, cy: 0, z: 0.2 }, W, H).z, 1);
  const c = clampCam({ cx: -50, cy: 999, z: 99 }, W, H);
  assert.equal(c.z, MAX_ZOOM);
  assert.equal(c.cx, W / (2 * MAX_ZOOM));
  assert.equal(c.cy, H - H / (2 * MAX_ZOOM));
});

test('focusRect fills the canvas with a department', () => {
  const c = focusRect({ x: 160, y: 22, w: 80, h: 134 }, W, H);
  assert.ok(Math.abs(c.z - (H / 134) * 0.92) < 1e-9);
  assert.equal(c.cx, 200);
  assert.ok(isZoomed(c));
});

test('zoomAt keeps the point under the cursor in place', () => {
  const cam = fullCam(W, H);
  const before = viewFor(cam, W, H, W, H);
  const next = zoomAt(cam, 2, 200, 100, W, H);
  const after = viewFor(next, W, H, W, H);
  assert.equal(next.z, 2);
  assert.ok(Math.abs((before.ox + 200 * before.scale) - (after.ox + 200 * after.scale)) <= 1);
  assert.ok(Math.abs((before.oy + 100 * before.scale) - (after.oy + 100 * after.scale)) <= 1);
  assert.deepEqual(zoomAt(next, 0.1, 10, 10, W, H), fullCam(W, H));
});

test('panning moves the camera against the drag and is clamped', () => {
  const cam = { cx: 300, cy: 150, z: 3 };
  assert.deepEqual(panCam(cam, 20, -10, W, H), { cx: 280, cy: 160, z: 3 });
  assert.equal(panCam(fullCam(W, H), 50, 50, W, H).cx, W / 2);
});

test('stepCam eases towards the target and ends exactly on it', () => {
  let cur = fullCam(W, H);
  const target = { cx: 100, cy: 80, z: 4 };
  cur = stepCam(cur, target, 1 / 60);
  assert.ok(cur.z > 1 && cur.z < 4);
  for (let i = 0; i < 200; i++) cur = stepCam(cur, target, 1 / 60);
  assert.deepEqual(cur, target);
});
