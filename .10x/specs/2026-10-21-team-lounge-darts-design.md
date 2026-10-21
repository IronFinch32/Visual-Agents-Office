# Spec — team-lounge-darts (2026-10-21)

Goedgekeurd in chat door de gebruiker (via CEO-sessie).

## Doel
Een 10x-teamkamer voelt levendiger: teamleden die niets doen zitten vaker in de lounge, een stil team blijft hangen in plaats van meteen naar huis te gaan, en in de lounge wordt gedart. De CEO-verdieping blijft staan zolang de CEO-sessie open is.

## Gedrag
1. **Lounge tijdens werk** (`web/tenx-room.js`): teamleden die niet werken/wachten gaan gemiddeld eens per ~40 s naar de lounge (~15 s als hun afdeling klaar is); max 3 tegelijk; 12–25 s per bezoek.
2. **Stil team** (alle agents idle/klaar en >10 min geen update): niemand gaat naar huis; maximaal 5 teamleden tegelijk in de lounge in rotatie, de rest leest aan het bureau. Licht blijft aan, onderschrift "Rustig · het team hangt in de lounge". Na **60 min** stilte, of na oplevering onder een CEO-verdieping, gaat iedereen naar huis (oud gedrag).
3. **Darten**: dartbord op een standaard in de lounge met een werplijn. Eén potje tegelijk, 1–2 spelers wisselen om de beurt; armzwaai, pijltje vliegt en blijft ~3 s in het bord steken; af en toe een ballon ("180!", "Bull!", "Mis…"). Een loungebezoeker kiest ~40% van de keren darten als er een plek bij het bord vrij is.
4. **CEO-verdieping** (`server/state.js`): `prune` verwijdert een CEO-sessie niet na 30 min stilte, alleen na SessionEnd of na 12 uur zonder enig event (vangnet bij crash). Subagents van de CEO worden opgeruimd zoals altijd.

## Buiten scope
- De gewone projectkamer (`web/room.js`) krijgt geen dartbord.
- Werksessie-kamers volgen nog de 30-min-regel.

## Testen
- Unit: `prune` houdt CEO-sessie na 31 min, verwijdert na 12 u+; gewone sessie nog na 30 min.
- Visueel: demo `VAO_DEMO_10X` op dev-poort; dartbord, darten, stille-lounge.
