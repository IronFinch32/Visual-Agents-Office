# Visual Agents Office

Een pixel-art kantoor dat live laat zien welke Claude Code agents er draaien, wat ze doen, en wie er op jou wacht. Zet het fullscreen op een tweede scherm.

| Status | Zo zie je het |
|---|---|
| 🟦 Werkt | typt aan bureau, blauwe ballon met de huidige actie ("Bewerkt server.js") |
| 🟥 Wacht op jou | hand omhoog, knipperend rood `!`, rode gloed, rode ballon met de reden, tab-titel `(1) wacht` |
| 🟩 Klaar | handen achter het hoofd, koffie, groen ✓ |
| ⚪ Idle | zzz |

**Een kantoor per project.** Elke projectmap (git-root; worktrees tellen mee met hun repo) is een kamer in het gebouw:
- bovenin op het paarse tapijt zitten de **sessies als managers**;
- daaronder heeft **elke subagent een eigen bureau**, met een pet en bureaurand in de kleur van zijn manager, een naambordje (Explore, Plan, …) en een ballon met wat hij doet;
- klare subagents blijven met ✓ en koffie zitten tot hun sessie een nieuwe opdracht krijgt (of 10 minuten);
- de kamer groeit mee met het team; een kamer met iemand die wacht knippert rood.

**Wat je ziet in een kamer**
- Op het **whiteboard** aan de muur staat de opdracht van elke manager; de ballon toont alleen de huidige actie.
- Het **beeldscherm** laat zien welke tool er draait: terminalregels (Bash), code (Read/Edit/Write), vergrootglas (Grep/Glob), wereldbol (web), stekker (MCP), poppetjes (subagent starten), een vraagteken (vraag aan jou), ✓ als het klaar is.
- **Uiterlijk per type**: manager in pak met stropdas, Explore met ontdekkingshoed, Plan met bril en klembord, general-purpose in hoodie, overige types met pet. Armband, pet en bureaurand hebben de kleur van hun manager.
- Klare subagents lopen naar de **koffiecorner**.
- **Licht volgt je klok**: overdag zonlicht door de ramen, 's avonds en 's nachts donker met bureaulampjes bij wie werkt. Forceren kan met `?tijd=dag`, `?tijd=avond` of `?tijd=nacht` achter de URL.
- Wacht er iemand, dan worden de andere kamers gedimd en staat er een rode lichtkegel op de wachtende agent.

Klik op een kamer om in te zoomen (`Esc` of "← Gebouw" om terug te gaan). Wacht er iemand in een ander kantoor, dan zie je bovenin een rode melding waarmee je er direct heen springt. Een sessie die stopt, loopt de deur uit; een lege kamer verdwijnt.

## Gebruik

Vereist Node 20+ (geen `npm install` nodig, geen dependencies).

```bash
npm start
```

Open http://127.0.0.1:4747. Eenmalig de Claude Code hooks installeren (maakt een backup van `~/.claude/settings.json`):

```bash
npm run install-hooks
```

Nieuwe en lopende sessies verschijnen bij hun volgende actie. Verwijderen:

```bash
npm run uninstall-hooks
```

Uitproberen zonder echte agents (server moet draaien):

```bash
npm run demo
```

Tests:

```bash
npm test
```

## Hoe het werkt

```
Claude Code ──hook (curl, max 1s, stil)──▶ POST /event ──▶ state.js ──SSE /stream──▶ canvas-kantoor
```

- De hooks staan in `~/.claude/settings.json` en gelden voor terminal-sessies én de Code-tab van de desktop app.
- Draait de server niet, dan faalt de `curl` stil en merkt Claude er niets van.
- De server luistert alleen op `127.0.0.1` en weigert vreemde `Origin`/`Host` headers. Prompts verlaten je Mac niet.
- Status leeft in het geheugen. Na een herstart verschijnen agents weer bij hun volgende event. Sessies zonder events na 30 minuten verdwijnen vanzelf.

Instellingen: `VAO_PORT` (standaard 4747; gebruik dezelfde poort bij `install-hooks --port`), `VAO_DEBUG=1` logt elk event.

Projectdocumentatie (spec, ADR, beslissingen per rol) staat in `.10x/`.
