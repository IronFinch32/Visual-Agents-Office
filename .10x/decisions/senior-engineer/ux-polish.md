# Senior Engineer — ux-polish
- T1: regex `/<([a-zA-Z][\w-]*)[^>]*>[\s\S]*?<\/\1>/g` herhaald tot stabiel, dan `/<\/?[a-zA-Z][\w-]*[^>]*>/g`, dan `truncate`. Pas toe in `UserPromptSubmit` en `restoreCeo` (str voor task).
- T2: cam `{x,y,w,h}` met vaste aspect van het canvas? Nee: cam beschrijft het gewenste gebied; `viewFor` past het in het canvas (letterbox) en centreert. Klemmen: w ∈ [W/6, W], h idem; centrum binnen [0,W]×[0,H]. `stepCam(cur, target, dt)` = exponentiële lerp (k=10/s), snap bij < 0.3px.
- T3: `frame` gebruikt `viewFor(cam, cw, ch)`. Bij zoom ingezoomd wordt de camera-aspect aangepast aan canvas-aspect zodat wiel/drag voorspelbaar zijn: `zoomAt` werkt op de *zichtbare* rechthoek (afgeleid uit view). Pointer: `pointerdown` bewaart start; `pointermove` > 4px → drag (pan in logische px = d/scale); 2 pointers → pinch. `click` na drag genegeerd.
- T4: bedrijfskop krijgt `.zoombar` met drie knoppen; `onZoomChange` toggelt `Heel bedrijf`. Esc-handler: legenda open? → app sluit (app luistert eerst en `stopImmediatePropagation`); camera ingezoomd → reset; anders focus(null).
- T5: label = absolute `div#hover` in body, `pointer-events:none`. Legenda = `div#help[role=dialog]`.
- T6: tokens; `@media (hover:none)` verbergt label.
