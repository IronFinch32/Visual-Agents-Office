# Security — visual-agents-office
## Threat model
| Threat | Mitigation |
|---|---|
| LAN access to prompts | bind 127.0.0.1 only |
| Malicious website POSTs fake events (CSRF) | reject non-local Origin (403) |
| DNS rebinding reads /api/state or /stream | reject non-local Host header (421) |
| Path traversal on static | normalize + prefix check |
| Memory DoS via large bodies | 256 KB limit, strings truncated, stale pruning |
| XSS via prompt/tool text | DOM via textContent only; canvas fillText |
| Hook breaks Claude | curl -m 1, output to /dev/null, `|| true`, hook timeout 2s |
| Settings corruption | parse-before-write, timestamped backup, only own entries removed |
## Residual
- Any local process can POST events (same-user trust boundary; acceptable).
- Prompts are held in memory for the server's lifetime (truncated to 140 chars).
