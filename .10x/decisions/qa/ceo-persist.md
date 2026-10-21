# QA — ceo-persist
- `npm test` 74/74; 2 nieuw: round-trip + junk/oud genegeerd; server-herstart met tmp-bestand houdt de verdieping, SessionEnd wist hem.
- Live op :4747: zelftest-CEO-prompt schreef `~/.visual-agents-office/ceo.json` (-rw-------), SessionEnd → `[]`.
- Niet te testen: de lopende CEO-sessie zelf (sessie-id onbekend tot ze weer een CEO-signaal stuurt).
