# SRE — one-company
- Geen SLO-wijziging (lokale tool). Signalen: browserconsole ("Kantoor company kon niet tekenen" bij een tekenfout; building vangt per kamer), `/api/state` → `departments`.
- **Runbook**
  - Leeg/raar bedrijf? → `?weergave=kamers` om te vergelijken; `?debug` → `__vaoRooms.get('company').room.debug()` toont cases, plaatsen, overdrachten.
  - Nieuwe afdeling uit de plugin verschijnt niet? → `curl 127.0.0.1:4747/api/state` → `departments`; `null` = bestand niet gevonden/ongeldig (plugin bijwerken of `TENX_DEPARTMENTS`); wordt elke 60 s opnieuw gelezen.
  - Project in de verkeerde afdeling? → `tenx[<project>].roles[<sessie>]` en `.sessions[<sessie>]` (ADR-015); de afdeling volgt de rol.
  - Collega blijft hangen? → hij gaat zodra er een nieuwe snapshot is zonder werk voor hem.
