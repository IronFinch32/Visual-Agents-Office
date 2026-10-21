# Architect — session-sync (ADR-015)
- tenx.js project state: `owner`, `views: Map<sessionId, view>`; `claim(p, sid)` freezes the old owner's view; `freshView()`; `viewOf(p)` = live view.
- Claim on: 10x-team prompt, 10x skill (non-CEO), any `.10x/` write (path or Bash command). Fresh view on `SessionStart` (source ≠ resume/compact) for a non-owner session in an enabled project.
- Roles: owner → active.json role unless `roles[owner]` is exact and newer; frozen sessions keep their frozen role. Guess for non-owners uses their own view phase.
- Snapshot: `sessions: { sid: view }` for non-owners present in `roles`/views. building.js: `tx = { ...tenx[pk], ...tenx[pk].sessions?.[sid] }` for session rooms.
- Failure modes: unknown owner → lastSession fallback; session gone → view dropped at SessionEnd / when agent not active.
- Plugin hook: stdin JSON → walk up to git root/home looking for `.10x/`; never fails the prompt.
