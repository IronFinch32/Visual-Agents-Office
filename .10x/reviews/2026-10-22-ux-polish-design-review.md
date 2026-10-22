# Design review — ux-polish (2026-10-22)

**Flows (UX):** alle 5 goedgekeurde flows aanwezig en gevolgd. Esc-volgorde klopt. Misklik zoomt niet meer per ongeluk.
**Visueel (UI):** tokens `--font-body/--hover/--focus/--line` gebruikt; geen losse kleuren behalve de projectkleur-swatch in de legenda (voorbeeld). Pixelfont alleen voor koppen, chips, knoppen.
**Toegankelijkheid:** knoppen met `aria-label`; legenda `role=dialog` met focusbeheer; kaarten en projectkoppen bereikbaar met Tab en Enter/Spatie; focus-ring geel (contrast ruim AA); muted tekst ~5:1 op kaarten; label verborgen op touch.
**Responsive:** 1440×900 en 375×812 gecontroleerd; op mobiel verbergt het ingezoomde bedrijf de tellers voor ruimte.
**Afwijkingen / restpunten:** gefocust bedrijf houdt zijn verhouding, waardoor op hoge schermen verticale ruimte overblijft (tech debt, niet blokkerend).
**Verdict: Approved**
