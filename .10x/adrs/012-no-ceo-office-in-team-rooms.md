# ADR-012: Geen directiekamer meer in teamkamers; de CEO komt op bezoek

**Status:** Accepted (wijzigt de teamkamer-lay-out van ADR-008/009)
**Date:** 2026-10-21
**Feature:** no-directie
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
ADR-009 haalde de zone `ceo` alleen weg zolang er een CEO-verdieping is. De CEO is inmiddels een vaste laag boven het gebouw (ADR-010/011). De gebruiker wil de directiekamer in teamkamers altijd kwijt; het CEO-poppetje mag nog binnenkomen voor stand-ups en feestjes.

## Decision
- `LAYOUTS` in `web/tenx-room.js` heeft geen zone `ceo` meer; `lounge` is in beide flavors `[3, 1, 2]`. De conditionele lay-outaanpassing in `applyFlavor` vervalt.
- `queueSpot` is altijd de rij bij de deur; `ceoGeo`, het CEO-bureau, de stoel, het postbakje en het naambordje in de teamkamer vervallen; `drawCeoDesk`/`drawInbox` worden niet meer geïmporteerd als niemand ze meer gebruikt.
- Het CEO-karakter bestaat altijd, start in modus `away` (verborgen bij de deur). In `think`: stand-up → binnenkomen en naar `meeting.head`; feest → lounge; anders `away` (naar de deur, verbergen).
- `floor` stuurt alleen nog `shippedHome`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Alleen weg met CEO-verdieping (huidig) | Geen werk | Gebruiker ziet nog directie zonder verdieping | Gebruiker koos ertegen |
| CEO-poppetje helemaal weg, PM leest opdracht voor | Minder code | Stand-up verliest de "jij geeft de opdracht"-scène | Gebruiker koos het bezoek |

## Consequences
### Positive
- Eén lay-out per flavor, minder takken (`floor` raakt de lay-out niet meer).
- Teamkamers zien er hetzelfde uit met en zonder CEO-sessie.
### Negative
- Zonder CEO-sessie is er geen vaste plek meer die "jij" voorstelt; het postbakje-aantal in de teamkamer verdwijnt (wachtenden zijn zichtbaar in de rij bij de deur en in de kaart-chip).
### Risks
- CEO blijft zichtbaar hangen als `away` niet goed terugkeert → gedekt door de bestaande `away → hidden`-regel in de beweging.

## Dependencies
- ADR-009 (setFloor), ADR-010 (lounge/darts — de spots zijn relatief aan de lounge-zone en blijven werken).
