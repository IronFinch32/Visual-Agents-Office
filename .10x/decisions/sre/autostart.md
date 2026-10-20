# SRE — autostart
Runbook: office not up after login → `launchctl print gui/$(id -u)/com.visualagentsoffice` (macOS) or `systemctl --user status visual-agents-office` (Linux); check `~/.visual-agents-office/office.log`. Moved clone folder → re-run `autostart`.
