# Office Polish (depth, in-world info, life) — Design Spec

**Date:** 2026-10-20 · **Feature slug:** `office-polish` · **Status:** Approved by user
Builds on ADR-001/002 (canvas per room in CSS grid stays).

## Goals
1. **Depth/layering**: fixed render layers per room; soft shadows; thick back wall with cap + baseboard; desk fronts occlude legs; window light beams; real-clock day/dusk/night lighting with desk lamps at working agents (`?tijd=dag|avond|nacht` override).
2. **In-world info**: whiteboard per manager on the wall with its task (≤3 wrapped lines); monitor screen shows the current tool category; bubble shows only current activity; spotlight when someone waits (other rooms dimmed, waiting room glows, light cone on the waiting agent); compact rooms (1 free desk; leftover floor becomes lounge).
3. **Life/character**: look per agent type (Explore: explorer hat; Plan: glasses + clipboard; general-purpose: hoodie; other: cap; manager: tie); armband in manager colour on workers; coffee corner (machine + sofa) where finished workers go; idle stretch/yawn; typing particles, coffee steam, swaying plants.
4. **Building look**: thick outer room walls drawn in canvas, hallway runner + facade frame in CSS, door-plaque room header, smooth FLIP zoom on focus/unfocus.

## Render layers (room.js)
| # | Layer |
|---|---|
| 0 | floor, rugs, lounge rug, window light beams, shadows |
| 1 | back wall (cap, baseboard), windows, clock, whiteboards |
| 2 | chairs, monitors (screen content), coffee machine, sofa |
| 3 | characters (seated + walking + lounge), sorted by y |
| 4 | desk fronts / desk tops (occlude legs), mugs |
| 5 | effects: typing particles, steam |
| 6 | lighting overlay (night darkness, lamps, spotlight) |
| 7 | bubbles, badges, nameplates |

## Data
Server adds `tool` (last `tool_name`, ≤60 chars) to agents; cleared on Stop. Client maps to category: terminal (Bash), code (Read/Edit/Write/MultiEdit/NotebookEdit), search (Grep/Glob), web (WebFetch/WebSearch), team (Agent/Task), plug (mcp__*), ask (AskUserQuestion/ExitPlanMode), todo (TodoWrite), other.

## Lounge rules
Lounge spots = 4 per room, right side of the work floor (room width grows by one lounge column if needed). Finished subagents (status done) walk to the first free lounge spot; overflow stays seated. Their desk stays reserved and shows ✓ on screen.

## Non-goals
Walkable hallways between rooms; per-user theme settings; sound changes.

## Testing
Unit: `tool` field set/cleared, toolCategory mapping. Visual: demo in building + focus, `?tijd=nacht`, waiting spotlight, phone width.
