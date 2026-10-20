# EM — visual-agents-office
| # | Task | Est | Depends |
|---|---|---|---|
| T1 | Scaffold: package.json, README, .gitignore | 0.25h | — |
| T2 | `state.js` reducer + unit tests | 1h | T1 |
| T3 | `server.js` HTTP/SSE/static + integration test | 1h | T2 |
| T4 | `hooks/install.js` install/uninstall + test against temp file | 1h | T1 |
| T5 | `web/` office renderer + side panel | 2–3h | T3 |
| T6 | `scripts/demo.js` | 0.5h | T3 |
| T7 | Live verification with real session (needs user OK to install hooks) | 0.5h | T4,T5 |
Risk: hook payload variance between CLI and desktop app → mitigated by on-demand creation + T7.
