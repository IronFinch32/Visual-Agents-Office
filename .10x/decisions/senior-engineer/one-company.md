# Senior Engineer — one-company
- T1: contract-voorbeeldlezer als basis, maar `fs`/`env`/`home` injecteerbaar voor tests; `sanitizeDepartments` gooit ongeldige entries weg i.p.v. alles; meeting-afdeling verplicht (toevoegen als hij ontbreekt).
- T2: `companyLayout(deps)`: rij 1 = meeting(2) + eerste helft afdelingen, rij 2 = rest + (overig) + flex + lounge(2); kortere rij → meeting/flex breder; afdeling span = ceil(rollen/2). Cases sorteren op `startedAt` voor stabiele toewijzing. Staffing houdt `Map(caseKey → {role, slot})`; vrijgeven als de case weg/klaar is; rolwissel → event `{caseKey, from, to}`.
- T3/T4: één `chars`-map: `m:<role>:<slot>` voor medewerkers (slot 0 altijd aanwezig, slot ≥1 alleen zolang nodig: komt binnen via de deur, vertrekt via de deur), `sub:<id>` voor subagents, `flex:<sessionId>` voor flex-managers. Gedrag per frame zoals `tenx-room.think()`. Overdracht: lijst actieve overdrachten (max 3 tegelijk).
- T5: in building een aparte tak; `focus(key)` voor een case-sleutel → `company.highlight(key)`.
- Lastig: zones 2 rijen hoog met 2 bureaus boven elkaar → nameplates niet over elkaar; checken met screenshots.
