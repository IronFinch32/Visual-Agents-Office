# SDE — office-polish
## Built
- server: `tool` field (last tool name, cleared on prompt/Stop/SubagentStop) + test.
- sprites.js: outfits (manager/explorer/planner/hoodie/cap), tool-category monitors, whiteboard with wrapping, back/outer walls with thickness, windows by time phase, light beams, coffee machine, table, rug, plant sway, desk lamps, bubble drop shadows, `timePhase`, `drawLighting`.
- room.js: layered render with depth-sorted scene (chairs → people → desks/monitors), particles (typing, steam), lighting pass, info layer last; compact rooms (desks = subagents + 1); lounge with 4 spots for finished subagents; idle stretch/yawn.
- building.js: phase provider (`?tijd=`), `alert` class for spotlight dimming, FLIP zoom (respects prefers-reduced-motion).
- style.css: brass plaque room titles, waiting glow, dimmed non-waiting rooms.
## Deviations from ADR-003
- Lighting uses one small offscreen canvas per room (destination-out holes) instead of drawing directly; keeps the scene intact under the darkness.
- Hallway runner/facade in CSS kept minimal (existing tile hallway + glow); outer walls drawn in canvas instead.
## Tech debt
- Hidden browser tabs throttle rAF, so characters "catch up" when the tab becomes visible.
