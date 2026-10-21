# CTO — one-company
- Bouwen: het kantoor schaalt niet met het aantal werksessies (een heel bedrijf per sessie); één bedrijf past op één scherm en laat zien wie waaraan werkt.
- Geen nieuwe dependencies, geen build-stap; blijft read-only.
- Koppeling met 10x-Team-Plus via het bestaande `departments.json`-contract (plugin ADR-006), met ingebouwde fallback. Repos blijven apart.
- Oude weergave per kamer blijft achter `?weergave=kamers` (legacy, kan later weg).
