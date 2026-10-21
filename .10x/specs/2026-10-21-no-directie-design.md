# no-directie — Directiekamer weg uit de teamkamers

**Datum:** 2026-10-21 · **Feature:** no-directie · **Goedgekeurd:** gebruiker koos "Altijd weg, CEO op bezoek"

## Probleem
De CEO zit sinds ADR-009/011 op een eigen verdieping boven alle kamers. Toch heeft elke 10x-teamkamer nog een zone "Directie" (zone `ceo` in `web/tenx-room.js`) met bureau, postbakje en het CEO-poppetje. Die verdwijnt nu alleen zolang er een CEO-verdieping is (`setFloor(true)`). De gebruiker wil haar altijd weg hebben.

## Ontwerp
- **Lay-out:** de zone `ceo` verdwijnt uit beide 10x-lay-outs (classic en plus). De lounge neemt haar plek in en is altijd twee zones breed (`lounge: [3, 1, 2]`). Dit is wat nu al gebeurt onder een CEO-verdieping.
- **Wachtenden:** teamleden die op de gebruiker wachten, staan altijd in een rij bij de deur van de kamer; de statustekst is altijd "bij de deur".
- **CEO op bezoek:** het CEO-poppetje blijft bestaan, maar staat standaard buiten (verborgen bij de deur). Bij een stand-up (nieuwe prompt in die sessie) komt de CEO via de deur binnen, staat aan het hoofd van de vergadertafel met de opdracht in een ballon, en gaat daarna weer weg. Bij het opleveringsfeest komt de CEO mee in de lounge en vertrekt daarna. Dit geldt met én zonder CEO-verdieping.
- **Blijft zoals het is:** `setFloor` bepaalt nog steeds alleen of een opgeleverd team na het feest naar huis gaat (`shippedHome`). De CEO-verdieping (`ceo-floor.js`, label "DIRECTIE") blijft ongewijzigd. Gewone (niet-10x) kamers hadden geen directie en veranderen niet.
- **README:** de alinea "Directiekamer: jij bent de CEO" wordt herschreven naar het bezoek-gedrag.

## Randgevallen
- Stand-up terwijl de CEO nog wegloopt van een vorige: hij draait om en loopt terug naar de tafel.
- Team "away" (stil > 1 uur): de CEO blijft weg.
- Kamer opnieuw aangemaakt / flavor wisselt: CEO start verborgen bij de deur, niet op een bureau.

## Testen
- Bestaande `npm test` blijft groen (geen serverwijziging).
- Browsercheck op de draaiende service: geen Directie-zone, brede lounge, CEO-bezoek bij een stand-up, wachtrij bij de deur, geen consolefouten.
