# SDE — bubble-project-label
**Gebouwd** (9f469e0)
- `web/company-model.js`: `bubbleHeader(c)` → `{ text: project, color }` of `null` (leeg / '?').
- `web/sprites.js`: `drawBubble` optie `header`; met header 18px hoog, kopregel 5px vet #5a5f73 + 3×3 kleurblok, breedte = max van beide regels (max `maxW`). Zonder header pixel-gelijk aan voorheen (tekst-y = y+6 in beide formules).
- `web/company.js`: `drawAgentBubble(..., c)` geeft `bubbleHeader(c)` door, voor afdelingsbureaus en Flexwerkplek.
- README: regel over tekstballonnen in 'Eén bedrijf'. Test in `test/company-model.test.js`; totaal 103/103.
**Afwijkingen:** geen. **Tech debt:** geen nieuwe.
