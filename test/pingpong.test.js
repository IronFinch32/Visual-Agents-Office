import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRally, HIT_DUR, PAUSE } from '../web/pingpong.js';

// a seeded random so a failing rally can be replayed
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// runs one rally from the serve to its end; returns the events and the sampled ball positions
function playOut(r, solo = false, side = 0) {
  r.serve(0, side, solo);
  const events = [];
  const samples = [];
  for (let t = 0; t < 30; t += 1 / 60) {
    const b = r.ball(t);
    if (b) samples.push({ t, side: r.hitter(), ...b });
    const ev = r.update(t);
    events.push(...ev.map((e) => ({ ...e, t })));
    if (ev.some((e) => e.type === 'point' || e.type === 'miss')) break;
  }
  return { events, samples };
}

test('strokes alternate sides and a rally ends with a point within nine strokes', () => {
  for (let k = 1; k <= 50; k++) {
    const { events } = playOut(createRally(seeded(k)), false, k % 2);
    const hits = events.filter((e) => e.type === 'hit');
    const point = events.find((e) => e.type === 'point');
    assert.ok(point, 'the rally ends with a point');
    assert.ok(hits.length + 1 >= 3 && hits.length + 1 <= 9, `${hits.length + 1} strokes`);
    let side = k % 2;
    for (const h of hits) { side = 1 - side; assert.equal(h.side, side); }
    assert.equal(point.side, side, 'the last hitter wins the point');
  }
});

test('the ball stays above the table and bounces once on the receiver half', () => {
  for (let k = 1; k <= 30; k++) {
    const { samples } = playOut(createRally(seeded(k)));
    for (const s of samples) {
      if (s.h >= 0) assert.ok(s.u >= -1e-9 && s.u <= 1 + 1e-9, `u ${s.u} above the table`);
      assert.ok(s.v >= 0 && s.v <= 1);
    }
    for (const s of samples.filter((x) => Math.abs(x.h) < 0.05 && x.u > 0.05 && x.u < 0.95)) {
      assert.ok(s.side === 0 ? s.u > 0.5 : s.u < 0.5, `bounce at u ${s.u} on the receiver half`);
    }
  }
});

test('a missed ball flies past the end and the winner serves after the pause', () => {
  const r = createRally(seeded(7));
  const { events, samples } = playOut(r);
  const point = events.find((e) => e.type === 'point');
  const last = samples[samples.length - 1];
  assert.ok(last.u < 0 || last.u > 1, 'past the end of the table');
  assert.ok(last.h < 0, 'falling below the top');
  assert.equal(r.ball(point.t + 0.1), null, 'no ball between rallies');
  assert.deepEqual(r.update(point.t + PAUSE / 2), []);
  assert.deepEqual(r.update(point.t + PAUSE + 0.01), [{ type: 'hit', side: point.side }]);
});

test('solo practice comes back to the same side and never scores a point', () => {
  for (let k = 1; k <= 20; k++) {
    const { events, samples } = playOut(createRally(seeded(k)), true, 1);
    assert.ok(events.every((e) => e.type !== 'point'));
    assert.ok(events.filter((e) => e.type === 'hit').every((e) => e.side === 1));
    assert.equal(events[events.length - 1].type, 'miss');
    for (const s of samples) if (s.h >= 0) assert.ok(s.u >= 0.5 - 1e-9, `u ${s.u} stays on the own half`);
  }
});

test('a long time jump moves on one stroke per update instead of looping', () => {
  const r = createRally(seeded(3));
  r.serve(0, 0, false);
  const ev = r.update(1000);
  assert.equal(ev.length, 1);
  if (ev[0].type === 'hit') assert.ok(r.ball(1000 + HIT_DUR / 2), 'the next stroke starts now, not in the past');
});

test('stop clears the rally', () => {
  const r = createRally(seeded(5));
  r.serve(0);
  assert.ok(r.playing());
  r.stop();
  assert.equal(r.playing(), false);
  assert.equal(r.ball(0.1), null);
  assert.deepEqual(r.update(5), []);
});
