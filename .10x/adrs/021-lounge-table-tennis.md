# ADR-021: Tafeltennis in de lounge als gescripte rally

**Status:** Accepted (breidt ADR-014 en ADR-016 uit)
**Date:** 2026-10-22
**Feature:** lounge-table-tennis
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
De bedrijfslounge (`web/company.js`) heeft darten (gescript) en pool (eigen fysica, `web/pool.js`). De gebruiker wil tafeltennis als derde activiteit en koos een rally met missers, geen echte fysica.

## Decision
- Nieuw puur module `web/pingpong.js`: `createRally(rand)` met een tijdgestuurde toestand: `serve(t, side, solo)`, `update(t)` → events `{ type: 'hit'|'point', side }`, `ball(t)` → `{ u, v, h }` (langs, dwars, hoogte) of `null`. Een vlucht is een paraboolboog naar een stuitpunt op de helft van de ontvanger, daarna een kleinere boog naar het batje. Het aantal slagen per rally wordt bij de serve bepaald (3–9); de laatste vlucht schiet voorbij de tafel en valt.
- `company.js`: ledenmodus `pingpong` naast `darts`/`pool`, twee speelplekken, `playPingPong(players, t)` die de rally start/stopt bij spelerswissel, tafel als nav-blok, tekenen via sprites.
- `tenx-sprites.js`: `drawPingPongTable`, `drawPaddle`, `drawPingPongBall`, constanten `TT_W`, `TT_H`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Fysica zoals pool | Echte bal, net/uit | Veel meer code voor een effect van een paar pixels | Gebruiker koos rally |
| Logica direct in `company.js` | Eén bestand minder | Niet testbaar; bestand al ~970 regels | Los module is testbaar |
| Alleen decor | Minimaal | Geen activiteit | Voldoet niet aan de vraag |

## Consequences
### Positive
- Rally is unit-testbaar en deterministisch met een eigen `rand`.
### Negative
- `company.js` groeit met ~60 regels lijm.
### Risks
- Lounge raakt vol: plekken verschuiven → visueel controleren dat niemand op tafel/bank staat.

## Dependencies
- ADR-016 (bedrijfslounge), ADR-014 (spelpatroon pool).
