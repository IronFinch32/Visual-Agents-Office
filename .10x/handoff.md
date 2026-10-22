# Handoff — shipped-active-feature

**Status:** opgeleverd (Phase 7; Phase 8 skipped — route change). Code e7726aa; ADR-020.
- Het kantoor leest nu de `# Status — <feature>`-sectie die `active.json` noemt, waar die ook in `status.md` staat; Aruba toont daardoor niet meer SHIPPED tijdens Verification/Delivery.
- Rollback: `git revert e7726aa` + `launchctl kickstart -k gui/$UID/com.visualagentsoffice`. Niets gepusht.
- Opmerking voor Aruba (niet aangepast): daar staat de lopende sectie middenin `status.md`, tegen het plugin-contract in; het kantoor kan er nu tegen.
