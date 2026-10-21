# Handoff — session-sync

**Status:** opgeleverd (Phase 7), kantoor-commit f288581, ADR-015; plugin-commit 740b06e in 10x-Team-Plus.
- Elke werksessie heeft een eigen stand (vers bij start, bevroren bij overname); active.json-rol alleen naar de eigenaar; nieuwer exact signaal wint; tijd = mtime.
- Plugin-hook herinnert Claude in `.10x/`-projecten aan het 10x-proces. Runbook: `decisions/sre/session-sync.md`.
- Open: gebruiker werkt de plugin bij; push van beide repo's alleen na akkoord.
