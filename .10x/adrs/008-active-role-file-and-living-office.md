# ADR-008: Prefer `.10x/active.json`; simulate office life client-side

**Status:** Accepted (extends ADR-006/007)
**Date:** 2026-10-21
**Feature:** living-office
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Role detection guessed wrongly (e.g. DevOps during a new brainstorm) because status.md was free-form and the orchestrator switches roles silently. The user's 10x-Team-Plus now writes `.10x/active.json` on every role/phase change and uses a fixed status.md layout. The user also wants a livelier office (CEO, handoffs, lounge/meeting use, pathfinding).

## Decision
- Server: `active.json` is the highest-priority signal for role, phase and current task; heuristics stay as fallback for older plugins. A new `/10x-team` prompt forces phase 0 until the next `.10x/` write. Server also tracks per project: `workload` (tool calls since phase change), kanban tasks from the newest EM decision, and per agent `failedAt`.
- Client: all "life" (coffee breaks, stand-ups, handoff choreography, CEO queue, end of day, party) is simulated in `tenx-room.js` from snapshot changes; no new server state for animation.
- Movement uses A* on a coarse occupancy grid built from the room layout.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Keep heuristics only | No plugin change | Keeps guessing wrong | User owns the plugin now |
| Server-driven animation state | Same on every browser | Couples presentation to API, more traffic | Animation is a view concern |
| Straight-line walking | Simple | Walks through desks | Looks unreal |

## Consequences
- Positive: exact roles with Plus ≥ 0.4.0-plus.2; lively, readable office.
- Negative: two browsers can show slightly different idle animations (random coffee breaks). active.json is per project, so with two sessions in one project the most recent writer is shown.
