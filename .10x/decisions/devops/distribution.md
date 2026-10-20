# DevOps — distribution
- Public GitHub repo, MIT. Install paths: `npx github:<user>/visual-agents-office` (no clone) or `git clone` + `npm start`. No deps, no build.
- `bin/visual-agents-office.js`: start (offers hook install when missing, detects an already running office, opens browser), setup, uninstall, demo; `--port`, `--no-open`, `--yes`.
- `.claude/` (local launch config) untracked. Verified from a clean clone via npx with a temporary HOME: hook install, start, already-running detection, hook delivery, uninstall.
- Not tested: Windows (hooks use sh + curl).
