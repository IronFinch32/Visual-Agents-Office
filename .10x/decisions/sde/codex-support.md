# SDE — codex-support
- hooks/install.js: TARGETS {claude, codex}, CODEX_EVENTS (incl. Interrupt), hookCommand(port, target) with `?src=codex`, detectTools (home dir or PATH), defaultChoice, parseToolChoice; updateSettings/hooksInstalled per target.
- CLI: `setup` menu (1/2/3, default from detection, re-asks on invalid), flags --claude/--codex/--all, Codex trust instructions; `uninstall` removes from both (only existing files); `start`/`autostart` run setup when no tool has hooks.
- server: `source` from `?src=` (whitelist). state: `source` on agents (subagents inherit), Interrupt → done "Onderbroken", apply_patch (file from patch header) and update_plan descriptions.
- UI: source tag on nameplates (claude #d97757, codex #10a37f) and side panel; apply_patch → code monitor, update_plan → todo monitor.
- demo: Codex project + Codex manager sharing payments-api with Claude.
