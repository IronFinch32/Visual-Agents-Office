// Drawing helpers for 10x mode: team outfits, departments, timeline, ADR frames, stamps.
import { C, FONT, rect, fit, wrap } from './sprites.js';

export const ROLE_INFO = {
  cto: { label: 'CTO', dept: 'strategy', outfit: 'manager', shirt: '#2c2f45', accent: '#e8c35a' },
  'product-manager': { label: 'PM', dept: 'strategy', outfit: 'planner', shirt: '#d9668f', acc: 'clipboard' },
  'ux-designer': { label: 'UX', dept: 'design', outfit: 'planner', shirt: '#4fb3a9', acc: 'sketch' },
  'ui-designer': { label: 'UI', dept: 'design', outfit: 'cap', shirt: '#e87fb0', accent: '#b8324f', acc: 'palette' },
  architect: { label: 'Architect', dept: 'architecture', outfit: 'cap', shirt: '#4a7fd6', accent: '#f1c40f', acc: 'blueprint' },
  'staff-engineer': { label: 'Staff', dept: 'architecture', outfit: 'hoodie', shirt: '#5b6fb8' },
  'engineering-manager': { label: 'EM', dept: 'planning', outfit: 'manager', shirt: '#3b4a5e', accent: '#4ea3ff', acc: 'headset' },
  'senior-engineer': { label: 'Senior', dept: 'planning', outfit: 'planner', shirt: '#8a6dcf' },
  sde: { label: 'SDE', dept: 'engineering', outfit: 'hoodie', shirt: '#3da37a' },
  dba: { label: 'DBA', dept: 'engineering', outfit: 'cap', shirt: '#2f8f9a', accent: '#1d5f66', acc: 'db' },
  qa: { label: 'QA', dept: 'quality', outfit: 'cap', shirt: '#e0a43a', accent: '#a86f12', acc: 'magnifier' },
  security: { label: 'Security', dept: 'quality', outfit: 'cap', shirt: '#3a3a44', accent: '#16161c', acc: 'shield' },
  devops: { label: 'DevOps', dept: 'operations', outfit: 'hoodie', shirt: '#d9773a', acc: 'headphones' },
  sre: { label: 'SRE', dept: 'operations', outfit: 'hoodie', shirt: '#c0453a', acc: 'pager' },
};

export const DEPTS = {
  meeting: { label: 'Vergaderzaal', rug: '#6b5a8f', roles: [] },
  strategy: { label: 'Strategie', rug: '#7a5a6e', roles: ['cto', 'product-manager'] },
  design: { label: 'Design', rug: '#7a5f8f', roles: ['ux-designer', 'ui-designer'] },
  architecture: { label: 'Architectuur', rug: '#4d5f8a', roles: ['architect', 'staff-engineer'] },
  planning: { label: 'Planning', rug: '#5d5a8a', roles: ['engineering-manager', 'senior-engineer'] },
  engineering: { label: 'Engineering', rug: '#3f6f5c', roles: ['sde', 'dba'] },
  quality: { label: 'Kwaliteit', rug: '#7a6a3f', roles: ['qa', 'security'] },
  operations: { label: 'Operations', rug: '#7a4d3f', roles: ['devops', 'sre'] },
  lounge: { label: 'Lounge', rug: '#3f6f73', roles: [] },
  ceo: { label: 'Directie', rug: '#6a5440', roles: [] },
};

// Per plugin flavor (ADR-007): department and default role per phase.
export const FLAVOR_PHASES = {
  classic: {
    depts: ['meeting', 'strategy', 'architecture', 'planning', 'engineering', 'quality', 'operations'],
    defaults: ['product-manager', 'product-manager', 'architect', 'engineering-manager', 'sde', 'qa', 'devops'],
    implPhase: 4,
  },
  plus: {
    depts: ['meeting', 'strategy', 'design', 'architecture', 'planning', 'engineering', 'quality', 'operations'],
    defaults: ['product-manager', 'product-manager', 'ux-designer', 'architect', 'engineering-manager', 'sde', 'qa', 'devops'],
    implPhase: 5,
  },
};
export const phasesFor = (flavor) => FLAVOR_PHASES[flavor] || FLAVOR_PHASES.classic;

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

export function roleLooks(role, base) {
  const info = ROLE_INFO[role];
  return { ...base, shirt: info.shirt, shirtDark: shade(info.shirt, 0.72) };
}

