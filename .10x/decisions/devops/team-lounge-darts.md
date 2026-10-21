# DevOps — team-lounge-darts
- Uitrol: LaunchAgent draait direct uit de repo; nieuwe code is live na `launchctl kickstart -k gui/$(id -u)/com.visualagentsoffice`.
- Herstart gedaan op 2026-10-21 op verzoek van de gebruiker (CEO-verdieping verschijnt weer bij het volgende CEO-skillgebruik).
- Rollback: `git revert e825729` + kickstart.
