# ADR-013: De CEO-sessie blijft staan als de app haar proces stilzet

**Status:** Accepted (wijzigt "Verdwijnen blijft: SessionEnd" uit ADR-010/011)
**Date:** 2026-10-21
**Feature:** ceo-sessionend
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
De Claude-app zet het CLI-proces van een stille sessie na een tijdje stil; dat stuurt de hook `SessionEnd`. Bij de volgende beurt hervat de app dezelfde sessie (zelfde `session_id`, nieuw `SessionStart`). De server wiste bij `SessionEnd` de CEO-sessie met haar `ceo`-vlag (en daarmee `ceo.json`). De hervatte sessie was dan een gewone sessie en de CEO-verdieping bleef weg tot de CEO-skill opnieuw liep. Gezien op 2026-10-21: laatste beurt 13:45, hervat 14:10, verdieping terug om 14:12.

## Decision
- `applyEvent` bij `SessionEnd` van een CEO-sessie: haar subagents gaan weg, de sessie zelf blijft staan met status `done` en activiteit "Staat stil". Alleen `reason` `clear` of `logout` haalt haar echt weg.
- Een hervatte sessie (`SessionStart`, zelfde id) is daardoor meteen weer CEO; `done` → `idle` gebeurt al.
- Het vangnet blijft `CEO_STALE_MS` (12 u stilte), ook voor een echt gesloten of gearchiveerde CEO-sessie.
- Andere sessies: ongewijzigd (weg bij `SessionEnd`).

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Weg bij SessionEnd, id onthouden en terug bij hervatten | Gesloten CEO verdwijnt meteen | Verdieping verdwijnt nog steeds zolang de sessie stilstaat | Gebruiker koos ertegen |
| Niets doen | Geen werk | Verdieping verdwijnt na elke stille periode | Het probleem zelf |

## Consequences
### Positive
- De CEO-verdieping blijft zolang de CEO-sessie open is in de app, ook als het proces stilstaat.
### Negative
- Na echt sluiten of archiveren van de CEO-sessie blijft de verdieping tot 12 u staan (want de app stuurt dan dezelfde `SessionEnd`).
### Risks
- Onbekende `reason`-waarden → behandeld als stilzetten (blijft staan), vangnet 12 u.

## Dependencies
- ADR-009 (CEO-herkenning), ADR-010 (CEO_STALE_MS), ADR-011 (`ceo.json` volgt de state vanzelf).