/** Accessories drawn on top of a person. (x, y) as in drawPerson. */
export function drawAccessory(ctx, x, y, role, { seated, pose, t = 0 }) {
  const acc = ROLE_INFO[role]?.acc;
  const left = Math.round(x) - 5;
  const top = Math.round(y) - (seated ? 17 : 20);
  const p = (dx, dy, w, h, c) => rect(ctx, left + dx, top + dy, w, h, c);
  if (pose === 'read') { p(2, 11, 6, 3, '#f4f4f4'); p(3, 12, 4, 1, '#9aa0b8'); }
  switch (acc) {
    case 'headphones':
      p(1, -1, 8, 1, '#1b1b22'); p(0, 2, 1, 3, '#1b1b22'); p(9, 2, 1, 3, '#1b1b22');
      break;
    case 'headset':
      p(1, -1, 8, 1, '#1b1b22'); p(9, 2, 1, 3, '#1b1b22'); p(7, 5, 3, 1, '#1b1b22');
      break;
    case 'magnifier':
      ctx.strokeStyle = '#d8dde8';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(left + 12, top + 9, 2, 0, Math.PI * 2); ctx.stroke();
      p(11, 11, 1, 3, '#6b4a2e');
      break;
    case 'shield':
      p(3, 9, 4, 4, '#c8ccd8'); p(4, 10, 2, 2, '#4ea3ff'); p(4, 13, 2, 1, '#c8ccd8');
      break;
    case 'db':
      p(3, 9, 4, 5, '#4ea3ff'); p(3, 10, 4, 1, '#2a6fd6'); p(3, 12, 4, 1, '#2a6fd6');
      break;
    case 'blueprint':
      p(-2, 9, 2, 6, '#4a7fd6'); p(-2, 9, 2, 1, '#9fd6ff');
      break;
    case 'pager':
      p(1, 13, 3, 2, '#1b1b22'); if (Math.sin(t * 5) > 0) p(2, 13, 1, 1, '#ff4d5e');
      break;
    case 'sketch':
      if (pose !== 'working') { p(-3, 9, 4, 5, '#f7f7fb'); p(-2, 10, 2, 1, '#9aa0b8'); p(-2, 12, 2, 1, '#9aa0b8'); p(1, 8, 1, 4, '#e8c35a'); }
      break;
    case 'palette':
      p(-3, 10, 4, 3, '#d9a066'); p(-3, 10, 1, 1, '#ff4d5e'); p(-1, 10, 1, 1, '#4ea3ff'); p(-2, 12, 1, 1, '#3ddc84');
      break;
    case 'clipboard':
      if (pose !== 'working') { p(-2, 9, 3, 5, '#a0522d'); p(-1, 10, 1, 3, '#ffffff'); }
      break;
    default:
  }
}

export function drawFolder(ctx, x, y) {
  rect(ctx, x - 3, y - 4, 7, 5, '#e8b84a');
  rect(ctx, x - 3, y - 5, 3, 1, '#e8b84a');
  rect(ctx, x - 2, y - 3, 5, 1, '#f6d98a');
}

export function drawZone(ctx, x, y, w, h, dept, { active, t = 0 }) {
  const d = DEPTS[dept];
  rect(ctx, x + 2, y + 2, w - 4, h - 4, shade(d.rug, 0.75));
  rect(ctx, x + 3, y + 3, w - 6, h - 6, d.rug);
  if (active) {
    ctx.globalAlpha = 0.18 + 0.06 * Math.sin(t * 2);
    rect(ctx, x + 3, y + 3, w - 6, h - 6, '#fff3c4');
    ctx.globalAlpha = 1;
  }
  // department sign
  ctx.font = `600 5px ${FONT}`;
  ctx.textBaseline = 'top';
  const label = d.label.toUpperCase();
  const lw = Math.ceil(ctx.measureText(label).width) + 4;
  rect(ctx, x + 4, y + 4, lw, 7, active ? '#f1c40f' : 'rgba(0,0,0,.35)');
  ctx.fillStyle = active ? '#2a1b10' : '#ffffff';
  ctx.fillText(label, x + 6, y + 5);
}

