# QA — visual-agents-office
## Strategy
- Unit: reducer mapping table, subagent routing/on-demand creation, prune timings, truncation, invalid input, describeTool.
- Integration: real HTTP server on random port (POST/state, 400/403/421, body limit, static + traversal, SSE snapshot).
- Installer: idempotency, preserves foreign hooks, CLI backup, hook silent when server down.
- Manual: `npm run demo` in browser — enter/walk, working bubble, waiting (red !, glow, raised hand, tab title), done (coffee, ✓), subagents beside desk + linger/prune, SessionEnd walk-out, phone width.
## Results
23/23 automated pass. Manual demo pass. Bug found+fixed: mobile topbar wrapping.
## Live check (2026-10-20, T7)
- Hooks installed in ~/.claude/settings.json (backup kept). Desktop-app Code sessions fire PreToolUse/PostToolUse/SubagentStart/SubagentStop with agent_id — subagent routing confirmed (Explore appeared beside parent with task + activity, then done).
- A second, unrelated user session appeared automatically.
- Fix: MCP tool labels prettified ("browser batch · Claude Browser").
## Open
- Waiting state not yet seen from a real PermissionRequest/Notification (covered by unit tests; this session runs in auto mode so no prompt occurred).
