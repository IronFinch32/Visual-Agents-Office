# ADR-014: Pooltafel in de lounge met een kleine eigen fysica

**Status:** Accepted (breidt ADR-010 uit)
**Date:** 2026-10-21
**Feature:** lounge-pool
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
De lounge (ADR-010) heeft een dartbord als cosmetisch spel. De gebruiker wil ook een pooltafel waar teamleden een potje spelen. Pool vraagt meer dan darten: ballen moeten rollen, botsen en in pockets vallen, anders oogt het niet als pool.

## Decision
- Nieuw puur module `web/pool.js` (geen canvas, geen DOM): `createPoolGame()` met tafelcoördinaten, `rack()`, `shoot(angle, speed)`, `step(dt)` → events, `moving()`. Wrijving, bandbots, elastische botsing gelijke massa, pocketstraal; substappen ≤ 1/120 s en dt-cap.
- `tenx-room.js` krijgt ledenmodus `pool` naast `darts`, twee vaste speelplekken, beurtwisseling (`playPool`) die alleen stoot als alles stilligt, en tekent tafel + keu. Tafel is een nav-blok.
- Sprites: `drawPoolTable`, `drawCue` in `tenx-sprites.js`; pose `cue` in `sprites.js`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Gescript: alleen witte → doelbal, vaste uitkomst | Minder code | Ballen botsen niet onderling; oogt nep | Fysica is maar iets meer code |
| Physics-library (bv. matter.js via CDN) | Realistisch | Externe afhankelijkheid, `web/` heeft geen deps | YAGNI |
| Logica in `tenx-room.js` zelf | Eén bestand minder | Niet testbaar, bestand al 700+ regels | Los module is testbaar |

## Consequences
### Positive
- Fysica is unit-testbaar; kamercode blijft lijm.
### Negative
- Iets meer per-frame werk (7 ballen, verwaarloosbaar).
### Risks
- Lounge-overlap of vastlopende spelers → nav-blok en speelplekken controleren in QA.

## Dependencies
- ADR-010 (lounge-modi), ADR-008 (living office).
