# DevOps — one-company
- **Ready to release.** Commits 032c3a2 (server + model), 7237500 (company view), 5f19dac (fix). Geen build-stap, geen nieuwe dependencies.
- Uitrol: service herstart 2026-10-21 (`launchctl kickstart -k gui/$UID/com.visualagentsoffice`), :4747 → 200, snapshot bevat `departments` (8 uit de plugin).
- Terugvallen zonder code: `?weergave=kamers` (oude weergave). Rollback: `git revert 5f19dac 7237500 032c3a2` + kickstart.
- Niets gepusht (push alleen na akkoord van de gebruiker).
