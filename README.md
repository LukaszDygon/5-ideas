# 5 Ideas Daily Showcase

A modern web application and general-purpose design system inspired by the 90s Radical Memphis Pop aesthetic (Milan Memphis geometry, MTV-era pop typography, comic-book pitch black borders, and hard zero-blur offset shadows).

> **Project complete.** The daily run ended on 2026-10-03 after 23 themes, 115 ideas and 23 shipped prototypes.

Every day:
1. Sparks **5 wild ideas** based on a morning theme.
2. **1 prototype is shipped** before sundown (webapp, poetry zine, 8-bit chiptune song, generative image, or interactive widget).

On the site:
1. **The Final Ranking** on the front page lists every shipped prototype in order of builder preference.
2. **Day pages** open with the shipped prototype and a launch button, then the 5 sparks and how it was built.
3. **Day-By-Day Stream** displays chronological ideas with flexible embedded renderers.
4. **Admin** (`/admin`) provides full CRUD content management and one-click ranking reordering.

---

## Tech Stack & Architecture

- **Runtime & Package Manager:** Python `>=3.13` managed with `uv`.
- **Web & API Framework:** `FastAPI` (ASGI) for public routes, REST API, Swagger `/docs`, and static files.
- **Admin Panel:** a FastAPI router at `/admin` (`showcase/admin.py`) sharing the site's Jinja templates.
- **Database:** Python stdlib `sqlite3` (`data/ideas.db`, seeded from `data/ideas.json`) in WAL mode with foreign keys and zero external ORM bloat.
- **Design System:** Radical Memphis Pop neo-brutalist Tailwind CSS + custom tokens (`style.css`), Bricolage Grotesque, Space Grotesk, and JetBrains Mono.
- **Testing:** `pytest` + `httpx` (`TestClient`).

---

## Developer Commands

AI coding agents: start with [AGENTS.md](AGENTS.md) (Claude Code loads it through `CLAUDE.md`).

```bash
# Install dependencies (dev tools included)
uv sync

# Run development server (site + admin on port 8000)
uv run python main.py
# Or: uv run uvicorn showcase.web:app --reload --port 8000

# Tests, lint and format
uv run pytest
uv run ruff check . && uv run ruff format --check .

# Daily workflow CLI (`uv run five-ideas --help` lists every command)
uv run five-ideas new-day --date today --theme "Theme" --idea "Title|Tagline|Description|Tags"  # repeat --idea 5x
uv run five-ideas sparks --date today --idea 2
uv run five-ideas new-prototype --slug my-idea --title "My Idea"
uv run five-ideas save-impl --date today --idea 2 --title "Prototype" --type webapp
uv run five-ideas capture --title "Prototype Name" --type webapp
uv run five-ideas rank 2026-10-03 2026-09-13  # ranking, best first; unlisted prototypes follow in their current order
uv run five-ideas build --base-path /5-ideas/
uv run five-ideas seed --yes  # wipes data/ideas.db and reloads data/ideas.json
```

Idea tags share one Title Case vocabulary (1-3 per idea, e.g. "Game, Horror"). `five-ideas tags` counts every tag in use;
`five-ideas tags --apply FILE` retags ideas from JSON shaped like `{"2026-10-03": {"1": "Game, Writing, Horror"}}`.

---

## Route Overview

| URL | Description | Engine |
| :--- | :--- | :--- |
| `/` | Project-complete broadcast and the final ranking of every shipped prototype | FastAPI |
| `/stream` | Continuous scroll feed with flexible media viewers | FastAPI |
| `/day/{date}` | Shipped prototype first (launch button, jump links), then the sparks, process and retro | FastAPI |
| `/design-system` | Reusable Memphis Pop UI component reference & sandbox | FastAPI |
| `/interactive/<slug>` | One page per prototype, discovered from [prototypes/](prototypes/) (`prototype.toml`) | FastAPI registry |
| `/admin` | Admin dashboard & ranking manager | FastAPI |
| `/admin/day/new` | Create daily drop (morning sparks or shipped build) | FastAPI |
| `/admin/day/{date}/edit`| Edit daily entry, ideas, and prototype details | FastAPI |
| `/docs` | Interactive Swagger API documentation | FastAPI |

---

## Design System Rules (Radical Memphis Pop)

1. **Strokes & Borders:** Always use solid `#1c1b1b` outlines: 3px (`border-[3px] border-ink`) or 4px (`border-[4px] border-ink`).
2. **Elevation & Depth:** Never use soft blurred shadows or translucent frosted glass. Depth is mechanical hard offsets:
   - Level 1: `box-shadow: 4px 4px 0px #1c1b1b`
   - Level 2: `box-shadow: 6px 6px 0px #1c1b1b`
   - Level 3: `box-shadow: 8px 8px 0px #1c1b1b`
3. **Tactile Mechanical Physics:** Buttons translate down-right and collapse shadows on `:active`:
   - `hover:-translate-x-0.5 hover:-translate-y-0.5`
   - `active:translate-x-1 active:translate-y-1 active:shadow-none`
4. **Color Hierarchy:**
   - Primary: Radical Magenta (`#b40065` / `#ff1493`)
   - Secondary: Electric Cyan (`#008190` / `#00e5ff`)
   - Tertiary: Sunshine Yellow (`#fae100` / `#ffe243`)
   - Accent: Acid Lime (`#39ff14`), Vivid Orange (`#ff5e00`)
   - Canvas: Warm milk white (`#f5f3ef`) with dot pattern (`memphis-pattern`)
