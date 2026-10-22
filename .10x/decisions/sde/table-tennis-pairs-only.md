# SDE — table-tennis-pairs-only
**Gebouwd (54c133a):** `company.js`: tafeltennis alleen bij twee vrije plekken + een vrij teamlid (`available`), partner krijgt modus/plek/eindtijd en loopt mee; eenling aan tafel → `modeUntil = t`; `playPingPong` stopt de rally bij < 2 spelers aan tafel; batjes alleen als de rally loopt. `pingpong.js`: solo en `miss` weg. `drawPingPongTable` zonder `folded`. Test 'solo practice' verwijderd.
**Afwijking:** batjes verborgen tot het potje begint (niet in spec), omdat de eerste speler anders een paar seconden met batje staat te wachten op de partner.
**Tech debt:** geen.
