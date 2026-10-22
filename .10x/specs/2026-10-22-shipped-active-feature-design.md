# Spec — shipped-active-feature (route: change)

**Probleem:** het kantoor toont SHIPPED bij Aruba digital tour guide terwijl de sessie in Verification zit. `status.md` daar heeft de lopende feature (`eerste-livegang-netlify`) middenin het bestand; de laatste sectie (`plekfotos-achtergrond`) is volledig afgevinkt en eindigt op Phase 7. `parsePhase` leest de laatste sectie, en de Launch-skip-regel (ADR-018) ziet actieve fase 6 = last−1 met fase 7 afgevinkt → complete.

**Ontwerp (goedgekeurd door de CEO, "Akkoord, bouw de fix zoals voorgesteld"):**
1. `statusSection(text, feature)`: kies de sectie `# Status — <feature>` (feature uit `active.json`, ook als die ouder is dan 6 uur). Geen match → hele tekst (laatste sectie, zoals nu).
2. Fase en takenlijst-telling komen uit die sectie.
3. De Launch-skip-uitzondering in `activeBehind` geldt alleen als de gelezen sectie geen andere feature noemt dan `active.json`.
4. Regressietest met de Aruba-indeling.

**Buiten scope:** Aruba-bestanden aanpassen; de plugin zelf.
