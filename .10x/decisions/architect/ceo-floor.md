# Architect — ceo-floor (ADR-009)

## Componenten
- `server/tenx.js`: `isCeoSkill(skill)`, `isCeoPrompt(prompt)`; uitsluitingen in `isPlusSignal`, enable-regex en prompt-regex; `onEvent` → `return false` voor `agent.ceo`.
- `server/state.js`: markeert `a.ceo`, houdt `state.ceoSeen`; `assignRooms(agents, { ceoSeen, isTenx })` (puur).
- `server/server.js` `fullSnapshot`: tenx-snapshot zonder CEO-projecten, dan `assignRooms`.
- `web/building.js`: groepeert op `room`, per kamer `projectKey`, verdieping-sectie eerst met eigen layout-rij, `onNewRoom` → overdrachtsanimatie, `setFloor` naar teamkamers, titels `project · feature`.
- `web/ceo-floor.js` (nieuw): canvas-renderer, zelfde interface als kamers (`setAgents`, `frame`, `size`, `isEmpty`, `kind`), plus `setRooms(lines)` en `handoff()`; klik op bordregel → `onFocus(key)`.
- `web/tenx-room.js`: `setFloor(on)`, layout zonder `ceo`-zone, wachtrij bij de deur, "na oplevering naar huis" alleen in floor/sessie-modus.

## Dataflow
hook → `applyEvent` (CEO-markering) → `tenx.onEvent` (skip CEO) → snapshot `{agents[+room], tenx, now}` → building groepeert op room.

## Faalwijzen
- CEO-sessie stale/SessionEnd → verdieping weg (lege kamer wordt opgeruimd zoals nu).
- Werksessie zonder `active.json` → titel alleen projectnaam, fase uit status.md.
- Sessie die nog geen 10x is maar het wordt (prompt) → kamersleutel wisselt van project naar sessie; oude kamer loopt leeg en verdwijnt.
