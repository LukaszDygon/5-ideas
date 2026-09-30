# AGENTS.md

Single source of truth for AI agents working in the **5 Ideas Daily Showcase** repo. `CLAUDE.md` imports this file.

## What this repo is

Every day: 5 idea "sparks" on a theme, 1 prototype shipped before sundown, all shown on a Radical Memphis Pop site.
FastAPI serves the public site and JSON API, a Flask admin is mounted at `/admin`, data lives in SQLite (stdlib `sqlite3`).
The site is frozen to static HTML and deployed to GitHub Pages under `/5-ideas/`.

## Commands

```bash
uv sync                                                      # install
uv run python main.py                                        # dev server on http://127.0.0.1:8000
uv run pytest -q                                             # tests (run after every code change)
uv run python scripts/get_day_sparks.py --date today         # show a day's sparks (add --idea N, --json)
uv run python scripts/save_implementation.py --idea N ...    # record a shipped prototype
uv run python scripts/capture_process.py --title "Name"      # leak-free AI interaction summary
uv run python scripts/build_static.py --base-path /5-ideas/  # freeze site into dist/
uv run python -m showcase.db                                 # wipe DB and reseed from ideas.json
```

## Repo map

| Path | Purpose |
| :--- | :--- |
| `showcase/config.py` | `Settings` (data dir, secrets) read from the environment |
| `showcase/web.py` | `create_app()` FastAPI factory and the public pages |
| `showcase/api.py` | Core JSON API under `/api` |
| `showcase/admin.py` | `create_admin_app()` Flask admin (CRUD, rankings, streak) mounted at `/admin` |
| `showcase/db.py` | SQLite schema and queries; auto-exports `ideas.json` on write |
| `showcase/registry.py` | Discovers `prototypes/<slug>/prototype.toml` and serves `/interactive/<slug>` |
| `showcase/static_site.py` | Freezes core pages, prototype pages and day pages into `dist/` |
| `showcase/legacy_prototypes.py` | Prototype routes not yet moved into `prototypes/` |
| `main.py` | uvicorn launcher |
| `scripts/` | CLI helpers: sparks, save implementation, capture, static build |
| `prototypes/` | One folder per prototype: manifest, template, `static/`, optional `routes.py` |
| `templates/` | Site templates, `templates/admin/`, and prototype templates awaiting migration |
| `static/` | Shared `static/style.css` and `static/app.js`, plus prototype media and data |
| `tests/` | pytest suite (`tests/conftest.py` isolates the DB per test) |
| `data/` | `data/ideas.json` and `data/streak.json` (committed seed/export), `ideas.db` (local, ignored) |
| `.claude/` | Claude Code settings, rules, hooks, skills |
| `.agents/skills/` | Workflow skills (spec, record, capture) |
| `docs/plan/` | Current restructure plan and its progress tracker |

## Daily workflow

1. Morning: log the theme and five sparks (admin `/admin/day/new`).
2. `/spec-implementation` picks the spark and confirms a build spec.
3. Build the prototype (template + route), keep tests green.
4. `/record-implementation` saves process steps and the retrospective (always ask the user; never invent them).
5. Build the static site, commit, and let the user push.

## Conventions

- Simplicity first: stdlib before packages, native browser APIs before dependencies, minimal code.
- Commits: `feat(YYYY-MM-DD): <what shipped>` for daily work; `refactor:`, `test:`, `docs:`, `chore:` otherwise.
- Data files (`data/ideas.json`, `data/streak.json`, `*.db`) change only through the scripts or the admin.
- UI follows the design system: [README.md#design-system-rules-radical-memphis-pop](README.md#design-system-rules-radical-memphis-pop), live at `/design-system` (`templates/design_system.html`).
- One prototype = one folder under `prototypes/`; its template extends `templates/base.html`.

## Do not

- Hand-edit anything in `data/` (`ideas.json`, `streak.json`, `*.db`).
- Add dependencies without asking.
- Touch `dist/` (build output) or `.baseline/` (restructure snapshots).
- Print, copy or commit secrets (`.env`, `mcp_config.json`). Use `.env.example` for new variables.
- Push, force-push, or rewrite git history.

## Where to look

| Need | Look at |
| :--- | :--- |
| Routes, stack, developer commands | [README.md](README.md) |
| Design tokens and components | `templates/design_system.html`, `static/style.css`, `.claude/rules/design-system.md` |
| Python conventions | `.claude/rules/python.md` |
| Prototype conventions | `.claude/rules/prototypes.md` |
| Schema for `days`, `ideas`, `implementations` | `showcase/db.py` |
| Spec, record, capture workflows | `.agents/skills/` |
| MCP servers (Stitch) | `.mcp.json`; the key comes from `STITCH_API_KEY` (see `.env.example`) |
| Restructure plan and status | `docs/plan/PLAN.md`, `docs/plan/progress.json` |
