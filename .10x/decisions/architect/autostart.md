# Architect — autostart (ADR-004)
- `service/autostart.js`: pure `serviceSpec({platform, home, node, entry, port, uid})` → { kind, file, content, enable[], disable[] } + `installApp`/`enable`/`disable` I/O wrappers.
- CLI: `autostart [--off]`, `start --service` (wait-for-port loop).
