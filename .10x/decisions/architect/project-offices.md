# Architect — project-offices (ADR-002)
## Components
- `server/state.js` + `projectKeyFor(cwd)`; agents carry `projectKey`, `project`. Prune: done subagents after `SUBAGENT_DONE_TTL_MS` (10 min); `UserPromptSubmit` on a session deletes its done subagents.
- `web/sprites.js` — stateless draw fns taking ctx.
- `web/room.js` — `createRoom(canvas)` → `{ setAgents(list, now), frame(t, dt), size(), isEmpty() }`. Seats: managers row (stable slot per session), worker desks (stable slot per subagent, lowest free).
- `web/building.js` — `createBuilding(container, {onFocusChange})` → `{ setAgents(list, now) }`; Map projectKey→room; removes room DOM when `room.isEmpty()` and project absent.
- `web/app.js` — SSE + panel grouped by project.
## Failure modes
- Agent without cwd → projectKey 'unknown' room.
- Session moves cwd (CwdChanged not hooked) → projectKey updates on next event; character changes room (walks out of old, in at new).
