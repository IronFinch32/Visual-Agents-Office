# Security — project-offices
- New: server stats paths derived from `cwd` in event bodies (gitRootResolver). Only `existsSync` on `<dir>/.git`; no reads, no writes, no shell. Callers are local (127.0.0.1 + Origin/Host checks). Cache bounded at 500 entries → no unbounded growth from crafted cwds.
- New DOM text (room titles, banner, project headers) via textContent only. Full cwd exposed as `title` tooltip — local only.
Verdict: approved.
