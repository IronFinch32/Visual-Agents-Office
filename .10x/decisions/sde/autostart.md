# SDE — autostart
- `service/autostart.js`: pure `serviceSpec` (launchd plist / systemd unit / schtasks), `stableRoot` (copies npx-cache installs to ~/.visual-agents-office/app), `enableAutostart`, `disableAutostart` (best effort).
- CLI: `autostart [--off]`; `start --service` waits (30 s poll) while another office holds the port, then takes over.
- package.json: `service/` in files, `autostart`, `autostart:off` scripts.
