# Handoff — one-company

**Van:** SDE → **Naar:** QA / Security / Design review
- Gebouwd: zie `decisions/sde/one-company.md`. Commit 7237500.
- Testen: `npm test`; browser met `office-dev` (:4848) + `VAO_DEMO_10X=ceo npm run demo` en `npm run demo` op `VAO_PORT=4848`. Controleer: overdracht, collega (SDE 2), vergadertafel, flex, wachten, SHIPPED, highlight, `?weergave=kamers`, extra afdeling.
- Security: `departments.json` is externe input (lokaal bestand) → sanering.
