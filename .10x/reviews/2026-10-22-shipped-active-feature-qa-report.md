# QA — shipped-active-feature

**Verdict: Pass**
- `npm test` 121/121 (buiten de sandbox; in de sandbox falen 10 servertests op poortbinding, ook zonder de wijziging).
- Echte Aruba-bestanden (alleen gelezen) door `createTenx`: met fix fase 7, done 0–6, `complete:false`; met de vorige `tenx.js` `complete:true` → bug gereproduceerd en verholpen.
- Regressie: Launch-skip in eigen sectie blijft `complete:true`; projecten zonder `# Status — `-koppen gedragen zich als voorheen.
- Live: service herstart, `/api/state` werkt; Aruba verschijnt pas weer bij het volgende event van die sessie — `Not run` live in het kantoor, wel gelijk aan de module-check.
