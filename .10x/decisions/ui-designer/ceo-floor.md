# UI — ceo-floor

- **Hergebruik**: bestaande pixel-sprites (`drawFloor`, `drawBackWall`, `drawCeoDesk`, `drawInbox`, `drawPerson` met `ceo-you`-looks + gouden accent `#e8c35a`, `drawFolder`, `drawBubble`, `drawPlant`, `drawLighting`). Geen nieuwe kleuren buiten het bestaande palet; het bord gebruikt de whiteboard-stijl van de kanban (donker bord, lichte tekst).
- **Maat**: logische 416 × 96 px (zelfde breedte als een 10x-kamer). Muur 46 px hoog met het bord (x 96–360, 6–42), vloer eronder met bureau links, trapgat rechtsonder.
- **Bordregel**: 5px pixelfont, `project · feature` links (afgekapt), fase rechts. Kleur: werkend `#e4defa`, wacht `C.waiting` met `!`, SHIPPED `C.done`. Hover: regel licht op; cursor pointer.
- **Gebouw**: verdieping-sectie staat bovenaan over de volle breedte (CSS `flex-basis: 100%`), titel "CEO-verdieping", gouden header zoals bestaande kamers.
- **Teamkamer in CEO-modus**: zone `ceo` vervalt, de lounge krijgt twee kolommen breed; wachtrij bij de deur.
