# Senior — session-sync
- T1: `claim(p, sid)` op 10x-prompt, 10x-skill en schrijfacties in `.10x/` (Write/Edit/apply_patch, of Bash met `.10x/` en `>`/`tee`/`mv`/`cp`/`git`). Lezen claimt niet en beëindigt `newRun` niet meer (een nieuwe sessie die eerst status.md leest viel terug op de oude stand).
- `liveView(p)` uit snapshot halen; bevriezen = `{...liveView(p), handoffAt}` + rol in `p.roles`. Verse view: fase 0, `handoffAt` = huidige (geen overdracht-animatie bij claim).
- Guess-fase per sessie via `phaseFor(p, sid)`.
- active.json `at` = mtime (fs.list), `updatedAt` alleen als fallback. Test met `utimesSync`.
- T4: hook leest stdin met timeout, `JSON.parse` in try, loopt omhoog tot `.git` of home; output `hookSpecificOutput.additionalContext`.
