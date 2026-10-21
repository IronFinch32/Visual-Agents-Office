# ADR-010: Lounge-leven bij stilte, darten, en een blijvende CEO-verdieping

**Status:** Accepted (breidt ADR-008 en ADR-009 uit)
**Date:** 2026-10-21
**Feature:** team-lounge-darts
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Een CEO-sessie wacht vaak lang op de gebruiker. `prune` verwijdert elke sessie na 30 min zonder event, dus de CEO-verdieping verdwijnt terwijl de sessie nog open is. In teamkamers gaat een stil team na 10 min naar huis; de kamer voelt dan leeg, terwijl de gebruiker juist wil zien dat het team er is en af en toe in de lounge zit (en dart).

## Decision
- **Server:** `prune` gebruikt voor een CEO-sessie (`kind === 'session' && ceo`) `CEO_STALE_MS = 12 u` i.p.v. `STALE_MS`. SessionEnd blijft de normale manier van verdwijnen.
- **Client (`tenx-room.js`):** stilte heeft twee trappen: `lull` (>10 min) → lounge-rotatie, licht aan; `away` (>60 min, of opgeleverd onder CEO-verdieping) → naar huis zoals voorheen. Koffiepauzes vaker (max 3). Nieuwe ledenmodus `darts` met een cosmetisch potje op een dartbord in de lounge.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| CEO-sessie nooit prunen | Simpelst | Bij crash zonder SessionEnd blijft een spook-verdieping tot herstart | Vangnet van 12 u kost één regel |
| Verdieping altijd tonen na `ceoSeen` | Stabiel beeld | Lege verdieping als er geen CEO meer is; vraagt client-logica | Gebruiker koos "zolang sessie open" |
| Client houdt de verdieping vast | Geen serverwijziging | Na herladen weg; server blijft bron van waarheid niet | Tegen ADR-009 |
| Stil team blijft aan bureaus | Minder code | Geen lounge-gevoel | Gebruiker wil lounge |

## Consequences
### Positive
- CEO-verdieping blijft zichtbaar tijdens lange wachttijden.
- Teamkamers blijven levendig.
### Negative
- Een gecrashte CEO-sessie blijft tot 12 u zichtbaar.
- Meer animatie = iets meer tekenwerk per frame (verwaarloosbaar).
### Risks
- Overvolle lounge in stille fase → cap op lounge-plekken + darts-plekken; overloop blijft aan bureau.

## Dependencies
- ADR-008 (living office modes), ADR-009 (CEO-herkenning `agent.ceo`).
