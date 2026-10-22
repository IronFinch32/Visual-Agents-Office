// Table tennis in the lounge (ADR-021), the pure part: a scripted rally in time. No canvas here, so it
// runs under node:test. Positions are relative to the table: u along it (0 = left end, 1 = right end),
// v across it (0..1) and h the height above the top in pixels.

export const HIT_DUR = 0.6; // seconds per stroke
export const PAUSE = 1.2; // seconds between a point and the next serve
const MIN_HITS = 3;
const MAX_HITS = 9;
const OVERSHOOT = 0.35; // how far a missed ball flies past the end of the table

// One arc: u from u0 to u1, height from h0 to h1 with a parabola of `peak` on top, over `frac` of the flight.
const seg = (u0, u1, h0, h1, peak, frac) => ({ u0, u1, h0, h1, peak, frac });

// The segments of one stroke from `side`. Two players: over the net, one bounce on the receiver's half.
// Solo: against the folded-up half at the net, one bounce back on the own half.
function strokePath(side, solo, miss) {
  const ua = side ? 1 : 0;
  const dir = side ? -1 : 1;
  if (solo) {
    const quarter = ua + dir * 0.25;
    const end = miss ? ua - dir * OVERSHOOT : ua;
    return [seg(ua, 0.5, 3, 4, 3, 0.45), seg(0.5, quarter, 4, 0, 1, 0.25), seg(quarter, end, 0, miss ? -6 : 3, 2, 0.3)];
  }
  const ub = 1 - ua;
  const bounce = ua + dir * 0.72;
  const end = miss ? ub + dir * OVERSHOOT : ub;
  return [seg(ua, bounce, 3, 0, 5, 0.72), seg(bounce, end, 0, miss ? -6 : 3, 3, 0.28)];
}

/** A rally between two players at the short ends (side 0 left, 1 right), or one player practising. */
export function createRally(rand = Math.random) {
  let s = null; // { solo, server, hits, count, flight, pauseUntil }

  function launch(side, t, miss) {
    s.flight = { side, start: t, path: strokePath(side, s.solo, miss), miss, v0: 0.25 + rand() * 0.5, v1: 0.25 + rand() * 0.5 };
  }
  function startRally(t) {
    s.hits = MIN_HITS + Math.floor(rand() * (MAX_HITS - MIN_HITS + 1));
    s.count = 1;
    s.pauseUntil = 0;
    launch(s.server, t, s.count >= s.hits);
  }

  return {
    serve(t, side = 0, solo = false) { s = { solo, server: side }; startRally(t); },
    stop() { s = null; },
    playing: () => !!s,
    /** Moves the rally on to `t`; at most one stroke or point per call, so a time jump never loops. */
    update(t) {
      if (!s) return [];
      if (!s.flight) {
        if (t < s.pauseUntil) return [];
        startRally(t);
        return [{ type: 'hit', side: s.server }];
      }
      const f = s.flight;
      const end = f.start + HIT_DUR;
      if (t < end) return [];
      if (f.miss) {
        s.flight = null;
        s.pauseUntil = t + PAUSE;
        if (s.solo) return [{ type: 'miss', side: f.side }];
        s.server = f.side; // the receiver missed, the hitter wins the point and serves
        return [{ type: 'point', side: f.side }];
      }
      const next = s.solo ? f.side : 1 - f.side;
      s.count++;
      launch(next, t - end < HIT_DUR ? end : t, s.count >= s.hits);
      return [{ type: 'hit', side: next }];
    },
    /** Where the ball is at `t`, or null between rallies. */
    ball(t) {
      const f = s?.flight;
      if (!f) return null;
      let k = Math.max(0, Math.min(1, (t - f.start) / HIT_DUR));
      const v = f.v0 + (f.v1 - f.v0) * k;
      for (const p of f.path) {
        if (k <= p.frac || p === f.path[f.path.length - 1]) {
          const q = Math.min(1, k / p.frac);
          return { u: p.u0 + (p.u1 - p.u0) * q, v, h: p.h0 + (p.h1 - p.h0) * q + 4 * p.peak * q * (1 - q) };
        }
        k -= p.frac;
      }
      return null;
    },
    /** The side of the stroke in the air, for the paddle swing. */
    hitter: () => s?.flight?.side ?? null,
  };
}
