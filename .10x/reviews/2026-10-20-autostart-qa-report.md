# QA — autostart
- Unit: 5 new tests (plist escaping + commands, systemd quoting, schtasks, unsupported platform, stableRoot copy). Total 35/35.
- Live on macOS: enable → service running and waiting while a manual server held 4747 → manual server stopped → service took over → events arrived → kill -9 → launchd restarted it → `--off` removed plist and stopped it → re-enabled.
- Not tested: Linux systemd, Windows schtasks (spec-tested only).
