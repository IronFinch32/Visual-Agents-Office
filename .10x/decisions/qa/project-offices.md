# QA — project-offices
## Automated (28/28 pass)
projectKeyFor (plain/worktree/trailing/empty), grouping + inheritance, done subagents kept until next prompt, cd keeps office, gitRootResolver.
## Manual (demo on port 4848)
- 4 rooms incl. worktree session in webshop room ✓; 6 workers at own desks, cap/accent in manager colour ✓
- Worker spawned walks from manager to desk ✓; room grows to 2 rows ✓
- Focus click, Esc, back button ✓; banner names other waiting room and jumps there ✓
- Empty room removed after walk-out ✓; phone width ✓
## Bugs found + fixed
1. Session moved offices after `cd` (live) → git root + lock.
2. Rooms stretched to row height (empty band) → align-items flex-start.
3. First room clipped on phone → `align-content: safe center`.
4. Long room name widened room → header width 0/min-width 100%.
5. Manager status text unreadable on carpet → light text.
## Live
Two parallel Explore subagents appeared under this session on the live server simultaneously.
