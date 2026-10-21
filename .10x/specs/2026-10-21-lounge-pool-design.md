# Pooltafel in de lounge — design

**Datum:** 2026-10-21 · **Feature:** lounge-pool · **Breidt uit:** ADR-010 (lounge-leven, darten)

## Doel
De lounge in de 10x-teamkamer krijgt naast het dartbord een pooltafel. In rustige momenten spelen twee teamleden een cosmetisch potje: om de beurt stoten, ballen rollen, botsen en vallen soms in een pocket. Puur sfeer; geen invloed op data of server.

## Gebruiker en context
Jij (CEO) kijkt naar het kantoor terwijl het team werkt of wacht. Succes: je ziet in een stille periode af en toe een potje pool naast het darten, het oogt als pixel-art in dezelfde stijl, en de rest van het kantoor gedraagt zich als voorheen.

## Plaatsing
- Lounge-zone is 160×104 px (2 kolommen). De rechterhelft is leeg op het koffieapparaat na.
- Tafel ~46×24 px (groen laken, houten rand, 6 pockets) op lounge-positie (90, 58), dus rechts naast het tafeltje en onder het koffieapparaat.
- Twee speelplekken: links (x≈84) en rechts (x≈142) van de tafel, op hoogte van het midden van de tafel.
- Tafel is een obstakel in de navigatie; bestaande loungeplekken blijven vrij (geen overlap gecontroleerd in QA).

## Gedrag
- Nieuwe ledenmodus `pool`, naast `coffee` en `darts`. Bij het kiezen van een lounge-activiteit: darts ~35%, pool ~35% (als er een speelplek vrij is), anders koffie. Zelfde cap op lounge-drukte en dezelfde duur als darten.
- Spelers staan aan hun kant van de tafel met een keu (nieuwe pose `cue`: keu horizontaal richting tafel, bij een stoot een korte terugzwaai + stoot).
- Om de beurt een stoot (elke ~2–3 s, alleen als alle ballen stilliggen): de witte bal krijgt een snelheid richting een willekeurige gekleurde bal met wat afwijking.
- Simpele 2D-fysica: wrijving, bots tegen de banden, elastische botsing tussen ballen (gelijke massa), pocket = bal binnen straal van een pocket. Witte bal in een pocket → teruggelegd op de afslagplek.
- Na het laatste gekleurde bal (of max ~12 stoten) wordt opnieuw gerackt.
- Af en toe een kreet bij een pocket: "In de hoek!", "Mooie bank!", "Scratch…", "Net niet", "Nog een potje?".
- Speelt niemand: ballen liggen stil op de tafel (laatste stand).

## Architectuur
- `web/pool.js` (nieuw, puur, zonder canvas): `createPoolGame()` met `rack()`, `shoot(angle, speed)`, `step(dt)` → events (`pocket`, `scratch`), `moving()`. Testbaar met `node --test`.
- `web/tenx-sprites.js`: `drawPoolTable(ctx, x, y, balls)` en `drawCue(...)`.
- `web/sprites.js`: pose `cue` in `drawPerson`.
- `web/tenx-room.js`: plaatsing, nav-blok, modus `pool`, beurtwisseling (`playPool`), tekenen, debug-info.

## Foutafhandeling
Puur client-side animatie. Fysica begrenst dt (max 1/30 s per substap) zodat een achtergrond-tab geen ballen door de band laat schieten; snelheid onder drempel = stil.

## Tests
- Unit (`test/pool.test.js`): rack plaatst 7 ballen binnen de tafel; na een stoot komen ballen tot stilstand; ballen blijven binnen de banden; een bal recht op een pocket wordt gepocket; witte bal in pocket komt terug.
- Browsercheck: tafel zichtbaar in beide flavors, potje komt op gang (via debug), geen console-fouten.

## Buiten scope
Toeschouwers, echte spelregels/score, geluid.
