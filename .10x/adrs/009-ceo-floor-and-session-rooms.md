# ADR-009: CEO-verdieping en een kamer per werksessie

**Status:** Accepted (breidt ADR-002 en ADR-006/008 uit)
**Date:** 2026-10-21
**Feature:** ceo-floor
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
10x-Team-Plus krijgt een CEO-modus: één CEO-sessie (geen `.10x/`) start werksessies die elk het 10x-proces doorlopen. ADR-002 groepeert kamers per project (git-root); dat geeft de CEO een losse kamer en voegt twee werksessies in één project samen. De CEO-skill wordt parallel gebouwd; het enige contract is de skillnaam `10x-Team-Plus:ceo` (of een prompt die met `/10x-Team-Plus:ceo` begint). Twee regexen in `server/tenx.js` zouden de CEO-skill/prompt als 10x-werk lezen.

## Decision
- **Herkenning in `state.js`** (puur): `PreToolUse Skill` met `10x-Team-Plus:ceo` of `UserPromptSubmit` die met `/10x-Team-Plus:ceo` begint markeert de sessie als CEO (`agent.ceo = true`, plakt tot SessionEnd). `state.ceoSeen` wordt `true` en blijft dat zolang de server draait. Herkenning (`isCeoSkill`, `isCeoPrompt`) staat in `tenx.js`, naast de andere plugin-namen.
- **Kamersleutel per agent (`agent.room`)**, berekend bij de snapshot door een pure functie `assignRooms`: CEO-sessie en haar subagents → `ceo`; sessie in een 10x-project terwijl `ceoSeen` → `session:<sessionId>`; anders `projectKey` (oud gedrag). `projectKey` blijft ongewijzigd; 10x-data blijft per project (`tenx[projectKey]`).
- **Valkuilen**: `tenx.onEvent` negeert events van CEO-sessies volledig; daarnaast sluiten `isPlusSignal`, de enable-regex en de `/10x-team`-prompt-regex de CEO-skill/prompt expliciet uit.
- **Client**: `building.js` groepeert op `a.room || a.projectKey`, onthoudt per kamer de `projectKey` voor 10x-data en beslissingen; kamer `ceo` wordt een nieuwe `ceo-floor.js`-renderer die bovenaan over de volle breedte staat. Teamkamers krijgen `setFloor(bool)`: zonder directiezone, lounge dubbel breed, wachtrij bij de deur, en na oplevering lichten uit.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Kamer per sessie altijd | Eenvoudiger | Regressie: gewone projecten met worktrees/meerdere sessies splitsen | Spec eist geen regressie |
| CEO-skill schrijft een bestand (bv. `~/.10x/ceo.json`) | Expliciet | Nieuw contract met parallel team, schrijft buiten repo | Spec: geen nieuw bestand |
| Kamer berekenen in de client | Geen serverwijziging | Client kent `ceoSeen` niet na herladen; logica dubbel | Server is de bron van waarheid |
| `projectKey` overschrijven met `session:<id>` | Client hoeft niets te weten | Breekt 10x-data per project en `/api/decision` | Te ingrijpend |

## Consequences
### Positive
- Geen regressie zonder CEO: `room === projectKey`.
- Twee werksessies in één project zijn twee kamers.
### Negative
- Twee werksessies in hetzelfde project delen fase/kanban (geaccepteerd in de spec).
- `ceoSeen` is in-memory: na een serverherstart zonder actieve CEO terug naar per-project tot de CEO weer iets doet.
### Risks
- Skillnaam wijzigt in 10x-Team-Plus → geen verdieping (graceful: oud gedrag). Mitigatie: naam staat op één plek (`isCeoSkill`).

## Dependencies
- Contract in `specs/2026-10-21-ceo-floor-design.md`; 10x-Team-Plus `ceo-mode`.
