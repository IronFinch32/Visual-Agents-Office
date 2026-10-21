# QA — living-office
- Automated 63/63 (new: parseActive, parseTasks/taskDone, active.json precedence + new run + staleness, workload reset, unknown-phase guess, phase names incl. Experience Design vs Design, failedAt, A* around obstacles/through doors/no-route fallback).
- Live: this repo writes its own .10x/active.json → office shows SDE exact (no "~").
- Visual (simulated frames because the preview pane was hidden): flex seats (+n), CEO queue in front of desk with bubble + inbox count, stand-up (CEO + team at the table), handoff (folder walk, exchange bubbles, giver to lounge), lounge chatter, party banner.
- Bugs found+fixed: CEO queue spot hidden behind desk; hidden (non-focused) rooms skipped behaviour and missed stand-ups; one failing room could stop the render loop.
- Not verified: end-of-day (10 min wait) visually — logic only; real /10x-team run with the updated plugin.
