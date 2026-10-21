# ADR-015: One owner per 10x project, a frozen or fresh view per session, and a reminder hook in the plugin

**Status:** Accepted (extends ADR-008/009)
**Date:** 2026-10-21
**Feature:** session-sync
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Since ADR-009 every 10x session gets its own room, but the 10x state (phase, done, active.json, kanban) is still kept per project. A new work session's room exists from `SessionStart`, before its `/10x-team` prompt, and shows the previous feature; an earlier finished session of the same project jumps back to phase 0 when a new one starts. The active.json role is handed to `lastSession` (any session that sent an event) and always beats newer exact signals; its age comes from the `updatedAt` Claude writes by hand. And when the user continues in a work session without `/10x-team`, Claude tends to stop updating `.10x/` at all.

## Decision
- **Owner per project** (`server/tenx.js`): the session that last sent a `/10x-team` prompt, called a 10x skill (not CEO) or wrote in `.10x/`. Without a known owner the old `lastSession` rule applies.
- **View per session**: the owner sees the live project state. A session that starts fresh (`SessionStart`, source not `resume`/`compact`) and isn't the owner gets a *fresh* view (phase 0, nothing done). When ownership moves from A to B, A's current view (phase, done, complete, active, kanban, workload, role) is *frozen*. The snapshot carries these as `tenx[project].sessions[sessionId]`; `web/building.js` merges them into `session:<id>` rooms and the CEO board. `SessionEnd` drops them.
- **Role**: the active.json role goes only to the owner, unless the owner has a newer *exact* signal; guesses never beat active.json. The active.json time is the file's mtime.
- **Reminder hook in 10x-Team-Plus** (`hooks/hooks.json` + `hooks/tenx-reminder.js`): on `UserPromptSubmit`, in a project with `.10x/`, for prompts that are not slash commands, add context telling Claude to follow `10x-Team-Plus:10x-team` for project work and keep `active.json`/`status.md` current. The office stays read-only; the CEO contract is unchanged.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Hide a new session room until its first `/10x-team` prompt | Tiny change | A room still flips between features; finished rooms still jump to phase 0 | Fixes half of point 1 |
| Key all 10x state by session instead of project | Clean model | `.10x/` files are per project; needs a second source of truth | Files can't tell which session wrote them |
| Office hook answers with additionalContext | No plugin change | Office would steer Claude; breaks read-only principle (ADR-006) | Wrong owner of the rule |
| Only document "always type /10x-team" | No code | User forgets; that is the bug | User chose the hook |

## Consequences
### Positive
- New sessions start at phase 0 at once; finished sessions stay finished; the shown role follows the freshest exact signal.
- The 10x process keeps running without typing the command.
### Negative
- More server state (owner, views); a fresh session that never does 10x work stays in the meeting room.
- The hook adds a few lines of context to every prompt in a 10x project.
### Risks
- Owner detection misses an owner (e.g. office restarted): falls back to `lastSession`, the old behaviour.
- Plugin hooks only load after the plugin is updated/reloaded; until then point 3 is unchanged.

## Dependencies
- ADR-008 (active.json), ADR-009 (session rooms). Claude Code plugin hooks (`hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}`).
