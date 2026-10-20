# ADR-005: Support Codex via its hooks.json, tagged by URL source

**Status:** Accepted
**Date:** 2026-10-20
**Feature:** codex-support
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Codex now exposes lifecycle hooks with nearly the same event names and payload fields as Claude Code, configured in `~/.codex/hooks.json` (or config.toml), requiring a one-time trust step in `/hooks`.

## Decision
- Generalise the installer into targets `{ claude: ~/.claude/settings.json, codex: ~/.codex/hooks.json }`, both JSON with the same `hooks.<Event>[].hooks[]` shape. Each target has its own event list.
- The hook command for Codex posts to `/event?src=codex`; the server copies `src` onto the event as `source` (whitelisted). Claude's command string is unchanged for backward compatibility; absent `src` means `claude`.
- Reducer stays tool-agnostic; only additions: `Interrupt` handling and Codex tool descriptions.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Write Codex hooks into config.toml | Single Codex config file | Needs a TOML editor; risk of corrupting user config | hooks.json is officially supported and JSON |
| Detect source from payload (e.g. `model`) | No URL change | Fragile heuristics | URL tag is explicit |
| Codex `notify` only | Simpler | Only end-of-turn; no waiting/tool state | Too little signal |

## Consequences
- Positive: one server, mixed offices (Claude + Codex in the same project room).
- Negative: Codex users must trust hooks manually once; Codex subagent tool activity attributed to the manager.
