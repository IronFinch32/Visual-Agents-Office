# SDE — shipped-active-feature

- Gebouwd (e7726aa): `statusSection(text, feature)` in `server/tenx.js`; `refresh` leest `active.json` vóór `status.md` en parseert de sectie van die feature (ook bij een `active.json` ouder dan 6 uur); kanban-telling uit dezelfde sectie; Launch-skip-regel in `activeBehind` alleen als de gelezen sectie geen andere feature noemt.
- Tests: 3 nieuwe (sectiekeuze, Aruba-indeling incl. oude `active.json`, skip-regel blijft werken). 121/121.
- Afwijking: geen. Bijeffect: `flavor` wordt nu vóór het parsen uit `active.json` afgeleid (eerder één refresh later) — alleen consistenter.
- Tech debt: `parsePhase` telt vrije tekst met "phase N … complete" als afgevinkt (bestaand gedrag, niet aangeraakt).
