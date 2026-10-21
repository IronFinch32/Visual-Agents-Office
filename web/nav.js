// Walkable grid + A* so people walk around furniture instead of through it (ADR-008).
// Pure module: works in the browser and under node --test.

export function createNav(W, H, cell = 4) {
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const blocked = new Uint8Array(cols * rows);

  const cx = (x) => Math.max(0, Math.min(cols - 1, Math.floor(x / cell)));
  const cy = (y) => Math.max(0, Math.min(rows - 1, Math.floor(y / cell)));
  const idx = (c, r) => r * cols + c;

  /** Mark a rectangle (logical px) as not walkable. */
  function block(x, y, w, h) {
    for (let r = cy(y); r <= cy(y + h - 1); r++) for (let c = cx(x); c <= cx(x + w - 1); c++) blocked[idx(c, r)] = 1;
  }
  function open(x, y, w, h) {
    for (let r = cy(y); r <= cy(y + h - 1); r++) for (let c = cx(x); c <= cx(x + w - 1); c++) blocked[idx(c, r)] = 0;
  }
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked[idx(c, r)];

  function lineOfSight(a, b) {
    let x0 = a.c, y0 = a.r;
    const dx = Math.abs(b.c - x0), dy = -Math.abs(b.r - y0);
    const sx = x0 < b.c ? 1 : -1, sy = y0 < b.r ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (!free(x0, y0)) return false;
      if (x0 === b.c && y0 === b.r) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Nearest walkable cell (start/goal may sit on a chair or behind a desk). */
  function nearestFree(c, r) {
    if (free(c, r)) return { c, r };
    for (let d = 1; d < 12; d++) {
      for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) === d && free(c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
    return { c, r };
  }

  /**
   * Path from (x0, y0) to (x1, y1) as waypoints in logical px, ending exactly at the goal.
   * Falls back to a straight line when no route exists.
   */
  function findPath(x0, y0, x1, y1) {
    const start = nearestFree(cx(x0), cy(y0));
    const goal = nearestFree(cx(x1), cy(y1));
    const n = cols * rows;
    const g = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open = [];
    const s = idx(start.c, start.r);
    const goalI = idx(goal.c, goal.r);
    const h = (c, r) => {
      const dx = Math.abs(c - goal.c), dy = Math.abs(r - goal.r);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    g[s] = 0;
    open.push([h(start.c, start.r), s]);
    let found = false;
    while (open.length) {
      // small open lists: a linear min-scan is fast enough and keeps this dependency-free
      let best = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[best][0]) best = i;
      const [, cur] = open.splice(best, 1)[0];
      if (closed[cur]) continue;
      if (cur === goalI) { found = true; break; }
      closed[cur] = 1;
      const c = cur % cols, r = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc, nr = r + dr;
        if (!free(nc, nr)) continue;
        if (dr && dc && (!free(c + dc, r) || !free(c, r + dr))) continue; // no corner cutting
        const ni = idx(nc, nr);
        const cost = g[cur] + (dr && dc ? 1.414 : 1);
        if (cost < g[ni]) {
          g[ni] = cost;
          came[ni] = cur;
          open.push([cost + h(nc, nr), ni]);
        }
      }
    }
    if (!found) return [{ x: x1, y: y1 }];
    const cells = [];
    for (let i = goalI; i !== -1; i = came[i]) cells.push({ c: i % cols, r: Math.floor(i / cols) });
    cells.reverse();
    // string-pulling: keep only the turns we need
    const pts = [cells[0]];
    for (let i = 2; i < cells.length; i++) if (!lineOfSight(pts[pts.length - 1], cells[i])) pts.push(cells[i - 1]);
    const center = (p) => ({ x: p.c * cell + cell / 2, y: p.r * cell + cell / 2 });
    const out = pts.slice(1).map(center);
    out.push({ x: x1, y: y1 });
    return out;
  }

  return { block, open, findPath, free: (x, y) => free(cx(x), cy(y)), cols, rows, cell };
}
