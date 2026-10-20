# Staff Engineer — project-offices
- Keep ESM, no deps, textContent-only DOM. Sprites stay procedural.
- Room DOM: `<section class="room" data-key>` containing `<header>` (DOM text, not canvas — crisp + accessible) and `<canvas>`.
- Don't break `/api/state` consumers: fields only added.
