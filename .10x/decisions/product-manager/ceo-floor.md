# PM — ceo-floor

## Probleem
Als CEO wil de gebruiker in één oogopslag zien welke werksessies lopen, in welke fase ze zitten en welke op hem wachten — zonder dat zijn eigen CEO-sessie als los "project" verschijnt.

## User stories
1. Als CEO zie ik mijzelf bovenaan het gebouw op een eigen verdieping, met mijn huidige activiteit.
2. Als CEO zie ik op een bord per werksessie `project · feature — Phase N <naam>` (of `SHIPPED`), en klik ik een regel om die kamer te focussen.
3. Als CEO zie ik in een postbakje hoeveel werksessies op mij wachten (rode `!` bij > 0).
4. Als CEO zie ik elke werksessie als eigen teamkamer, ook twee in hetzelfde project; de kamer blijft na oplevering staan (lichten uit) tot ik de sessie archiveer.
5. Zonder CEO-sessie werkt het kantoor precies zoals nu.

## Succescriteria
- Demo `VAO_DEMO_10X=ceo` toont verdieping, bord, postbakje, overdracht, SHIPPED en een verdwijnende kamer na SessionEnd.
- Alle bestaande tests blijven groen; nieuwe unit tests voor herkenning, kamersleutels en de twee valkuilen.

## Scope
In: spec-gedrag. Uit: Codex-CEO, archiveren vanuit het kantoor.
