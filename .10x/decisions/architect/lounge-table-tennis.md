# Architect — lounge-table-tennis
Zie ADR-021. Componenten: `web/pingpong.js` (puur, tijd → balpositie/events), `company.js` (modus, plekken, beurt, tekenen), `tenx-sprites.js` (tekenen).
Faalwijzen: speler loopt weg midden in een rally → rally stopt (ball null), herstart bij nieuwe bezetting. Eén speler ↔ twee spelers → nieuwe serve. Tijd springt (tab op achtergrond) → `update` verwerkt hooguit één afgelopen fase per frame en serveert opnieuw als de vlucht verlopen is; geen lussen.
