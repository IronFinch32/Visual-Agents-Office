# Architect — one-company (ADR-016)
**Componenten**
- `server/departments.js` — `loadDepartments({ env, home, fs })` + `sanitizeDepartments(obj)`; cache 60 s in `server.js`; `departments` in elke snapshot.
- `web/company-model.js` — puur: `companyLayout`, `deriveCases`, `createStaffing`, `projectColor`, `PROJECT_COLORS`, `ZONE` constanten.
- `web/company.js` — renderer + gedrag (beweging, overdracht, lounge, wachten, highlight, klik).
- `web/building.js` — modus `company` (standaard) vs `kamers` (`?weergave=kamers`).
- `web/ceo-floor.js` — bordregel krijgt `color`; klik → `onFocus(caseKey)` (nu highlight).
- `web/app.js` — projectklik → `building.focus(key)` (company: highlight); rol-labels UX/UI.

**Datastroom:** hooks → state/tenx (ongewijzigd) → snapshot `{ agents, tenx, departments, now }` → building → company.setData → model → staffing → gedrag/tekenen.

**Case-sleutel:** `session:<sessionId>` (zelfde als de oude kamersleutel), zodat CEO-bord, zijbalk en highlight dezelfde sleutel gebruiken. Flex-cases idem.

**Grenzen:** server blijft read-only; browser vertrouwt `departments` alleen als gesaneerde data (tekst via canvas `fillText`, nooit HTML).

**Faalwijzen:** contract kapot → `null` → ingebouwde lijst; onbekende rol → zone "Overig" met generieke medewerker; te veel cases → stapel; render-exceptie in één frame → building vangt per kamer (bestaat).
