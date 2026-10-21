# Security review — one-company (2026-10-21)
**Verdict:** Approved
Scope: `server/departments.js`, `server/server.js` (snapshot), `web/company*.js`, `web/building.js`.
- Externe input `departments.json`: grootte-limiet, JSON in try/catch, strikte sanering (zie `decisions/security/one-company.md`). Unit-tests dekken ongeldige ids, control-tekens, limieten, verkeerde versie.
- Geen nieuwe endpoints, geen schrijfacties, geen nieuwe dependencies.
- Rendering alleen via canvas/textContent.
Open: geen High/Medium. Low geaccepteerd (TENX_DEPARTMENTS wijst naar willekeurig leesbaar bestand; alleen gesaneerde velden worden gebruikt).
