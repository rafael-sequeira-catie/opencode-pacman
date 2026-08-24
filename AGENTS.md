# AGENTS.md

Pac-Man clone built to practice **spec-driven development** (course project). Vanilla JS/HTML/CSS only: no package.json, no build step, no linter, no tests. Verification is manual — load the page and play.

## Running

Serve statically (or open `src/index.html` directly — no modules, no fetch):

```sh
python3 -m http.server -d src   # http://localhost:8000
```

## Architecture: ordered globals, not ES modules

Files share state through `window.*` globals and load in strict dependency order via the `<script>` tags in `src/index.html`: `maze.js → game.js → render.js → main.js`.

- A new JS file is useless without adding its script tag in the correct position.
- Each file must expose its public API on `window` (`window.MAZE`, `window.createGame`, `window.draw`, ...).
- Dependency direction: `main.js` → `game.js`/`render.js` → `maze.js`.

## Game data invariants

- The maze is 31 strings × 28 chars in `src/js/maze.js`. Legend: `#` wall(1), `.` dot(2), space walkable(0), `-` ghost-door(3). At TILE=20 this gives the 560×620 canvas.
- `MAZE` is pristine — never mutate it; each game copies it into `game.grid`.
- Positions are cell-space floats; actors only turn/decide/eat when `aligned()` to a cell center. Speeds are exact unit fractions (1/8, 1/10) so alignment recurs precisely — do not change them to arbitrary values or turning logic breaks silently.

## Spec-driven workflow (the purpose of this repo)

Skills `spec` and `spec-impl` live in `.agents/skills/` (installed from `klerith/fernando-skills`, hashes pinned in `skills-lock.json` — local edits to the SKILL.md files desync the lockfile). Read their SKILL.md before doing spec work; the summary below is not the full contract.

1. `/spec <feature>` → asks clarifying questions → saves `specs/NN-slug.md` with sequential two-digit numbering, status Draft/Borrador.
2. Only the human flips the status to Approved/Aprobado.
3. `/spec-impl <NN-slug>` → creates branch `spec-NN-slug` → implements the plan one step at a time, pausing for diff review after each step. Never auto-commits; out-of-scope requests are deferred to a new spec, not implemented.

`specs/` does not exist yet — the first spec will be `01-...`. Branch behavior is configured in `specs/.spec-config.yml` (`AutoCreateBranch`, default true).

## Conventions

- Project language is Spanish (README, code comments, UI strings); write comments/UI in Spanish and reply in the user's language.
- Code style: single quotes, spaces inside parens `( likeThis )`, comments explain intent rather than restate code.


1- Transportes
2- Conductor
3- Oficial administrativo
4- Asistente administrativo

