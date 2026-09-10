# AGENTS.md — 5 Ideas Daily Showcase

## Project Overview
**5 Ideas Daily Showcase** is a modern, high-energy experimental laboratory website inspired by the 90s Radical Memphis Pop aesthetic (Milan Memphis geometry, MTV-era pop typography, comic-book pitch black borders, and hard zero-blur offset shadows).

Every day:
1. Sparks **5 wild ideas** based on a morning theme.
2. **1 prototype is shipped** before sundown (can be a webapp, poetry zine, 8-bit chiptune song, generative image, or interactive widget).
3. The front page displays **Top-Ranked Implementations** in order of builder preference to welcome visitors.
4. **Calendar View** is the biggest view, allowing interactive date selection.
5. **Day-By-Day Stream** is the middle view, displaying chronological ideas with flexible embedded media renderers.
6. **Flask Admin** (`/admin`) provides full CRUD content management and one-click ranking reordering.

---

## Tech Stack & Architecture

- **Python Runtime:** Python `>=3.14` managed with `uv`.
- **Web & API Framework:** `FastAPI` (ASGI) for public routes, REST API, Swagger `/docs`, and static files.
- **Admin Panel Framework:** `Flask` (WSGI) mounted cleanly at `/admin` via Starlette `WSGIMiddleware`.
- **Database:** Python stdlib `sqlite3` (`ideas.db`) with WAL mode, foreign keys, and zero external ORM bloat.
- **Design System:** Radical Memphis Pop neo-brutalist Tailwind + custom CSS tokens, Bricolage Grotesque, Space Grotesk, and JetBrains Mono.
- **Test Suite:** `pytest` + `httpx` (`TestClient`).

---

## Developer Commands

```bash
# Run the application (FastAPI + Flask admin on port 8000)
uv run uvicorn app:app --reload --port 8000

# Run test suite
uv run pytest

# Initialize and reseed SQLite demo database
uv run python db.py

# Capture AI + Human implementation process from transcripts
uv run python scripts/capture_process.py --title "Prototype Name" --type webapp
```

---

## Design System Rules (Radical Memphis Pop)

1. **Strokes & Borders:** Always use 3px (`border-[3px] border-ink`) or 4px (`border-[4px] border-ink`) solid `#1c1b1b` outlines.
2. **Elevation & Depth:** Never use soft blurred drop-shadows or translucent frosted glass. Depth is mechanical hard offsets:
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

---

## Available Skills & Tools

- `.agents/skills/capture-implementation/SKILL.md`: Run at the conclusion of building an idea to extract genesis prompts, conversation turns, architecture steps, and retrospective into the daily showcase.
