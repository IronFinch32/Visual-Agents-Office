# Architect — tenx-mode (ADR-006)
- server/tenx.js: ROLES/DEPTS tables, roleFromSkill, roleFromPath, guessRole, parsePhase, isCodeFile, createTenx({fs}) with onEvent/refresh/snapshot/readDecision.
- server.js: wire onEvent after applyEvent; snapshot.tenx; GET /api/decision; 15 s refresh.
- web/tenx-room.js: same interface as room.js (setAgents, frame, size, isEmpty) + setTenx(info) + click hit-test; building picks room type.
