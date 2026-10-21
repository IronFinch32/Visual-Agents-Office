# SDE — one-company
**Gebouwd** (commits 032c3a2 T1–T2 `feat(company): departments.json…`, T3–T6 7237500)
- `server/departments.js`: `sanitizeDepartments`, `loadDepartments`, `departmentsSource` (cache 60 s); `server.js` zet `departments` in de snapshot (`createServer({ departments })` injecteerbaar).
- `web/company-model.js`: `companyLayout`, `deriveCases`, `unknownRoles`, `stableSlots`, `createStaffing`, `createProjectColors`, `shortName`, `BUILTIN_DEPARTMENTS`.
- `web/company.js`: renderer + gedrag (medewerkers `m:<rol>:<slot>`, flex `f:<sessie>`, subagents; overdracht met gekleurde map; collega's in/uit via de deur; vergadertafels; flex; lounge koffie/darts/pool; rustig/weg; SHIPPED-feest; highlight met dim-masker; klik → beslissing).
- `web/building.js`: standaard `setCompany` (CEO-verdieping + bedrijf), `?weergave=kamers` = oude pad; `focus(key)` van een sessie/project → highlight. `ceo-floor.js`: kleurblokje en ⚠ bij gate. `app.js`: `departments` doorgeven, UX/UI-labels. `tenx-sprites.js`: `drawFolder(color)`, `drawZone({label, rug})` met fallback, `roleInfo()` voor onbekende rollen.
- README: sectie "Eén bedrijf".
- Tests: `test/departments.test.js` (5), `test/company-model.test.js` (11); totaal 102/102.

**Afwijkingen van plan**
- Zonehoogte 134 (i.p.v. 118) na visuele check: afdelingsbordjes en twee bureaus boven elkaar.
- Flex-naambordje: projectnaam + regel met bron (`claude`/`codex`) i.p.v. bron-tag naast de naam (te smal).
- Gate kleurt de bordregel rood (status `waiting`-kleur) met ⚠.

**Tech debt**
- Lounge/darts/pool-gedrag gedupliceerd met `tenx-room.js` (legacy) — weg als `?weergave=kamers` vervalt.
- `building.js` roept `deriveCases` naast `company.js` aan (dubbel werk per snapshot, klein).
