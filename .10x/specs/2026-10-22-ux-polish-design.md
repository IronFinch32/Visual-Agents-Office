# Spec — ux-polish: mooier, beter en gebruiksvriendelijker kantoor

**Datum:** 2026-10-22 · **Feature:** `ux-polish` · **Status:** goedgekeurd door de gebruiker ("Plus echt inzoomen", "Akkoord, bouwen")

## Aanleiding (audit 2026-10-22, desktop 1440×900 en mobiel 375×812)
1. Pixeltekst in het kantoor (5px) is op normale schaal bijna onleesbaar.
2. Niemand ziet dat medewerkers klikbaar zijn; het klikvlak is klein en een misklik zoomt in of uit.
3. Inzoomen op 'Bedrijf' wordt nauwelijks groter (de breedte is al de beperking).
4. Ruwe prompttekst (`<system-reminder>…`) verschijnt als taak in de lijst.
5. Beslissingen van go-to-market-rollen tonen een kale rolnaam (`cfo`); markdown staat er ruw in kleine monospace.
6. "0 wacht op jou" staat altijd in alarmrood.
7. Knoppen hebben geen hover-, focus- of actieve staat; lange tekst in het pixelfont leest zwaar.
8. Geen uitleg van kleuren, afdelingen, klikken en zoomen.

## Ontwerp
### Inzoomen (camera in het bedrijfscanvas)
- Een **camera** (`{x, y, w, h}` in logische pixels) bepaalt welk deel van het bedrijf het canvas vult; standaard het hele bedrijf. Pixels blijven scherp (geen CSS-schaal).
- **Klik op een afdeling** → het gebouw focust op het bedrijf (CEO-verdieping verdwijnt) en de camera beweegt soepel naar die afdeling. Nog een klik op dezelfde afdeling → terug naar het hele bedrijf.
- **Scrollwiel / knijpen** zoomt rond de cursor; **slepen** schuift. Inzoomen vanuit het overzicht focust ook het bedrijf.
- **Knoppen** in de kop van het bedrijf: `−`, `+`, `Heel bedrijf` (alleen zichtbaar als ingezoomd).
- **Esc**: eerst camera terug naar heel bedrijf, dan pas terug naar het gebouw. `← Gebouw` doet beide.
- Grenzen: zoom 1×–6× t.o.v. heel bedrijf; de camera blijft binnen het bedrijf. `prefers-reduced-motion` → direct springen, geen animatie.
- Een klik op het bedrijfscanvas schakelt de gebouwfocus nooit meer per ongeluk om; de kop van de kamer doet dat nog wel.

### Medewerkers
- Hover: handcursor en een **label** naast de cursor: rol, project · feature, status en taak (leesbaar font). Boven een afdeling: vergrootglas-cursor en de afdelingsnaam.
- Groter klikvlak (dichtstbijzijnde persoon binnen ±8 bij −6…+6 logische px rond het lijf).
- Klik op een medewerker → laatste beslissing in het paneel (zoals nu), zonder zoomwissel.
- Na slepen (> 4 css-px beweging) telt de klik niet.

### Lijst en beslissing
- Server haalt ruwe tags uit prompts: blokken `<tag>…</tag>` en losse `<tag>` verdwijnen, witruimte samengevouwen. Ook bij het terugzetten van bewaarde CEO-taken.
- Klik op een agentkaart licht zijn project op in het kantoor (zoals de projectkop).
- Beslissing: volledige rolnaam uit de afdelingen (fallback: ingebouwde lijst incl. CFO, Legal Counsel, Sales Lead, Customer Success Manager, Product Marketing Manager); markdown (koppen, lijsten, **vet**, `code`) als nette DOM-elementen, nooit `innerHTML`.

### Look
- Pixelfont alleen voor koppen, chips en knoppen; taak-, activiteit-, reden-, beslis- en labeltekst in een leesbaar systeemfont.
- Tellers met 0 zijn gedempt (grijs), niet rood.
- Knoppen: hover, `:focus-visible`-ring, active-indruk, disabled; consistent formaat.
- **`?`-knop** in de topbalk opent een legenda (statuskleuren, projectkleur, klik/zoom/sleep, sneltoetsen Esc, `+`/`-`/`0`). Sluit met ✕, Esc of klik ernaast.
- Sneltoetsen: `+`/`=` inzoomen, `-` uitzoomen, `0` heel bedrijf (niet als je in een invoerveld zit).

## Buiten scope
- Nieuwe look van de pixel-sprites; de legacy kamerweergave (`?weergave=kamers`) en de CEO-verdieping krijgen geen camera.
- Geen nieuwe serverendpoints.

## Testen
- Unit: camera-wiskunde (`web/camera.js`), markdown-blokken (`web/markdown.js`), tag-filter in `server/state.js`.
- Browser: desktop en mobiel; zoom via klik/wiel/knoppen/Esc; hover-label; beslissing van CFO; legenda; reduced motion; geen console-fouten.
