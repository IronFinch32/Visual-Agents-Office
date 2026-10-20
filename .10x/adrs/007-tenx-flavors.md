# ADR-007: Support 10x-Team-Plus via detected "flavors"

**Status:** Accepted (extends ADR-006)
**Date:** 2026-10-21
**Feature:** tenx-plus
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
The user forked the plugin as 10x-Team-Plus: two new roles (UX Designer, UI Designer, folders `ux-designer/`, `ui-designer/`) and a new Phase 2 "Experience Design", so phases run 0–7 and implementation moves from phase 4 to 5. Projects using the original plugin must keep working.

## Decision
- Each 10x project has a `flavor`: `classic` (phases 0–6) or `plus` (0–7). Plus is detected from any of: a `10x-Team-Plus:` skill call, writes to/presence of `.10x/decisions/ux-designer|ui-designer/`, or `status.md` mentioning Phase 7 / Experience Design. Once plus, a project stays plus.
- Phase tables (department per phase, default role per phase, implementation phase, last phase) live per flavor on server and client; guessing works per department instead of per phase number.
- Office layout per flavor: plus adds a Design department (UX, UI) and uses a 5-column grid with a wider lounge.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Only support Plus | Simpler | Breaks original 10x users | Both are in use |
| User setting (flavor flag) | Explicit | Extra config, easy to forget | Detection is reliable from files |
| Read the plugin's SKILL.md to learn phases | Generic | Depends on plugin install path/format | ADR-006: no dependency on plugin files |

## Consequences
- Positive: correct department lighting, timeline and gatekeeper for both plugins.
- Negative: until a Plus signal is seen, a Plus project at phase 0/1 renders as classic (identical up to phase 1).
