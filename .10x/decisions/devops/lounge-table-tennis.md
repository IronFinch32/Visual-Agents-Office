# DevOps — lounge-table-tennis
Verdict **Ready to release**. Alleen `web/`-bestanden; de draaiende service op :4747 serveert ze direct van schijf (gecontroleerd: `/pingpong.js` 200, `company.js` bevat TT_TABLE). Geen herstart nodig; gebruikers herladen de pagina. Rollback: `git revert da9c6e2 cfdc8ff`. Niets gepusht.