export function drawMeetingTable(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + 14, w / 2 + 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  rect(ctx, x, y, w, 9, C.deskTop);
  rect(ctx, x, y, w, 1, '#e9b77f');
  rect(ctx, x, y + 9, w, 3, C.deskFront);
  for (let i = x + 6; i < x + w - 4; i += 12) rect(ctx, i, y + 3, 5, 3, '#f0f0f0');
}

export function drawTimeline(ctx, x, y, { phase, done = [], complete, last = 6, t = 0 }) {
  ctx.font = `600 5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rect(ctx, x, y - 1, last * 12, 2, '#3a3d5e');
  for (let i = 0; i <= last; i++) {
    const cx = x + i * 12;
    const isDone = done.includes(i) || complete;
    const isCurrent = !complete && i === phase;
    let fill = '#5b6078';
    if (isDone) fill = C.done;
    if (isCurrent) fill = Math.sin(t * 4) > 0 ? '#f1c40f' : '#c99a0a';
    ctx.fillStyle = '#1b1d2a';
    ctx.beginPath(); ctx.arc(cx, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(cx, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isCurrent ? '#2a1b10' : '#ffffff';
    ctx.fillText(isDone && !isCurrent ? '✓' : String(i), cx, y + 0.5);
  }
  ctx.textAlign = 'left';
}

export function drawAdrFrame(ctx, x, y, number, glow) {
  if (glow) {
    ctx.fillStyle = 'rgba(241,196,15,.45)';
    ctx.fillRect(x - 2, y - 2, 18, 15);
  }
  rect(ctx, x, y, 14, 11, '#6b4a2e');
  rect(ctx, x + 1, y + 1, 12, 9, '#f7f2e4');
  ctx.font = `4px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#5a3a1a';
  ctx.fillText('ADR', x + 2, y + 1.5);
  ctx.font = `600 4px ${FONT}`;
  ctx.fillText(number || '?', x + 2, y + 5.5);
}

export function drawBeacon(ctx, x, y, t) {
  const on = Math.sin(t * 10) > 0;
  rect(ctx, x - 3, y + 3, 7, 2, '#3b3f4f');
  rect(ctx, x - 2, y - 2, 5, 5, on ? '#ff4d5e' : '#7a2630');
  if (on) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(255,77,94,.55)');
    g.addColorStop(1, 'rgba(255,77,94,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawStamp(ctx, x, y, label, verdict) {
  const color = verdict === 'rejected' ? '#d63a4a' : '#2f9e5f';
  const text = `${label} ${verdict === 'rejected' ? '✗' : '✓'}`;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  ctx.font = `600 5px ${FONT}`;
  const w = Math.ceil(ctx.measureText(text).width) + 5;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w, 8);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 3, 2);
  ctx.restore();
}

export function drawEaselText(ctx, x, y, w, h, text) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, '#9aa0b8');
  rect(ctx, x, y, w, h, '#f7f7fb');
  if (!text) return;
  ctx.font = `5px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1f3a8a';
  wrap(ctx, text, w - 6, Math.floor((h - 3) / 6)).forEach((l, i) => ctx.fillText(fit(ctx, l, w - 6), x + 3, y + 2 + i * 6));
}

// ---------- living office (ADR-008) ----------

export function drawCeoDesk(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + 17, w / 2 + 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  rect(ctx, x, y, w, 5, '#5a3a22');
  rect(ctx, x, y, w, 1, '#7a5232');
  rect(ctx, x, y + 5, w, 10, '#3e2716');
  rect(ctx, x + 4, y + 8, w - 8, 1, '#c99a3a');
  rect(ctx, x + 2, y + 15, 3, 2, '#2a1a0e');
  rect(ctx, x + w - 5, y + 15, 3, 2, '#2a1a0e');
}

export function drawInbox(ctx, x, y, count, t) {
  rect(ctx, x, y, 9, 4, '#9aa0b8');
  rect(ctx, x + 1, y + 1, 7, 2, '#f7f7fb');
  if (!count) return;
  const on = Math.sin(t * 6) > -0.3;
  rect(ctx, x + 6, y - 6, 7, 7, on ? '#ff4d5e' : '#b8323f');
  ctx.font = `600 5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(Math.min(9, count)), x + 9.5, y - 2.5);
  ctx.textAlign = 'left';
}

