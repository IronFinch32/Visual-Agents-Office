# QA — session-sync (2026-10-21)
**Verdict: Pass**
- `npm test` kantoor: 86/86 (6 nieuwe scenario's: verse sessie op fase 0, bevroren afgeronde sessie, lezen beëindigt nieuwe run niet, resume houdt live stand, active.json-rol niet naar stille sessie, nieuwer exact signaal wint/gok niet, mtime boven foute updatedAt, idle-stop houdt / clear wist bevroren stand).
- Plugin: `tests/tenx-reminder.test.js` 4/4, `validate-skills` 375/375; hook handmatig: VAO-map → herinnering, CEO-werkmap → stil, exit 0.
- Live: losse instantie op :4799 met nepproject + CEO — sessie A "oude-feature · klaar"/SHIPPED, nieuwe sessie B direct "fase 0 Vergaderzaal", ook nadat B status.md las; rollen A devops, B meeting; geen consolefouten. Echte service herstart, :4747 → 200.
- Not run: echte nieuwe CEO-werksessie end-to-end in de app (gebeurt bij het volgende CEO-idee); plugin-hook in een echte sessie (pas actief na plugin-update door de gebruiker).
