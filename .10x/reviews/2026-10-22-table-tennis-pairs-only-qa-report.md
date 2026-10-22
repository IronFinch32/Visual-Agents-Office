# QA-rapport — table-tennis-pairs-only (2026-10-22)

**Verdict: Pass**

| Check | Resultaat |
|---|---|
| `node --test test/*.test.js` | 126/126 (solo-test verwijderd; serverproeven buiten de sandbox) |
| Simulatie 10 min (18.000 frames, :4848, frames handmatig aangestuurd) | aantal spelers in tafeltennis altijd 0 of 2, nooit 1 |
| Eén speler aan tafel terwijl partner nog loopt | 80 metingen, 0 keer een batje of balletje |
| Twee spelers aan tafel | batjes in 327/329 metingen |
| Console-fouten | geen |

Opmerking: het Browser-paneel was verborgen, waardoor de browser animatieframes pauzeerde; daarom de frames zelf aangestuurd in plaats van live kijken. Ook de vorige versie stond in die toestand stil, dus geen regressie.
