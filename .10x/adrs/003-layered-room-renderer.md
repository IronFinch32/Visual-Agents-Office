# ADR-003: Layered room renderer with tool-aware monitors

**Status:** Accepted
**Date:** 2026-10-20
**Feature:** office-polish
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Rooms render in ad-hoc order (chair → person → desk → overlays), which blocks depth effects (occlusion, lighting, particles) and puts all info into bubbles. Monitors can't show what an agent does because the snapshot has no tool identity.

## Decision
- room.js renders in 8 fixed layers (see spec); each layer is a function over a precomputed scene list (`buildScene()` → items with layer + y), so depth sorting and lighting are consistent.
- Lighting is a separate offscreen-free pass: a full-room `rgba` darkness rect, then lamp/spotlight radial gradients with `globalCompositeOperation = 'lighter'`/`'destination-out'`-free approach (draw light as additive gradient on top of darkness).
- Snapshot gains an additive `tool` field (raw last tool name); categorisation happens in the browser (presentation concern).
- Agent-type looks are a lookup table in sprites.js keyed by agent_type; unknown types fall back to cap.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Keep immediate-mode order, sprinkle effects | Less refactor | Occlusion/lighting bugs, hard to extend | Doesn't give real layering |
| WebGL / PixiJS layers | GPU, filters | Dependency, rewrite | No-deps principle; canvas is plenty fast |
| Server sends tool category | Simpler client | Presentation logic in API | Category mapping is UI vocabulary |

## Consequences
### Positive
- Depth, lighting and particles compose cleanly; new layers are one function.
### Negative
- room.js grows; draw cost per frame rises (still < 1 ms per room at our sizes).
### Risks
- Night lighting reducing readability → bubbles/nameplates are drawn after the lighting pass.

## Dependencies
ADR-002 (room per canvas). Additive API change compatible with ADR-001 clients.
