// Procedural pixel-art drawing helpers. All coordinates are logical pixels.

export const C = {
  floorA: '#b98a5a', floorB: '#ad7f50', floorLine: '#9a6f45', carpet: '#6d5a8f', carpetEdge: '#5a4a78',
  rug: '#3f6f73', rugEdge: '#2f5559',
  wall: '#5a5f86', wallDark: '#474b6d', wallCap: '#7d82ab', trim: '#2f3250', baseboard: '#3a3d5e',
  window: '#9fd6ff', windowNight: '#1c2550', windowFrame: '#e9ecff',
  deskTop: '#d9a066', deskFront: '#8f5a2e', deskLeg: '#5e3a1d',
  chair: '#3a3f5c', chairTop: '#4a5070', monitorEdge: '#1d2030',
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

/** Outfit per agent type, so the kind of worker is visible from across the room. */
export function outfitFor(agent) {
  if (agent.kind === 'session') return 'manager';
  const type = (agent.name || '').toLowerCase();
  if (type.includes('explore')) return 'explorer';
  if (type.includes('plan')) return 'planner';
  if (type.includes('general')) return 'hoodie';
  return 'cap';
}

/** What the monitor shows, derived from the last tool name. */
export function toolCategory(tool) {
  if (!tool) return 'idle';
  if (tool === 'Bash' || tool === 'BashOutput' || tool === 'KillShell') return 'terminal';
  if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) return 'code';
  if (tool === 'Grep' || tool === 'Glob') return 'search';
  if (tool === 'WebFetch' || tool === 'WebSearch') return 'web';
  if (tool === 'Agent' || tool === 'Task' || tool === 'TaskOutput' || tool === 'SendMessage') return 'team';
  if (tool === 'AskUserQuestion' || tool === 'ExitPlanMode') return 'ask';
  if (tool === 'TodoWrite') return 'todo';
  if (tool.startsWith('mcp__')) return 'plug';
  return 'other';
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

export function wrap(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= maxW) { line = next; continue; }
    if (line) lines.push(line);
    line = words[i];
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < words.length && lines.length) lines[lines.length - 1] = fit(ctx, `${lines[lines.length - 1]} …`, maxW);
  return lines.map((l) => fit(ctx, l, maxW));
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

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Small deterministic noise for animated screens.
const noise = (a, b) => (hash(`${a}:${b}`) % 1000) / 1000;

// ---------- room shell ----------

export function drawFloor(ctx, x0, y0, W, H) {
  for (let y = y0; y < y0 + H; y += 6) {
    const h = Math.min(6, y0 + H - y);
    rect(ctx, x0, y, W, h, ((y - y0) / 6) % 2 ? C.floorA : C.floorB);
    const off = (((y - y0) / 6) % 3) * 13;
    for (let x = x0 + off; x < x0 + W; x += 40) rect(ctx, x, y, 1, h, C.floorLine);
  }
}

export function drawRug(ctx, x, y, w, h, color = C.rug, edge = C.rugEdge) {
  rect(ctx, x, y, w, h, edge);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, color);
  for (let i = x + 3; i < x + w - 3; i += 4) {
    rect(ctx, i, y + 2, 2, 1, edge);
    rect(ctx, i, y + h - 3, 2, 1, edge);
  }
}

/** Back wall with a lighter cap (gives the wall thickness) and a baseboard shadow. */
export function drawBackWall(ctx, W, wallH) {
  rect(ctx, 0, 0, W, 4, C.wallCap);
  rect(ctx, 0, 4, W, 1, C.trim);
  rect(ctx, 0, 5, W, wallH - 9, C.wall);
  rect(ctx, 0, wallH - 4, W, 3, C.baseboard);
  rect(ctx, 0, wallH - 1, W, 1, C.trim);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, wallH, W, 3); // shadow the wall casts on the floor
}

/** Side and front walls: the room looks like a box seen from above. */
export function drawOuterWalls(ctx, W, H, wallH) {
  rect(ctx, 0, wallH, 4, H - wallH, C.wallDark);
  rect(ctx, W - 4, wallH, 4, H - wallH, C.wallDark);
  rect(ctx, 0, wallH, 1, H - wallH, C.wallCap);
  rect(ctx, W - 1, wallH, 1, H - wallH, C.wallCap);
  rect(ctx, 0, H - 5, W, 5, C.wallDark);
  rect(ctx, 0, H - 5, W, 1, C.wallCap);
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.fillRect(4, wallH, 3, H - wallH - 5);
}

