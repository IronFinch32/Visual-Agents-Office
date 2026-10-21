# Project in de tekstballon — ontwerp

**Datum:** 2026-10-21 · **Feature:** bubble-project-label · **Bron:** CEO-idee

## Probleem
Sinds er één bedrijf is (ADR-016) zitten medewerkers van verschillende projecten door elkaar in dezelfde afdelingen. De tekstballon boven een agent zegt alleen wát hij doet ("Read remaining anchor regions"). Voor wíé (welk project) staat alleen in een piepklein 4px-labeltje onder het naamplaatje. Je ziet dus niet in één oogopslag wie waar voor welk project bezig is.

## Gekozen oplossing (door de gebruiker gekozen: "Kopregel in projectkleur")
De ballon krijgt een kopregel boven de activiteit:

```
┌──────────────────────────┐
│ ■ Aruba Tour Guide       │   ■ = projectkleur (dezelfde als map/bureau-accent)
│ Read remaining anchor... │
└────────────┬─────────────┘
```

- Kopregel: vierkantje (3×3) in de projectkleur + projectnaam, 5px, vet, donkergrijs op wit. Afgekapt met "…" binnen de ballonbreedte.
- Tweede regel: wat er nu al stond (activiteit, wachtreden of "Klaar: …"), ongewijzigd.
- De rand van de ballon blijft de status-kleur (werkt blauw, wacht rood, klaar groen). Status en project blijven zo los van elkaar leesbaar.
- Ballonbreedte = breedste van de twee regels, maximaal 110px zoals nu. De ballon groeit 7px naar boven; de punt blijft op dezelfde plek boven het hoofd.

## Waar
- Bedrijfsweergave (`web/company.js`): medewerkers aan afdelingsbureaus en sessies op de Flexwerkplek — alle tekstballonnen van `drawAgentBubble` (werkt / wacht / klaar).
- Projectnaam = `case.project`, de naam die ook het naamplaatje en de zijbalk gebruiken.

## Niet (YAGNI)
- Denk-wolkje ("denkt na…") blijft een wolkje zonder tekst; het projectlabel onder het naamplaatje blijft daar de bron.
- CEO-ballon op de CEO-verdieping (de CEO werkt niet voor één project).
- Oude kamerweergave (`?weergave=kamers`, `tenx-room.js`/`room.js`): daar is elke kamer al één project.
- Babbel-ballonnen in de lounge en subagents (die hebben geen tekstballon).

## Opbouw
- `sprites.js` `drawBubble`: nieuwe optie `header: { text, color }`. Zonder header gedraagt hij zich exact als nu (CEO-verdieping, oude weergave ongewijzigd).
- `company-model.js`: pure helper `bubbleHeader(c)` → `{ text, color }` of `null` als er geen project is. Getest in `test/company-model.test.js`.
- `company.js` `drawAgentBubble` geeft de header door voor elke tekstballon.

## Foutgevallen
- Geen projectnaam (`?` of leeg) → geen kopregel, gewone ballon.
- Heel lange projectnaam → afgekapt op de ballonbreedte.
- Ballon bij de rand van het canvas → bestaande `minX/maxX`-klem geldt voor de hele ballon.

## Testen
- Unit: `bubbleHeader` (naam, lege naam, kleur doorgegeven).
- Volledige `npm test` blijft groen.
- Browser: live kantoor op :4747, ballon met kopregel zichtbaar bij een werkende agent; demo-modus voor wacht/klaar.
