# Senior Engineer — project-offices
- P1: `projectKeyFor`: strip trailing `/`, cut at `/.claude/worktrees/` or `/.worktrees/`; '' → 'unknown'.
- P3: Room logical size: W = 12 + cols*64, H = 26 (wall) + 50 (managers) + rows*58 + 10. Managers centred in top row (desk 56 wide). Worker desk 40 wide, seated sprite, bubble above, name plate below. Door top-left; entering characters walk from door.
- Text inside canvas stays (bubbles/name plates); room title in DOM.
- P4: room CSS `aspect-ratio: W / H`, `flex: 1 1 <W*2>px`, max-height; building = flex-wrap with gap styled as hallway. Focus: `.building.focused .room:not(.focus){display:none}`.
