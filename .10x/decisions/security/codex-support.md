# Security — codex-support
- `src` query param whitelisted to codex|claude (test covers a `<script>` value). Tag text comes from a constant table, never from input.
- Installer only edits ~/.codex/hooks.json (JSON), preserves foreign keys/hooks, backs up first. Codex's own trust gate still applies.
Approved.
