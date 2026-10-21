# EM — one-company

## Taken
- T1 `server/departments.js` laden + saneren, `departments` in de snapshot (cache 60 s) + tests — 1 u
- T2 `web/company-model.js`: layout, cases, staffing, kleuren + tests — 2 u
- T3 `web/company.js`: zones, bureaus, medewerkers, mappen, krukjes, collega's, flex, vergadertafels — 3 u
- T4 `web/company.js`: gedrag — overdracht, wachten, lounge (koffie/darts/pool), rustig/weg, feest, highlight, klik — 2 u
- T5 `building.js` + `ceo-floor.js` + `app.js`: company-modus, bordkleur, highlight, `?weergave=kamers` — 1 u
- T6 demo (meerdere sessies, 2 in dezelfde rol), README, `npm test`, browsercheck — 1 u

## Volgorde
T1 → T2 → T3 → T4 → T5 → T6 (T1 en T2 onafhankelijk).

## Risico's
- Ruimte in een zone (bureau + krukjes + collega-bureau) → visueel tunen in T3.
- Lounge-gedrag kopiëren zonder regressie in legacy → legacy niet aanraken.
