# Senior — team-lounge-darts
- T1: in `prune`, `stale` = `now - updatedAt > (a.kind==='session' && a.ceo ? CEO_STALE_MS : STALE_MS)`.
- T3: splits `quiet` in `lull` (10 min, lounge) en `away` (60 min of shippedHome). `quietNow` (lichten uit/onderschrift) alleen bij away; lull eigen onderschrift.
- T4: darts-spots vast in lounge-zone; lid met mode 'darts' bezet een speler-plek; worp elke ~1.6 s; pijl vliegt 0.25 s als lijn-particle.
- Let op: lounge-zone is 80 of 160 breed (floor) — dartbord-positie relatief aan zone, nav-block voor standaard.
