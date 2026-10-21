# QA — lounge-pool
**Verdict: Pass**
- Unit: `test/pool.test.js` 6 tests (rack, stilstand, momentum, pocket, respot, dt-cap). Volledige suite 81/81 (servertests buiten sandbox i.v.m. poortbinding).
- Browser (tijdelijke harness met stil team, daarna verwijderd): plus en classic tonen de tafel; in ~2 min 14 stoten → herrack, ballen gepot, 1–2 spelers wisselen, darten + koffie lopen ernaast; geen console-fouten. Live gebouw op :4747 toont de tafel in alle drie de teamkamers.
- Edge: speler verlaat pool tijdens mikken → schutter vrijgegeven (code-review). Lange loop naar stance (tot ~6 s) is cosmetisch acceptabel.
