# Visual Agents Office — Design Spec

**Date:** 2026-10-20
**Feature slug:** `visual-agents-office`
**Status:** Approved by user (brainstorm, 2026-10-20)

## Problem
When several Claude Code sessions (and their subagents) run at once, the only way to know which one is working, which is waiting for input and which is done is to click through them in Claude. The user wants a glanceable "office" on a second screen.

## Goals
1. Show every running Claude Code session on this Mac (terminal CLI + desktop app Code tab) as a pixel-art character at a desk.
2. Show subagents (Agent/Task tool) as smaller colleagues next to their parent's desk.
3. Show briefly what each agent is doing: last prompt (task) + current activity (tool).
4. Make **waiting for input** and **done** unmistakable (colour, icon, blinking, optional chime).
5. Zero impact on Claude when the office isn't running.

## Non-goals (YAGNI)
- Other AI tools (Cursor, Codex…).
- Controlling agents from the office (read-only).
- Remote access / multi-machine / auth.
- Persisting history across server restarts.
- Linking desktop "side sessions" to the session that started them (hooks don't expose this). They are grouped by project folder instead.

## Architecture
```
Claude Code ──(command hooks: curl, 1s timeout, silent)──▶ POST 127.0.0.1:4747/event
                                                             │
                                               server/state.js (pure reducer)
                                                             │
                                  GET /stream (SSE snapshot + updates) ──▶ web/ canvas office
```

### Components
| Unit | Responsibility | Depends on |
|---|---|---|
| `server/state.js` | Pure state machine: `applyEvent(state, event, now)` → state; `prune(state, now)`; `describeTool(name, input)` | nothing |
| `server/server.js` | HTTP: `POST /event`, `GET /stream` (SSE), `GET /api/state`, static files from `web/`. Binds 127.0.0.1 only | `state.js`, Node stdlib |
| `hooks/install.js` | Adds/removes hook entries in `~/.claude/settings.json` (backup first, idempotent, marked so uninstall only removes ours) | Node stdlib |
| `web/` | Canvas pixel-art office + side panel list. Connects to `/stream`, auto-reconnects | browser only |
| `scripts/demo.js` | Sends simulated events so the office can be tried without real agents | Node stdlib |

### Data model (in memory)
```
Agent {
  id, sessionId, parentId|null, kind: 'session'|'subagent',
  name (project folder basename | agent_type), cwd,
  status: 'working'|'waiting'|'done'|'idle',
  task (last prompt, ≤140 chars), activity (≤80 chars),
  waitingReason, startedAt, updatedAt
}
```

### Event → status mapping
| Hook event | Effect |
|---|---|
| `SessionStart` | create session agent, status `idle` |
| `UserPromptSubmit` | `working`, task = prompt |
| `PreToolUse` | `working`, activity = describeTool; if tool is `AskUserQuestion`/`ExitPlanMode` → `waiting` |
| `PostToolUse` | `working` (clears waiting after permission granted) |
| `PermissionRequest`, `Notification` (`permission_prompt`, `idle_prompt`, `elicitation_dialog`), `Elicitation` | `waiting`, reason = message |
| `Stop` | `done` |
| `SubagentStart` | create subagent (id = agent_id) under session, `working` |
| any event with `agent_id` | routed to that subagent (created on demand) |
| `SubagentStop` | subagent `done`, removed after 20 s |
| `SessionEnd` | session + subagents removed (character walks out) |
| no events for 30 min | removed (stale) |

Sessions never seen via `SessionStart` (already running when hooks were installed) are created on demand from any event.

### Visuals
- Top-down pixel-art office (canvas, nearest-neighbour scaling), desks in a grid sorted by project folder.
- Character colour derived from session id hash. Name plate = project folder.
- Speech bubble = activity. Status badge: blue typing (working), red blinking `!` + red glow (waiting), green ✓ + coffee mug (done), grey zzz (idle).
- Subagents: smaller characters standing beside parent's desk, labelled by agent type.
- Side panel: list with status, name, task, activity, "waiting for Xm".
- Optional chime when an agent enters `waiting` (toggle, off by default because browsers block autoplay until a click).

### Error handling
- Hook command: `curl -s -m 1 … >/dev/null 2>&1 || true` — never blocks, never prints (stdout of some hooks goes into Claude's context).
- Server: body limit 256 KB, invalid JSON → 400 and ignored, unknown events ignored, strings truncated.
- Browser: SSE auto-reconnect; "offline" banner when disconnected.

### Security
- Bind 127.0.0.1 only (prompts may be sensitive). No CORS headers. Reject `POST /event` with a non-local `Origin`.
- Installer backs up settings and only touches entries it owns.

### Testing
- `node --test` unit tests on `state.js` (mapping table above, subagents, pruning, truncation).
- Server integration test: start on a random port, POST events, read `/api/state`.
- `npm run demo` visual check; live check with a real session.

### Run
```
npm start            # http://127.0.0.1:4747
npm run install-hooks
npm run uninstall-hooks
npm run demo
```
