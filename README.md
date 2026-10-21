# Visual Agents Office

Een live pixel-art kantoor dat laat zien welke **Claude Code**- en **Codex**-agents er op je computer draaien, wat ze doen en **wie er op jou wacht**. Zet het op een tweede scherm en volg je agents zonder de hele tijd door sessies te klikken.

- **Een kantoor per project.** Elke projectmap (git-root; worktrees tellen mee) is een kamer in het gebouw.
- **Sessies zijn managers**, met hun opdracht op het whiteboard aan de muur.
- **Elke subagent heeft een eigen bureau**, met een ballon die zegt wat hij doet en een beeldscherm dat de tool laat zien (terminal, code, zoeken, web, …).
- **Wacht er iemand op jou**, dan steekt hij zijn hand op, knippert er een rood `!`, worden de andere kamers gedimd en staat hij in een rode spotlight. De browsertab toont `(1) wacht`, en een belletje is optioneel.
- **Klaar?** Subagents lopen naar de koffiecorner; managers leunen achterover met koffie.
- Het licht volgt je klok: overdag zon door de ramen, 's avonds en 's nachts bureaulampjes.
- **Claude en Codex door elkaar.** Een klein label op elk naambordje (`claude` of `codex`) laat zien welke tool een agent aanstuurt; werken ze aan hetzelfde project, dan zitten ze in hetzelfde kantoor.

## 10x-team modus

