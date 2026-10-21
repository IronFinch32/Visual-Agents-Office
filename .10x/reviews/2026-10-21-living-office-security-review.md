# Security — living-office
- active.json parsed defensively (JSON.parse in try, role whitelist, phase range, strings truncated); only read from known project roots like other .10x files.
- No new endpoints. `?debug` only exposes in-page objects to the local console.
Approved.
