# SDE — ux-polish
**Gebouwd (3427ef6):**
- T1 `server/state.js` `cleanPrompt`: injected tag-blokken eruit (ook afgekapte `<x-y>` tot het eind), invoer begrensd op 20k tekens; toegepast op prompts en herstelde CEO-taken. Tests in `test/state.test.js`.
- T2 `web/camera.js` + `test/camera.test.js` (camera `{cx, cy, z}`, 1×–6×).
- T3 `web/company.js`: view uit camera, pointer (hover/klik/slepen/wiel/knijpen), `hitPerson` (±8 px) en `hitZone`, API `zoomTo/zoomBy/resetZoom/isZoomed`; canvas-klik stopt propagatie.
- T4 `web/building.js`: zoombalk (− + Heel bedrijf) in de bedrijfskop, `onWantFocus` focust bedrijf, Esc: camera → focus, sneltoetsen + − 0; unfocus reset de zoom.
- T5 `web/markdown.js` + `test/markdown.test.js`; `web/app.js`: hover-label, beslissing als DOM, rolnamen (plugin-titels + 5 go-to-market fallback), klikbare kaarten (ook toetsenbord), gedempte nultellers, legenda met focusbeheer.
- T6 `web/style.css` tokens `--font-body/--hover/--focus/--line`, knopstaten, label, legenda, beslissing, mobiel: tellers verborgen als ingezoomd.
**Afwijkingen:** camera als `{cx, cy, z}` i.p.v. rechthoek (eenvoudiger klemmen; zelfde gedrag). Hover-titel toont de volledige plugin-titel ("UX Designer") i.p.v. de korte label.
**Tech debt:** gefocust bedrijf behoudt de breedte/hoogte-verhouding, dus op hoge schermen blijft verticale ruimte over; CEO-verdieping en `?weergave=kamers` hebben geen camera (buiten scope).
**Tests:** 118/118 (servertests buiten de sandbox gedraaid i.v.m. poort-binding).
