# DevOps — visual-agents-office
- **Deploy target:** none — local tool, `npm start`. No build step, no dependencies.
- **CI:** not set up (no remote repo). If pushed to GitHub: one workflow running `npm test` on Node 20/22.
- **Install:** `npm run install-hooks` (backup of settings.json). **Rollback:** `npm run uninstall-hooks` or restore `~/.claude/settings.json.vao-backup-*`.
- **Optional autostart:** a launchd agent (`~/Library/LaunchAgents`) running `node server/server.js` — not created; offer to user.
