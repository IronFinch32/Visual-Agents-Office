# Architect — lounge-pool (ADR-014)
- `web/pool.js` puur: state `{ balls:[{id,x,y,vx,vy,color,in}], W, H, pockets }`, events `pocket`/`scratch`. Coördinaten relatief aan het laken.
- `tenx-room.js`: `POOL_TABLE=[90,58]`, `POOL_SPOTS` links/rechts, `pool = { game, turn, next, shots }`; modus `pool` naast `darts` in de lounge-keuze; `playPool(players,t)`.
- Faalmodi: tab in achtergrond → grote dt → gecapt. Geen spelers → ballen liggen stil.
- Geen server/API-wijziging.
