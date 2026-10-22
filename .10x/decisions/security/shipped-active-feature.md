# Security — shipped-active-feature

**Verdict: Approved**
- Geen nieuwe invoer van buiten: `feature` komt uit lokale `active.json` (al begrensd op 60 tekens) en wordt alleen met `===` vergeleken, niet als regex gebruikt. Geen ReDoS: kop-regex is lineair.
- Geen nieuw netwerkoppervlak, geen schrijfacties, geen secrets.
