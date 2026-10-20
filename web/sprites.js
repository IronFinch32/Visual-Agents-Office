// Procedural pixel-art drawing helpers. All coordinates are logical pixels.

export const C = {
  floorA: '#b98a5a', floorB: '#ad7f50', floorLine: '#9a6f45', carpet: '#6d5a8f', carpetEdge: '#5a4a78',
  wall: '#5a5f86', wallDark: '#474b6d', trim: '#2f3250',
  window: '#9fd6ff', windowFrame: '#e9ecff',
  deskTop: '#d9a066', deskFront: '#8f5a2e', deskLeg: '#5e3a1d',
  chair: '#3a3f5c', chairTop: '#4a5070', monitor: '#30344a', monitorEdge: '#1d2030',
  plant: '#3fa34d', plantDark: '#2b7a37', pot: '#c0603b', potRim: '#d9774f',
  skin: ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'],
  hair: ['#2b1d0e', '#6b4423', '#d6b25e', '#a33b20', '#1c1c1c', '#7c7c8a'],
  pants: '#2f3550', shoe: '#1b1b22', eye: '#1b1b22',
  working: '#4ea3ff', waiting: '#ff4d5e', done: '#3ddc84', idle: '#8a8fa8',
  bubble: '#ffffff', bubbleText: '#1b1d2a', text: '#ffffff', textDark: '#2a1b10', shadow: 'rgba(0,0,0,.25)',
};

export const FONT = "'Pixelify Sans', ui-monospace, Menlo, monospace";

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function looksFor(id) {
  const h = hash(id);
  const hue = h % 360;
  return {
    shirt: `hsl(${hue} 60% 55%)`,
    shirtDark: `hsl(${hue} 55% 40%)`,
    skin: C.skin[(h >>> 8) % C.skin.length],
    hair: C.hair[(h >>> 12) % C.hair.length],
  };
}

export function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

