# Handoff — ceo-floor

**Van:** brainstorm (CEO-sessie) **Naar:** CTO + PM (Phase 1)

- Spec: `.10x/specs/2026-10-21-ceo-floor-design.md` — goedgekeurd (CEO-verdieping boven alle kamers, één kamer per 10x-werksessie, kamer blijft tot SessionEnd).
- 10x-Team-Plus bouwt parallel de skill `10x-Team-Plus:ceo`; houd je aan het *Contract* in de spec. Test met een demo-CEO, niet met de echte skill.
- Let op de twee valkuilen in `server/tenx.js` (regel 41 en 282) die in de spec staan.
- Na oplevering: service herstarten (`launchctl kickstart -k gui/$(id -u)/com.visualagentsoffice`).
