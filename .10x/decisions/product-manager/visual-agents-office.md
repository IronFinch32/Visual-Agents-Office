# PM — visual-agents-office
## User stories
1. As a user with several sessions I see one character per session so I know how many are running.
2. I see what each one is working on (task + current tool) in a few words.
3. I notice within seconds when an agent waits for my input (red, blinking, optional chime).
4. I see when an agent is done.
5. I see subagents next to the session that spawned them.
## Success criteria
- State change visible in the browser < 1 s after the hook fires.
- Claude Code behaves identically when the office server is not running.
- Works for CLI and desktop-app Code sessions.
## Out of scope
Other AI tools, controlling agents, remote access, history.
