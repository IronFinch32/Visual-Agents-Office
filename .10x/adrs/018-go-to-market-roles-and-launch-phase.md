# ADR-018: Go-to-market-rollen en Launch-fase in het kantoor

**Status:** Accepted
**Date:** 2026-10-22
**Feature:** go-to-market-departments
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
10x-Team-Plus 0.5.0-plus.1 (plugin ADR-007) voegt vijf rollen, vier afdelingen en fase 8 Launch toe; status.md-secties hebben nu 9 regels, oude 8. ADR-016 tekent zones al uit `departments.json`, maar de server kent een vaste rollenlijst (`ROLES`) en fasen 0–7: nieuwe rollen en fase 8 in `active.json` worden weggegooid, en "klaar" volgt fase 7.

## Decision
- De rollenlijst en de smaak `plus` (server `FLAVORS`, browser `FLAVOR_PHASES`) krijgen de vijf rollen en fase 8 → `marketing` (standaardrol PMM). Smaak `classic` blijft gelijk.
- `parsePhase` bepaalt het einde per sectie: de hoogste fase van de smaak als de sectie die noemt, anders één lager wanneer die laatste fase optioneel is (`optionalLast` in `FLAVORS.plus`). Het geeft `last` mee. `complete = highest >= last`.
- `active.json` met een fase vóór `last` maakt het project niet "klaar", behalve fase `last-1` als `last` optioneel is en al afgevinkt (Launch overgeslagen).
- Browser: eigen looks/accessoires en NL-labels in `tenx-sprites.js`; de oude kamerweergave knipt de fasen af op de zones die haar layout kent.
- Nog steeds is `departments.json` leidend voor welke zones er zijn; de vaste lijsten zijn alleen voor herkenning, uiterlijk en fallback.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Rollen dynamisch uit `departments.json` op de server | Toekomstvast | Server moet dan ook skill→rol en pad→rol dynamisch maken; meer code nu | Vaste lijst is klein en getest; onbekende rollen blijven generiek (ADR-016) |
| Fase 8 als aparte smaak `plus-launch` | Oude projecten 100% ongemoeid | Smaakdetectie wordt ingewikkelder; zelfde plugin, twee smaken | Per-sectie einde lost hetzelfde op |
| Alleen generiek tonen | Geen UI-werk | Gebruiker koos volwaardig | — |

## Consequences
### Positive
- CFO/Sales/Legal in Strategie en het hele Launch-team zijn zichtbaar aan het werk; projecten zijn niet te vroeg klaar.
### Negative
- Rollenlijst staat nog op drie plekken (server ROLES, browser ROLE_INFO, departments.json).
### Risks
- Projecten met een vrije status-opmaak die "Phase 8" voor iets anders gebruiken: alleen plus-smaak, klein risico.

## Dependencies
- ADR-007 (smaken), ADR-008 (active.json), ADR-016 (één bedrijf); 10x-Team-Plus `docs/departments-contract.md` v1 + ADR-007.
