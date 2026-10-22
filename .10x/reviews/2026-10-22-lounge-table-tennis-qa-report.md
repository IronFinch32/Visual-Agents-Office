# QA-rapport — lounge-table-tennis (2026-10-22)

**Verdict: Pass**

| Check | Resultaat |
|---|---|
| `node --test test/*.test.js` | 127/127 (6 nieuw in `pingpong.test.js`; serverproeven buiten de sandbox gedraaid) |
| Rally: afwisseling, 3–9 slagen, punt voor laatste slagman | Pass (50 seeds) |
| Stuit op ontvangershelft, bal boven tafel | Pass (30 seeds) |
| Misser voorbij tafel, winnaar serveert na pauze | Pass |
| Solo: zelfde kant, geen punten, eindigt met `miss` | Pass |
| Tijdsprong (achtergrondtab) → één stap, geen lus | Pass |
| Browser :4848: tafel rechtsonder, overlapt niets | Pass (gezien) |
| Browser: solo met opgeklapte rechterhelft | Pass (gezien) |
| Browser: duo, batjes in de hand, balletje beweegt | Pass (gezien) |
| Console-fouten | geen |
| Ballon bij punt in de browser | Not run (toevalskans; logica gedekt door unit-tests op events) |

**Bug gevonden en opgelost:** `poolStance` kon tot y 104 klemmen, in het nav-blok van de nieuwe tafel → de pool-speler kon op de tafeltennistafel gaan staan. Fix da9c6e2: klem op `TT_TABLE[1] − 2`.
