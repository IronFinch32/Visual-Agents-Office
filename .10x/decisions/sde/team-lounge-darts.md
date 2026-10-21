# SDE — team-lounge-darts (commit e825729)
- `server/state.js`: `CEO_STALE_MS` (12 u); `prune` gebruikt die voor `kind==='session' && ceo`.
- `web/sprites.js`: pose `throw` + optie `throwing` in `drawPerson`.
- `web/tenx-sprites.js`: `drawDartboard`, `drawDart`.
- `web/tenx-room.js`: `AWAY_MS` (60 min) naast `QUIET_MS` (10 min) → `lull` (lounge-rotatie, cap 5, rate 1/8 s, geen vergadermodus, onderschrift) en `quiet` (naar huis). Koffie vaker (1/40 s, 1/15 s als afdeling klaar, cap 3, 12–25 s). Modus `darts` met 2 werpplekken, `playDarts()` (beurten, vliegend pijltje, max 3 in het bord, 35% ballon). Loungeplekken verschoven rond het bord; nav-block voor de standaard. `debug()` toont darts-teller.
- Afwijking van plan: tijdens `lull` wordt de fase-0-vergadering opgeschort (anders bleef de helft in de vergaderzaal).
- Tech debt: geen.
