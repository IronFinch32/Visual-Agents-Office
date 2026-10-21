# ADR-011: CEO-sessie onthouden over een herstart heen

**Status:** Accepted (breidt ADR-009/010 uit)
**Date:** 2026-10-21
**Feature:** ceo-persist
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
De CEO wordt alleen herkend aan de skill of prompt `10x-Team-Plus:ceo` (ADR-009) en staat in het geheugen. Na een herstart van de service is de verdieping weg en krijgt elke teamkamer weer een eigen CEO-kantoor, tot de CEO-skill opnieuw gebruikt wordt — wat in een lopende CEO-sessie lang kan duren.

## Decision
- `state.js` (puur): `ceoSnapshot(state)` geeft de CEO-sessies als platte objecten; `restoreCeo(state, saved, now)` zet ze terug (alleen jonger dan `CEO_STALE_MS`, status `working` → `idle`) en zet `ceoSeen`.
- `server.js`: optionele `ceoStore { load(), save(list) }`. Bij start `restoreCeo(load())`; na elke event/prune opslaan als de lijst verandert (id/kerngegevens) of `updatedAt` >60 s nieuwer is. Standaard geen store (tests schrijven niets); `bin` en de `server.js`-main gebruiken `fileCeoStore(~/.visual-agents-office/ceo.json)` (mode 0600, inhoud gevalideerd).
- Verdwijnen blijft: SessionEnd of 12 u stilte.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Hele state bewaren | Alles terug na herstart | Spooksessies, grotere file, meer schrijven | Alleen de CEO is het probleem |
| CEO herkennen aan werkmap (geen `.10x/`, boven projecten) | Geen bestand | Heuristiek, vals-positief | Te onbetrouwbaar |
| Niets doen | Simpel | Verdieping weg na elke herstart | Gebruiker wil het wel |

## Consequences
### Positive
- Herstart (update, reboot) laat de CEO-verdieping staan.
### Negative
- Een bestand in `~/.visual-agents-office/`; een CEO-sessie die zonder SessionEnd sterft blijft max 12 u zichtbaar, ook na herstart.
### Risks
- Corrupt bestand → genegeerd (lege lijst).
