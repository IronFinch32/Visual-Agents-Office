# ADR-020: Status-sectie van de actieve feature lezen

**Status:** Accepted
**Date:** 2026-10-22
**Feature:** shipped-active-feature
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
`parsePhase` neemt de laatste `# Status`-sectie die fases noemt. Het plugin-contract zegt dat de laatste sectie de lopende feature is, maar sessies voegen in de praktijk soms een sectie middenin toe (Aruba: `eerste-livegang-netlify` boven drie oudere secties). Dan leest het kantoor een afgeronde oude sectie, en de Launch-skip-uitzondering uit ADR-018 (active op last−1, last afgevinkt) maakt van een lopende Verification "SHIPPED".

## Decision
- Nieuwe pure functie `statusSection(text, feature)` in `server/tenx.js`: geeft `{ text, feature }` — de sectie `# Status — <feature>` als die bestaat, anders de hele tekst met de feature van de laatste `# Status — `-kop (of `null`).
- `refresh` kiest de sectie met de feature uit `active.json`; die feature wordt ook gebruikt als `active.json` te oud is voor de rolweergave (6 uur), want de sectie blijft de beste bron.
- Fase, `done`, `complete` en de kanban-telling komen uit die sectie.
- `activeBehind`: de Launch-skip-uitzondering geldt alleen als de gelezen sectie geen andere feature noemt dan `active.json`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Alleen de skip-regel aanscherpen | Kleinste wijziging | Fase/`done`/kanban komen nog steeds van de verkeerde feature | Halve fix |
| Eerste sectie met een open fase nemen | Geen `active.json` nodig | Verlaten features (bv. `roadmap-ux-wensen`, alles open) winnen dan | Fout signaal |
| Aruba's `status.md` herordenen | Geen code | Lost alleen dit ene geval op; ander project mag dat niet | Kantoor moet robuust zijn |

## Consequences
### Positive
- Juiste fase en geen valse SHIPPED, ongeacht waar de sectie staat.
### Negative
- Kantoor hangt iets meer af van een kloppende `feature` in `active.json`; zonder match blijft het oude gedrag.
### Risks
- Feature-slug in `active.json` wijkt af van de kop → terugval op laatste sectie (oud gedrag). Vergelijking is hoofdletterongevoelig en negeert omringende spaties/backticks.

## Dependencies
- ADR-008 (active.json), ADR-018 (Launch-fase en skip-regel).
