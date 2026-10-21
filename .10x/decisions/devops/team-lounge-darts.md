# DevOps — team-lounge-darts
- Uitrol: LaunchAgent draait direct uit de repo; nieuwe code is live na `launchctl kickstart -k gui/$(id -u)/com.visualagentsoffice`.
- Niet automatisch herstart: een herstart wist het in-memory CEO-kenmerk, dus de lopende CEO-sessie verliest haar verdieping tot ze de CEO-skill opnieuw gebruikt. Herstart wanneer het uitkomt (bv. bij een nieuwe CEO-sessie).
- Rollback: `git revert e825729` + kickstart.
