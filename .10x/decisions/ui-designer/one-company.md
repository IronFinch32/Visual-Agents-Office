# UI — one-company
**Richting:** bestaande pixel-art stijl, bestaande sprites/tokens (`C`, `FONT`, `DEPTS.rug`, rol-outfits) hergebruiken. Nieuw is alleen de **projectkleur**.

**Projectkleuren (token `PROJECT_COLORS`)**, toegewezen op volgorde van verschijnen, stabiel zolang de server draait (per projectKey):
`#4ea3ff` blauw · `#f1c40f` geel · `#3ddc84` groen · `#e87fb0` roze · `#ff8c42` oranje · `#a78bfa` paars · `#2dd4bf` turquoise · `#ff5c7a` rood-roze. Na 8 weer van voren.
Contrast: alle 8 ≥ 4.5:1 tegen de donkere naambordjes (`#1b1d2b`-ish) — als blokje/map, nooit als enige drager: de projectnaam staat er altijd bij.

**Componenten**
- *Map*: `drawFolder(ctx, x, y, color)` — 7×5 px in projectkleur, lichte rand; QA/SEC-stempel klein op de map in Kwaliteit.
- *Naambordje*: `drawNameplate` met label `ROL · project` (project max 8 tekens), 3×3 kleurblokje links. Collega: `SDE 2 · project`.
- *Stapel*: `+n` in wit 5 px boven het hoofdbureau.
- *Vergadertafel*: kleine tafel 40×10 met 2 stoelen; map in het midden.
- *Zone "Flexwerkplek"*: rug `#4f5a6e`; "Overig": rug `#5a5a5a`.
- *Highlight*: rest gedimd met `rgba(10,10,30,.45)`, gekozen bureau/tafel met 1 px rand in projectkleur.
- *Gate*: bestaande `drawBeacon` naast het bureau; CEO-bordregel in `C.waiting`.
- *CEO-bord*: per regel een kleurblokje 3×3 voor het label.

**Afmetingen (logisch, schaal past zich aan):** zone 80×118, muur 30 hoog (alleen bordjes per zone), bedrijf ≈ 496×274 bij 10x+ (6 kolommen).
**Responsief:** `building.js` schaalt het canvas als geheel; bij smalle vensters wordt alles kleiner (zoals nu). Klik op het bedrijf = inzoomen, Esc terug.
