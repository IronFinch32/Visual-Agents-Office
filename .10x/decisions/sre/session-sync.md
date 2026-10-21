# SRE — session-sync
- Nieuwe sessiekamer toont toch de oude stand? → kwam `SessionStart` met source `resume`/`compact` (dan geen verse stand), of draaide de server toen nog niet (geen eigenaar bekend → oude lastSession-regel).
- Afgeronde kamer springt mee naar fase 0? → `/api/state` → `tenx[<project>].sessions[<id>]` moet bestaan voor die sessie; leeg na een kantoor-herstart (state is in-memory).
- Rol klopt niet? → `roles[<id>]` in `/api/state`; `source: 'active.json'` alleen bij de eigenaar; `guessed: true` = gok (`~`).
- Claude werkt `.10x/` niet bij zonder commando? → staat 10x-Team-Plus ≥ 0.4.0-plus.7 actief (plugin bijgewerkt)? Test: `echo '{"cwd":"<project>","prompt":"x"}' | node <plugin>/hooks/tenx-reminder.js`.
