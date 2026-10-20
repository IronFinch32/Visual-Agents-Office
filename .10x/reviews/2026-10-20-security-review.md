# Security Review — 2026-10-20 — visual-agents-office
Scope: server/server.js, hooks/install.js, web/app.js.
Findings:
1. **Fixed** — DNS rebinding could read prompts via /api/state. Added Host allowlist + test.
2. OK — Origin check blocks cross-site POSTs (text/plain no-cors POST carries Origin).
3. OK — no innerHTML; no eval; no external requests except Google Fonts CSS (no data sent).
4. OK — installer never deletes foreign hooks; backup before every write.
Verdict: approved for local personal use.
