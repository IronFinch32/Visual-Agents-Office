# QA — visual-agents-office
## Strategy
- Unit: reducer mapping table, subagent routing/on-demand creation, prune timings, truncation, invalid input, describeTool.
- Integration: real HTTP server on random port (POST/state, 400/403/421, body limit, static + traversal, SSE snapshot).
- Installer: idempotency, preserves foreign hooks, CLI backup, hook silent when server down.
- Manual: `npm run demo` in browser — enter/walk, working bubble, waiting (red !, glow, raised hand, tab title), done (coffee, ✓), subagents beside desk + linger/prune, SessionEnd walk-out, phone width.
## Results
23/23 automated pass. Manual demo pass. Bug found+fixed: mobile topbar wrapping.
## Open
- Live check with real CLI + desktop-app sessions (needs hooks installed) — confirms agent_id routing and PermissionRequest firing in the desktop app.
