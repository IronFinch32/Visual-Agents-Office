# Spec — session-sync (2026-10-21)

Drie punten van de CEO over werksessies in het kantoor.

## Probleem
1. Een nieuwe werksessie toont eerst even de oude status (vorige feature, fase 7/SHIPPED) voordat ze op fase 0 komt.
2. De rol die het kantoor als "aan het werk" toont, klopt niet altijd met wat Claude echt doet.
3. Gaat de gebruiker in een werksessie verder zonder `/10x-Team-Plus:10x-team`, dan werkt Claude `.10x/` vaak niet bij en lopen het kantoor en het CEO-bord achter.

## Oorzaken
1. 10x-stand is per project; de sessiekamer bestaat al vanaf `SessionStart`, vóór de `/10x-team`-prompt. Andere sessiekamers van hetzelfde project springen mee met elke nieuwe run.
2. `active.json` wint altijd, ook van nieuwere exacte signalen; de rol gaat naar `lastSession` (elke sessie die iets stuurt, ook een stille oude); de leeftijd komt uit de door Claude ingevulde `updatedAt`.
3. Zonder de skill in context vergeet Claude het proces en de state-bestanden.

## Ontwerp
### Kantoor (`server/tenx.js`, `web/building.js`)
- Per project een **eigenaar**: de sessie die het laatst een `/10x-team`-prompt stuurde, een 10x-skill (niet CEO) aanriep of in `.10x/` schreef. Zonder bekende eigenaar: `lastSession` (oude gedrag).
- **Nieuwe sessie** (`SessionStart`, `source` niet `resume`/`compact`) in een 10x-project die geen eigenaar is: eigen stand "vers" — fase 0, `done` leeg, niet complete, geen `active`, geen kanban, workload 0.
- **Eigenaar wisselt** van A naar B: A's huidige stand (fase, done, complete, active, kanban, workload, rol) wordt bevroren.
- Snapshot per project krijgt `sessions: { <sessionId>: view }` voor niet-eigenaren; de rol daarin komt in `roles`. `building.js` voegt voor `session:<id>`-kamers die view samen met de projectstand (kamer, kanban, chip, CEO-bord).
- `active.json`-rol alleen naar de eigenaar, en alleen als er geen nieuwer **exact** signaal (rol-skill, schrijven in `decisions/<rol>/`, ADR, review) voor die sessie is. Gegokte rollen winnen nooit van `active.json`.
- Tijd van `active.json` = mtime van het bestand (echte schrijftijd); `updatedAt` alleen als er geen mtime is.
- `SessionEnd` ruimt de bevroren/verse stand van die sessie op.

### Plugin 10x-Team-Plus (`hooks/`)
- `hooks/hooks.json` met één `UserPromptSubmit`-command-hook → `node "${CLAUDE_PLUGIN_ROOT}/hooks/tenx-reminder.js"`.
- Het script leest de hook-JSON van stdin; doet niets (exit 0, geen output) als: de prompt met `/` begint, er geen `.10x/` is in `cwd` of een bovenliggende map tot aan de git-root, of de invoer ongeldig is.
- Anders: JSON op stdout met `hookSpecificOutput.additionalContext`: korte herinnering (zie ADR-015) om bij projectwerk de skill `10x-Team-Plus:10x-team` te gebruiken, `active.json`/`status.md` bij te werken en na Phase 7 "Phase 7 afgerond" te melden als de sessie door de CEO is gestart; losse vragen hoeven dat niet.
- Nooit blokkeren: altijd exit 0, binnen ~1 s. Contract met de CEO-skill blijft ongewijzigd.

## Buiten scope
- Codex-hook (Codex vertrouwt hooks per stuk; aparte stap).
- Twee sessies die tegelijk in hetzelfde project 10x-werk doen: `active.json` blijft per project, de laatste schrijver is eigenaar.

## Tests
- tenx.test.js: verse sessie op fase 0 vóór de prompt; oude sessie blijft bevroren als nieuwe begint; resume behoudt live stand; active.json-rol niet naar stille sessie; nieuwer exact signaal wint, gok niet; mtime telt bij foute updatedAt.
- 10x-Team-Plus: test voor tenx-reminder.js (geen .10x → niets; slash-commando → niets; `.10x/` → additionalContext; ongeldige invoer → niets).