export function drawDoor(ctx, x, wallH) {
  rect(ctx, x - 8, 6, 16, wallH - 6, C.trim);
  rect(ctx, x - 7, 7, 14, wallH - 7, '#7a4a26');
  rect(ctx, x - 5, 9, 10, 8, '#8d5a30');
  rect(ctx, x - 5, 19, 10, wallH - 22, '#8d5a30');
  rect(ctx, x + 3, 22, 2, 2, '#e8c35a');
}

export function drawWindow(ctx, x, y, w, h, phase, t) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, C.windowFrame);
  const night = phase === 'nacht';
  rect(ctx, x, y, w, h, night ? C.windowNight : phase === 'avond' ? '#f2a86b' : C.window);
  if (night) {
    for (let i = 0; i < 3; i++) {
      if (Math.sin(t * 2 + i * 2 + x) > -0.5) rect(ctx, x + 2 + ((i * 7 + x) % (w - 3)), y + 2 + ((i * 5) % (h - 3)), 1, 1, '#ffffff');
    }
  } else {
    rect(ctx, x + 2, y + 2, Math.min(6, w - 4), 1, '#ffffff');
  }
  rect(ctx, x + Math.floor(w / 2) - 1, y, 2, h, C.windowFrame);
}

/** Sunlight falling through a window onto the floor. */
export function drawLightBeam(ctx, x, w, wallH, depth, phase) {
  if (phase === 'nacht') return;
  ctx.fillStyle = phase === 'avond' ? 'rgba(255,170,90,.10)' : 'rgba(255,245,200,.12)';
  ctx.beginPath();
  ctx.moveTo(x, wallH);
  ctx.lineTo(x + w, wallH);
  ctx.lineTo(x + w + depth * 0.5, wallH + depth);
  ctx.lineTo(x + depth * 0.5, wallH + depth);
  ctx.closePath();
  ctx.fill();
}

export function drawClock(ctx, cx, cy) {
  rect(ctx, cx - 6, cy - 6, 12, 12, C.windowFrame);
  rect(ctx, cx - 5, cy - 5, 10, 10, '#fff');
  const now = new Date();
  const hAng = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
  const mAng = now.getMinutes() / 60 * Math.PI * 2;
  ctx.strokeStyle = '#1b1d2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hAng) * 3, cy - Math.cos(hAng) * 3);
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(mAng) * 4.5, cy - Math.cos(mAng) * 4.5);
  ctx.stroke();
}

