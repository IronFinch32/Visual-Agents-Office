# Staff — session-sync
- Keep tenx.js pure (injected fs); new tests in test/tenx.test.js in the existing style (node:test, fake fs).
- building.js change stays one line of merging; tenx-room.js untouched (it already reacts to phase/complete changes).
- Plugin: CommonJS like tests/validate-skills.test.js, zero deps, exit 0 always; test file tests/tenx-reminder.test.js run with `node`.
