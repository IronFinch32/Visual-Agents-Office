# Staff Engineer — ux-polish
- Volg bestaand patroon: pure modules naast `web/*-model.js`, getest met `node --test` (`test/camera.test.js`, `test/markdown.test.js`, aanvulling `test/state.test.js`).
- Geen dependencies; geen `innerHTML` (beslissingstekst komt uit bestanden: DOM via `textContent`).
- CSS-tokens in `:root`, geen losse kleuren in nieuwe regels behalve via tokens.
- Nederlandse UI-teksten, Engelse code-commentaren (zoals bestaand).
- `prefers-reduced-motion` respecteren zoals in `building.js` focus().
