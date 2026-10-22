# ADR-019: Camera-zoom in het bedrijfscanvas

**Status:** Accepted
**Date:** 2026-10-22
**Feature:** ux-polish
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Het bedrijf (ADR-016) wordt als één canvas getekend met `view = {scale, ox, oy}` zodat het hele bedrijf past. Op normale schermen is de schaal ~1,5–2×, waardoor 5px-tekst en personen te klein zijn. Gebouwfocus (FLIP) helpt nauwelijks omdat de breedte al de beperking is. Klikken op het canvas schakelt de gebouwfocus om, ook bij een misklik naast een medewerker.

## Decision
- Nieuwe pure module `web/camera.js`: `fullCam`, `viewFor(cam, cw, ch)`, `zoomAt`, `clampCam`, `focusRect`, `stepCam`. Camera = rechthoek in logische px die in het canvas past; grenzen 1×–6×.
- `company.js` rekent `view` uit de (geanimeerde) camera i.p.v. altijd het hele bedrijf; hit-tests gebruiken dezelfde `view`. Nieuwe API: `zoomTo(zoneId|null)`, `zoomBy(f)`, `resetZoom()`, `isZoomed()`, `onChange`.
- Pointer-events op het bedrijfscanvas: wiel/knijp/slepen/klik/hover. Het canvas stopt click-propagatie zodat de kamer-sectie de focus niet omschakelt; `building.js` focust het bedrijf zelf wanneer de camera inzoomt.
- Hover-info gaat via een callback naar een HTML-label (`app.js`), niet getekend in het canvas: leesbaar font en geen extra canvaswerk.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| CSS-transform/scroll op het canvas | Geen tekencode | Wazige pixels of enorm canvas; scrollen onhandig | Slechter resultaat |
| Apart detailscherm per afdeling | Volledige controle | Veel dubbele tekencode | YAGNI |
| Pan/zoom-bibliotheek | Kant-en-klaar | Dependency in een dependency-vrij project | Overkill voor ~60 regels |

## Consequences
### Positive
- Scherpe pixels op elk zoomniveau; tekst en ballonnen leesbaar.
- Misklikken zoomen niet meer per ongeluk.
### Negative
- Iets meer state in `company.js`; de CEO-verdieping en de legacy kamers krijgen geen camera.
### Risks
- Hit-test en tekenen moeten dezelfde transform gebruiken → één `view` per frame, gedeeld.
- Wiel op het canvas kaapt scrollen in het gebouw → gebouw scrollt zelden; acceptabel.

## Dependencies
- ADR-016 (één bedrijf), ADR-003 (gelaagde renderer).
