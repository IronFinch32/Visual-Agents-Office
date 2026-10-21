# CEO-verdieping — design

**Status:** goedgekeurd door de gebruiker (2026-10-21)
**Feature-slug:** `ceo-floor`
**Hangt af van:** 10x-Team-Plus `ceo-mode` (`10x-Team-Plus/.10x/specs/2026-10-21-ceo-mode-design.md`), alleen via het contract hieronder

## Context

10x-Team-Plus krijgt een CEO-modus: de gebruiker praat in één vaste **CEO-sessie** (cwd `~/Documents/Claude Projects/`, geen git-repo, geen `.10x/`), en die start per idee een **werksessie** in een projectmap die het hele 10x-proces doorloopt. Na oplevering archiveert de gebruiker de werksessie.

Het kantoor toont nu één kamer per project (sleutel `projectKey` = git-root) en in elk 10x-kantoor een eigen kleine directiekamer (zone `ceo` in `web/tenx-room.js`). Dat past niet meer: de CEO is één sessie boven alle projecten, en het werk zit per sessie.

## Contract met 10x-Team-Plus

- **CEO-sessie:** roept de skill `10x-Team-Plus:ceo` aan (PreToolUse `Skill` met `skill` = `10x-Team-Plus:ceo`), of zijn `UserPromptSubmit`-prompt begint met `/10x-Team-Plus:ceo`. Eén keer herkend, blijft de sessie CEO tot `SessionEnd`.
- **Werksessie:** een sessie in een project met `.10x/` die 10x-werk doet (bestaande herkenning in `server/tenx.js`). De feature komt uit `.10x/active.json` van die projectmap (bestaand formaat).
- De CEO-skill schrijft niets naar `.10x/`; er komt geen nieuw bestand.

## Gedrag

### Gebouw
- Is er een CEO-sessie, dan staat bovenaan het gebouw een **CEO-verdieping** over de volle breedte, boven alle kamers. Zonder CEO-sessie: geen verdieping, alles zoals nu.
- De CEO-sessie krijgt **geen** eigen gewone kamer (nu zou hij een kamer "Claude Projects" krijgen).

### CEO-verdieping
- De CEO (bestaand sprite `ceo-you`, pak met gouden accent) aan een groot bureau, met zijn huidige activiteit in een ballon zoals een manager nu.
- **Postbakje** met het aantal werksessies dat op de gebruiker wacht (status `waiting`). Rode `!` als het meer dan 0 is.
- **Bord** met per lopende werksessie één regel: `project · feature — Phase N <naam>`, en `SHIPPED` na Phase 7. Klik op een regel focust die teamkamer (bestaande `focus(key)`).
- **Overdracht:** verschijnt er een nieuwe werksessie terwijl er een CEO is, dan loopt de CEO met een map naar de rand van de verdieping (naar beneden), en gaat de nieuwe kamer open. Puur cosmetisch, maximaal een paar seconden.

### Teamkamers
- **Eén kamer per 10x-werksessie**: kamersleutel `session:<sessionId>` in plaats van `projectKey`, voor sessies waarvan het project 10x is én er een CEO-sessie bestaat of heeft bestaan sinds de server draait. Zonder CEO blijft het per project (huidige gedrag, geen regressie).
- Kamertitel: `project · feature` (feature uit `active.json`, valt terug op alleen de projectnaam).
- Fase, rollen, whiteboard, kanban, stempels: zoals nu, per project gelezen. Twee werksessies in hetzelfde project delen dus dezelfde `.10x/`-gegevens; dat is geaccepteerd, want de CEO waarschuwt tegen parallel werk in één project.
- De kleine directiekamer (zone `ceo`) in een teamkamer verdwijnt zolang er een CEO-verdieping is; wachtende teamleden lopen dan naar de **deur** van de kamer in plaats van naar de directiekamer, en het postbakje boven telt ze.
- **Na Phase 7**: bestaand SHIPPED-feest, daarna lichten uit en het team naar huis. De kamer **blijft staan** tot de sessie eindigt (`SessionEnd`, bijvoorbeeld archiveren in de app) of de bestaande stale-timeout (`STALE_MS`) verloopt.

### Wat niet mag gebeuren (bekende valkuilen)
- `server/tenx.js:41` (`/^10x-team-plus:/i`) zou de CEO-skill als 10x-signaal zien en de CEO-map tot 10x-kantoor maken → `10x-Team-Plus:ceo` uitsluiten.
- `server/tenx.js:282` (`/10x-team/i` op de prompt) zou bij `/10x-Team-Plus:ceo …` het project naar Phase 0 zetten → CEO-prompts uitsluiten.

## Niet in scope
- Codex-sessies als CEO (de CEO-modus bestaat alleen in de Claude-app).
- Sessies archiveren vanuit het kantoor (het kantoor blijft read-only).

## Testen
- Unit (`test/`): herkenning CEO via skill en via prompt; CEO-prompt zet geen fase 0 en maakt geen 10x-kantoor; kamersleutel `session:<id>` alleen met CEO; zonder CEO precies het oude gedrag (bestaande tests blijven groen); `SessionEnd` verwijdert de kamer.
- `npm run demo`: een nieuwe demovariant met een CEO die twee werksessies start (`VAO_DEMO_10X=ceo`), visueel controleren: verdieping, bord, postbakje, overdracht, SHIPPED, kamer weg na einde.
- Live: na de bouw van `ceo-mode` één echte CEO-run in de app.
