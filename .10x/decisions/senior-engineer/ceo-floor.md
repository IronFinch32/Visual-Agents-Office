# Senior — ceo-floor

- **T1**: `isCeoSkill = /^10x-team-plus:ceo$/i`, `isCeoPrompt = /^\s*\/10x-team-plus:ceo\b/i`. In `applyEvent` vóór de switch: markeer `session.ceo`, `state.ceoSeen = true`. Subagents erven `ceo` niet als veld; `assignRooms` kijkt naar de sessie. In `tenx.onEvent`: `if (agent.ceo) return false` als eerste check; regexen ook aanpassen (defense in depth).
- **T2**: `assignRooms(agents, { ceoSeen, isTenx })` muteert kopieën uit `snapshot()`; CEO-sessie-ids verzamelen uit sessies met `ceo`. In `fullSnapshot`: `tenx.snapshot(projectKeys van niet-CEO-agents)` en `isTenx = (k) => !!tx[k]`.
- **T3**: in `setAgents` groep-sleutel `a.room || a.projectKey`; `entry.projectKey`; tenx-lookup via `entry.projectKey`. Verdieping: sectie met class `floor`, altijd eerst in de DOM (`prepend`), in `layout()` eerst de verdieping op volle breedte schalen (max ~28% hoogte), rest in de overgebleven hoogte. Nieuwe kamer terwijl verdieping al bestond → `floor.handoff()`.
- **T4**: eigen kleine scene, geen nav-grid nodig (open vloer); CEO-ballon via `drawBubble`/`drawThought` zoals `drawAgentBubble`. Hit-test bordregels in logische coördinaten.
- **T5**: `LAY` afleiden: zonder `ceo` en met `lounge: [3,1,2]`; `ceoGeo`-gebruik bewaken; `quiet` als variabele uit `think` i.p.v. `chars.get('ceo').mode`. Naar huis na oplevering: `floor && tenx.complete && !party && geen agent working/waiting`.
- **T6**: `runTenxDemo` parametriseren (sessie-id, root, feature, prompt) zodat hij twee keer parallel kan lopen; `demo-ceo.js` start CEO + twee werksessies en eindigt er één.
