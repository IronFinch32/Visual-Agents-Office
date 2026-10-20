# ADR-004: Autostart via the OS user service manager, not Docker

**Status:** Accepted
**Date:** 2026-10-20
**Feature:** autostart
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Users want the office to "always run" after checkout. The server must see the host filesystem (git-root resolution), Claude Code hooks live in the host's `~/.claude/settings.json`, and the server must only listen on 127.0.0.1.

## Decision
`visual-agents-office autostart` registers a per-user login service: launchd LaunchAgent (macOS, KeepAlive), systemd user unit (Linux), Task Scheduler ONLOGON task (Windows, untested). `autostart --off` removes it. When run from the ephemeral npx cache the app is first copied to `~/.visual-agents-office/app`; from a git clone the clone is used in place. The service runs `start --service --no-open`: if another office already listens on the port it waits and takes over when that one stops, instead of crash-looping.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Docker image + compose | Familiar "always on" story | Needs Docker (~GB), no host paths for git roots, can't edit host settings, must bind 0.0.0.0 inside container | Breaks project grouping and weakens the localhost guarantee |
| pm2 / forever | Cross-platform | Extra global dependency | We avoid dependencies |
| Document manual launchd/systemd setup | No code | Error-prone for users | One command is the point |

## Consequences
### Positive
- One command, zero dependencies, survives reboots, restarts on crash (macOS/Linux).
### Negative
- Service pins the absolute node path; switching Node versions (nvm) requires re-running `autostart`.
- The npx copy doesn't auto-update; re-run `autostart` to update.
### Risks
- Windows path untested → documented as such.
