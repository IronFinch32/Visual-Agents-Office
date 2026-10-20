# Security — autostart
Per-user service only (no sudo, no system-wide units). Service still binds 127.0.0.1. Paths in plist are XML-escaped; systemd ExecStart args quoted. Log file in user home contains only startup lines (event logging only with VAO_DEBUG=1). Approved.
