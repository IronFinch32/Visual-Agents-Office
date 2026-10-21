# ADR-016: One company with departments; work sessions are folders that move between them

**Status:** Accepted (supersedes the room-per-session view of ADR-009 as default; ADR-009/015 server logic stays)
**Date:** 2026-10-21
**Feature:** one-company
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
ADR-009 gives every 10x work session its own complete office (`tenx-room.js`, all roles). With several sessions the screen fills with copies of the same company. The CEO wants one company with departments (also new ones from the plugin), where each session moves from department to department and each employee shows which project they work on. 10x-Team-Plus publishes `departments.json` (contract v1, plugin ADR-006) for exactly this. Server state per session (ADR-015: owner, fresh/frozen views, role per session) already tells the browser everything it needs per session.

## Decision
- **Server:** new `server/departments.js` loads `departments.json` per the contract (`TENX_DEPARTMENTS` → `~/.claude/plugins/installed_plugins.json` → `null`), validates and sanitises it (ids `^[a-z0-9-]{1,40}$`, ≤ 16 departments, ≤ 6 roles each, strings ≤ 40 chars), caches it and re-reads every 60 s. The snapshot gets `departments` (or `null`). Agent/10x state is unchanged; `assignRooms` keeps filling `room` for the legacy view.
- **Browser model (`web/company-model.js`, pure, node-testable):**
  - `companyLayout(departments, flavorDefaults)` → zones `[meeting, …departments, (overig), flex, lounge]` in two rows with col/row/span.
  - `deriveCases(agents, tenx, deps)` → one case per non-CEO session: 10x (view = `tenx[p].sessions[sid]` ∥ live, role = `tenx[p].roles[sid]` ∥ phase default, `meeting`/phase 0 → meeting) or flex.
  - `createStaffing()` → `assign(cases)` gives every active 10x case a slot of its role (slot 0 = permanent employee, slot 1 = colleague, more → pile on slot 0), stable across snapshots; meeting cases use the `product-manager` pool and sit at a table. Reports role changes per case (for the folder walk).
  - `projectColor` assigns `PROJECT_COLORS` in order of first appearance per projectKey.
- **Renderer (`web/company.js`):** one canvas for the whole company: zones, desks, stools, colleague desks, meeting tables, flex desks, lounge (coffee/darts/pool behaviour carried over from `tenx-room.js`), folder hand-overs, waiting, gate beacon, highlight. Same interface as the other rooms (`setAgents`, `frame`, `size`, `isEmpty`, `kind`) plus `setData(agents, tenx, departments)` and `highlight(caseKey)`.
- **Building:** default mode puts the CEO floor (if any) above one `company` room; CEO board lines become cases with colour; board click and side-panel click → `highlight`. `?weergave=kamers` keeps the old per-room code path untouched.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Make `tenx-room.js` multi-project | Reuses all behaviour | 821 lines built around one project; every rule changes; high regression risk in the legacy view | Rewrite in disguise |
| Shrink existing rooms side by side | Tiny change | Still a whole company per session | Not what the CEO asked |
| Server computes cases/staffing | One source of truth | Animation state (who walks where) lives in the browser anyway; more server state | Model is presentation; keep server read-only and lean |
| Read `departments.json` in the browser | No server change | Browser can't read local plugin files | Impossible |
| Drop the legacy view | Less code | No fallback if the company view disappoints | Keep one release behind a URL flag |

## Consequences
### Positive
- One screen regardless of the number of sessions; new plugin departments/roles appear without code changes.
- Model is pure and unit-tested; renderer stays dumb.
### Negative
- Lounge/darts/pool logic is duplicated between `company.js` and the legacy `tenx-room.js` (tech debt until the legacy view is removed).
- Per-project ADR frames and kanban are no longer drawn (explicitly out of scope).
### Risks
- Many sessions in one role → pile "+n" hides who exactly; mitigated by the CEO board and side panel.
- Contract file location is Claude-Code-internal; mitigated by the fallback.

## Dependencies
- ADR-009 (CEO floor, CEO detection), ADR-015 (per-session views/roles), 10x-Team-Plus `docs/departments-contract.md` v1.
