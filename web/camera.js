// Camera for the company canvas (ADR-019): which part of the company fills the canvas.
// A camera is { cx, cy, z }: the logical point in the middle and the zoom (1 = whole company).
// Pure module: works in the browser and under node --test.

export const MAX_ZOOM = 6;

export const fullCam = (W, H) => ({ cx: W / 2, cy: H / 2, z: 1 });

/** Keep the zoom within 1..max and the visible part inside the company. */
export function clampCam(cam, W, H, max = MAX_ZOOM) {
  const z = Math.max(1, Math.min(max, cam.z));
  const hw = W / (2 * z);
  const hh = H / (2 * z);
  return { cx: Math.max(hw, Math.min(W - hw, cam.cx)), cy: Math.max(hh, Math.min(H - hh, cam.cy)), z };
}

/** Canvas transform for a camera: logical (x, y) is drawn at (ox + x * scale, oy + y * scale). */
export function viewFor(cam, W, H, cw, ch) {
  const scale = Math.min(cw / W, ch / H) * cam.z;
  return { scale, ox: Math.round(cw / 2 - cam.cx * scale), oy: Math.round(ch / 2 - cam.cy * scale) };
}

/** Camera that shows `rect` (logical px) as large as fits, with a little margin. */
export function focusRect(rect, W, H, max = MAX_ZOOM) {
  const z = Math.min(W / rect.w, H / rect.h) * 0.92;
  return clampCam({ cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, z }, W, H, max);
}

/** Zoom by `factor` while the logical point (px, py) stays under the cursor. */
export function zoomAt(cam, factor, px, py, W, H, max = MAX_ZOOM) {
  const z = Math.max(1, Math.min(max, cam.z * factor));
  const k = cam.z / z;
  return clampCam({ cx: px - (px - cam.cx) * k, cy: py - (py - cam.cy) * k, z }, W, H, max);
}

/** Move the camera by a drag of (dx, dy) logical px. */
export const panCam = (cam, dx, dy, W, H, max = MAX_ZOOM) => clampCam({ cx: cam.cx - dx, cy: cam.cy - dy, z: cam.z }, W, H, max);

/** Ease `cur` towards `target`; snaps when close so the animation ends. */
export function stepCam(cur, target, dt, rate = 10) {
  const a = 1 - Math.exp(-rate * dt);
  const next = { cx: cur.cx + (target.cx - cur.cx) * a, cy: cur.cy + (target.cy - cur.cy) * a, z: cur.z + (target.z - cur.z) * a };
  const close = Math.abs(next.cx - target.cx) < 0.2 && Math.abs(next.cy - target.cy) < 0.2 && Math.abs(next.z - target.z) < 0.002;
  return close ? { ...target } : next;
}

export const isZoomed = (cam) => cam.z > 1.01;
