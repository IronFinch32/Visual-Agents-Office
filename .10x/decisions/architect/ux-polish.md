# Architect — ux-polish (ADR-019)
**Componenten**
- `web/camera.js` (puur, getest): camera-wiskunde.
- `web/company.js`: camera-state (`cam`, `target`), pointer-handlers, `hitPerson`, `hitZone`, API `zoomTo/zoomBy/resetZoom/isZoomed`, opties `onHover(info, x, y)`, `onZoomChange(zoomed)`, `onWantFocus()`.
- `web/building.js`: zoomknoppen in de bedrijfskop; Esc-volgorde (camera → focus); `← Gebouw` reset camera; canvas-klik schakelt focus niet.
- `web/markdown.js` (puur, getest): `parseMarkdown(text)` → blokken `{type:'h'|'li'|'p'|'code', level, spans:[{t,bold,code}]}`; `app.js` bouwt DOM.
- `web/app.js`: hover-label, legenda, rolnamen uit `departments`, kaart-klik → highlight, gedempte tellers.
- `server/state.js`: `cleanPrompt` vóór `truncate` voor prompts en herstelde CEO-taken.
**Data:** geen nieuwe API's; `departments` in snapshot levert rolnamen.
**Faalwijzen:** canvas 0×0 → camera niet aanpassen; layoutwissel (nieuwe afdeling) → camera klemmen op nieuwe grootte; fout in één kamer blijft geïsoleerd (bestaande try/catch).
