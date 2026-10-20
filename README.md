# Visual Agents Office

Een pixel-art kantoor dat live laat zien welke Claude Code agents er draaien, wat ze doen, en wie er op jou wacht. Zet het fullscreen op een tweede scherm.

| Status | Zo zie je het |
|---|---|
| 🟦 Werkt | typt aan bureau, blauwe ballon met de huidige actie ("Bewerkt server.js") |
| 🟥 Wacht op jou | hand omhoog, knipperend rood `!`, rode gloed, rode ballon met de reden, tab-titel `(1) wacht` |
| 🟩 Klaar | handen achter het hoofd, koffie, groen ✓ |
| ⚪ Idle | zzz |

Subagents (Explore, general-purpose, …) staan als kleine collega's met een pet in de kleur van hun "baas" naast het bureau. Een sessie die stopt, loopt de deur uit.

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
