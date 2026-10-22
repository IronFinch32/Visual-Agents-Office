# Spec — lounge-table-tennis (2026-10-22)

Aanvraag via de CEO-sessie: "in de lounge mag naast pool en darts ook een tafeltennis als activiteit worden toegevoegd". Gebruiker koos de aanpak **rally met missers**.

## Doel
De lounge van het bedrijf (`web/company.js`, ADR-016) krijgt een derde spel naast darten en pool: een tafeltennistafel waar teamleden die niets te doen hebben een balletje slaan.

## Gedrag
1. **Plek**: een groene tafel (36×18 px, wit middenlijntje, net in het midden) rechtsonder in de lounge, in de lege hoek onder de pooltafel. De twee loungeplekken die daar lagen schuiven op zodat niemand op de tafel staat. De tafel is een nav-blok.
2. **Spelers**: twee vaste speelplekken aan de korte kanten (links en rechts van de tafel). Een loungebezoeker kiest een activiteit uit wat vrij is: darten ~25%, pool ~25%, tafeltennis ~25%, koffie de rest. Spelduur per bezoek blijft zoals bij de andere spellen.
3. **Rally met twee spelers**: de serveerder slaat, het balletje vliegt in een boogje naar de andere kant, stuit één keer op de helft van de tegenstander en komt bij het batje aan (~0,6 s per slag). Na 3–9 slagen mist iemand: het balletje vliegt voorbij de tafel en valt. Dan ~1,2 s pauze en serveert de winnaar van het punt. Bij een punt soms een ballon: "Punt!", "Net!", "Smash!", "Uit…", "Nog een potje?".
4. **Eén speler**: de andere tafelhelft staat opgeklapt; het balletje kaatst ertegen en komt terug (oefenen). Geen punten, af en toe een misser.
5. **Batje**: een klein rood batje in de hand van elke speler aan tafel; bij de slag zwaait het kort naar voren.
6. **Geen spelers**: geen balletje, tafel staat er als decor.

## Opbouw
- Nieuw puur module `web/pingpong.js` (geen canvas): `createRally(rand)` met `serve(t, side, solo)`, `update(t)` → events (`hit`, `point`) en `ball(t)` → positie langs de tafel (`u`), dwars (`v`) en hoogte (`h`). Unit-testbaar zoals `pool.js`.
- `company.js`: modus `pingpong`, speelplekken, `playPingPong`, tekenen van tafel, batjes en balletje.
- `tenx-sprites.js`: `drawPingPongTable`, `drawPaddle`, `drawPingPongBall`.
- De oude `tenx-room.js` (niet meer in gebruik sinds ADR-016) blijft ongemoeid.

## Buiten scope
- Puntentelling op het scherm, toeschouwers, fysica zoals bij pool.

## Testen
- Unit (`test/pingpong.test.js`): na een serve wisselen de slagen van kant; een rally eindigt binnen 9 slagen met een `point`; tijdens een normale vlucht blijft het balletje boven de tafel (0 ≤ u ≤ 1) en stuit het op de helft van de ontvanger; solo komt het balletje terug bij dezelfde kant zonder `point` per slag.
- Visueel op dev-poort 4848: tafel past in de lounge, spelers staan aan de korte kanten, niemand loopt door de tafel, rally en ballonnen zichtbaar.
