# QA — team-lounge-darts
- `npm test` 72/72 (2 nieuw in `test/ceo.test.js`: CEO-sessie blijft na 30 min, weg na 12 u; SessionEnd verwijdert hem nog steeds). Server-tests vereisen lokale poortbinding (draaien buiten sandbox).
- Visueel op :4848 (demo `VAO_DEMO_10X=ceo` + handmatig half-af 10x-project, updatedAt in de client 15 min terug): onderschrift "Rustig · het team hangt in de lounge", 5 in lounge, 2 darters, worpen (turn 18, pijlen 1→2→3 en reset), werp-pose zichtbaar. Opgeleverd team onder CEO-verdieping gaat naar huis (ongewijzigd).
- Bugs: geen open. Niet getest: 60-min-overgang naar huis (zelfde codepad als voorheen, alleen drempel).
