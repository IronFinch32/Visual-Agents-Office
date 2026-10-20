# Project Offices — Design Spec

**Date:** 2026-10-20 · **Feature slug:** `project-offices` · **Status:** Approved by user
Extends `visual-agents-office` (ADR-001).

## Problem
Today every session is one character with tiny subagents beside it. Sessions run teams of subagents; the user wants to see each team at work: one office per project, with a working character per running subagent.

## Requirements
1. **One room per project folder.** Sessions sharing a cwd share a room. Worktree paths (`<repo>/.claude/worktrees/<name>/…`, `<repo>/.worktrees/<name>/…`) map to `<repo>`.
2. In a room: **sessions = managers** at larger desks along the top; **subagents = workers**, each at their own desk on the work floor (seated, typing, bubble with activity, name plate with agent type). A worker's desk has an accent in its manager's colour.
3. Rooms grow with the number of workers; always ≥ 2 empty worker desks.
4. **Subagent lifetime:** finished subagents stay seated (✓ + coffee) until their session's next `UserPromptSubmit`, its `SessionEnd`, or 10 minutes after finishing.
5. **Building view:** all rooms visible at once in a CSS grid with hallway styling; stable order (first seen). Room label: project name + status counts. Room border blinks red if anyone inside waits.
6. **Focus view:** click a room to fill the stage; `Esc` or "← Gebouw" returns. While focused, a red banner names other rooms with waiting agents (click → focus that room).
7. Side panel grouped by project → sessions → subagents.
8. A room disappears after its last agent has walked out.

## Non-goals
Linking side sessions to parents; persisting rooms; drag-and-drop layout.

## Design
- **Server (`state.js`)**: add `projectKey` (normalized cwd) and `project` (basename of key) on every agent; subagents inherit. `prune`: drop `SUBAGENT_LINGER_MS` (20 s) in favour of `SUBAGENT_DONE_TTL_MS` (10 min); `UserPromptSubmit` on a session removes its `done` subagents. Snapshot shape otherwise unchanged (additive).
- **Web**:
  - `sprites.js` — pure drawing helpers (person, desk, plant, badge, bubble) on a given ctx.
  - `room.js` — `createRoom(canvas, projectKey)`: layout of manager + worker desks, character walking (from room door), render loop step; `setAgents(list)`; `isEmpty()` once everyone left.
  - `building.js` — owns room DOM elements in `#building`, creates/removes rooms, focus mode, waiting banner; one shared `requestAnimationFrame` loop calling each room.
  - `app.js` — SSE, panel grouped by project, sound, title.
- **Layout per room** (logical px): width = cols × 64 + margins, cols = clamp(ceil(sqrt(workers+2)·1.3), 3, 6). Managers row 56 px tall, worker rows 60 px. Canvas scales by integer factor to fit its CSS box; room CSS box size proportional to logical size (`aspect-ratio`) so small rooms take less space.

## Error handling
Unchanged server-side. Missing cwd → projectKey `unknown`. A subagent whose parent is gone is pruned (orphan rule stays).

## Testing
Unit: projectKey normalization (plain, worktree, trailing slash, empty), grouping, subagent done TTL, cleared on next prompt, removed on SessionEnd. Manual: demo with 3 projects, 2 sessions in one project, 5+ subagents; focus/back; banner; phone width. Live: real session spawning ≥ 2 parallel subagents.
