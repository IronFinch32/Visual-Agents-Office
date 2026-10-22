// Just enough markdown for decision files (ux-polish): headings, list items, paragraphs, code blocks,
// tables as plain rows, **bold** and `code`. Returns plain data; the caller builds DOM with textContent.
// Pure module: works in the browser and under node --test.

/** Inline spans of a line: [{ t, bold?, code? }]. */
export function parseInline(line) {
  const spans = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let at = 0;
  for (let m; (m = re.exec(line));) {
    if (m.index > at) spans.push({ t: line.slice(at, m.index) });
    spans.push(m[2] != null ? { t: m[2], bold: true } : { t: m[3], code: true });
    at = m.index + m[0].length;
  }
  if (at < line.length) spans.push({ t: line.slice(at) });
  return spans;
}

/** Blocks: { type: 'h', level, spans } | { type: 'li', depth, spans } | { type: 'p', spans } | { type: 'code', text }. */
export function parseMarkdown(text) {
  const blocks = [];
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  let para = null;
  const flush = () => { if (para) { blocks.push({ type: 'p', spans: parseInline(para.join(' ')) }); para = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { flush(); blocks.push({ type: 'h', level: m[1].length, spans: parseInline(m[2].trim()) }); continue; }
    if ((m = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line))) { flush(); blocks.push({ type: 'li', depth: Math.min(3, Math.floor(m[1].length / 2)), spans: parseInline(m[2]) }); continue; }
    if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // table divider
    if ((m = /^\s*\|(.*)\|\s*$/.exec(line))) { flush(); blocks.push({ type: 'p', spans: parseInline(m[1].split('|').map((c) => c.trim()).join(' · ')) }); continue; }
    if (!line.trim()) { flush(); continue; }
    (para ||= []).push(line.trim());
  }
  flush();
  return blocks;
}
