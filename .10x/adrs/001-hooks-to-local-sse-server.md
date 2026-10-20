# ADR-001: Claude Code command hooks → local Node server → SSE → canvas

**Status:** Accepted
**Date:** 2026-10-20
**Feature:** visual-agents-office
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
We need near-real-time, accurate per-agent status (working / waiting / done) for all Claude Code sessions on one Mac, including subagents, with zero impact on Claude when the visualiser is off. Claude Code exposes lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PermissionRequest, Notification, Stop, SubagentStart/Stop, SessionEnd) whose JSON input includes session_id, cwd and, inside subagents, agent_id/agent_type.

## Decision
- Register **command** hooks in `~/.claude/settings.json` that pipe stdin to `curl -s -m 1 -X POST --data-binary @- http://127.0.0.1:4747/event >/dev/null 2>&1 || true`.
- A stdlib-only Node server reduces events into in-memory state with a pure reducer (`state.js`) and pushes full snapshots over SSE.
- A vanilla-JS canvas page renders the office.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| `type: "http"` hooks | No curl process | Connection failures surface as hook errors in the UI when server is off | Violates "zero impact when off" |
| Tail transcripts in `~/.claude/projects` | No config change | "Waiting for permission" is not in transcripts; heuristic, laggy | Can't meet the core waiting requirement |
| WebSocket instead of SSE | Bidirectional | Needs a dependency or hand-rolled framing; we only push one way | YAGNI |
| React/Phaser frontend | Richer tooling | Build step, dependencies | Overkill for one canvas |

## Consequences
### Positive
- Exact status signals; trivial install/uninstall; no dependencies.
### Negative
- Spawns a short curl process per hook event (~ms). Requires modifying user settings.
- State is lost on server restart (sessions reappear on their next event).
### Risks
- Hook schema changes in future Claude Code versions → reducer ignores unknown fields/events; tolerant parsing.
- Prompt text is sensitive → bind 127.0.0.1 only, reject non-local Origin.

## Dependencies
- Claude Code hooks; `curl` (preinstalled on macOS). Constrains: future control features would need a new ADR.
