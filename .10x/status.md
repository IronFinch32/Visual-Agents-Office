# Status — visual-agents-office
- [x] Phase 0: Brainstorming — spec `.10x/specs/2026-10-20-visual-agents-office-design.md`
- [x] Phase 1: Strategy Complete
- [x] Phase 2: Design Complete (ADR-001)
- [x] Phase 3: Planning Complete (T1–T7)
- [x] Phase 4: Implementation Complete (T1–T6)
- [x] Phase 5: Verification Complete (23/23 tests, demo OK, security approved)
- [x] Phase 6: Delivery Complete (local tool; runbook in decisions/sre)

## Open
- Waiting state still to observe from a real permission prompt.

# Status — project-offices
- [x] Phase 0: Brainstorming — `.10x/specs/2026-10-20-project-offices-design.md`
- [x] Phase 1: Strategy Complete
- [x] Phase 2: Design Complete (ADR-002)
- [x] Phase 3: Planning Complete (P1–P7)
- [x] Phase 4: Implementation Complete (P1–P6)
- [x] Phase 5: Verification Complete (28/28, demo + live OK, security approved)
- [x] Phase 6: Delivery Complete — restart server to activate

# Status — office-polish
- [x] Phase 0: Brainstorming — `.10x/specs/2026-10-20-office-polish-design.md`
- [x] Phase 1: Strategy Complete
- [x] Phase 2: Design Complete (ADR-003)
- [x] Phase 3: Planning Complete (U1–U5)
- [x] Phase 4: Implementation Complete (U1–U4)
- [x] Phase 5: Verification Complete (29/29, visual demo day/evening/night, phone)
- [x] Phase 6: Delivery Complete — restart server to activate

# Status — distribution
- [x] CLI + README + LICENSE, verified from clean clone
- [x] Pushed to https://github.com/IronFinch32/Visual-Agents-Office (public, MIT); npx from GitHub verified

# Status — autostart
- [x] Design (ADR-004)
- [x] Implementation, verification (35/35, live macOS), delivery

# Status — codex-support
- [x] Spec + ADR-005
- [x] Implementation + verification (40/40, menu in pty, visual); real Codex untested

# Status — tenx-mode
- [x] Spec, ADR-006, plan
- [x] Implementation + verification (50/50, demo), delivery

# Status — tenx-plus
- [x] Design (ADR-007)
- [x] Implementation + verification (53/53, Plus demo)

# Status — living-office

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Approved in chat: active.json reader + phase fix, step 1 (CEO office, flex desks, pathfinding, handoff, stand-up, lounge life), step 2 (party, failures, thinking, workload, kanban, end of day).

# Status — ceo-floor

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Spec goedgekeurd: `.10x/specs/2026-10-21-ceo-floor-design.md`
- Repo verhuisd naar `~/Documents/Claude Projects/Visual Agents Office`; LaunchAgent aangepast en service herstart (2026-10-21)
- [x] T1 Server: CEO-herkenning + valkuilen + tests
- [x] T2 Server: assignRooms + room in snapshot + tests
- [x] T3 Client: building groepeert op room, verdieping-rij
- [x] T4 Client: ceo-floor.js
- [x] T5 Client: tenx-room setFloor
- [x] T6 Demo VAO_DEMO_10X=ceo + visuele controle
- Tests 70/70 (`npm test`, 7 nieuw in `test/ceo.test.js`); demo `VAO_DEMO_10X=ceo` visueel gecontroleerd op :4848

## Verification
- QA approved (70/70, demo), security approved, design approved — `reviews/2026-10-21-ceo-floor-*.md`
- Release-ready; echte CEO-run in de app volgt na `ceo-mode`

## Delivery
- Service herstart (launchctl kickstart), :4747 draait de nieuwe code — 2026-10-21
- Sign-off: feature af; live CEO-run in de app volgt zodra `10x-Team-Plus:ceo` er is

# Status — team-lounge-darts

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Spec goedgekeurd: `.10x/specs/2026-10-21-team-lounge-darts-design.md` · ADR-010
- [x] T1 Server: CEO-uitzondering in prune + tests
- [x] T2 Sprites: dartbord, pijl, throw-pose
- [x] T3 Kamer: koffie vaker, stille lounge-rotatie, 60 min naar huis
- [x] T4 Kamer: darts
- [x] T5 Visuele controle + npm test
- Code: commit e825729 · tests 72/72

## Verification
- QA, security en design goedgekeurd — `reviews/2026-10-21-team-lounge-darts-*.md`

