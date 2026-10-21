# Handoff — ceo-sessionend

**Status:** opgeleverd (Phase 7), commit 0a1dc09, ADR-013.
- Oorzaak: de app zet een stille CEO-sessie stil (SessionEnd) en hervat haar met hetzelfde id; de server wiste de CEO daarbij. Nu blijft ze, behalve bij /clear of logout. Runbook: `decisions/sre/ceo-sessionend.md`. Rollback: `git revert 0a1dc09`.
