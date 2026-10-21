# Security review — ceo-floor (2026-10-21)

**Verdict: approved, geen blockers.**

- **Nieuwe invoer**: alleen `tool_input.skill` en `prompt` van bestaande hook-events, getest met verankerde regexen; geen nieuwe endpoints. Bestaande bescherming (Host/Origin-check, body-limiet, alleen 127.0.0.1) ongewijzigd.
- **Spoofing**: elke lokale hook kan zich als CEO melden; effect is alleen weergave (kantoor is read-only). Geaccepteerd, zelfde trust-model als ADR-001.
- **Bestanden**: geen nieuwe bestandstoegang; de CEO-map wordt juist niet als 10x-project gelezen. `/api/decision` gebruikt nog steeds de `projectKey` + rol-whitelist.
- **XSS**: kamertitels/bordregels via `textContent` en canvas `fillText`; geen `innerHTML`.
- **DoS**: aantal kamers groeit met sessies zoals voorheen; opruimen via SessionEnd/`STALE_MS`.
