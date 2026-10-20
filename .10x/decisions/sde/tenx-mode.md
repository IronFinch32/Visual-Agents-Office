# SDE — tenx-mode
- server/tenx.js: ROLES (12) + skill map, roleFromSkill/roleFromPath/guessRole, parsePhase (last section with "Phase N"), isCodeFile, reviewVerdict, createTenx({fs}) → onEvent/tick/refresh/snapshot/readDecision. Bookkeeping writes (status/handoff) keep the current role.
- server.js: nodeFs adapter (256 KB cap), tenx wired after applyEvent, `tenx` in snapshot (only for projects with live agents), GET /api/decision, tick in the 5 s interval.
- web/tenx-sprites.js: role outfits/accessories, zones, meeting table, timeline, ADR frames, beacon, stamps, folder. web/tenx-room.js: 8 zones (2×4), 12 members always present, driven member per session role, meeting mode (phase 0), courier on handoff, ADR glow, gate banner, work floor + lounge for subagents, click hit-test → onRoleClick.
- building.js: per-project room type (swaps canvas), 10x phase chip, gate class. app.js: decision card + gate cards in the panel.
- scripts/demo-10x.js: full run on a temp project with a real .10x folder (meeting question, gate, ADRs, handoffs, subagents, reviews, permission wait, completion).
## Deviations
- Wall clock dropped in 10x rooms (wall holds board, ADRs, timeline, door).
- Click target enlarged (±9 px) after manual testing.
