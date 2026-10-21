# Staff Engineer — one-company
- Patronen volgen: ES-modules zonder build, `createX()`-factories met `frame/size/isEmpty`, `node:test`, puur model gescheiden van canvas (zoals `pool.js`, `nav.js`).
- Hergebruik: `sprites.js` (personen, bureaus, ballonnen, licht), `tenx-sprites.js` (rollen, zones, lounge-meubels), `nav.js` (looproutes), `pool.js` (biljart).
- `ROLE_INFO`/`DEPTS` blijven de bron voor uiterlijk en Nederlandse labels; `departments.json` bepaalt welke afdelingen/rollen er zijn. Onbekende rol → `genericRole(role)` (kleur uit hash, outfit hoodie).
- `drawFolder` krijgt een optionele kleur (default ongewijzigd → legacy blijft gelijk).
- Duplicatie lounge-gedrag met `tenx-room.js` geaccepteerd (ADR-016, tech debt), niet de legacy aanpassen.
- Geen nieuwe dependencies; tests in `test/company-model.test.js`, `test/departments.test.js`.