export function minutesSince(ts, now) {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return 'net';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}u${String(m % 60).padStart(2, '0')}`;
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawFloor(ctx, x0, y0, W, H) {
  for (let y = y0; y < y0 + H; y += 6) {
    rect(ctx, x0, y, W, Math.min(6, y0 + H - y), ((y - y0) / 6) % 2 ? C.floorA : C.floorB);
    const off = (((y - y0) / 6) % 3) * 13;
    for (let x = x0 + off; x < x0 + W; x += 40) rect(ctx, x, y, 1, Math.min(6, y0 + H - y), C.floorLine);
  }
}

export function drawWall(ctx, W, wallH, doorX) {
  rect(ctx, 0, 0, W, wallH, C.wall);
  rect(ctx, 0, wallH - 4, W, 4, C.wallDark);
  rect(ctx, 0, wallH - 1, W, 1, C.trim);
  for (let x = doorX + 30; x + 30 < W - 8; x += 64) {
    rect(ctx, x - 1, 4, 30, 13, C.windowFrame);
    rect(ctx, x, 5, 28, 11, C.window);
    rect(ctx, x + 13, 5, 2, 11, C.windowFrame);
    rect(ctx, x + 3, 7, 6, 2, '#d8f0ff');
  }
  rect(ctx, doorX - 8, 4, 16, wallH - 4, C.trim);
  rect(ctx, doorX - 7, 5, 14, wallH - 5, '#7a4a26');
  rect(ctx, doorX + 3, 13, 2, 2, '#e8c35a');
}

export function drawPlant(ctx, x, y) {
  rect(ctx, x + 1, y + 12, 7, 8, C.pot);
  rect(ctx, x, y + 11, 9, 2, C.potRim);
  rect(ctx, x + 2, y + 2, 5, 9, C.plant);
  rect(ctx, x, y + 5, 3, 5, C.plantDark);
  rect(ctx, x + 6, y + 4, 3, 6, C.plantDark);
  rect(ctx, x + 3, y, 3, 3, C.plant);
}

export function drawChair(ctx, cx, seatY) {
  rect(ctx, cx - 8, seatY - 24, 16, 24, C.chair);
  rect(ctx, cx - 7, seatY - 23, 14, 2, C.chairTop);
}

/** Desk whose top-left corner is (x, y). The monitor sits on the right half. */
export function drawDesk(ctx, x, y, w, { status, t = 0, accent, mug = false, seed = 0 } = {}) {
  if (status === 'waiting') {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 6);
    ctx.fillStyle = C.waiting;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 10, w / 2 + 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  rect(ctx, x, y, w, 4, C.deskTop);
  rect(ctx, x, y + 4, w, 9, C.deskFront);
  if (accent) rect(ctx, x, y + 4, w, 2, accent);
  rect(ctx, x + 2, y + 13, 3, 3, C.deskLeg);
  rect(ctx, x + w - 5, y + 13, 3, 3, C.deskLeg);
  const mx = x + w - 18;
  rect(ctx, mx, y - 14, 15, 12, C.monitorEdge);
  rect(ctx, mx + 1, y - 13, 13, 10, C.monitor);
  rect(ctx, mx + 5, y - 2, 4, 2, C.monitorEdge);
  if (status === 'working') {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10 + seed);
    rect(ctx, mx - 1, y - 14, 1, 12, C.working);
    rect(ctx, mx, y - 15, 15, 1, C.working);
    ctx.globalAlpha = 1;
  }
  if (mug || status === 'done') {
    rect(ctx, x + 4, y - 4, 5, 5, '#f4f4f4');
    rect(ctx, x + 9, y - 3, 2, 3, '#f4f4f4');
    rect(ctx, x + 5, y - 4, 3, 1, '#6b3e1f');
    ctx.globalAlpha = 0.6;
    rect(ctx, x + 5 + Math.round(Math.sin(t * 3)), y - 8, 1, 3, '#ffffff');
    ctx.globalAlpha = 1;
  }
  rect(ctx, x + 12, y + 1, 8, 2, '#f0f0f0');
}

/**
 * A person. (x, y) is the seat point when seated, the feet when standing.
 * pose: working | waiting | done | idle | walk. cap: colour of a cap (workers wear their manager's colour).
 */
export function drawPerson(ctx, x, y, looks, { pose, t = 0, seated, walkPhase = 0, cap } = {}) {
  const left = Math.round(x) - 5;
  const top = Math.round(y) - (seated ? 17 : 20);
  const p = (dx, dy, w, h, c) => rect(ctx, left + dx, top + dy, w, h, c);
  const lean = pose === 'done' ? -1 : 0;
  const L = (dx, dy, w, h, c) => p(dx, dy + lean, w, h, c);

  if (!seated) {
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    const a = Math.round(Math.sin(walkPhase));
    p(2, 14, 2, 5 - Math.max(0, a), C.pants);
    p(6, 14, 2, 5 - Math.max(0, -a), C.pants);
    p(2, 19 - Math.max(0, a), 2, 1, C.shoe);
    p(6, 19 - Math.max(0, -a), 2, 1, C.shoe);
  }
  L(1, 7, 8, 8, looks.shirt);
  L(4, 7, 2, 1, '#ffffff');
  L(2, 1, 6, 6, looks.skin);
  if (cap) {
    L(1, 0, 8, 2, cap);
    L(7, 1, 3, 1, cap);
  } else {
    L(2, 0, 6, 2, looks.hair);
    L(1, 1, 1, 3, looks.hair);
    L(8, 1, 1, 3, looks.hair);
  }
  if (pose === 'idle') {
    L(3, 4, 2, 1, C.eye);
    L(6, 4, 2, 1, C.eye);
  } else {
    const blink = Math.sin(t * 1.3 + x) > 0.97;
    L(3, 3, 1, blink ? 1 : 2, C.eye);
    L(6, 3, 1, blink ? 1 : 2, C.eye);
  }
  if (pose === 'done') L(4, 5, 2, 1, '#a0522d');
  if (pose === 'working' && seated) {
    const bob = Math.sin(t * 14) > 0 ? 0 : 1;
    L(0, 8, 1, 5, looks.shirtDark);
    L(9, 8, 1, 5, looks.shirtDark);
    L(1, 13 + bob, 2, 1, looks.skin);
    L(7, 14 - bob, 2, 1, looks.skin);
  } else if (pose === 'waiting') {
    const wave = Math.sin(t * 8) > 0 ? 0 : 1;
    L(0, 8, 1, 5, looks.shirtDark);
    L(0, 13, 1, 1, looks.skin);
    L(9 + wave, -1, 1, 8, looks.shirtDark);
    L(9 + wave, -2, 1, 1, looks.skin);
  } else if (pose === 'done') {
    L(0, 2, 1, 6, looks.shirtDark);
    L(9, 2, 1, 6, looks.shirtDark);
    L(1, 1, 1, 2, looks.skin);
    L(8, 1, 1, 2, looks.skin);
  } else {
    L(0, 8, 1, 6, looks.shirtDark);
    L(9, 8, 1, 6, looks.shirtDark);
    L(0, 14, 1, 1, looks.skin);
    L(9, 14, 1, 1, looks.skin);
  }
}

export function drawBadge(ctx, cx, cy, text, color, size = 7) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(cx - size / 2) - 1, Math.round(cy - size / 2) - 1, size + 2, size + 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
  ctx.textAlign = 'left';
}

export function drawBubble(ctx, cx, bottomY, text, { border = C.trim, bold = false, maxW = 60, minX = 0, maxX = Infinity } = {}) {
  ctx.font = `${bold ? '600 ' : ''}6px ${FONT}`;
  const label = fit(ctx, text, maxW - 8);
  const w = Math.ceil(ctx.measureText(label).width) + 8;
  const h = 11;
  let x = Math.round(cx - w / 2);
  x = Math.max(minX + 1, Math.min(x, maxX - w - 1));
  const y = Math.round(bottomY - h - 3);
  rect(ctx, x - 1, y - 1, w + 2, h + 2, border);
  rect(ctx, x, y, w, h, C.bubble);
  rect(ctx, Math.round(cx) - 1, y + h, 3, 1, border);
  rect(ctx, Math.round(cx), y + h + 1, 1, 2, border);
  rect(ctx, Math.round(cx), y + h, 1, 1, C.bubble);
  ctx.fillStyle = C.bubbleText;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 4, y + h / 2 + 0.5);
}

/** Bubble + badge above a seated agent, according to its status. */
export function drawStatusOverlay(ctx, x, headY, agent, t, { maxW, minX, maxX, doneText }) {
  const opts = { maxW, minX, maxX };
  if (agent.status === 'waiting') {
    drawBubble(ctx, x + 10, headY - 2, agent.waitingReason || 'Wacht op je input', { ...opts, border: C.waiting, bold: true });
    if (Math.sin(t * 7) > -0.2) drawBadge(ctx, x - 9, headY - 2, '!', C.waiting, 8);
  } else if (agent.status === 'working') {
    drawBubble(ctx, x + 10, headY - 2, agent.activity || 'Aan het werk', { ...opts, border: C.working });
  } else if (agent.status === 'done') {
    drawBubble(ctx, x + 10, headY - 2, doneText, { ...opts, border: C.done });
    drawBadge(ctx, x - 9, headY - 2, '✓', C.done, 7);
  } else {
    ctx.font = `600 6px ${FONT}`;
    ctx.fillStyle = '#e8eaff';
    const k = (t * 0.8) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillText('z', x + 6 + k * 4, headY - k * 8);
    ctx.fillText('Z', x + 10 + k * 3, headY - 6 - k * 6);
    ctx.globalAlpha = 1;
  }
}

export function drawNameplate(ctx, x, y, maxW, label, statusText, status, { light = false } = {}) {
  rect(ctx, x, y + 1, 5, 5, C[status] || C.idle);
  ctx.font = `600 6px ${FONT}`;
  ctx.textBaseline = 'top';
  const name = fit(ctx, label, maxW - 8);
  ctx.fillStyle = C.shadow;
  ctx.fillText(name, x + 8, y + 0.5);
  ctx.fillStyle = C.text;
  ctx.fillText(name, x + 7, y);
  if (statusText) {
    ctx.font = `5px ${FONT}`;
    ctx.fillStyle = status === 'waiting' ? '#ffd1d6' : light ? '#e4defa' : C.textDark;
    ctx.fillText(fit(ctx, statusText, maxW - 8), x + 7, y + 7);
  }
}
