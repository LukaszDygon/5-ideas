# 5 Ideas Daily Showcase

A modern web application and general-purpose design system built with **Python**, **uv**, **FastAPI**, **Flask**, and **stdlib SQLite**, faithfully implementing the **Radical Memphis Pop** aesthetic from the Stitch showcase designs.

## Key Features

- **Daily 5 Ideas + 1 Shipped Prototype:** Each day is anchored to a date and theme with 5 spark ideas, where 1 is built and deployed.
- **Top-Ranked Implementations ("Builder's Favorites"):** Front page greets visitors with the implementations you ranked highest in the admin panel.
- **Calendar View (The Biggest View):** Full monthly grid with month/year navigation, streak counters, idea pips, and direct day selectors.
- **Day-by-Day Stream (The Middle View):** Continuous chronological feed featuring flexible media renderers:
  - `webapp`: Interactive iframe / live app launcher
  - `poetry`: Neo-brutalist typewriter zine layout
  - `song`: Cassette player with Web Audio 8-bit chiptune synthesizer & animated EQ bars
  - `image`: Vector SVG procedural art poster viewer
  - `interactive`: Embedded app simulator (includes live NeonDJ 90s vinyl scratch deck!)
- **Flask Admin Panel (`/admin`):** Full CRUD for daily drops and a quick-save table to reorder implementation rankings.
- **Design System Catalog (`/design-system`):** Reusable tokens, buttons, badges, hard shadows (`4px 4px 0px #1c1b1b`), and interactive sandbox to render custom content.
- **Implementation Capture Skill (`.agents/skills/capture-implementation`):** Scans conversation transcripts and produces presentable process summaries, prompts, turn counts, and retrospectives ("What Rocked vs What Broke").

---

## Quickstart

```bash
# 1. Install dependencies and initialize venv
uv sync

# 2. Run the application
uv run python main.py
# Server will start on http://127.0.0.1:8000

# 3. Run test suite
uv run pytest
```

---

## Route Overview

| URL | Description | Engine |
| :--- | :--- | :--- |
| `/` | Front page with Top Picks & Today's Drop | FastAPI |
| `/calendar` | Interactive full-month archive calendar (Biggest View) | FastAPI |
| `/stream` | Continuous scroll feed with flexible media viewers | FastAPI |
| `/day/{date}` | Daily deep-dive with retrospective and prompt logs | FastAPI |
| `/design-system` | General-purpose Memphis Pop UI component reference | FastAPI |
| `/interactive/neondj` | Live Web Audio 90s turntable & synth simulator | FastAPI |
| `/admin` | Flask Admin dashboard & ranking manager | Flask (via WSGI) |
| `/docs` | Interactive Swagger API documentation | FastAPI |