export function drawSofa(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + 12, w / 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  rect(ctx, x, y, w, 6, '#8a4a5e');
  rect(ctx, x, y + 6, w, 5, '#6e3a4b');
  rect(ctx, x - 2, y + 2, 3, 9, '#6e3a4b');
  rect(ctx, x + w - 1, y + 2, 3, 9, '#6e3a4b');
  rect(ctx, x + 2, y + 1, w - 4, 1, '#a45d73');
}

export function drawMiniDesk(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(x + 8, y + 9, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
  rect(ctx, x, y, 16, 3, C.deskTop);
  rect(ctx, x + 1, y + 3, 14, 4, C.deskFront);
  rect(ctx, x + 4, y - 4, 8, 4, '#30344a'); // laptop lid
  rect(ctx, x + 5, y - 3, 6, 2, '#4ea3ff');
}

export function drawPaperStack(ctx, x, y, sheets) {
  for (let i = 0; i < sheets; i++) {
    rect(ctx, x + (i % 2), y - i * 1.5, 7, 2, i % 2 ? '#f4f4f4' : '#e6e6ee');
  }
}

export function drawThought(ctx, cx, bottomY, t) {
  const x = Math.round(cx), y = Math.round(bottomY);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = C.trim;
  ctx.lineWidth = 1;
  const blob = (bx, by, r) => { ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  blob(x - 2, y - 2, 1.2);
  blob(x + 1, y - 5, 1.8);
  ctx.beginPath(); ctx.ellipse(x + 7, y - 12, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    if (Math.floor(t * 3) % 4 > i) rect(ctx, x + 3 + i * 3, y - 12, 2, 2, C.bubbleText);
  }
}

export function drawSmoke(ctx, x, y, age) {
  const k = Math.min(1, age / 4);
  ctx.globalAlpha = 0.7 * (1 - k);
  ctx.fillStyle = '#5b6078';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2 + age * 3) * 3, y - age * 4 - i * 3, 2.5 + i * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (age < 2.5) {
    ctx.font = `600 5px ${FONT}`;
    ctx.fillStyle = '#ff4d5e';
    ctx.textBaseline = 'bottom';
    ctx.fillText('#!?', x + 4, y - 4);
  }
}

export function drawKanban(ctx, x, y, w, h, tasks, implActive) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, '#6b4a2e');
  rect(ctx, x, y, w, h, '#c9b48a');
  const colW = Math.floor(w / 3);
  const cols = [[], [], []];
  const firstOpen = tasks.findIndex((tk) => !tk.done);
  tasks.forEach((tk, i) => cols[tk.done ? 2 : i === firstOpen && implActive ? 1 : 0].push(tk));
  ctx.font = `600 4px ${FONT}`;
  ctx.textBaseline = 'top';
  ['TE DOEN', 'BEZIG', 'KLAAR'].forEach((label, c) => {
    ctx.fillStyle = '#4a3420';
    ctx.fillText(label, x + c * colW + 2, y + 1);
    if (c) rect(ctx, x + c * colW, y + 1, 1, h - 2, '#a8946a');
    cols[c].slice(0, 5).forEach((tk, i) => {
      const cx = x + c * colW + 2;
      const cy = y + 7 + i * 6;
      rect(ctx, cx, cy, colW - 4, 5, c === 2 ? '#bfe8c9' : c === 1 ? '#bfdcf7' : '#fff6c8');
      ctx.font = `4px ${FONT}`;
      ctx.fillStyle = '#2a1b10';
      ctx.fillText(tk.id, cx + 1, cy + 0.5);
    });
    if (cols[c].length > 5) { ctx.fillStyle = '#4a3420'; ctx.fillText(`+${cols[c].length - 5}`, x + c * colW + 2, y + h - 6); }
  });
  if (!tasks.length) {
    ctx.font = `4px ${FONT}`;
    ctx.fillStyle = '#6b5a3a';
    ctx.fillText('nog geen planning', x + 4, y + h / 2);
  }
}

export function drawBanner(ctx, cx, y, text, t) {
  ctx.font = `600 9px ${FONT}`;
  const w = Math.ceil(ctx.measureText(text).width) + 14;
  const x = Math.round(cx - w / 2);
  const wave = Math.round(Math.sin(t * 3) * 1);
  rect(ctx, x, y + wave, w, 13, '#f1c40f');
  rect(ctx, x + 2, y + 2 + wave, w - 4, 9, '#d94a5e');
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 7, y + 7 + wave);
}
