# Handoff — ux-polish

**Status:** opgeleverd (Phase 7; Phase 8 skipped — intern hulpmiddel). Code 3427ef6 + d64b633; ADR-019.
- Klik op een afdeling om in te zoomen; scrollen/knijpen/slepen; − + Heel bedrijf; Esc terug; `?` voor de legenda.
- Hover over een medewerker toont rol, project en taak; klik opent de beslissing (ook CFO/Legal/Sales/CS/PMM, met nette opmaak).
- Takenlijst zonder ingevoegde systeemtekst.
- Rollback: `git revert d64b633 3427ef6` + `launchctl kickstart -k gui/$UID/com.visualagentsoffice`. Niets gepusht.
- Restpunt (tech debt): gefocust bedrijf houdt zijn verhouding; op hoge schermen blijft verticale ruimte over.
