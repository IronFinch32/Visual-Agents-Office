# Architect — bubble-project-label
- ADR-017. Eenheden: `bubbleHeader(c)` (puur, getest) → `drawBubble(..., { header })` (tekenen) ← `drawAgentBubble` (company.js).
- Geen data/server-wijziging: `case.project` en `case.color` bestaan al in de client.
- Faalgevallen: lege/'?'-naam → null header; lange naam → `fit()` op ballonbreedte.
