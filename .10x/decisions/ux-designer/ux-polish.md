# UX — ux-polish
**Gebruiker:** de CEO, desktop (soms telefoon), kijkt mee terwijl agents werken.
**Kerntaak:** "wie doet wat, en wacht er iemand op mij?" in één oogopslag, en details op aanvraag.
**Flows**
1. Overzicht → klik afdeling → (gebouw focust bedrijf) camera zoomt → hover persoon → label → klik → beslissing in paneel.
2. Ingezoomd → klik dezelfde afdeling / `Heel bedrijf` / `0` / Esc → heel bedrijf → Esc / `← Gebouw` → overzicht met CEO-verdieping.
3. Wiel/knijp rond cursor; slepen schuift; na slepen geen klik.
4. Lijst: klik kaart of projectkop → project licht op in het kantoor.
5. `?` → legenda; sluit met ✕/Esc/klik ernaast. Esc sluit eerst de legenda, dan de zoom, dan de focus.
**States:** leeg bedrijf (bestaande "dicht"-tekst blijft); offline-balk; beslissing zonder bestand ("Nog geen beslissing van deze rol.").
**Toegankelijkheid:** knoppen echte `<button>` met labels; `?`-popover `role="dialog"` met focus op ✕ bij openen en terug naar `?` bij sluiten; zoomknoppen met `aria-label`; sneltoetsen niet in invoervelden; reduced motion → geen camera-animatie.
**Usability-check:** kan je zonder uitleg een beslissing van de UI Designer openen? (QA-walkthrough)
