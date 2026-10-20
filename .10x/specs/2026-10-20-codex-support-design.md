# Codex Support — Design Spec
**Date:** 2026-10-20 · **Feature slug:** `codex-support` · **Status:** Approved by user ("support voor codex + setup waarbij je kiest")

## Requirements
1. `setup` lets the user choose: Claude Code, Codex, or both. Interactive menu with detected tools pre-selected; flags `--claude`, `--codex`, `--all` for scripts. Non-interactive default: every detected tool (Claude if none detected).
2. Codex hooks are written to `~/.codex/hooks.json` (same group/handler shape as Claude; existing hooks and other keys preserved; backup first). Events: SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse, PermissionRequest, Stop, SubagentStart, SubagentStop, Interrupt.
3. Hook URL carries the source: `/event?src=codex` (Claude keeps its existing URL so installed hooks stay valid).
4. After installing Codex hooks, tell the user to trust them once via `/hooks` in Codex.
5. Agents get `source: 'claude' | 'codex'`; office shows a small source tag on name plates and in the side panel.
6. Codex tool names mapped: `apply_patch` → "Bewerkt <file>" + code monitor; `update_plan` → takenlijst; `Bash`/`mcp__*` already handled. `Interrupt` → done with activity "Onderbroken".
7. `uninstall` removes hooks from both tools; `start` offers setup when no tool has hooks.

## Known limitation
Codex tool events from inside a subagent carry no `agent_id`; their tool activity shows on the manager. Subagent start/stop still create/finish workers.
