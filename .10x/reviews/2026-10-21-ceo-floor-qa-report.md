# QA report — ceo-floor (2026-10-21)

**Verdict: approved.**

## Automated
`npm test`: 70/70 pass (63 bestaand + 7 nieuw in `test/ceo.test.js`):
- herkenning via skill en prompt (hoofdletterongevoelig; subagent-skill telt niet; prompt moet ermee beginnen)
- valkuilen: CEO-prompt/-skill maakt geen 10x-kantoor en zet geen fase 0, ook niet vanuit een 10x-project; echte `/10x-team`-prompt doet dat nog wel
- `assignRooms`: zonder CEO alles per project (geen regressie); met CEO `ceo` / `session:<id>` / per project voor niet-10x
- end-to-end via HTTP: kamersleutels wisselen pas na de CEO, `SessionEnd` haalt de kamer weg

## Handmatig (demo op :4848)
| Scenario | Resultaat |
|---|---|
| `VAO_DEMO_10X=ceo`: CEO verschijnt, geen kamer "vao-demo-ceo" | ok |
| CEO vraagt iets → rode ballon, paneel "wacht op jou" | ok |
| Twee werksessies → twee kamers, bord met `project · feature — Phase N` | ok |
| Klik op bordregel → juiste kamer gefocust | ok |
| Teamkamer zonder directiezone, lounge breed | ok |
| Security wacht → postbakje telt, regel rood | ok |
| Phase 7 → SHIPPED op bord, daarna "Opgeleverd · iedereen is naar huis" | ok |
| `SessionEnd` webshop → kamer weg, portaal blijft | ok |
| `npm run demo` op verse server → per project, directiekamer terug | ok (geen regressie) |

## Gevonden en opgelost
- B1: verschijnende scrollbalk maakte de verdieping 9px te breed → horizontaal scrollen en kamers onder elkaar. Fix: `scrollbar-gutter: stable` + 2px marge.

## Open (niet blokkerend)
- Kamertitels worden afgekapt als kamers naast elkaar staan; volledige naam staat op het bord en als tooltip.
- Echte CEO-run in de app nog niet getest (skill wordt parallel gebouwd).
