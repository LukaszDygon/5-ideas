# 5 Ideas Daily Showcase

A modern web application and general-purpose design system inspired by the 90s Radical Memphis Pop aesthetic (Milan Memphis geometry, MTV-era pop typography, comic-book pitch black borders, and hard zero-blur offset shadows).

Every day:
1. Sparks **5 wild ideas** based on a morning theme.
2. **1 prototype is shipped** before sundown (webapp, poetry zine, 8-bit chiptune song, generative image, or interactive widget).
3. **Top-Ranked Implementations** welcome visitors in order of builder preference.
4. **Calendar View** provides interactive monthly archive navigation.
5. **Day-By-Day Stream** displays chronological ideas with flexible embedded renderers.
6. **Flask Admin** (`/admin`) provides full CRUD content management and one-click ranking reordering.

---

## Tech Stack & Architecture

- **Runtime & Package Manager:** Python `>=3.13` managed with `uv`.
- **Web & API Framework:** `FastAPI` (ASGI) for public routes, REST API, Swagger `/docs`, and static files.
- **Admin Panel Framework:** `Flask` (WSGI) mounted at `/admin` via Starlette `WSGIMiddleware`.
- **Database:** Python stdlib `sqlite3` (`ideas.db`) in WAL mode with foreign keys and zero external ORM bloat.
- **Design System:** Radical Memphis Pop neo-brutalist Tailwind CSS + custom tokens (`style.css`), Bricolage Grotesque, Space Grotesk, and JetBrains Mono.
- **Testing:** `pytest` + `httpx` (`TestClient`).

---

## Developer Commands

```bash
# Install dependencies
uv sync

# Run development server (FastAPI + Flask admin on port 8000)
uv run uvicorn app:app --reload --port 8000
# Or: uv run python main.py

# Run test suite
uv run pytest

# Re-seed SQLite demo database from ideas.json
uv run python db.py

# Freeze static bundle for GitHub Pages / static CDN
uv run python scripts/build_static.py

# Inspect day entry and sparks (defaults to today)
uv run python scripts/get_day_sparks.py --date today
uv run python scripts/get_day_sparks.py --date today --idea 2

# Record shipped prototype into database
uv run python scripts/save_implementation.py --date today --idea 2 --title "Prototype" --type webapp

# Capture AI + human implementation turns from transcripts
uv run python scripts/capture_process.py --title "Prototype Name" --type webapp
```

---

## Route Overview

| URL | Description | Engine |
| :--- | :--- | :--- |
| `/` | Front page with Top Picks showcase & today's drop | FastAPI |
| `/calendar` | Interactive full-month archive calendar (The Biggest View) | FastAPI |
| `/stream` | Continuous scroll feed with flexible media viewers | FastAPI |
| `/day/{date}` | Daily deep-dive with retrospective and prompt logs | FastAPI |
| `/design-system` | Reusable Memphis Pop UI component reference & sandbox | FastAPI |
| `/interactive/neondj` | Live Web Audio 90s vinyl turntable & synth simulator | FastAPI |
| `/admin` | Flask Admin dashboard & ranking manager | Flask (via WSGI) |
| `/admin/day/new` | Create daily drop (morning sparks or shipped build) | Flask |
| `/admin/day/{date}/edit`| Edit daily entry, ideas, and prototype details | Flask |
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
