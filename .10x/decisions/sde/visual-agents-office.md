# SDE — visual-agents-office
## Built
- `server/state.js` reducer (Dutch activity labels), `server/server.js` (POST /event, GET /stream SSE, /api/state, static, prune 5s, heartbeat 15s, broadcast coalesced 100ms).
- `hooks/install.js` — 13 events, command hook with curl, matcher `*` for tool events, backup + idempotent + only removes own entries.
- `web/` — procedural pixel-art canvas office (`office.js`), SSE client + side panel + chime + tab title (`app.js`), Pixelify Sans font (falls back to monospace offline).
- `scripts/demo.js`, tests in `test/` (23 tests).
## Deviations from plan
- Desk assignment is **stable** (lowest free slot on arrival) instead of sorted by project — reshuffling characters on every new session was confusing. Spec's "sorted by project" dropped.
- Added Host-header check (DNS rebinding) after security pass.
- Office always shows ≥4 desks so it doesn't look empty.
## Tech debt
- Canvas text uses a web font; offline it falls back to monospace (fine).
- No visual regression tests for the canvas; verified manually via demo.
