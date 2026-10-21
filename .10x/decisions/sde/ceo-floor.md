# SDE — ceo-floor

Gebouwd volgens ADR-009: T1, T2, T3, T4, T5, T6.

- **T1** `server/tenx.js`: `isCeoSkill`, `isCeoPrompt`; uitgesloten in `isPlusSignal`, de enable-regex en de `/10x-team`-prompt-regex; `onEvent` slaat CEO-agents over. `server/state.js`: markeert `session.ceo` en `state.ceoSeen` (alleen hoofdsessie, niet vanuit een subagent).
- **T2** `assignRooms` in `state.js`; `server.js fullSnapshot` laat CEO-projecten uit de tenx-snapshot en zet `agent.room`.
- **T3** `web/building.js`: groepeert op `room`, `projectKey` per kamer (10x-data, beslissingen), verdieping bovenaan met `.floor-break`, eigen rij in `layout()` (max 30% hoogte), bordregels, titels `project · feature`, handoff bij een nieuwe `session:`-kamer. `web/app.js`: paneel groepeert op kamer; CEO-kaart heet "CEO".
- **T4** `web/ceo-floor.js`: muur met DIRECTIE-plaquette en bord (max 5 regels, +N), bureau + postbakje, CEO-ballon (wacht/werkt/denkt/klaar), trap met overdracht (map, "Nieuw team!"), klik/hover op bordregels.
- **T5** `web/tenx-room.js`: `setFloor(on)` → geen `ceo`-zone, lounge 2 breed, wachtrij bij de deur ("bij de deur"), na oplevering + feest naar huis ("Opgeleverd · iedereen is naar huis"). `quiet` is nu een variabele i.p.v. de CEO-modus af te lezen.
- **T6** `scripts/demo-ceo.js` + `runTenxDemo` geparametriseerd (root, sessionId, feature, prompt). `VAO_DEMO_10X=ceo npm run demo`.

## Afwijkingen
- `.building` kreeg `scrollbar-gutter: stable` en 2px marge in `layout()`: in de demo gaf een verschijnende scrollbalk een terugkoppeling (verdieping net te breed → horizontaal scrollen).
- Board-lijn-hitbox is 6 logische px hoog; op kleine schermen klein, maar de kamers zijn ook direct klikbaar.

## Tech debt
- `ceoSeen` is in-memory (bewust, ADR-009).
- Kamertitels worden smal als twee kamers naast elkaar staan (header = canvasbreedte); het bord toont de volledige naam.
