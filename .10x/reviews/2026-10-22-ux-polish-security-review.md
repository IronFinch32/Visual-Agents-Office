# Security review — ux-polish (2026-10-22)

- **Beslissingstekst** (bestanden uit `.10x/`) wordt via `parseMarkdown` → `textContent`/`createElement` getoond; nooit `innerHTML`. Test: `<img onerror>` blijft tekst. ✔
- **Hover-label** bouwt DOM met `textContent`; projectkleur komt uit de vaste palet-lijst. ✔
- **cleanPrompt**: invoer begrensd op 20k tekens; regex-werk gemeten op 4000 patroonherhalingen ~70 ms. Alleen lokale hooks leveren prompts. Low, geaccepteerd.
- Geen nieuwe endpoints, geen nieuwe opslag; `localStorage` ongewijzigd.
- `innerHTML` alleen in de statische `index.html` (legenda), geen dynamische invoer.

**Bevindingen:** geen High/Medium. Low: theoretische regex-kosten bij kwaadaardige lokale prompt (geaccepteerd: begrensd, lokaal).
**Verdict: Approved**
