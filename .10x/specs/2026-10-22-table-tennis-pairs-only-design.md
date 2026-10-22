# Spec — table-tennis-pairs-only (2026-10-22)

Melding van de gebruiker: soms begint één speler alleen en lijkt die tegen een muur te spelen. Spelers mogen pas spelen als er twee zijn. Gebruiker koos **alleen als duo**.

## Gedrag
1. Tafeltennis wordt alleen gekozen als beide speelplekken vrij zijn én er een tweede vrij teamlid is (niet aan het werk, niet bij een overdracht, niet al in de lounge, niet weg). Ze krijgen samen de modus `pingpong`, elk een eigen kant en dezelfde eindtijd, en lopen samen naar de tafel.
2. De rally start pas als beide spelers aan de tafel staan. Zolang er minder dan twee staan: geen balletje.
3. Valt één speler weg (krijgt werk, overdracht, feest), dan stopt het potje en verlaat de ander de tafel ook.
4. De solomodus (oefenen tegen de opgeklapte helft) verdwijnt helemaal, ook uit `pingpong.js` en de tafeltekening.

## Testen
- Unit: `serve` kent geen solo meer; rally-tests blijven groen.
- Browser :4848: nooit één speler alleen aan de tafel met een balletje; spelers komen in paren.
