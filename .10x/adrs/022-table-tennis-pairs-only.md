# ADR-022: Tafeltennis alleen als duo

**Status:** Accepted (vervangt het solo-deel van ADR-021)
**Date:** 2026-10-22
**Feature:** table-tennis-pairs-only
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
ADR-021 liet één speler oefenen tegen de opgeklapte tafelhelft. In de praktijk oogt dat als tegen een muur spelen; de gebruiker wil alleen spel met twee spelers.

## Decision
- `company.js` kiest tafeltennis voor twee teamleden tegelijk: de kiezer zoekt een vrij teamlid als partner; zonder partner of met een bezette plek valt de keuze door naar koffie. Na de modusronde: staat er nog maar één lid in `pingpong`, dan eindigt diens bezoek (`modeUntil = t`).
- `playPingPong` start een rally alleen bij twee spelers die aan de tafel staan; anders `rally.stop()`.
- `pingpong.js` verliest de solomodus (`serve(t, side)`, geen `miss`-event); `drawPingPongTable` verliest `folded`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Eerste speler wacht aan de tafel op een tegenstander | Minder code in de keuze | Er staat soms iemand alleen te wachten | Gebruiker koos duo |
| Solo houden maar minder vaak | Geen wijziging | Het muur-effect blijft | Lost de melding niet op |

## Consequences
### Positive
- Nooit één speler alleen; minder code in `pingpong.js`.
### Negative
- Tafeltennis komt iets minder vaak voor (er moet een partner vrij zijn).
### Risks
- Partner die al in deze frame verwerkt is → direct zijn modus en route zetten; QA controleert dat beide aankomen.

## Dependencies
- ADR-021.
