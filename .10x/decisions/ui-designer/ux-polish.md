# UI — ux-polish
**Tokens (style.css :root)** — toegevoegd: `--font-body` (system-ui stack), `--focus` (#ffd166), `--hover` (lichtere card), `--line` (#11131d).
- Pixelfont (`--font`) blijft voor topbalk-titel, kamerkoppen, chips, knoppen, kaartnamen, projectkoppen.
- `--font-body` voor `.task/.activity/.reason/.decision-*`, hover-label en legenda-tekst; 13–14px, regelhoogte 1.35.
**Componenten**
- Knop: default card-achtergrond; hover `--hover`; `:focus-visible` 2px `--focus` outline met offset; active 1px omlaag; `[hidden]` verbergt.
- Teller: `.count.zero` → kleur `--muted`, stip grijs.
- Zoomknoppen: kleine pixelknoppen in de kamerkop van het bedrijf (`−` `+` `Heel bedrijf`), 20px hoog.
- Hover-label: donkere kaart (`--panel`), 1px rand `--line`, schaduw, max 260px, regel 1 vet (rol), regel 2 projectkleur-blokje + project · feature, regel 3 status · taak (muted). Positie: 14px rechts-onder de cursor, binnen de viewport geklemd.
- Legenda: popover onder de topbalk rechts, 300px, secties "Status", "Bediening", "Sneltoetsen".
- Beslissing: koppen 14px pixelfont, lijsten met inspringing, `code` monospace op donkerder vlak, max-hoogte 50vh scroll.
**Contrast:** muted #9aa0c3 op #2c3048 ≈ 5.0:1 (AA). Focus-ring geel op donker ruim AA.
**Responsive:** < 760px: zoomknoppen blijven; label verborgen bij touch (geen hover), klik werkt zoals desktop.
