# Architect — visual-agents-office
See ADR-001 and spec.
## Components & boundaries
- `server/state.js` — pure: `createState()`, `applyEvent(state, evt, now)`, `prune(state, now)`, `snapshot(state)`, `describeTool()`. No I/O.
- `server/server.js` — HTTP + SSE + static. Calls reducer, broadcasts snapshot (throttled to ≤10/s).
- `hooks/install.js` — settings.json editor; owns entries tagged by URL `127.0.0.1:4747/event`.
- `web/` — `office.js` (render loop, sprites), `app.js` (SSE, side panel).
## Data flow
hook stdin JSON → curl → POST /event → applyEvent → broadcast `snapshot` → browser replaces state → render loop interpolates character positions.
## Failure modes
| Failure | Behaviour |
|---|---|
| Server down | curl fails silently; Claude unaffected |
| Browser disconnected | EventSource auto-reconnects; banner shown |
| Server restarted | Agents reappear on next event (created on demand) |
| Session killed without SessionEnd | Pruned after 30 min idle |
| Subagent without SubagentStart | Created on demand from agent_id |
