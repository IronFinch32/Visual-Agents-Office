# SRE — ceo-floor

- **SLO**: ongewijzigd (lokaal dashboard, best effort). Geen nieuwe achtergrondtaken of I/O.
- **Monitoring**: `VAO_DEBUG=1` logt elk event; `curl -s 127.0.0.1:4747/api/state | jq '.agents[] | {id, ceo, room}'` laat zien wie CEO is en welke kamer elke sessie heeft.
- **Runbook**
  - *Geen verdieping terwijl de CEO draait*: check of de sessie `10x-Team-Plus:ceo` aanroept of met `/10x-Team-Plus:ceo` begint (`isCeoSkill`/`isCeoPrompt` in `server/tenx.js`); als de skill een andere naam kreeg, daar aanpassen.
  - *CEO-map toont toch een 10x-kantoor*: kijk of er een `.10x/` in de CEO-map staat (contract zegt van niet).
  - *Kamers per sessie na een herstart weg*: verwacht; `ceoSeen` is in-memory en komt terug zodra de CEO iets doet.
  - *Kamer blijft hangen*: verdwijnt bij `SessionEnd` of na `STALE_MS` (30 min).