export function drawWhiteboard(ctx, x, y, w, h, text, magnet) {
  rect(ctx, x - 1, y - 1, w + 2, h + 3, '#9aa0b8');
  rect(ctx, x, y, w, h, '#f7f7fb');
  rect(ctx, x + 2, y + h, w - 4, 1, '#6b7088'); // marker tray
  rect(ctx, x + 4, y + h - 1, 4, 1, '#d33');
  rect(ctx, x + 9, y + h - 1, 4, 1, '#2a6fd6');
  if (magnet) rect(ctx, x + w - 5, y + 2, 3, 3, magnet);
  if (!text) return;
  ctx.font = `5px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1f3a8a';
  wrap(ctx, text, w - 8, 3).forEach((line, i) => ctx.fillText(line, x + 3, y + 2 + i * 6));
}

export function drawPlant(ctx, x, y, t = 0) {
  const sway = Math.round(Math.sin(t * 1.4 + x * 0.3) * 0.8);
  ellipse(ctx, x + 4.5, y + 20, 6, 2, C.shadow);
  rect(ctx, x + 1, y + 12, 7, 8, C.pot);
  rect(ctx, x, y + 11, 9, 2, C.potRim);
  rect(ctx, x + 2 + sway, y + 2, 5, 9, C.plant);
  rect(ctx, x + sway, y + 5, 3, 5, C.plantDark);
  rect(ctx, x + 6 + sway, y + 4, 3, 6, C.plantDark);
  rect(ctx, x + 3 + sway * 2, y, 3, 3, C.plant);
}

export function drawCoffeeMachine(ctx, x, y, t) {
  ellipse(ctx, x + 6, y + 20, 8, 2, C.shadow);
  rect(ctx, x, y, 12, 20, '#3b3f4f');
  rect(ctx, x + 1, y + 1, 10, 4, '#545a70');
  rect(ctx, x + 8, y + 2, 2, 2, Math.sin(t * 3) > 0 ? '#ff4d5e' : '#7a2630');
  rect(ctx, x + 3, y + 8, 6, 6, '#1d2030');
  rect(ctx, x + 4, y + 11, 4, 3, '#f4f4f4');
  rect(ctx, x - 2, y + 20, 16, 2, '#6b4a2e');
}

export function drawSmallTable(ctx, x, y) {
  ellipse(ctx, x + 6, y + 8, 7, 2, C.shadow);
  rect(ctx, x, y, 12, 3, C.deskTop);
  rect(ctx, x + 1, y + 3, 10, 2, C.deskFront);
  rect(ctx, x + 5, y + 5, 2, 3, C.deskLeg);
}

export function drawChair(ctx, cx, seatY) {
  rect(ctx, cx - 8, seatY - 24, 16, 24, C.chair);
  rect(ctx, cx - 7, seatY - 23, 14, 2, C.chairTop);
  rect(ctx, cx - 8, seatY - 1, 16, 1, '#2a2e45');
}

/** Monitor with its screen facing the room; content follows the tool category. */
export function drawMonitor(ctx, x, y, { category = 'idle', status, t = 0, seed = 0 } = {}) {
  const w = 15, h = 12;
  rect(ctx, x, y, w, h, C.monitorEdge);
  rect(ctx, x + w, y + 1, 1, h - 1, '#11131d'); // side edge for depth
  rect(ctx, x + 5, y + h, 5, 2, C.monitorEdge);
  rect(ctx, x + 3, y + h + 2, 9, 1, C.monitorEdge);
  const sx = x + 1, sy = y + 1, sw = w - 2, sh = h - 2;
  const tick = Math.floor(t * 3);
  const px = (dx, dy, ww, hh, c) => rect(ctx, sx + dx, sy + dy, ww, hh, c);

  if (status === 'waiting') {
    px(0, 0, sw, sh, Math.sin(t * 7) > 0 ? '#5a1820' : '#3a1016');
    px(6, 2, 1, 4, '#ffffff');
    px(6, 7, 1, 1, '#ffffff');
    return;
  }
  if (status === 'done') {
    px(0, 0, sw, sh, '#12301f');
    px(3, 5, 2, 2, C.done); px(5, 6, 2, 2, C.done); px(7, 4, 2, 2, C.done); px(9, 2, 2, 2, C.done);
    return;
  }
  switch (category) {
    case 'terminal':
      px(0, 0, sw, sh, '#0b1a10');
      for (let i = 0; i < 4; i++) {
        const len = 2 + Math.floor(noise(seed + i, tick + i) * 9);
        px(1, 1 + i * 2, len, 1, i === 3 ? '#9cf0b8' : '#3ddc84');
      }
      if (Math.sin(t * 6) > 0) px(1 + Math.floor(noise(seed, tick) * 9), 8, 2, 1, '#9cf0b8');
      break;
    case 'code': {
      px(0, 0, sw, sh, '#1e1f2b');
      const cols = ['#ff79c6', '#8be9fd', '#f1fa8c', '#bd93f9', '#50fa7b'];
      for (let i = 0; i < 5; i++) {
        const indent = Math.floor(noise(seed + i, tick + i) * 3) * 2;
        const len = 2 + Math.floor(noise(seed - i, tick + i) * (9 - indent));
        px(1 + indent, 1 + i * 2 - 1 + 1, len, 1, cols[(i + tick) % cols.length]);
      }
      break;
    }
    case 'search':
      px(0, 0, sw, sh, '#1e2a3a');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx + 5 + Math.sin(t * 2), sy + 4, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      px(7 + Math.round(Math.sin(t * 2)), 6, 3, 1, '#ffffff');
      px(9 + Math.round(Math.sin(t * 2)), 7, 2, 1, '#ffffff');
      break;
    case 'web':
      px(0, 0, sw, sh, '#0f2d4a');
      ellipse(ctx, sx + sw / 2, sy + sh / 2, 4, 4, '#4ea3ff');
      px(4 + (tick % 3), 3, 2, 2, '#3ddc84');
      px(6 + (tick % 2), 6, 2, 1, '#3ddc84');
      break;
    case 'team':
      px(0, 0, sw, sh, '#2a1f3a');
      for (const [dx, c] of [[2, '#ff9f43'], [7, '#4ea3ff']]) {
        px(dx, 2, 2, 2, c);
        px(dx - 1, 5, 4, 3, c);
      }
      break;
    case 'plug':
      px(0, 0, sw, sh, '#2b2b2b');
      px(4, 2, 1, 2, '#f1c40f'); px(7, 2, 1, 2, '#f1c40f');
      px(3, 4, 6, 3, '#f1c40f'); px(5, 7, 2, 2, '#f1c40f');
      break;
    case 'ask':
      px(0, 0, sw, sh, '#3a1a1f');
      px(4, 1, 4, 1, '#fff'); px(8, 2, 1, 2, '#fff'); px(6, 4, 2, 1, '#fff'); px(6, 5, 1, 2, '#fff'); px(6, 8, 1, 1, '#fff');
      break;
    case 'todo':
      px(0, 0, sw, sh, '#1e2a1e');
      for (let i = 0; i < 3; i++) {
        px(1, 1 + i * 3, 2, 2, i < (tick % 4) ? C.done : '#55665a');
        px(4, 1 + i * 3, 7, 1, '#c8d6c8');
      }
      break;
    case 'other':
      px(0, 0, sw, sh, '#22263a');
      px(2, 2, 9, 1, '#8a8fa8'); px(2, 4, 6, 1, '#8a8fa8'); px(2, 6, 8, 1, '#8a8fa8');
      break;
    default: {
      // screensaver
      px(0, 0, sw, sh, '#0d0f1a');
      const bx = Math.round((Math.sin(t * 0.7 + seed) + 1) * (sw - 2) / 2);
      const by = Math.round((Math.cos(t * 0.9 + seed) + 1) * (sh - 2) / 2);
      px(bx, by, 2, 2, '#4ea3ff');
    }
  }
}

/** Desk top + front. The front is drawn over a seated person's legs. */
export function drawDesk(ctx, x, y, w, { accent, mug = false, lampOn = false, t = 0 } = {}) {
  ellipse(ctx, x + w / 2, y + 16, w / 2 + 2, 3, C.shadow);
  rect(ctx, x, y, w, 4, C.deskTop);
  rect(ctx, x, y, w, 1, '#e9b77f');
  rect(ctx, x, y + 4, w, 9, C.deskFront);
  if (accent) rect(ctx, x, y + 4, w, 2, accent);
  rect(ctx, x + 2, y + 13, 3, 3, C.deskLeg);
  rect(ctx, x + w - 5, y + 13, 3, 3, C.deskLeg);
  rect(ctx, x + 12, y + 1, 8, 2, '#f0f0f0'); // papers
  rect(ctx, x + 22, y + 1, 9, 2, '#2a2e45'); // keyboard
  // desk lamp
  rect(ctx, x + 2, y - 1, 4, 1, '#3b3f4f');
  rect(ctx, x + 3, y - 6, 1, 5, '#3b3f4f');
  rect(ctx, x + 2, y - 8, 4, 2, lampOn ? '#ffd27a' : '#5b6078');
  if (mug) {
    rect(ctx, x + 7, y - 4, 4, 4, '#f4f4f4');
    rect(ctx, x + 11, y - 3, 1, 2, '#f4f4f4');
    rect(ctx, x + 8, y - 4, 2, 1, '#6b3e1f');
  }
}

// ---------- people ----------

/**
 * A person. (x, y) is the seat point when seated, the feet when standing.
 * pose: working | waiting | done | idle | stretch | walk | sip
 */
export function drawPerson(ctx, x, y, looks, { pose, t = 0, seated, walkPhase = 0, outfit = 'cap', accent, sipping = false } = {}) {
  const left = Math.round(x) - 5;
  const top = Math.round(y) - (seated ? 17 : 20);
  const p = (dx, dy, w, h, c) => rect(ctx, left + dx, top + dy, w, h, c);
  const lean = pose === 'done' && seated ? -1 : 0;
  const L = (dx, dy, w, h, c) => p(dx, dy + lean, w, h, c);
  const shirt = outfit === 'manager' ? '#2f3550' : looks.shirt;
  const shirtDark = outfit === 'manager' ? '#23283d' : looks.shirtDark;

  if (!seated) {
    ellipse(ctx, x, y, 5, 2, C.shadow);
    const a = pose === 'walk' ? Math.round(Math.sin(walkPhase)) : 0;
    p(2, 14, 2, 5 - Math.max(0, a), C.pants);
    p(6, 14, 2, 5 - Math.max(0, -a), C.pants);
    p(2, 19 - Math.max(0, a), 2, 1, C.shoe);
    p(6, 19 - Math.max(0, -a), 2, 1, C.shoe);
  }
  // body
  L(1, 7, 8, 8, shirt);
  if (outfit === 'manager') {
    L(3, 7, 4, 2, '#ffffff');
    L(4, 8, 2, 6, accent || '#c0392b');
  } else if (outfit === 'hoodie') {
    L(4, 8, 1, 3, '#ffffff');
    L(6, 8, 1, 3, '#ffffff');
    L(2, 12, 6, 2, shirtDark); // pocket
  } else {
    L(4, 7, 2, 1, '#ffffff');
  }
  // head
  if (outfit === 'hoodie') L(1, 0, 8, 7, shirtDark);
  L(2, 1, 6, 6, looks.skin);
  if (outfit === 'explorer') {
    L(1, 1, 1, 3, looks.hair); L(8, 1, 1, 3, looks.hair);
    L(-1, 1, 12, 1, '#8a6d3b');
    L(2, -2, 6, 3, '#b08d57');
    L(2, 0, 6, 1, '#5e4524');
  } else if (outfit === 'cap') {
    L(1, 0, 8, 2, accent || shirtDark);
    L(7, 1, 3, 1, accent || shirtDark);
  } else if (outfit !== 'hoodie') {
    L(2, 0, 6, 2, looks.hair);
    L(1, 1, 1, 3, looks.hair);
    L(8, 1, 1, 3, looks.hair);
  }
  // face
  if (pose === 'idle' || pose === 'stretch') {
    L(3, 4, 2, 1, C.eye);
    L(6, 4, 2, 1, C.eye);
    if (pose === 'stretch') L(4, 5, 2, 2, '#5a1a1a'); // yawn
  } else {
    const blink = Math.sin(t * 1.3 + x) > 0.97;
    if (outfit === 'planner') {
      L(2, 3, 3, 2, '#cfe8ff'); L(5, 3, 3, 2, '#cfe8ff'); L(4, 3, 2, 1, '#1b1b22');
    }
    L(3, 3, 1, blink ? 1 : 2, C.eye);
    L(6, 3, 1, blink ? 1 : 2, C.eye);
  }
  if (pose === 'done' || pose === 'sip') L(4, 5, 2, 1, '#a0522d');
  // arms
  const band = (dx) => { if (accent && outfit !== 'manager' && outfit !== 'cap') L(dx, 9, 1, 2, accent); };
  if (pose === 'working' && seated) {
    const bob = Math.sin(t * 14) > 0 ? 0 : 1;
    L(0, 8, 1, 5, shirtDark); L(9, 8, 1, 5, shirtDark);
    band(0); band(9);
    L(1, 13 + bob, 2, 1, looks.skin);
    L(7, 14 - bob, 2, 1, looks.skin);
    if (outfit === 'planner') { L(-3, 9, 3, 5, '#a0522d'); L(-2, 10, 1, 3, '#ffffff'); }
  } else if (pose === 'waiting') {
    const wave = Math.sin(t * 8) > 0 ? 0 : 1;
    L(0, 8, 1, 5, shirtDark); L(0, 13, 1, 1, looks.skin);
    L(9 + wave, -1, 1, 8, shirtDark); L(9 + wave, -2, 1, 1, looks.skin);
    band(0);
  } else if (pose === 'done' && seated) {
    L(0, 2, 1, 6, shirtDark); L(9, 2, 1, 6, shirtDark);
    L(1, 1, 1, 2, looks.skin); L(8, 1, 1, 2, looks.skin);
  } else if (pose === 'stretch') {
    L(0, -3, 1, 10, shirtDark); L(9, -3, 1, 10, shirtDark);
    L(0, -4, 1, 1, looks.skin); L(9, -4, 1, 1, looks.skin);
  } else if (pose === 'sip') {
    L(0, 8, 1, 6, shirtDark); L(0, 14, 1, 1, looks.skin);
    band(0);
    if (sipping) {
      L(8, 6, 1, 3, shirtDark);
      L(6, 4, 3, 3, '#f4f4f4');
    } else {
      L(9, 8, 1, 4, shirtDark);
      L(9, 11, 3, 3, '#f4f4f4');
      L(10, 11, 1, 1, '#6b3e1f');
    }
  } else {
    L(0, 8, 1, 6, shirtDark); L(9, 8, 1, 6, shirtDark);
    band(0); band(9);
    L(0, 14, 1, 1, looks.skin); L(9, 14, 1, 1, looks.skin);
  }
}

// ---------- overlays ----------

export function drawBadge(ctx, cx, cy, text, color, size = 7) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(Math.round(cx - size / 2), Math.round(cy - size / 2) + 1, size + 2, size + 2);
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
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x, y + 1, w + 2, h + 2); // drop shadow lifts the bubble off the scene
  rect(ctx, x - 1, y - 1, w + 2, h + 2, border);
  rect(ctx, x, y, w, h, C.bubble);
  rect(ctx, Math.round(cx) - 1, y + h, 3, 1, border);
  rect(ctx, Math.round(cx), y + h + 1, 1, 2, border);
  rect(ctx, Math.round(cx), y + h, 1, 1, C.bubble);
  ctx.fillStyle = C.bubbleText;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 4, y + h / 2 + 0.5);
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

// ---------- light ----------

export function timePhase(date = new Date(), override = '') {
  if (['dag', 'avond', 'nacht'].includes(override)) return override;
  const h = date.getHours();
  if (h >= 7 && h < 17) return 'dag';
  if (h >= 17 && h < 21) return 'avond';
  return 'nacht';
}

/**
 * Darkness with holes for lamps and a spotlight, composited on an offscreen canvas
 * so the scene underneath is never erased.
 */
export function drawLighting(ctx, shade, W, H, { phase, lamps = [], spots = [], t = 0 }) {
  const dark = phase === 'nacht' ? 0.5 : phase === 'avond' ? 0.22 : 0;
  const spotDark = spots.length ? 0.28 : 0;
  const alpha = Math.max(dark, spotDark);
  if (alpha <= 0) return;
  if (shade.width !== W || shade.height !== H) { shade.width = W; shade.height = H; }
  const s = shade.getContext('2d');
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, W, H);
  s.fillStyle = phase === 'dag' ? `rgba(10,10,20,${alpha})` : `rgba(8,10,35,${alpha})`;
  s.fillRect(0, 0, W, H);
  s.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, strength) => {
    const g = s.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g;
    s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
  };
  if (dark) for (const l of lamps) hole(l.x, l.y, 26, 0.9);
  for (const sp of spots) hole(sp.x, sp.y, 30 + Math.sin(t * 4) * 2, 1);
  ctx.drawImage(shade, 0, 0);
  // warm glow on top of the lamps
  if (dark) {
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lamps) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 18);
      g.addColorStop(0, 'rgba(255,190,90,.22)');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, 18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // red spotlight cone from the ceiling
  for (const sp of spots) {
    const g = ctx.createLinearGradient(sp.x, 0, sp.x, sp.y + 10);
    g.addColorStop(0, 'rgba(255,77,94,0)');
    g.addColorStop(1, `rgba(255,77,94,${0.16 + 0.06 * Math.sin(t * 6)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sp.x - 6, 0);
    ctx.lineTo(sp.x + 6, 0);
    ctx.lineTo(sp.x + 22, sp.y + 10);
    ctx.lineTo(sp.x - 22, sp.y + 10);
    ctx.closePath();
    ctx.fill();
  }
}
