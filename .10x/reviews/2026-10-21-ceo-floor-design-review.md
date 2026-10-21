# Design review — ceo-floor (2026-10-21)

**Verdict: approved.**

- Flows uit `decisions/ux-designer/ceo-floor.md` aanwezig: verdieping alleen met CEO, bord + klik, postbakje, overdracht naar de trap, wachtrij bij de deur, oplevering → lichten uit, kamer weg na einde.
- Visueel: alleen bestaande sprites en paletkleuren; gouden accenten passen bij de bestaande kamerkoppen.
- Toegankelijkheid: canvas heeft `aria-label` "CEO-verdieping"; paneel groepeert de CEO onder "CEO-verdieping" en toont alle tekst. Bordregels zijn klein (6 logische px) — kamers zelf blijven klikbaar als alternatief. Reduced motion: bestaande FLIP-regel geldt.
- Open: afgekapte kamertitels bij twee kamers naast elkaar (zie QA).