## Delivery
- Service herstart (launchctl kickstart), :4747 serveert de nieuwe code — 2026-10-21

# Status — ceo-persist

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design — skipped (geen nieuwe UI; bestaand gedrag van setFloor)
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Vervolg op team-lounge-darts: na een herstart vergat de server de CEO-sessie → geen verdieping en CEO-kantoor in elke teamkamer. Gebruiker koos: onthouden over herstart heen (ADR-011).
- [x] T1 state.js: ceoSnapshot/restoreCeo (puur) + tests
- [x] T2 server.js: ceoStore (bestand), laden bij start, opslaan bij wijziging + test
- [x] T3 bin + main: bestand `~/.visual-agents-office/ceo.json`
- [x] T4 herstart service, controleren
- Code: commit 1b6e331 · tests 74/74

## Verification
- QA en security goedgekeurd — `reviews/2026-10-21-ceo-persist-*.md`

## Delivery
- Service herstart 2026-10-21; live zelftest geslaagd. De lopende CEO-sessie verschijnt na één nieuw CEO-signaal en blijft daarna over herstarts heen.

# Status — no-directie

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Gebruiker: Directie-zone altijd weg uit teamkamers; CEO komt op bezoek bij stand-up/feest (ADR-012).
- [x] T1 tenx-room.js: lay-out, wachtrij bij de deur, CEO-meubilair weg, CEO-bezoek
- [x] T2 README bijwerken
- [x] T3 npm test + browsercheck, service herstarten
- Code: commit d693082 · tests 74/74

## Verification
- QA, security en design goedgekeurd — `reviews/2026-10-21-no-directie-*.md`

## Delivery
- Webbestanden live via de draaiende service (:4747), geen herstart nodig — 2026-10-21

# Status — ceo-sessionend

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design — skipped (geen nieuwe UI; gedrag server-side)
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Diagnose
- CEO-sessie 07ea0ca2 houdt sinds 09:18 hetzelfde id; service draait sinds 13:35 zonder herstart.
- 13:45 laatste beurt → app zet het idle CLI-proces stil → hook `SessionEnd` → `applyEvent` wist de sessie (en `ceo: true`), `ceo.json` wordt `[]`.
- 14:10:23 hervat de app dezelfde sessie (SessionStart, zelfde id) → gewone sessie, geen verdieping; pas bij `/10x-Team-Plus:ceo` om 14:12 komt de verdieping terug.

## Progress
- Gebruiker koos: CEO blijft bij stilzetten; alleen /clear of uitloggen haalt haar weg (ADR-013).
- [x] T1 state.js SessionEnd-tak + tests
- [x] T2 README bijwerken — vervalt (README beschrijft dit niet)
- [x] T3 npm test, service herstarten, live check
- Code: commit 0a1dc09 · tests 75/75

## Verification
- QA en security goedgekeurd — `reviews/2026-10-21-ceo-sessionend-*.md`

## Delivery
- Service herstart 2026-10-21 14:16; live zelftest geslaagd. De open CEO-sessie verschijnt weer bij haar volgende `/10x-Team-Plus:ceo` en blijft daarna ook als de app haar stilzet.

# Status — lounge-pool

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [x] Phase 6: Verification
- [x] Phase 7: Delivery

## Progress
- Gebruiker koos: speelbaar potje (geen toeschouwers). Spec `specs/2026-10-21-lounge-pool-design.md`, ADR-014.
- [x] T1 pool.js + tests
- [x] T2 sprites + pose cue
- [x] T3 tenx-room.js koppeling
- [x] T4 README, npm test, browsercheck
- Code: commit 259b02f · tests 81/81

## Verification
- QA Pass, security en design goedgekeurd — `reviews/2026-10-21-lounge-pool-*.md`

## Delivery
- Webbestanden live via de draaiende service (:4747), geen herstart nodig — 2026-10-21

# Status — session-sync

- [x] Phase 0: Brainstorming
- [x] Phase 1: Strategy
- [x] Phase 2: Experience Design
- [x] Phase 3: Design
- [x] Phase 4: Planning
- [x] Phase 5: Implementation
- [ ] Phase 6: Verification
- [ ] Phase 7: Delivery

## Progress
- Drie punten van de CEO: (1) nieuwe werksessie toont even de oude status, (2) werkende rol klopt niet altijd met wat je ziet, (3) verder werken zonder /10x-team houdt het kantoor/de CEO niet bij.
- [x] T1 tenx.js eigenaar/stand/rol/mtime
- [x] T2 building.js
- [x] T3 tests
- [x] T4 plugin-hook
- [ ] T5 README, tests, live
