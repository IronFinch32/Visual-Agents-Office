# Security — one-company
**Verdict: Approved**

**Threat model (nieuw oppervlak)**
- `departments.json` is externe input: een lokaal bestand uit de plugin-cache of `TENX_DEPARTMENTS`. Aanvaller zou lokale schrijfrechten nodig hebben (dan is het spel al uit), maar we behandelen het toch als onbetrouwbaar:
  - Lezen via `nodeFs.readText` (max 256 KB, fouten → ''), `JSON.parse` in try/catch → `null`.
  - `sanitizeDepartments`: alleen `version: 1`; ids/rollen `^[a-z0-9][a-z0-9-]{0,39}$`; ≤ 16 afdelingen, ≤ 6 rollen; titels/namen ≤ 40 tekens zonder control-tekens; dubbele rollen eruit; `meeting` kan geen rollen hebben.
  - `installPath` uit `installed_plugins.json` wordt alleen gebruikt om `departments.json` te lezen (read-only); geen executie.
- Weergave: alle tekst via canvas `fillText` (geen HTML-injectie). Zijbalk ongewijzigd (`textContent`).
- `/api/decision` blijft beperkt tot bekende rollen (`ROLE_IDS`); onbekende rollen uit het contract geven 404 → "Nog geen beslissing". Geen padtraversal (rolnaam gevalideerd, bestandsnaam regex).
- Server blijft op 127.0.0.1 met Origin/Host-check (ongewijzigd). Snapshot bevat alleen gesaneerde afdelingsdata, geen paden.

**Bevindingen**
- Geen High/Medium. Low (geaccepteerd): `TENX_DEPARTMENTS` kan naar elk leesbaar bestand wijzen; inhoud wordt alleen als departments-JSON geïnterpreteerd en ongeldige inhoud geeft `null` — er lekt niets naar de browser behalve gesaneerde ids/namen.
