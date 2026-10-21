# Architect — ceo-sessionend (ADR-013)
- Oorzaak: app zet idle CLI-proces stil → `SessionEnd` → CEO gewist; hervat met zelfde id als gewone sessie.
- Fix in `server/state.js` `applyEvent`: CEO-sessie blijft bij `SessionEnd` (status done), behalve `reason` clear/logout. Subagents gaan wel weg. Geen wijziging in server.js/web.
