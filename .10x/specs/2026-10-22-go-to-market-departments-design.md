# Go-to-market-afdelingen — design

**Feature:** go-to-market-departments · **Date:** 2026-10-22 · **Status:** goedgekeurd door de CEO (gebruiker)

## Probleem
10x-Team-Plus 0.5.0-plus.1 heeft vijf nieuwe rollen (product-marketing-manager, sales-lead, customer-success-manager, legal-counsel, cfo) in vier nieuwe afdelingen (Marketing & Growth, Sales & Pricing, Customer Success, Legal & Finance) en een nieuwe fase 8 Launch. Het kantoor tekent de zones al uit `departments.json`, maar:
- de server negeert `active.json` met een nieuwe rol of `phase: 8`, en herkent de nieuwe skills en `decisions/<rol>/`-mappen niet;
- een project met Phase 7 afgevinkt en Phase 8 open staat al op "klaar";
- de nieuwe rollen zijn naamloze generieke hoodies, zonder Nederlandse afdelingsnaam, en fase 8 heeft geen afdeling of standaardrol.

## Besluiten (met de gebruiker)
1. **Volwaardig**: correcte herkenning én eigen uiterlijk per rol. Indeling blijft twee rijen (geen aparte vleugel).
2. **Server (`server/tenx.js`)**
   - `ROLES` + de vijf rollen (afdelingen `marketing`, `sales`, `customer-success`, `legal-finance`, zoals `departments.json`).
   - Smaak `plus` krijgt fase 8 `Launch` → afdeling `marketing`. `parseActive` accepteert fase 0–8.
   - Klaar per status-sectie: een sectie met een `Phase 8`-regel is klaar als Phase 8 is afgevinkt (ook "skipped"); een oude sectie die bij Phase 7 eindigt is klaar na Phase 7. `active.json` met fase 7 na een overgeslagen Launch houdt het project op klaar.
   - `.10x/launch/…` en `reviews/…launch…` → `product-marketing-manager`. Raadsel in fase 8 (geen exact signaal): prijs/sales → `sales-lead`, FAQ/onboarding/support → `customer-success-manager`, privacy/voorwaarden/licentie → `legal-counsel`, anders PMM.
   - Plus-signaal: ook `Phase 8` in status.md en schrijven in `decisions/<nieuwe rol>/`.
3. **Browser (`web/tenx-sprites.js`)**
   - Looks + accessoire: PMM oranje blazer + megafoon; Sales pak + telefoon; CS groen + headset; Legal donker pak + weegschaal; CFO pak met gouden das + rekenmachine.
   - Afdelingen: Marketing, Sales, Customer Success, Legal & Finance, elk met eigen vloerkleur.
   - `FLAVOR_PHASES.plus`: fase 8 → `marketing`, standaardrol PMM. Ingebouwde fallback-indeling krijgt de vier afdelingen.
4. **Buiten scope**: de oude weergave `?weergave=kamers` (tenx-room.js) tekent de nieuwe rollen niet; daar valt alles terug op de bestaande rollen en eindigt de tijdlijn bij fase 7. De smaak `classic` verandert niet.

## Scherm
```
│ Vergaderzaal │ Strategie │ Design │ Architectuur │ Planning │ Engineering │ Kwaliteit │
│ Operations │ Marketing │ Sales │ Customer Success │ Legal & Finance │ Flexwerkplek │ Lounge │
```
(Legal & Finance heeft twee rollen in één zone; de andere nieuwe afdelingen één.)

## Fouten / randgevallen
- Oude plugin zonder fase 8 / nieuwe rollen: niets verandert (smaak plus eindigt dan in de praktijk bij 7; status-sectie zonder Phase 8 is klaar na 7).
- Onbekende rol uit een nog nieuwere plugin: blijft generiek in "Overig" (ADR-016).

## Testen
- Unit: roleFromSkill/roleFromPath voor de nieuwe rollen; guessRole fase 8; parseActive fase 8; parsePhase met 8 én 9 regels (klaar-logica, ook skipped); createTenx: active.json `cfo` fase 1 en fase 7 na skipped launch; companyLayout met de 12 afdelingen uit het echte contract; deriveCases fase 8.
- Browser: demo met elke nieuwe rol aan het werk, screenshot, console schoon; `?weergave=kamers` crasht niet bij fase 8.
