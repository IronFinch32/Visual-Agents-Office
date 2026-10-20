# Architect — office-polish (ADR-003)
Layered scene in room.js (buildScene → 8 layers). Server: additive `tool`. Building: CSS spotlight classes (`building.alert`, `.room.waiting`), FLIP zoom via Web Animations API.
Failure modes: unknown agent_type → cap look; unknown tool → generic screen; time override invalid → real clock.
