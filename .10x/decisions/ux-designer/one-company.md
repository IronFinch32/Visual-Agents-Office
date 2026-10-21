# UX — one-company
**Akkoord:** indeling, flows en schermopbouw goedgekeurd door de CEO in de brainstorm (spec 2026-10-21-one-company-design.md); de CEO liet fases 1–7 aan het team.

**Gebruiker/context:** CEO, tweede scherm, kijkt even op: "wie werkt waaraan, wie wacht op mij?" Kerntaak die moeiteloos moet: in 2 s zien welk project waar ligt en wie wacht.

**IA (één scherm, boven → onder):** CEO-verdieping (bord: regel per project) → bedrijf (2 rijen zones) → zijbalk (lijst per project, ongewijzigd).

**Wireframe afdelingszone (per rolkolom, 38 px breed):**
```
[ BORD: Engineering ]
 [monitor]  [monitor]      ← hoofdbureau per rol, map in projectkleur op het bureau
 SDE · Aruba  DBA          ← naambordje: rol · project (kleurblokje)
 o o        o              ← krukjes voor subagents (max 2, dan +n)
 [bureau]                  ← collega-bureau (SDE 2), alleen als het nodig is
 SDE 2 · VAO
```
Vergaderzaal: 3 tafels naast elkaar; per tafel map + PM (of collega-PM); wacht het project op jou → vraag in een ballon.
Flexwerkplek: 2×2 bureaus per 80 px; naambordje = projectnaam + `claude`/`codex`.

**Flows**
1. Fasewissel/rolwissel: oude medewerker staat op → loopt met gekleurde map naar het nieuwe bureau → "Overdracht: <fase>" / "Ik pak het op!" → koffie.
2. Wacht op jou: medewerker blijft aan zijn bureau of tafel, hand omhoog, `!` knippert, ballon met de vraag, spotlight; CEO-bordregel rood.
3. Klik op CEO-bordregel of project in de zijbalk → 4 s highlight: alles behalve de map/medewerker van dat project gedimd. Klik elders / Esc → weg.
4. Klik op medewerker → zijbalk toont zijn nieuwste beslissing voor zijn huidige project.
5. Opgeleverd → banner "SHIPPED! <project>" + confetti, map verdwijnt.

**States:** leeg (geen agents: bedrijf met de lichten uit, tekst "Nog geen agents"), rustig (10 min → lounge), weg (60 min → lichten uit), overloop (+n), onbekende rol/afdeling (generiek, zone "Overig").

**Toegankelijkheid:** canvas heeft `aria-label`; alle informatie staat ook in de zijbalk (tekst). Highlight respecteert `prefers-reduced-motion` (geen puls, alleen dimmen). Klikdoelen ≥ 24 CSS px bij normale schaal (bordregels zijn klein → zijbalk is het toegankelijke alternatief).

**Usability-check:** in de verificatie met de demo: kun je binnen 2 s aanwijzen waar elk project ligt en wie wacht?
