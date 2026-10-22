# QA-rapport — ux-polish (2026-10-22)

**Build:** 3427ef6 + d64b633 · **Tests:** `npm test` 118/118 (servertests buiten de sandbox)

| Check | Hoe | Resultaat |
|---|---|---|
| Klik op afdeling zoomt in, gebouw focust | browser 1440×900, klik Design | Pass |
| Wiel zoomt in vanuit overzicht en focust bedrijf | WheelEvent | Pass |
| Slepen schuift camera, klik na slepen genegeerd | PointerEvents, `debug().cam` 328→168 | Pass |
| `+` / `0` sneltoetsen | KeyboardEvent | Pass |
| Esc-volgorde: legenda → zoom → focus | 3× Esc | Pass |
| Hover-label persoon/afdeling | hover UX | Pass |
| Klik medewerker → beslissing, geen zoom | klik CFO: "Beslissing · CFO" | Pass |
| Beslissing met markdown (kop, lijst, code) | SDE-beslissing | Pass |
| Nultellers gedempt | DOM `count zero` | Pass |
| Legenda open/sluit, focus naar ✕ en terug naar ? | klik + Esc | Pass |
| Toetsenbordfocus zichtbaar (gele ring) | Tab | Pass |
| Focus blijft op kaart na snapshot | 6 s wachten | Pass (na fix d64b633) |
| Mobiel 375×812: tik afdeling zoomt, titel niet afgekapt | emulatie | Pass |
| Schone taak na prompt met `<system-reminder>` | unit-test | Pass |
| Schone CEO-taak na herstart van de service | live na herstart | zie Delivery |
| Knijpen op echt touch-scherm | — | Not run (geen touch-apparaat; logica gedeeld met wiel-zoom) |
| `prefers-reduced-motion` | — | Not run in browser; codepad springt direct naar het doel |
| Console-fouten | read_console_messages | Pass (alleen ERR_NETWORK_IO_SUSPENDED van het gepauzeerde paneel, niet van deze code) |

**Gevonden en opgelost:** focus verdween uit de lijst bij elke snapshot (d64b633); bedrijfstitel afgekapt op mobiel bij ingezoomd (tellers verborgen).
**Verdict: Pass**
