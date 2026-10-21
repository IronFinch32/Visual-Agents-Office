# SDE — lounge-pool (commit 259b02f)
- `web/pool.js`: 7 ballen, wrijving (exp.), bandbots, elastische botsing, 6 pockets, respot witte bal, dt-cap 0.1 s + substappen 1/120 s.
- `web/tenx-sprites.js`: `drawPoolTable`, `drawCue`, `POOL_W/H`. `web/sprites.js`: pose `cue`.
- `web/tenx-room.js`: tafel op lounge (90,56), nav-blok, modus `pool` (35% darts / 35% pool / rest koffie), `playPool`: schutter loopt achter de witte bal op de stootlijn (`poolStance`), mikt 1,1 s met terugzwaai, stoot 55–90 px/s, blijft staan tot alles stilligt; wachtende speler staat met keu rechtop. Rack na laatste bal of 14 stoten. Kreten bij pocket/scratch. Debug-veld `pool`.
- README lounge-regel bijgewerkt.
- Afwijking van spec: schutter loopt naar de witte bal i.p.v. vast aan een korte kant te staan — oogt echter; wachtplekken blijven aan de korte kanten.
- Tech debt: geen.
