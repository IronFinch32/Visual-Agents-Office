# CTO — lounge-pool
- Waarom: de lounge (ADR-010) maakt stille periodes levendig; een tweede spel geeft variatie naast darten. Laag risico, puur client-side.
- Build vs buy: zelf bouwen. Geen physics-library: een paar ballen met wrijving/botsing is ~60 regels, en de app heeft geen build-stap of dependencies in `web/`.
- Geen serverwijziging, geen data.
