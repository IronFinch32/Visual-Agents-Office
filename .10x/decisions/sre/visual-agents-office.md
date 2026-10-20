# SRE — visual-agents-office
- **SLO (informal):** status visible < 1 s after hook; zero added latency to Claude beyond ~10 ms curl per event.
- **Monitoring:** red "Geen verbinding" banner in UI when SSE drops; `VAO_DEBUG=1` logs every event.
## Runbook
| Symptom | Check |
|---|---|
| Office empty while sessions run | `VAO_DEBUG=1 npm start`, trigger an action in Claude; no log → hooks not installed (`grep 4747 ~/.claude/settings.json`) or port mismatch |
| "Poort 4747 is al in gebruik" | server already running: `lsof -i :4747` |
| Agent stuck on waiting | next event fixes it; stale after 30 min; restart server to clear |
| Want it gone | `npm run uninstall-hooks` |
