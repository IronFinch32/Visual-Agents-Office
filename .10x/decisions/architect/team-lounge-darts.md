# Architect — team-lounge-darts (ADR-010)
- Server: `prune` krijgt een CEO-uitzondering (`CEO_STALE_MS = 12 u`). Geen API-wijziging.
- Client: alleen `tenx-room.js` (gedrag + tekenen) en `tenx-sprites.js` (dartbord, pijltje). Nieuwe ledenmodus `darts`; nieuwe stilte-fase: `quiet` (10 min) → lounge-rotatie, `home` (60 min of shippedHome) → weg.
- Darts-state in de kamer: `darts = { players:[id], turn, nextThrow, stuck:[{x,y,until,color}], flying }`; puur cosmetisch, random.
- Faalmodi: geen. Bij ontbrekende lounge-plekken valt een bezoeker terug op koffie/bureau.
