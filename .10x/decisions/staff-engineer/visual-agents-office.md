# Staff Engineer — visual-agents-office
- ESM (`"type": "module"`), Node ≥ 20. 2-space indent, small functions, no classes in reducer.
- All user-derived strings truncated in reducer (task 140, activity 80, reason 120) and rendered via `textContent`/canvas `fillText` only — never innerHTML.
- Config via env: `VAO_PORT` (default 4747), `VAO_HOST` fixed 127.0.0.1.
- Logging: one line per startup; errors to stderr; no event logging by default (`VAO_DEBUG=1` to log).
- Tests next to code in `test/`.
