# Architect — codex-support (ADR-005)
- hooks/install.js: TARGETS {claude, codex} with file, events, command(port); install/uninstall/hooksInstalled per target; detectTools().
- server.js: read ?src=, set evt.source (claude|codex).
- state.js: agent.source; Interrupt; apply_patch/update_plan descriptions.
- CLI setup: menu (1 Claude, 2 Codex, 3 beide) + flags.
- UI: source tag on nameplates + panel.
