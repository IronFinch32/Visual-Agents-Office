# ADR-006: 10x mode as an optional, file-observing adapter

**Status:** Accepted
**Date:** 2026-10-21
**Feature:** tenx-mode
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
The user always pairs the office with the third-party 10x-team plugin and wants to see which team role works. The plugin switches roles silently and is not ours to modify. The office must keep working without it.

## Decision
- A separate server module (`server/tenx.js`) observes hook events and the project's `.10x/` files (read-only) to derive per-project 10x state: phase, ADRs, reviews, gate violations, handoffs, and each session's active role (exact or guessed).
- File access is injected (`fs` functions) so detection/parsing stay unit-testable; the module is wired into the server in one place and adds a `tenx` map to the snapshot.
- The browser renders a different room type (`web/tenx-room.js`) only for projects present in `tenx`.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Separate repo/app for 10x | Clean separation | Duplicates server, hooks, autostart; port/hook conflicts | Twice the maintenance |
| Modify the plugin to emit role markers | Exact roles | Third-party code; breaks on updates | Not ours |
| Parse transcripts for role mentions | More signal | Heavy, brittle, privacy | Files + tool events suffice |

## Consequences
- Positive: zero dependency; exact roles whenever `.10x` is written; works for Claude and Codex.
- Negative: between writes the role is a heuristic (marked `~`); status.md is free-form so phase parsing is best effort.
- Risks: reading files from paths derived from events → restricted to known project roots and fixed sub-paths, read-only, size-limited.
