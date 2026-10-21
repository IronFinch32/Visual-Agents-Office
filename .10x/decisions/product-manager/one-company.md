# PM — one-company
**Gebruiker:** de CEO met meerdere werksessies tegelijk op een tweede scherm.
**Stories**
1. Als CEO zie ik op één scherm één bedrijf met afdelingen, niet een bedrijf per sessie.
2. Als CEO zie ik per afdeling/medewerker aan welk project die werkt (kleur + naam op de map en het naambordje).
3. Als CEO zie ik een project van afdeling naar afdeling gaan als de fase/rol wisselt.
4. Als CEO zie ik wie op mij wacht (hand omhoog, rode `!`, rode regel op het CEO-bord).
5. Vergaderzaal (fase 0) en lounge (koffie, darts, pool) blijven.
6. Gewone sessies zonder 10x staan op de Flexwerkplek.
7. Nieuwe afdelingen uit de plugin verschijnen zonder codewijziging.
**Acceptatie**
- Met 3 werksessies (2 in dezelfde rol) zie je één bedrijf; de tweede krijgt een collega-bureau; alles past zonder scrollen op 1280×720.
- Rolwissel → map loopt naar het nieuwe bureau.
- `departments.json` met een extra afdeling → extra zone; ontbrekend/kapot → ingebouwde indeling.
- `?weergave=kamers` toont de oude weergave.
- `npm test` groen.
**Buiten scope:** kanban/ADR-muur per project, afdelingen configureren in het kantoor.
