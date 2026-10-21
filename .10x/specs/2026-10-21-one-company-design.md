# One company — design

**Feature:** one-company · **Date:** 2026-10-21 · **Status:** approved by the CEO (user)

## Problem
Today every 10x work session (and every project) gets a complete office with all 14 roles. With a few sessions the screen fills with small copies of the same company and you can't see at a glance who works on what.

## Goal
One screen: the CEO room on top (status per project, as now) and below it **one company** with departments. Projects are **folders** that move from department to department; the role working on a project shows it on its nameplate.

## Decisions (with the user)
1. **Permanent staff.** Every role has one permanent employee with the current look. A session is a project folder in its own colour. The folder lies on the desk of the role that works on it now; that employee works, nameplate "SDE · Aruba".
2. **Colleagues.** Two projects need the same role at the same time → a colleague ("SDE 2") gets a second desk in that department. More than two → the extra folders pile on the main desk with "+n" (still visible on the CEO board). A colleague leaves when their project moves on.
3. **Folders walk.** When a project's role changes, the employee who had it walks the folder to the next desk ("Overdracht: …" / "Ik pak het op!"), then takes a coffee.
4. **Meeting room.** Every project in phase 0 (or role `meeting`, i.e. waiting on the user) gets its own table (max 3) with its folder; the PM (or a colleague PM) sits there. Extra meetings → "+n".
5. **Flexwerkplek.** Sessions without 10x (no `.10x/`, also Codex) get a flex desk with a project label in their own department. Subagents on stools as now.
6. **Lounge.** Employees without a project take coffee, darts or pool now and then (existing behaviour). After 10 minutes of company-wide silence everybody hangs out; after an hour lights out.
7. **Waiting on you.** The employee whose project waits raises a hand with a red `!` and the question; the CEO board line turns red; tab title and chime as now.
8. **Departments from the plugin.** The office reads `departments.json` (10x-Team-Plus contract v1) and falls back to its built-in list. An unknown department becomes an extra zone, an unknown role a generic employee.
9. **Per-project wall items go.** ADR frames, kanban and timeline per room disappear. The phase moves to the CEO board. Gate (code before ADR) → red beacon at the employee's desk and a red line on the CEO board. QA/security stamps → on the folder.
10. **Always one company**, also without a CEO session (then no CEO room). The old room-per-project view stays reachable with `?weergave=kamers`.
11. **Click** a CEO board line or a project in the side panel → that project's folder and employee light up, everything else dims for a few seconds. Click an employee → their latest decision for their current project (as now).

## Screen
```
┌──────────────── CEO-verdieping (as now, board line: ● colour · project · phase) ───────────────┐
├──────────────────────────────── Bedrijf ───────────────────────────────────────────────────────┤
│ Vergaderzaal (2 wide, 3 tables) │ Strategie │ Design │ Architectuur │ Planning                  │
│ Engineering │ Kwaliteit │ Operations │ Flexwerkplek │ Lounge (2 wide: coffee, darts, pool)       │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```
Row 1: meeting + first half of the departments; row 2: the rest + flex + lounge; the shorter row widens meeting (row 1) or flex (row 2). A department with more than two roles gets a wider zone.

Department zone (per role column): main desk with monitor, stools for subagents in front of it, a colleague desk below.

## Data flow
- Server: unchanged agent/10x state. New: `departments` in the snapshot (loaded from the plugin, sanitised, re-read every 60 s, `null` → built-in).
- Browser: a pure model (`web/company-model.js`) turns `agents + tenx + departments` into **cases** (one per work session) with department, role, status, colour, and a **staffing** map role → slots, stable across snapshots. The renderer (`web/company.js`) draws the floor and animates the people. `building.js` puts the CEO floor and the company under each other.

## Cases
- 10x session (project has 10x state, not the CEO): its view = `tenx.sessions[sid]` if present, otherwise the project's live state. Role = `tenx.roles[sid].role`; missing → default role of the phase; `meeting` or phase 0 → meeting table. Complete (shipped) → no desk; CEO board says SHIPPED; small party.
- Other session (not CEO) → flex desk.
- Subagents follow their parent session's case.

## Errors / edge cases
- `departments.json` missing, invalid, wrong version → built-in layout, no error shown.
- Role from `active.json` that no department knows → generic employee in a "Overig" zone.
- More cases than desks → "+n" pile; nothing disappears from the CEO board or side panel.
- No agents → empty company, lights out.

## Testing
- Unit (node:test): departments loader (env path, installed_plugins lookup, invalid/oversized input), company layout from departments (classic, plus, extra department, 3-role department), case derivation (fresh/frozen views, meeting, complete, flex, unknown role), slot assignment (stable, colleague, overflow, release).
- Browser check with `npm run demo` / demo-10x on a second port: screenshots, console clean, `?weergave=kamers` still works.

## Out of scope
- Configuring departments inside the office; drag & drop; per-project kanban/ADR wall; the CEO visiting team rooms (there are none).
