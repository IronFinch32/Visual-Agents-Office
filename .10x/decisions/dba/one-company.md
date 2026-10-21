# DBA — one-company
Geen database of opgeslagen data. Nieuwe in-memory state alleen in de browser (staffing, kleuren). `departments.json` wordt alleen gelezen (max 256 KB via `nodeFs.readText`), gesaneerd en 60 s gecachet. Geen migraties.
