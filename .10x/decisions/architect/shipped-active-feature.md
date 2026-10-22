# Architect — shipped-active-feature

- Route: change (bugfix met gedragswijziging in sectiekeuze) → ADR-020.
- Grens: alleen `server/tenx.js` (pure `statusSection` + `refresh`/`activeBehind`). Geen wijziging in het web-deel of het snapshotcontract.
- Faalmodi: geen/afwijkende feature → oud gedrag; sectie zonder fases → `parsePhase` geeft null → vorige waarden blijven (zoals nu).
