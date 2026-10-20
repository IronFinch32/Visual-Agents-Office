# SDE — project-offices
## Built
- `state.js`: `projectKeyFor` (worktree normalization), injected `projectRoot`, `projectKey`/`project` on agents, subagent TTL 10 min, done subagents cleared on next session prompt.
- `server.js`: `gitRootResolver` (walk up to `.git`, cached ≤500 entries) injected into state.
- `web/sprites.js` (drawing), `web/room.js` (managers row + worker desks, walking, overlays), `web/building.js` (rooms, fit-to-screen scale search, focus, waiting banner, Esc), `app.js` panel grouped by project. `office.js` removed.
- `scripts/demo.js`: 3 projects, worktree session, 6 subagents.
## Deviations from spec
- **Git-root grouping + locked projectKey** added after the live test: a `cd` into `web/` moved the session to a new "web" office. Now the project is the nearest `.git` folder, fixed per session except on SessionStart.
- Integer scaling only from 4× (instead of 2×) so focused rooms use the space.
- Room size computed by a JS fit search instead of CSS `aspect-ratio`.
## Tech debt
- Panel re-renders fully per snapshot (fine at this size).
- Reload makes everyone walk in from the door again.
