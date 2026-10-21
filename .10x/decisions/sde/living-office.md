# SDE — living-office
## Built
- server/tenx.js: parseActive (contract validation), active.json as top signal (owner = session that touched it, else last session), 6 h freshness, newRun on /10x-team prompt (phase 0 + meeting until real .10x work), phase names in status.md, unknown-phase guess by kind of work, workload, kanban (parseTasks/taskDone), snapshot fields active/workload/kanban.
- server/state.js: failedAt on PostToolUseFailure.
- web/nav.js: occupancy grid + A* with string pulling (+ tests).
- web/tenx-room.js rewritten: no work floor; 5×2 grid with CEO office; flex seats; behaviour per member (home/meeting/coffee/handoff/ceo/away/party); stand-up on new prompt; handoff choreography; CEO queue; lounge chatter; thought bubble; smoke on failure; paper stack; kanban wall; party; end of day; behaviour runs even when the room is hidden.
- web/building.js: render loop schedules first and isolates room errors; `?debug` exposes rooms.
- scripts/demo-10x.js: full Plus run with active.json, stand-ups, failure, CEO queue, kanban, party.
## Deviations
- ADR-008 "no new server state for animation" kept; workload/kanban/failedAt are data, not animation.
## Notes
- Browsers throttle hidden tabs; animation resumes when visible.
