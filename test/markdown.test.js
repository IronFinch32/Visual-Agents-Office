import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline } from '../web/markdown.js';

test('inline: bold and code spans between plain text', () => {
  assert.deepEqual(parseInline('Kies **Postgres** met `pg` nu'), [
    { t: 'Kies ' }, { t: 'Postgres', bold: true }, { t: ' met ' }, { t: 'pg', code: true }, { t: ' nu' },
  ]);
  assert.deepEqual(parseInline('geen opmaak'), [{ t: 'geen opmaak' }]);
});

test('blocks: headings, nested list items, paragraphs, code and tables', () => {
  const md = '# CFO — shop\n\nKosten zijn laag\nen voorspelbaar.\n\n- Hosting\n  - Netlify\n1. Eerste\n\n```\nnpm test\n```\n| A | B |\n|---|---|\n| 1 | 2 |';
  assert.deepEqual(parseMarkdown(md).map((b) => [b.type, b.level ?? b.depth ?? '', b.text ?? b.spans.map((s) => s.t).join('')]), [
    ['h', 1, 'CFO — shop'],
    ['p', '', 'Kosten zijn laag en voorspelbaar.'],
    ['li', 0, 'Hosting'],
    ['li', 1, 'Netlify'],
    ['li', 0, 'Eerste'],
    ['code', '', 'npm test'],
    ['p', '', 'A · B'],
    ['p', '', '1 · 2'],
  ]);
});

test('markup in a decision is kept as text, never as HTML', () => {
  const [b] = parseMarkdown('<img src=x onerror=alert(1)>');
  assert.equal(b.type, 'p');
  assert.equal(b.spans[0].t, '<img src=x onerror=alert(1)>');
  assert.deepEqual(parseMarkdown(''), []);
});
