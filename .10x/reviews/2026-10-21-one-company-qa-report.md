# QA report — one-company (2026-10-21)
**Verdict: Pass**

## Automated
- `npm test`: 102/102 pass (nieuw: departments 5, company-model 11). Server-tests draaien buiten de sandbox (lokale poort).

## Manual (browser, office-dev :4848, CEO-demo + gewone demo tegelijk)
| Check | Result |
|---|---|
| Eén bedrijf onder de CEO-verdieping, 10 zones (10x+ ingebouwd) | Pass |
| Projectmap in projectkleur op het bureau, naambordje "rol · project" | Pass |
| Rolwissel → map loopt mee ("Overdracht: Strategy/Experience Design/Verification", "Ik pak het op!") | Pass |
| Twee projecten in dezelfde rol → collega (SDE 2, Security 2, EM 2) komt binnen; vertrekt als het werk verder gaat | Pass |
| Derde project in dezelfde rol → stapel "+1" | Pass (debug: pile) |
| Vergaderzaal: tafel per project in fase 0, PM met vraag-ballon | Pass |
| Flexwerkplek: gewone sessies + Codex, bron-label | Pass |
| Wachten: hand/!, spotlight, CEO-bordregel rood, tab "(n) wacht" | Pass |
| SHIPPED-banner bij oplevering | Pass |
| Highlight vanuit sessie/project-sleutel volgt de map naar de nieuwe afdeling | Pass |
| Extra afdeling "Growth" (3 rollen) uit een departments-object → extra brede zone | Pass |
| `?weergave=kamers` toont de oude weergave | Pass |
| Console-fouten | Geen |

## Bugs
- Gevonden en opgelost: vertrekkende collega/subagent bleef staan als het pad de deur niet precies haalde (fix 5f19dac).

## Live (service :4747 na herstart)
- Echte `departments.json` uit de geïnstalleerde plugin gevonden (8 afdelingen); deze werksessie verschijnt aan het DevOps-bureau met projectlabel; geen console-fouten.

## Not run
- Windows: niet getest (zoals de rest van het project).
