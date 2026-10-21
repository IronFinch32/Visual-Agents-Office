# UX — ceo-floor

Flows komen uit de goedgekeurde spec (2026-10-21); hier uitgewerkt tot layout en states.

## Gebruiker en taak
De gebruiker (CEO) kijkt naast zijn CEO-chat naar het kantoor. Kerntaak: "welke werksessie heeft mij nodig, en hoe ver is de rest?" — binnen 2 seconden af te lezen.

## Informatie-architectuur
```
┌──────────────── CEO-verdieping (volle breedte, bovenaan) ────────────────┐
│ [bureau + CEO + postbakje]   [BORD: project · feature — Phase N naam]  ▼trap │
└──────────────────────────────────────────────────────────────────────────┘
┌ teamkamer sessie A ┐ ┌ teamkamer sessie B ┐ ┌ gewoon project ┐ …
```
- Verdieping alleen als er nu een CEO-sessie is. Hij krijgt geen gewone kamer.
- Teamkamer per werksessie, titel `project · feature`.

## Flows
1. **Nieuwe werksessie**: CEO pakt een map, loopt naar de trap (rechtsonder), zet hem neer, loopt terug (± 3 s); de nieuwe kamer verschijnt eronder (bestaande fade-in).
2. **Werksessie wacht**: het teamlid loopt naar de deur van de eigen kamer (rij bij de deur, rechtsboven), de kamer knippert rood zoals nu; postbakje boven telt +1 met rode `!`.
3. **Bord-klik**: regel → `focus(kamer)`; Esc / terug-knop zoals nu. Klik elders op de verdieping focust de verdieping (zoals elke kamer).
4. **Oplevering**: SHIPPED-feest (16 s), daarna lichten uit, team naar huis, tekst "Opgeleverd · iedereen is naar huis". Kamer blijft tot SessionEnd/stale.

## States
- Bord leeg: "Nog geen werksessies". Meer dan 5 regels: eerste 5 + "+N".
- CEO werkt: ballon met activiteit; denkt na: denkwolk; wacht op jou: rode ballon met de vraag; klaar: ✓.
- CEO-sessie weg (SessionEnd): verdieping weg; teamkamers blijven per sessie (CEO heeft bestaan) maar krijgen hun directiekamer terug, want die verdwijnt alleen zolang er een verdieping is.

## Toegankelijkheid
Canvas is decoratief; het zijpaneel blijft de tekstuele bron. Verdieping-canvas krijgt `aria-label` "CEO-verdieping". Bordregels zijn ook als title/tooltip-tekst in het paneel terug te vinden (projectkoppen). Reduced motion: de bestaande FLIP-animatie respecteert dit al.
