# QA — go-to-market-departments (2026-10-22)
**Verdict: Pass**
- `npm test` 107/107 (buiten de sandbox; binnen de sandbox falen 10 servertests alleen op `listen EPERM`).
- Nieuw: rollen/skills/paden/active.json voor alle 5 rollen; fase 8 guesses; parsePhase 8 vs 9 regels + skipped; createTenx cfo fase 8 open → skipped Launch klaar; layout 12 afdelingen; deriveCases fase 8.
- Browser (demo op :4848, echte departments.json): 12 zones in 2 rijen, nieuwe looks zichtbaar; snapshot fase 7 → 8 (PMM, CS, …) → pas `complete` na Phase 8; console schoon; `?weergave=kamers` in fase 8 zonder fouten.
