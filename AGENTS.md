# AGENTS.md

Single source of truth for AI agents working in the **5 Ideas Daily Showcase** repo. `CLAUDE.md` imports this file.

## What this repo is

Every day: 5 idea "sparks" on a theme, 1 prototype shipped before sundown, all shown on a Radical Memphis Pop site.
FastAPI serves the public site, the JSON API and the admin at `/admin`; data lives in SQLite (stdlib `sqlite3`).
The site is frozen to static HTML and deployed to GitHub Pages under `/5-ideas/`.

## Commands

```bash
uv sync                                                    # install (dev tools included)
uv run python main.py                                      # dev server on http://127.0.0.1:8000
uv run pytest -q                                           # tests (run after every code change)
uv run ruff check . && uv run ruff format .                # lint and format
uv run five-ideas --help                                   # the daily-workflow CLI (showcase/cli.py):
uv run five-ideas new-day --theme "..." --idea "title|tagline|description|tags"   # x5
uv run five-ideas sparks --date today                      # show a day's sparks (--idea N, --json)
uv run five-ideas new-prototype --slug my-idea --title "My Idea"
uv run five-ideas save-impl --idea N ...                   # record the shipped prototype
uv run five-ideas capture --title "Name"                   # leak-free AI interaction summary
uv run five-ideas build --base-path /5-ideas/              # freeze the site into dist/
uv run five-ideas seed --yes                               # wipe the DB and reload data/ideas.json
```

## Repo map

| Path | Purpose |
| :--- | :--- |
| `showcase/config.py` | `Settings` (data dir, secrets) read from the environment |
| `showcase/web.py` | `create_app()` FastAPI factory: templates, registry, static, admin mounts |
| `showcase/pages.py` | Public HTML pages (home, calendar, stream, day, design system) |
| `showcase/api.py` | Core JSON API under `/api` |
| `showcase/admin.py` | Admin router at `/admin` (CRUD, rankings, streak; cookie flash messages) |
| `showcase/db.py` | SQLite schema and queries; auto-exports `ideas.json` on write |
| `showcase/cli.py` | `five-ideas` CLI: sparks, new-day, save-impl, capture, new-prototype, build, seed |
| `showcase/capture.py` | Transcript parsing for leak-free AI interaction summaries |
| `showcase/streak.py` | Publishing streak (consecutive days) and the `data/streak.json` override |
| `showcase/registry.py` | Discovers `prototypes/<slug>/prototype.toml` and serves `/interactive/<slug>` |
| `showcase/static_site.py` | Freezes core pages, prototype pages and day pages into `dist/` |
| `main.py` | uvicorn launcher |
| `prototypes/` | One folder per prototype: manifest, template, `static/`, optional `routes.py` |
| `templates/` | Site templates (`templates/base.html` and friends) and `templates/admin/` |
| `static/` | Shared assets only: `static/style.css`, `static/app.js`, `static/images/` |
| `tests/` | pytest suite (`tests/conftest.py` isolates the DB per test) |
| `data/` | `data/ideas.json` and `data/streak.json` (committed seed/export), `ideas.db` (local, ignored) |
| `.claude/` | Claude Code rules, hooks and skills (`.claude/skills/`) |
| `.agents/skills/` | Symlinks to `.claude/skills/` for other agent tools |
| `docs/plan/` | Current restructure plan and its progress tracker |

## Daily workflow

1. `/new-day` logs the theme and five sparks (`five-ideas new-day`).
2. `/spec-implementation` picks the spark and confirms a build spec.
3. `/new-prototype <slug>` scaffolds `prototypes/<slug>/`; build it there and keep `uv run pytest -q` green.
4. `/record-implementation` saves process steps and the retrospective (always ask the user; never invent them);
   `/capture-implementation` adds the leak-free AI interaction summary.
5. `/ship` (user-invoked) formats, tests, builds and commits locally; the user pushes.

## Conventions

- Simplicity first: stdlib before packages, native browser APIs before dependencies, minimal code.
- Commits: `feat(YYYY-MM-DD): <what shipped>` for daily work; `refactor:`, `test:`, `docs:`, `chore:` otherwise.
- Data files (`data/ideas.json`, `data/streak.json`, `*.db`) change only through `five-ideas` or the admin.
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
| Review a prototype | subagents `design-reviewer` (design + a11y, read-only) and `prototype-qa` (tests, build, assets) in `.claude/agents/` |
| Prototype conventions | `.claude/rules/prototypes.md` |
| Schema for `days`, `ideas`, `implementations` | `showcase/db.py` |
| Daily-workflow skills and UI snippets | `.claude/skills/` (`design-system` holds copy-paste components) |
| MCP servers (Stitch) | `.mcp.json`; export `STITCH_API_KEY` (see `.env.example`) before starting `claude`, approve the server once |
| Restructure plan and status | `docs/plan/PLAN.md`, `docs/plan/progress.json` |
