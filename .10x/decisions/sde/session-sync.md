# SDE — session-sync
- Kantoor (commit f288581): `server/tenx.js` eigenaar per project (`owner`, `claim`), `views` (vers bij SessionStart startup/clear, bevroren bij overname), `liveView`, `ownerRole` (active.json alleen voor eigenaar, nieuwer exact signaal wint), `isTenxWrite` (lezen claimt niet en beëindigt newRun niet), active.json-tijd = mtime, views/rollen blijven bij app-stop en verdwijnen bij /clear, logout of na 24 u. `web/building.js` voegt `tenx[pk].sessions[sid]` samen voor sessiekamers. Tests: 6 nieuwe scenario's in test/tenx.test.js; 86/86.
- Afwijking: SessionEnd wist rollen alleen nog bij clear/logout (anders verloor een door de app stilgezette sessie haar bevroren stand).
- Plugin 10x-Team-Plus (niet gecommit tot akkoord van de gebruiker voor die repo): `hooks/hooks.json`, `hooks/tenx-reminder.js`, `tests/tenx-reminder.test.js` (4/4), README, versie 0.4.0-plus.7.
- Tech debt: geen Codex-variant van de hook.
