# SDE — no-directie (commit d693082)
- web/tenx-room.js: zone `ceo` uit beide LAYOUTS, lounge [3,1,2]; ceoGeo, CEO-meubilair, nav-blok en imports drawCeoDesk/drawInbox weg; queueSpot altijd bij de deur; STATUS_TEXT 'bij de deur'.
- CEO-karakter start away+hidden bij de deur; komt binnen bij stand-up (naar meeting.head) en feest (lounge), anders weer weg.
- setFloor zet alleen nog `floor` (voor shippedHome), geen herbouw van de lay-out meer.
- Afwijking: stand-up duurt 14 s i.p.v. 9 s, zodat de CEO vanaf de deur (~5,5 s lopen) nog ~8 s aan tafel staat.
- tenx-sprites.js: DEPTS.ceo weg (ongebruikt). README-alinea herschreven.
- Tech debt: geen.
