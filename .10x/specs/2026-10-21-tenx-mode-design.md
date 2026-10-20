# 10x Mode — Design Spec
**Date:** 2026-10-21 · **Feature slug:** `tenx-mode` · **Status:** Approved by user

## Goal
Couple the office to the 10x-team plugin without depending on it: projects that use 10x get an office with departments and the 12 team roles, showing which role is working.

## Activation (no hard dependency)
A project is in 10x mode when `<projectKey>/.10x/` exists or a `10x-Team:*` skill / `/10x-team` prompt is seen. Otherwise the normal room is used. No plugin code or paths are used.

## Layout
Wall: door, ADR frames, phase timeline 0–6, clock. Zones (2×4): Meeting (phase 0), Strategy (CTO, PM), Architecture (Architect, Staff), Planning (EM, Senior), Engineering (SDE, DBA), Quality (QA, Security), Operations (DevOps, SRE), Lounge. Below: shared work floor with a desk per real subagent (as in normal rooms).

All 12 members are always present (outfit per role). The member of the session's active role shows the session's status/bubble/monitor; others read quietly. The active phase's zone is lit. In phase 0 the team gathers at the meeting table; the whiteboard shows the open question.

## Role detection (server/tenx.js)
Exact: Skill `10x-Team:<role-skill>`; writes to `.10x/decisions/<role>/`; `.10x/adrs/` → architect; `.10x/reviews/*security*`/`*qa*` → security/qa; `.10x/specs/` → meeting. Otherwise guessed from phase + tool (phase 4 code → SDE, sql/migration → DBA, tests → QA in phase 4/5, phase 6 → DevOps, monitoring → SRE) and marked `~`.
Phase: parsed from `.10x/status.md` (last section that mentions phases; highest completed "Phase N" + 1). Re-read on writes to `.10x/` and every 15 s.

## Extras
- ADR wall from `.10x/adrs/*.md` (number + title); new ones glow.
- Handoff: write to `handoff.md` → a member carries a folder to the next phase's zone.
- Gatekeeper: code edit (non-.md, outside `.10x/`) while no ADR exists or phase < 4 → red beacon + panel warning for 2 minutes.
- Stamps: reviews containing qa/security in filename → green APPROVED stamp, red if text contains afgekeurd/rejected/blocker/fail.
- Click a member (focused room) → panel shows the start of that role's newest decision file. Endpoint `GET /api/decision?project=&role=` reads only `<known project>/.10x/decisions/<known role>/*.md`, max 4 KB.

## Non-goals
Editing the plugin; writing to `.10x/`; per-feature status beyond the latest section.
