# DevOps — ceo-floor

- **Uitrol**: lokaal via de LaunchAgent `com.visualagentsoffice` (ADR-004), die direct uit de repo draait. Herstart: `launchctl kickstart -k gui/$(id -u)/com.visualagentsoffice`. Gedaan op 2026-10-21; :4747 serveert `ceo-floor.js`.
- **CI**: geen CI; gate is `npm test` (70/70) lokaal.
- **Rollback**: `git revert 38024ab e7e2232` en de service herstarten. Zonder CEO-sessie is het gedrag al gelijk aan vóór de feature, dus terugdraaien is zelden nodig.
- **Dev-server**: `.claude/launch.json` heeft `office-dev` op :4848 om de demo te draaien zonder het live kantoor te storen.
