# ADR-017: Projectnaam als kopregel in tekstballonnen

**Status:** Accepted
**Date:** 2026-10-21
**Feature:** bubble-project-label
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
In het ene bedrijf (ADR-016) werken medewerkers van verschillende projecten naast elkaar. De ballon toont alleen de activiteit; het project staat alleen in een 4px-tag onder het naamplaatje.

## Decision
`drawBubble` (sprites.js) krijgt een optionele `header: { text, color }` die een tweede, kleinere regel boven de tekst tekent. `company-model.js` levert `bubbleHeader(case)`; `company.js` geeft die mee aan elke tekstballon van een agent. Zonder header blijft `drawBubble` pixel-gelijk aan nu.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Projectnaam als prefix op één regel | Geen hoogtewijziging | Activiteit wordt eerder afgekapt | Gebruiker koos kopregel |
| Ballonrand in projectkleur | Heel compact | Status-kleur verdwijnt | Status is belangrijker signaal |
| Aparte `drawProjectBubble` in company.js | Raakt sprites.js niet | Dubbele ballonlogica | Eén ballonfunctie houdt stijl gelijk |

## Consequences
### Positive
- Wie-waar meteen leesbaar; andere weergaven ongemoeid.
### Negative
- Ballon is 7px hoger, iets meer overlap tussen buren.
### Risks
- Overlap bij volle afdelingen — bestaande overlay-volgorde blijft; visueel gecontroleerd in Phase 6.

## Dependencies
- ADR-016 (cases met `project` en `color`).
