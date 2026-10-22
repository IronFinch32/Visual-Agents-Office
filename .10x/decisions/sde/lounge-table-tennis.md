# SDE — lounge-table-tennis
**Gebouwd (cfdc8ff):**
- `web/pingpong.js`: `createRally(rand)` — `serve`, `stop`, `playing`, `update(t)` (max één slag/punt per aanroep), `ball(t)` → {u,v,h}, `hitter`. Slag 0,6 s, pauze 1,2 s, 3–9 slagen.
- `test/pingpong.test.js`: 6 tests (afwisseling, stuit op ontvangershelft, misser voorbij tafel + winnaar serveert, solo zonder punten, tijdsprong, stop).
- `web/tenx-sprites.js`: `drawPingPongTable(ctx,x,y,folded)`, `drawPaddle`, `drawPingPongBall`, `TT_W`/`TT_H`.
- `web/company.js`: modus `pingpong`, `TT_TABLE` [78,98], `TT_SPOTS` [70,112]/[120,112], keuzekansen 25/25/25/rest, `playPingPong` (nieuwe serve bij spelerswissel), nav-blok, batjes als overlay met zwaai 0,15 s, balletje met schaduw.
**Afwijkingen van plan:** `drawPingPongTable` kreeg `folded` (0/1) in plaats van een solo-vlag, zodat een solospeler aan de rechterkant tegen de linkerhelft oefent. Loungeplekken onderin herschikt: [14,104] [36,104] [52,122] [148,112] [24,124].
**Tech debt:** geen. `tenx-room.js` (ongebruikt) niet aangepast.
