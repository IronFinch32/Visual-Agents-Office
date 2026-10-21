# Staff — ceo-floor

- Volg de bestaande scheiding: pure logica in `server/state.js`/`server/tenx.js` (testbaar met `node --test`), I/O alleen in `server.js`.
- Plugin-namen (regexen) op één plek in `tenx.js`.
- Nieuwe renderer volgt het room-interface uit `room.js`/`tenx-room.js` (`kind`, `setAgents`, `frame`, `size`, `isEmpty`); geen nieuwe dependencies, sprites hergebruiken.
- Geen gedrag wijzigen zonder CEO: elke nieuwe tak hangt aan `ceoSeen`/`floor`.
- Teksten in het Nederlands, zoals de rest van de UI.
