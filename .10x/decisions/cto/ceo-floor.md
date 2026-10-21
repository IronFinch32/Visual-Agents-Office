# CTO — ceo-floor

- **Verdict: build.** De gebruiker werkt voortaan als CEO via één vaste sessie die werksessies start (10x-Team-Plus `ceo-mode`). Het kantoor toont nu een kamer "Claude Projects" voor de CEO en één kamer per project; dat beeld klopt niet meer. Geen bestaand alternatief: het kantoor is ons eigen product.
- **Richting:** blijft local-first, read-only, zonder dependencies. Geen nieuw bestandscontract met 10x-Team-Plus: de CEO wordt herkend aan zijn skill/prompt (contract in de spec).
- **Risico:** de CEO-skill wordt parallel gebouwd. Mitigatie: alleen afhankelijk van de skillnaam `10x-Team-Plus:ceo`; testen met een demo-CEO.
- **Opportunity cost:** klein (± een dag); geen regressie zonder CEO is een harde eis.