Gebruik je de [10x-team plugin](https://github.com/Jaan-Mustafa/10x-Team), dan krijgt elk project met een `.10x/`-map automatisch een **10x-kantoor**:

- **Zes afdelingen, één per fase**: Strategie (CTO, PM), Architectuur (Architect, Staff), Planning (EM, Senior), Engineering (SDE, DBA), Kwaliteit (QA, Security) en Operations (DevOps, SRE). Daarnaast een **vergaderzaal** voor fase 0 en een lounge.
- **Het hele team is er altijd.** Elke rol heeft een eigen uiterlijk: CTO in pak, QA met vergrootglas, Security met schild, DevOps met koptelefoon, …
- **Wie nu aan het werk is**, zie je aan de ballon, het scherm en de bureaulamp; de afdeling van de huidige fase is verlicht. Een rol wordt exact herkend als Claude een 10x-skill aanroept of naar `.10x/decisions/<rol>/` schrijft. Anders schat het kantoor de rol op basis van de fase en het soort werk; dat zie je aan een `~` op het naambordje.
- **Aan de muur**: het whiteboard met de opdracht (in fase 0 je openstaande vraag), de ADR's als ingelijste bordjes (een nieuwe licht op) en een fase-tijdlijn 0–6 uit `.10x/status.md`.
- **Overdracht**: verandert `handoff.md`, dan loopt een teamlid met een map naar de volgende afdeling.
- **Poortwachter**: wordt er code geschreven terwijl er nog geen ADR is, of vóór fase 4, dan gaat er een rode zwaailamp aan en verschijnt er een waarschuwing in de zijbalk.
- **Stempels**: na een QA- of security-review in `.10x/reviews/` komt er een groene stempel (✓) of een rode (✗ bij afgekeurd, blocker of fail).
- **Klik op een teamlid** om het begin van zijn nieuwste beslissing in de zijbalk te lezen.
- **Directiekamer: jij bent de CEO.** Stuur je een prompt, dan loopt de CEO naar de vergaderzaal voor een korte stand-up met je opdracht in een ballon. Wacht iemand op jou, dan loopt die naar je deur en wacht daar met zijn vraag; meerdere wachtenden vormen een rij, en het postbakje op je bureau telt mee.
- **Echte overdracht**: rondt een fase af, dan brengt de vorige rol een map naar het bureau van de volgende ("Overdracht: …" / "Ik pak het op!") en gaat daarna koffie halen.
- **Leven in de lounge**: wie niet aan de beurt is, haalt af en toe koffie en kletst even; rollen van afgeronde fases vaker.
- **Flexplekken**: subagents (Explore e.d.) zitten op een krukje naast het bureau van de rol die ze aanstuurt; klaar, dan naar de lounge.
- **Looproutes**: iedereen loopt om bureaus, tafels en de bank heen.
- **Details**: een gedachtewolk bij "denkt na", een rookwolkje als een tool mislukt, een papierstapel die groeit met het werk in de fase, een **kanbanbord** met de taken (T1, T2, …) uit de EM-planning, een **"SHIPPED!"-feest** bij oplevering, en na 10 minuten stilte gaat het team naar huis (lichten uit).

**Wie werkt er echt?** Vanaf 10x-Team-Plus `0.4.0-plus.2` houdt de plugin zelf bij welke rol actief is, in `.10x/active.json` (`role`, `phase`, `phaseName`, `feature`, `task`, `updatedAt`). Het kantoor geeft dat bestand voorrang en hoeft dan niet meer te gokken: geen `~` op het naambordje, en de taak staat op het whiteboard. Zonder dat bestand valt het terug op skill-aanroepen, schrijfacties in `.10x/` en de fase uit `status.md` (ook fasenamen als "Strategy Complete" worden herkend). Een nieuwe `/10x-team`-prompt zet het kantoor altijd op fase 0 in de vergaderzaal, tot er echt 10x-werk begint.

**10x-Team-Plus** (met UX en UI Designer) wordt automatisch herkend: aan `10x-Team-Plus:`-skills, aan de mappen `.10x/decisions/ux-designer/` of `ui-designer/`, of aan "Phase 7" in `status.md`. Zo'n kantoor krijgt een extra afdeling **Design** (UX met schetsboek, UI met kleurenpalet), een tijdlijn van 0 tot en met 7 en een poortwachter die let op code vóór fase 5 (implementatie). Projecten met de originele 10x-Team blijven de indeling met 0–6 houden. Het kopje toont `10x` of `10x+`.

Het kantoor is niet afhankelijk van de plugin: het leest alleen (read-only) de `.10x/`-map van je project en de skill-namen uit de hooks. Projecten zonder `.10x/` krijgen gewoon het normale kantoor. `npm run demo` speelt ook een complete 10x-Team-Plus-run af (`VAO_DEMO_10X=classic npm run demo` voor de originele).

## Vereisten

- [Node.js](https://nodejs.org) 20 of nieuwer
- [Claude Code](https://claude.com/claude-code) en/of [Codex](https://developers.openai.com/codex) (CLI)
- `curl` (standaard aanwezig op macOS en Linux)

## Starten

Eén commando, zonder iets te clonen:

```bash
npx github:IronFinch32/Visual-Agents-Office
```

De eerste keer vraag je met welke tool je werkt:

```
Met welke agent-tool werk je?
  1) Claude Code   (gevonden)
  2) Codex         (niet gevonden)
  3) Allebei
Keuze [1]:
```

De standaardkeuze is wat er op je computer gevonden is. Daarna worden de hooks voor die tool(s) geïnstalleerd. Daarna start het kantoor op http://127.0.0.1:4747 en opent je browser. Nieuwe en lopende Claude Code sessies verschijnen bij hun volgende actie.

Liever een lokale kopie:

```bash
git clone https://github.com/IronFinch32/Visual-Agents-Office.git
cd Visual-Agents-Office
npm start
```

Er zijn geen dependencies, dus `npm install` is niet nodig.

### Codex: hooks eenmalig vertrouwen

Codex voert nieuwe hooks pas uit nadat je ze vertrouwt. Open na `setup` Codex, typ `/hooks` en markeer de Visual Agents Office-hooks als vertrouwd. Dat hoeft maar één keer, en opnieuw als de hooks veranderen.

### Altijd laten draaien

Laat het kantoor automatisch starten bij elke login, zodat je alleen nog http://127.0.0.1:4747 hoeft te openen:

```bash
npx github:IronFinch32/Visual-Agents-Office autostart
```

Vanuit een lokale kopie kan het ook met `npm run autostart`. Uitzetten doe je met `… autostart --off` (of `npm run autostart:off`).

- **macOS:** een LaunchAgent (`~/Library/LaunchAgents/com.visualagentsoffice.plist`) die de server na een crash opnieuw start.
- **Linux:** een systemd user-service (`~/.config/systemd/user/visual-agents-office.service`).
- **Windows:** een Taakplanner-taak bij aanmelden (niet getest).

Startte je met `npx`, dan wordt de app eerst gekopieerd naar `~/.visual-agents-office/app`. Vanuit een clone draait de service direct uit die map: verplaats je de map, draai `autostart` dan opnieuw. Doe dat ook na een update of als je van Node-versie wisselt. Het log staat in `~/.visual-agents-office/office.log`. Draait er al een kantoor dat je met de hand hebt gestart, dan wacht de service tot dat stopt en neemt het dan over.

Docker is bewust niet gebruikt: de server moet je projectmappen kunnen zien (om ze per git-root te groeperen) en de hooks moeten in je eigen `~/.claude/settings.json` staan. Zie `.10x/adrs/004-autostart-via-os-service.md`.

## Commando's

| Commando | Wat het doet |
|---|---|
| `npm start` / `npx github:IronFinch32/Visual-Agents-Office` | Start het kantoor en opent de browser. Biedt aan de hooks te installeren als die ontbreken. |
| `npm run setup` (of `… setup`) | Kies Claude Code, Codex of allebei en installeer alleen de hooks. Zonder menu kan het met `--claude`, `--codex` of `--all`. |
| `npm run uninstall-hooks` (of `… uninstall`) | Verwijdert de hooks weer, uit Claude Code én Codex. |
| `npm run demo` (of `… demo`) | Stuurt nep-agents naar een draaiend kantoor, om het uit te proberen. |
| `npm run autostart` (of `… autostart`) | Start het kantoor automatisch bij elke login. Met `--off` zet je dat weer uit. |
| `npm test` | Draait de tests. |

Opties: `--port <n>` (standaard 4747, of de omgevingsvariabele `VAO_PORT`), `--no-open` (browser niet openen) en `--yes` (hooks installeren zonder te vragen). Met npm geef je ze door na `--`, bijvoorbeeld `npm start -- --port 5000`. Gebruik bij een andere poort dezelfde `--port` voor `setup`.

In de browser:
- Klik op een kamer om in te zoomen; terug met `Esc` of "← Gebouw".
- Plak `?tijd=dag`, `?tijd=avond` of `?tijd=nacht` achter de URL om de belichting te forceren.
- Met ☰ toon of verberg je de zijbalk, en met 🔕 zet je het belletje aan of uit.

## Hoe het werkt

```
Claude Code ──hook (curl, max 1 s, stil)──▶ POST 127.0.0.1:4747/event
                                                    │
                                     server/state.js (status per agent)
                                                    │
                                SSE /stream ──▶ web/ (canvas-kantoor per project)
```

- `setup` voegt hooks toe aan `~/.claude/settings.json` (Claude Code) en/of `~/.codex/hooks.json` (Codex) voor sessie-, prompt-, tool-, toestemmings-, stop- en subagent-events. Codex-hooks sturen `?src=codex` mee, zodat het kantoor weet welke tool het is. Er wordt eerst een backup gemaakt (`settings.json.vao-backup-…`), bestaande hooks blijven staan, en `uninstall` verwijdert alleen de eigen hooks.
- Draait het kantoor niet, dan faalt de hook stil en merkt Claude Code er niets van.
- **Privacy:** de server luistert alleen op `127.0.0.1` en weigert verzoeken van andere websites (Origin- en Host-check). Je prompts verlaten je computer niet en worden niet opgeslagen; alles staat alleen in het geheugen.
- Agents zonder activiteit verdwijnen na 30 minuten. Klare subagents blijven staan tot hun sessie een nieuwe opdracht krijgt (of maximaal 10 minuten).

## Problemen oplossen

| Probleem | Oplossing |
|---|---|
| Het kantoor blijft leeg | Zijn de hooks geïnstalleerd (`npm run setup`)? Doe iets in een Claude Code sessie; de sessie verschijnt bij de volgende actie. Start met `VAO_DEBUG=1 npm start` om elk binnenkomend event te zien. |
| "Poort 4747 is al in gebruik" | Er draait al iets anders op die poort. Kies er een met `--port` en installeer de hooks voor die poort. |
| Een agent staat in het verkeerde kantoor | Het kantoor is de dichtstbijzijnde map met `.git` boven de werkmap van de sessie. |
| Poppetjes staan stil | Browsers vertragen tabs op de achtergrond; ze lopen bij zodra de tab zichtbaar is. |

| Codex-agents verschijnen niet | Heb je de hooks vertrouwd via `/hooks` in Codex? |
| Codex-subagent typt niet aan zijn bureau | Codex stuurt bij tool-events van subagents (nog) geen `agent_id` mee; hun activiteit staat daarom bij de manager. Starten en klaar zijn zie je wel. |

Windows is niet getest. De hooks gebruiken `sh`-syntax en `curl`.

## Project

```
bin/        startcommando (start, setup, uninstall, demo, autostart)
service/    autostart via launchd / systemd / Taakplanner
server/     HTTP + SSE server, de status-state-machine en de 10x-herkenning (tenx.js)
hooks/      installer voor ~/.claude/settings.json en ~/.codex/hooks.json
web/        de browser-app (canvas, geen build-stap); tenx-room.js is het 10x-kantoor
scripts/    demo
test/       node:test tests
.10x/       ontwerpdocumenten, ADR's en reviews
```

Licentie: [MIT](LICENSE)
