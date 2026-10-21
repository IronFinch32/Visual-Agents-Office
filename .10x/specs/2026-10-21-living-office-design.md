# Living Office — Design Spec
**Date:** 2026-10-21 · **Feature slug:** `living-office` · **Status:** Approved by user

## Fix: who is really working
- Read `.10x/active.json` (10x-Team-Plus ≥ 0.4.0-plus.2 contract: role, phase, phaseName, feature, task, updatedAt). It is the exact signal for role and phase, for the session that wrote it (Write/Edit path or Bash command mentioning it) or else the most recently active session in the project. Stale after 6 h.
- A new `/10x-team` prompt starts a new run: phase 0, role meeting, until the next `.10x/` write.
- status.md: also recognise phase names (Brainstorming, Strategy, Experience Design, Design, Planning, Implementation, Verification, Delivery, plus legacy "<Name> Complete").
- Unknown phase: guess only from the kind of work; default PM.

## Step 1 — layout and behaviour
- No work floor in 10x rooms. Grid 5×2: row 0 meeting, strategy, design, architecture, planning (classic: meeting spans 2); row 1 engineering, quality, operations, lounge, CEO office.
- Flex seats: subagents sit on a stool next to the desk of the role their session plays (2 per department, rest "+n"); done → lounge.
- Pathfinding: A* on a 4 px grid, furniture blocked, zone borders walkable.
- Handoff on phase increase or handoff.md write: previous role carries a folder to the next role's desk, receiver stands, takes it ("Ik pak het op!"), sits and starts; giver gets coffee in the lounge, then returns.
- Meeting room: phase 0, and a short stand-up (≈8 s) on every new prompt: CEO walks in with the prompt, team gathers.
- Lounge life: idle members get coffee now and then (max 2), chat; roles of finished phases more often.
- CEO office: the user as CEO (suit, big desk, nameplate "CEO (jij)", inbox with open questions). Waiting agents walk to the CEO door and queue there; back after the answer.

## Step 2 — polish
- Party on live completion: confetti, "SHIPPED!" banner, team in the lounge.
- Failures (PostToolUseFailure → `failedAt`): smoke puff + frustrated pose for 4 s.
- Thinking (activity "Denkt na"): thought bubble "…".
- Workload: paper stack on the active desk grows with tool calls in the current phase.
- Kanban on the wall: tasks `T<n>` from the newest engineering-manager decision; Klaar when ticked/mentioned in status.md or the SDE decision; Bezig = first open task during implementation.
- End of day: 10 minutes without activity → team walks out, lights off; back on new activity.
