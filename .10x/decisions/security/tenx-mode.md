# Security — tenx-mode
- File reads are read-only, limited to `<projectKey>/.10x/` for projects the server already learned from hook events; projectKey comes from local hook events only (Origin/Host checks unchanged).
- /api/decision: project must be a known, 10x-enabled project; role must be one of 12 fixed ids; file names filtered (`^[\w.-]+$`); 4 KB cap. Traversal tests included.
- Rendering via canvas text and textContent (decision text in <pre> via textContent).
Approved.
