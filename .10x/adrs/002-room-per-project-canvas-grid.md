# ADR-002: One canvas per project room, laid out by CSS grid

**Status:** Accepted
**Date:** 2026-10-20
**Feature:** project-offices
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
ADR-001's renderer draws one office with a desk per session and mini subagents. We now need N rooms (one per project folder), each with a variable number of worker desks, all visible at once, with click-to-focus. Grouping must also treat worktrees as the same project.

## Decision
- Server computes `projectKey` (cwd with `/.claude/worktrees/<x>` or `/.worktrees/<x>` suffix stripped) on each agent; the browser groups by it.
- Browser: each room is its own `<canvas>` inside a CSS grid (`#building`). Room box size follows the room's logical size via `aspect-ratio`; focus = CSS class making one room fill the stage. One shared rAF loop renders all rooms.
- Renderer split into `sprites.js` (drawing), `room.js` (per-room layout + motion), `building.js` (room lifecycle, focus, banner).
- Finished subagents stay until the parent's next prompt or 10 min (replaces 20 s linger).

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Single canvas with custom building layout engine | Continuous hallways, one draw surface | Must hand-write packing, hit-testing, zoom/camera | Much more code for cosmetic gain |
| Phaser / game engine | Camera, tweens, input built in | Dependency + build step | Violates no-deps principle |
| Group in server, send rooms | Browser simpler | Couples presentation into API | Grouping is a view concern; additive field is enough |

## Consequences
### Positive
- Layout, responsiveness and click handling come free from the browser. Rooms are independent and testable.
### Negative
- Hallways are CSS decoration, not walkable; characters can't walk between rooms.
- N canvases → N draw calls per frame (fine for < 20 rooms).
### Risks
- Many rooms on a small screen get tiny → min room size + scrolling building view.

## Dependencies
Builds on ADR-001 (event pipeline unchanged). Supersedes the "subagents beside desk" part of the ADR-001 UI.
