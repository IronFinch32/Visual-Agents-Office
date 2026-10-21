# SDE — ceo-persist (commit 1b6e331)
- `state.js`: `ceoSnapshot`, `restoreCeo` (gevalideerd, ouder dan 12 u genegeerd, working → idle, zet ceoSeen).
- `server.js`: `CEO_FILE`, `fileCeoStore` (atomisch schrijven via .tmp + rename, mode 0600, max 64 KB lezen), optie `ceoStore`; laden bij start, `persistCeo()` na event en prune (alleen bij wijziging, updatedAt max 1×/min).
- `bin/visual-agents-office.js` en `server.js`-main geven `fileCeoStore()` mee; tests niet (of met tmp-bestand).
