# EM — ceo-floor

| # | Task | Est. | Depends |
|---|---|---|---|
| T1 | Server: CEO-herkenning + valkuilen in tenx.js + unit tests | 1u | — |
| T2 | Server: `assignRooms` + `room` in snapshot + tests | 1u | T1 |
| T3 | Client: building groepeert op room, verdieping-rij, titels, projectKey per kamer | 1.5u | T2 |
| T4 | Client: `web/ceo-floor.js` (CEO, bord, postbakje, overdracht, klik) | 2u | T3 |
| T5 | Client: tenx-room `setFloor` (geen directie, wachtrij bij deur, na oplevering naar huis) | 1u | T3 |
| T6 | Demo `VAO_DEMO_10X=ceo` + visuele controle | 1u | T4, T5 |

Risico's: layout van de volle-breedte-rij in `building.layout()`; overdracht moet kort blijven.
