# Plan: AI-Ready Setup, Repository Restructure, and Test Suite

**Written:** 2026-09-30 · **Progress tracker:** `docs/plan/progress.json` · **Target executor:** a capable coding model working in Claude Code, task by task.

## How to use this plan

1. Read the task's entry here **and** in `progress.json`. Set its `status` to `in_progress` and fill `started`.
2. Do the work. Every task ends with **Verify** steps; all of them must pass.
3. Commit with the message pattern given in the task (one commit per task unless told otherwise), then set `status: done`, `completed`, and `commit` (short SHA) in `progress.json`.
4. If blocked, set `status: blocked` and write why in `notes`. Never skip verification to move on.
5. Respect `depends_on`. The suggested order is P0 → P1a → P2 → P1b → P3 (with the optional T2.8 last), and the `order` field in `progress.json` reflects it.

Ground rules that apply to every task:

- **Simplicity first** (from `AGENTS.md`): stdlib before packages, native browser APIs before dependencies. Do not add a dependency unless the task says so.
- **Tests are the contract.** `uv run pytest` must stay green after every task. Currently 49 tests pass.
- **Data files are never hand-edited.** `ideas.json`, `streak.json`, and `*.db` only change through the scripts/admin.
- **No secrets in git, ever.** A live API key currently sits on disk in `mcp_config.json` and `.agents/plugins/stitch/mcp_config.json` (both gitignored). Do not print, copy, or commit it. Task T0.2 rotates it.
- **Reference facts.** The Claude Code settings, hooks, skills and subagent schemas below come from https://code.claude.com/docs/en/ (settings.md, hooks.md, skills.md, sub-agents.md, memory.md, sandboxing.md). If a key name in this plan disagrees with the docs, the docs win. Check them when implementing P1.

---

## Current state (what the survey found)

Layout today:

```
app.py        FastAPI: all public routes + 2 prototype APIs (21 KB). Uses deprecated @app.on_event.
admin.py      Flask admin mounted at /admin through WSGIMiddleware. Hard-coded secret_key.
db.py         sqlite3 layer. Three near-identical "hydrate day" functions. Auto-exports ideas.json on write.
main.py       uvicorn launcher.
scripts/      build_static.py (hard-coded route list + hard-coded link rewrite list),
              get_day_sparks.py, save_implementation.py, capture_process.py (reads Antigravity/Gemini transcripts).
templates/    6 site templates + admin/ + 15 prototype templates (500–2500 lines each, JS/CSS inlined).
static/       style.css, app.js, ~20 MB of audio/images/data, most of it belonging to single prototypes.
tests/        conftest (monkeypatches three module globals), test_api, test_admin, test_db. 49 tests.
.agents/      skills/ (3 SKILL.md, not read by Claude Code) and plugins/stitch (MCP config with a key).
ideas.json    Seed + export file, committed. ideas.db gitignored. streak.json committed. 5ideas.db stray empty file.
```

Pain points the plan fixes:

- Adding a prototype touches four files by hand: `app.py` (route), `scripts/build_static.py` (route list **and** link-rewrite list), `tests/test_api.py`, plus the template. `house-stats` is missing from the static build because of this.
- Prototype assets are mixed into the shared `static/` tree; prototype templates are monoliths.
- `/api/house-stats/parse-url` contains personal listing data and shells out to an absolute path under the user's home directory.
- Claude Code has no project config: no `CLAUDE.md`, no `.claude/`, skills live where Claude cannot find them, every Bash call prompts.
- Nothing checks that docs, skills, hooks and settings stay valid as the repo evolves.

---

## Target layout

```
CLAUDE.md                      one line: @AGENTS.md (plus Claude-only notes if ever needed)
AGENTS.md                      single source of truth for agents (rewritten in T1.1)
.claude/
  settings.json                committed: permissions, sandbox, hooks
  settings.local.json          gitignored: personal overrides
  hooks/                       small executable scripts (python3/sh), tested
  skills/<name>/SKILL.md       new-day, spec-implementation, new-prototype, record-implementation,
                               capture-implementation, ship, design-system
  agents/                      design-reviewer.md, prototype-qa.md
  rules/                       python.md, prototypes.md, design-system.md (path-scoped)
  state/                       gitignored: session.json written by SessionStart hook
.agents/skills/                symlinks → ../../.claude/skills/* (kept for other tools)
.mcp.json                      project MCP servers, key via ${STITCH_API_KEY}
.env.example                   documented env vars; .env is gitignored
showcase/                      the Python package
  __init__.py
  config.py                    paths & env (DATA_DIR, HOSTED_STATIC, HOUSE_STATS_DIR, ADMIN_SECRET)
  db.py                        connection + schema + queries (deduplicated)
  streak.py                    streak calculation + streak.json IO
  registry.py                  prototype discovery from prototypes/*/prototype.toml
  web.py                       create_app(): FastAPI factory, Jinja env, mounts registry + admin
  api.py                       /api/* router (core only)
  admin.py                     Flask admin (unchanged behaviour)
  static_site.py               build_static() driven by the registry
  cli.py                       `uv run python -m showcase.cli <cmd>`: sparks, new-day, save-impl,
                               capture, new-prototype, build, seed
data/                          ideas.json (committed), streak.json (committed), ideas.db (ignored)
prototypes/<slug>/             prototype.toml, template.html, static/ (js, css, data, media), routes.py (optional)
templates/                     base.html, index, calendar, stream, day, design_system, admin/
static/                        only shared assets: style.css, app.js, images/memphis_poster.svg
scripts/                       thin wrappers kept for backwards compatibility OR removed (T2.10 decides)
tests/
  conftest.py                  builds an app against a tmp data dir via config, no monkeypatching of globals
  unit/                        test_db.py, test_streak.py, test_registry.py, test_cli.py
  web/                         test_pages.py, test_api.py, test_admin.py
  prototypes/                  test_every_prototype.py (parametrized over registry)
  build/                       test_static_site.py
  ai_setup/                    test_instructions.py, test_skills.py, test_settings.py, test_hooks.py,
                               test_agents.py, test_secrets.py, test_docs_freshness.py, test_plan_progress.py
evals/                         optional: claude plugin eval cases (P3, gated)
docs/plan/                     this plan + progress.json
```

---

## Phase 0 — Baseline and hygiene

### T0.1 Golden baseline snapshot
Create a reference to diff against during the restructure.

- Run `uv run pytest -q` and record the count in `progress.json` notes.
- Run `uv run python scripts/build_static.py --base-path /5-ideas/` then copy `dist/` to `.baseline/dist-before/` (add `.baseline/` to `.gitignore`).
- Save the route list: `uv run python -c "from app import app; print('\n'.join(sorted(r.path for r in app.routes)))" > .baseline/routes-before.txt`.

**Verify:** `.baseline/dist-before/index.html` exists; `.baseline/routes-before.txt` lists 19 `/interactive/...` paths plus core routes.
**Commit:** `chore: ignore .baseline snapshots` (only the .gitignore line is committed).

### T0.2 Secret hygiene
- Tell the user the Stitch API key on disk must be rotated in the Google console (the plan cannot do this). Do not display the key.
- Create `.env.example` with `STITCH_API_KEY=`, `FIVE_IDEAS_ADMIN_SECRET=`, `HOUSE_STATS_DIR=`, `FIVE_IDEAS_DATA_DIR=`. Add `.env` to `.gitignore`.
- Create `.mcp.json` (project MCP config Claude Code reads) with the stitch server using `"X-Goog-Api-Key": "${STITCH_API_KEY}"`. Delete `mcp_config.json` and `.agents/plugins/` after the user confirms `.env` holds the key (ask once; if no answer, leave the files but keep them ignored).
- `admin.py`: `secret_key = os.environ.get("FIVE_IDEAS_ADMIN_SECRET", "dev-only-secret")`.
- Delete the stray empty `5ideas.db`.
- Extend `.gitignore`: `.env`, `.claude/settings.local.json`, `.claude/state/`, `.baseline/`, `evals/results/`.

**Verify:** `git ls-files | xargs grep -lE 'AQ\.[A-Za-z0-9_-]{20,}|X-Goog-Api-Key' ` prints nothing; `uv run pytest -q` green; `git status` shows no `.env`.
**Commit:** `chore(security): move MCP key to env, parametrise admin secret`.

---

## Phase 1a — Claude Code core setup (do this early; it makes the rest faster)

### T1.1 CLAUDE.md, AGENTS.md rewrite, and rules
Claude Code (≥ 2.1.277) reads `AGENTS.md` only when no `CLAUDE.md` exists, and `@path` imports work in both. Keep `AGENTS.md` as the single source and make `CLAUDE.md` import it.

- `CLAUDE.md` content: `@AGENTS.md` on its own line, nothing else (comments are fine).
- Rewrite `AGENTS.md` (target ≤ 150 lines) with sections: **What this repo is** (3 lines), **Commands** (the exact `uv run …` commands, one per line, in a code block), **Repo map** (the target layout above, trimmed), **Daily workflow** (morning: `/new-day` → `/spec-implementation` → `/new-prototype` → build → `/record-implementation` → `/ship`), **Conventions** (commit format `feat(YYYY-MM-DD): …`, data files only via CLI, design-system rules link, one prototype = one folder), **Do not** (edit `data/*` by hand, add deps without asking, touch `dist/`, print secrets), **Where to look** (table of paths → purpose, replacing the current documentation index).
- Add `.claude/rules/`:
  - `python.md` (`paths: ["**/*.py"]`): stdlib first, type hints, `ruff format` before commit, no `print` in library code (CLI only), sqlite via `showcase.db` helpers only.
  - `prototypes.md` (`paths: ["prototypes/**"]`): folder contract (`prototype.toml` keys, template must `{% extends "base.html" %}`, inline JS ≤ 200 lines else `static/app.js`, no external CDN scripts except the allowlist in `tests/prototypes`), how data reaches JS (`data-*` attributes or one `<script id="…" type="application/json">`), how to register extra routes (`routes.py` exposing `router = APIRouter()`).
  - `design-system.md` (`paths: ["**/*.html", "**/*.css"]`): the Memphis Pop rules copied from README (borders, hard shadows, active physics, colour tokens) plus class names from `static/style.css` (`neo-btn`, `neo-btn-primary`, …).
- Update the README "Developer Commands" to match (do not duplicate the agent instructions there).

**Verify:** Start `claude` in the repo and run `/memory`: it lists `CLAUDE.md` and shows `AGENTS.md` imported. Open a `.py` file and confirm `python.md` rule loads (visible in `/context`). Every path mentioned in `AGENTS.md` exists (this becomes an automated test in T3.2).
**Commit:** `docs(agents): CLAUDE.md imports AGENTS.md; add path-scoped rules`.

### T1.2 Permissions and sandbox (`.claude/settings.json`)
Goal: Claude works inside this repo without prompts, but cannot reach secrets, the wider filesystem, or destructive git/shell operations. Three layers: **sandbox** (isolation), **permission rules** (authorisation), **hooks** (T1.3, fine-grained guard).

Write `.claude/settings.json` (committed) with this shape; confirm key names against the settings and sandboxing docs when implementing:

```jsonc
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read", "Edit", "Write",
      "Bash(uv run:*)", "Bash(uv sync:*)", "Bash(uv lock:*)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)",
      "Bash(git add:*)", "Bash(git commit:*)", "Bash(git branch:*)", "Bash(git switch:*)",
      "Bash(git checkout:*)", "Bash(git stash:*)", "Bash(git restore:*)", "Bash(git mv:*)",
      "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)", "Bash(tree:*)",
      "Bash(grep:*)", "Bash(rg:*)", "Bash(find:*)", "Bash(sed -n:*)", "Bash(diff:*)",
      "Bash(mkdir:*)", "Bash(cp:*)", "Bash(mv:*)", "Bash(touch:*)", "Bash(ln -s:*)", "Bash(chmod +x:*)",
      "Bash(sqlite3:*)", "Bash(python3 -m json.tool:*)", "Bash(node --check:*)",
      "Bash(curl -s http://127.0.0.1:*)", "Bash(curl -s http://localhost:*)", "Bash(lsof -i:*)",
      "WebFetch(domain:code.claude.com)", "WebFetch(domain:docs.anthropic.com)",
      "WebFetch(domain:fastapi.tiangolo.com)", "WebFetch(domain:flask.palletsprojects.com)",
      "WebFetch(domain:docs.astral.sh)", "WebFetch(domain:developer.mozilla.org)",
      "WebFetch(domain:docs.python.org)"
    ],
    "ask": [
      "Bash(git push:*)", "Bash(uv add:*)", "Bash(uv remove:*)", "Bash(rm:*)",
      "Edit(./.claude/settings.json)", "Edit(./.github/**)", "Edit(./uv.lock)"
    ],
    "deny": [
      "Read(./.env)", "Read(./.env.*)", "Read(**/mcp_config.json)",
      "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/.gnupg/**)", "Read(~/.config/gcloud/**)",
      "Read(~/.claude/**)",
      "Edit(./data/**)", "Write(./data/**)", "Edit(./dist/**)", "Write(./dist/**)",
      "Bash(sudo:*)", "Bash(rm -rf /*)", "Bash(git push --force:*)", "Bash(git push -f:*)",
      "Bash(git reset --hard:*)", "Bash(git clean:*)", "Bash(git rebase:*)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "network": {
      "allowlist": [
        "pypi.org", "files.pythonhosted.org", "github.com", "api.github.com",
        "objects.githubusercontent.com", "fonts.googleapis.com", "fonts.gstatic.com",
        "cdn.tailwindcss.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com",
        "code.claude.com", "docs.anthropic.com"
      ]
    },
    "filesystem": { "denyRead": ["~/.ssh", "~/.aws", "~/.gnupg", "~/.config/gcloud"] }
  },
  "hooks": { /* filled in T1.3 */ }
}
```

Notes for the implementer:
- Deny rules win over allow rules. Bash rules are prefix matches, so `Bash(rm:*)` in `ask` still lets the deny rules block `rm -rf /`.
- `Read(~/.claude/**)` blocks the Read tool, not scripts. The capture script (T1.7) reads the session transcript via Bash, which is intended.
- macOS uses the built-in Seatbelt sandbox; Linux needs `bubblewrap` and `socat`. If `sandbox.enabled` is not honoured on the installed build, remove `autoAllowBashIfSandboxed`; the permission rules and hooks stand on their own.
- Do **not** use `bypassPermissions`. `acceptEdits` plus the allow list gives prompt-free work inside the repo.
- Create `.claude/settings.local.json` only if the user wants machine-specific overrides; it is ignored.

**Verify:**
1. `python3 -m json.tool .claude/settings.json` succeeds (strip the `jsonc` comments first).
2. New `claude` session: `uv run pytest -q`, `git status`, editing a file under `prototypes/` — none prompt.
3. `cat ~/.ssh/config` via Bash and `Read ~/.ssh/config` via the Read tool are both refused. `git push --force` is refused. `uv add requests` prompts.
4. `/permissions` shows the project rules under "Project settings".
**Commit:** `feat(claude): project permissions and sandbox settings`.

### T1.3 Hooks
All hook scripts live in `.claude/hooks/`, are executable, use only python3 stdlib or POSIX sh, read the JSON payload from stdin, and finish in < 2 s (except the Stop test run). Exit 0 = allow, exit 2 = block with the reason on stderr. Register them in `settings.json` under `hooks`.

| Event / matcher | Script | Behaviour |
| :-- | :-- | :-- |
| `SessionStart` | `session-start.py` | Writes `{session_id, transcript_path, cwd, started}` to `.claude/state/session.json`. Prints to stdout (becomes context): git branch + short status, today's date, and today's day entry summary via the sparks CLI if it exists ("no entry for today yet" otherwise). |
| `PreToolUse` matcher `Bash` | `guard-bash.py` | Exit 2 for: `sudo`, `rm -rf` on any path outside the repo or on `/`, `git push --force`/`-f`, `git reset --hard`, `git clean`, `curl … \| sh`/`bash`, any redirection `>` to an absolute path outside the repo, `uv run python db.py` and `python -m showcase.cli seed` without `--yes` (seeding wipes the DB). Everything else exits 0 silently. |
| `PreToolUse` matcher `Edit\|Write\|MultiEdit` | `protect-files.py` | Exit 2 when `tool_input.file_path` resolves outside the repo, or under `data/`, `dist/`, `.baseline/`, `uv.lock`, `.env*`, `*.db`. Reason names the CLI to use instead. |
| `PostToolUse` matcher `Edit\|Write\|MultiEdit` | `post-edit.sh` | `.py` → `uv run ruff format <file>` then `uv run ruff check --fix <file>` (ruff added in T2.9; until then the script checks `uv run ruff --version` and no-ops). `.json` → `python3 -m json.tool` validity check, print a warning line on failure. `.html` under `prototypes/` or `templates/` → compile it with Jinja2 (`python3 -c "…Environment().parse(open(f).read())"`) and warn on syntax errors. Never blocks. |
| `Stop` | `stop-check.py` | If `stop_hook_active` is true in the payload, exit 0 (prevents loops). If `git diff --name-only HEAD` (plus untracked) includes `.py`, `.html` or `.toml` files, run `uv run pytest -q -x --no-header -p no:cacheprovider`; on failure print `{"decision":"block","reason":"<last 20 lines>"}` so Claude fixes it before stopping. Timeout 120 s. |
| `UserPromptSubmit` | `prompt-context.py` | If the prompt contains `today` or a `YYYY-MM-DD`, print one line with today's date and whether an entry exists for it. Cheap, no blocking. |

Also add `"disableAllHooks": false` is unnecessary; just ensure `chmod +x .claude/hooks/*`.

**Verify:**
1. Each script with a sample payload: `echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | .claude/hooks/guard-bash.py; echo $?` → `2`. Same with `uv run pytest` → `0`.
2. `echo '{"tool_name":"Write","tool_input":{"file_path":"data/ideas.json"}}' | .claude/hooks/protect-files.py; echo $?` → `2`; with `prototypes/x/template.html` → `0`.
3. In a live session, ask Claude to run `git push --force`: it reports the hook block. Edit a `.py` file: it is reformatted. Run `/hooks` to see all registered.
4. Break a test on purpose, tell Claude "done": the Stop hook blocks with the failure. Revert.
These become automated in T3.2 (`tests/ai_setup/test_hooks.py`).
**Commit:** `feat(claude): session, guard, protect, post-edit and stop hooks`.

---

## Phase 2 — Structure

### T2.1 Python package `showcase/` with an app factory
- Create `showcase/config.py`: `DATA_DIR = Path(os.environ.get("FIVE_IDEAS_DATA_DIR", ROOT / "data"))`, derived `DB_FILE`, `SEED_FILE`, `STREAK_FILE`; `HOSTED_STATIC`, `HOUSE_STATS_DIR`, `ADMIN_SECRET`. A tiny `Settings` dataclass with a `from_env()` classmethod is enough; no pydantic-settings.
- Move `db.py` → `showcase/db.py`, taking a `Settings`/paths object or explicit `db_path` (keep the `db_path` keyword so tests and CLI stay simple). Remove the module-level `DB_FILE` monkeypatch pattern: functions default to `config.paths()` resolved at call time.
- Move `admin.py` → `showcase/admin.py` with `create_admin_app(settings)`.
- `showcase/web.py`: `create_app(settings=None) -> FastAPI`, lifespan handler replacing `@app.on_event("startup")`, Jinja env with the globals (`is_hosted`, `all_published_dates`, `get_streak`), static mount, admin mount, registry mount (T2.3). Module-level `app = create_app()` for `uvicorn showcase.web:app`.
- `showcase/api.py`: `APIRouter` with `/api/days*`, `/api/implementations*`, `/api/calendar/*`. Prototype-specific APIs move in T2.5.
- Keep `main.py` as the launcher (`uvicorn.run("showcase.web:app", …)`). Delete top-level `app.py`, `admin.py`, `db.py` **after** tests and scripts import the new modules.
- Update `.github/workflows/deploy-pages.yml`, README, AGENTS.md.

**Verify:** `uv run pytest -q` green (tests updated to import `showcase.*`); `uv run python main.py` serves `/`, `/admin`, `/docs`; no `DeprecationWarning` about `on_event` in pytest output; `uv run python -c "import app"` fails (old module gone).
**Commit:** `refactor: move app into showcase/ package with app factory`.

### T2.2 Data directory
- `git mv ideas.json data/ideas.json`, `git mv streak.json data/streak.json`; move the untracked `ideas.db` (and `-wal`/`-shm`) into `data/`. `.gitignore`: `data/*.db*`.
- `config.DATA_DIR` (T2.1) already points there. `build_static` copies `data/streak.json` into `dist/`.

**Verify:** `uv run python -m showcase.cli sparks --date 2026-09-29` (or the script equivalent before T2.10) prints the entry; `git status` shows only the two renames; tests green.
**Commit:** `refactor: move data files under data/`.

### T2.3 Prototype registry
Contract for `prototypes/<slug>/prototype.toml` (parsed with stdlib `tomllib`):

```toml
slug = "which-is-faster"          # must equal folder name; URL is /interactive/<slug>
title = "Which One is Faster?"
date = "2026-09-29"               # day it belongs to
build_type = "interactive"        # webapp | poetry | song | image | interactive
template = "template.html"        # relative to folder; must extend base.html
description = "Survivor trivia showdown …"
extra_paths = []                  # e.g. ["hardware"] → /interactive/campfire/hardware, template hardware.html
routes = false                    # true → import prototypes/<slug>/routes.py, include `router`
```

- `showcase/registry.py`: `discover(root) -> list[Prototype]` (dataclass), validation (slug matches folder, template exists, build_type valid, unique slugs, date format). `register(app, prototypes)`: GET `/interactive/<slug>` (and extra paths) rendering the template with `{"prototype": p}`; mount `prototypes/<slug>/static` at `/static/prototypes/<slug>` when present; include `routes.router` when `routes = true`.
- Jinja loader: `ChoiceLoader([FileSystemLoader("templates"), PrefixLoader({slug: FileSystemLoader(folder)})])` so templates render as `<slug>/template.html` and site templates keep working. Flask admin keeps its own env (it only uses `templates/admin/*` and `base.html`).
- `showcase/static_site.py`: routes = core routes + `registry` routes + `/day/<date>` for each day. Replace the hard-coded `rewrite_html_links` list with one regex over `(href|src|url\()=?"?/` that prefixes root-relative URLs, skipping `//` and `/5-ideas/` already-prefixed ones. Include `house-stats`.
- Tests (`tests/unit/test_registry.py`, `tests/prototypes/test_every_prototype.py`): parametrized over `discover()`: manifest valid, GET returns 200, page contains the site header marker, every `/static/prototypes/<slug>/…` reference in the rendered HTML exists on disk, external `<script src>` hosts ⊆ `{cdnjs.cloudflare.com, cdn.jsdelivr.net, unpkg.com, cdn.tailwindcss.com}`.

**Verify:** With one prototype migrated (do `which-is-faster` first as the pilot, including its `routes.py` for `/api/which-is-faster/events` and its `static/data/fleeting_time_bank.json`): `curl -s localhost:8000/interactive/which-is-faster | head` renders; `uv run pytest -q tests/prototypes` passes; `uv run python -m showcase.cli build` (or script) emits `dist/interactive/which-is-faster/index.html` identical to `.baseline/dist-before/interactive/which-is-faster/index.html` except for asset paths (compare with `diff` after normalising `/static/data/` → `/static/prototypes/which-is-faster/data/`).
**Commit:** `feat(registry): prototype discovery from prototypes/<slug>/prototype.toml (pilot: which-is-faster)`.

### T2.4 Migrate the remaining 14 prototypes
One folder each: `canopy, campfire (extra_paths=["hardware"]), slots1v1, tortoise, house-stats, flute, water-calories, fractiles, mcnuggets, nostalgia-cap, table-steamer, crusade-trail, monster-mystery, neondj`. Use `git mv` for templates and for assets owned by a single prototype (`static/audio/*` → campfire, `static/images/caps` → nostalgia-cap, `static/images/slots` → slots1v1, `static/images/macau_*` → check which template references them, `static/images/mcnugget_*` → mcnuggets, `static/images/table_steamer_setup.jpg` → table-steamer, `static/data/crusade_*` → crusade-trail). Update asset URLs inside each template (`/static/audio/x.mp3` → `/static/prototypes/campfire/audio/x.mp3`). `dates` for each come from `data/ideas.json` (`implemented_idea.implementation.content` or `external_url`). Remove the corresponding routes from `showcase/web.py` and the hard-coded lists. Do it in 3–4 commits of 4–5 prototypes each so a broken page is easy to bisect.

**Verify after each batch:** `uv run pytest -q` green; `grep -rn "/static/audio\|/static/images/caps\|/static/images/slots\|/static/data/" templates prototypes` returns only the new prefixed paths; static build: for every route in `.baseline/routes-before.txt`, `dist/<route>/index.html` exists; `diff -r` of before/after `dist/` shows only asset-path changes (`sed` both sides to normalise `/static/prototypes/<slug>/` → `/static/` before diffing). Open 3 media-heavy pages in a browser (campfire, nostalgia-cap, slots1v1) and confirm audio/images load (no 404s in devtools network tab).
**Commit:** `refactor(prototypes): migrate <batch> into prototypes/` per batch.

### T2.5 Per-prototype routes and the house-stats cleanup
- `prototypes/house-stats/routes.py`: move `/api/house-stats/parse-url` here. Replace the three hard-coded listing presets with `prototypes/house-stats/static/data/sample_listings.json` loaded at request time. Replace the absolute `/Users/lukaszdygon/code/house_stats` with `settings.HOUSE_STATS_DIR` (env, optional; skip the subprocess when unset). Keep the token-based fallback but drop the personal postcode/prices; use obviously synthetic sample values.
- Confirm `which-is-faster` routes (from T2.3 pilot) and remove any remaining prototype-specific code from `showcase/web.py`. `showcase/web.py` should now be under ~150 lines.

**Verify:** `uv run pytest -q` green (existing house-stats test still passes, adjusted to sample data); `grep -rn "lukaszdygon" showcase prototypes` → nothing; `wc -l showcase/web.py` < 150.
**Commit:** `refactor(prototypes): move per-prototype APIs into routes.py; de-personalise house-stats`.

### T2.6 Extract inline JS/CSS for the large prototypes (incremental)
For each prototype whose template has > 200 lines of inline `<script>` (canopy, campfire, slots1v1, house-stats, fractiles, flute, water-calories, nostalgia-cap, crusade-trail, which-is-faster, monster-mystery): move the script body to `prototypes/<slug>/static/app.js` and `<style>` to `static/style.css`, referenced from the template. Where the script used Jinja expressions (e.g. `{{ events_json }}`), emit the data as `<script id="data" type="application/json">{{ … | tojson }}</script>` and read it with `JSON.parse(document.getElementById('data').textContent)`. Keep Three.js/PeerJS CDN tags in the template.

Do one prototype per commit. This task is **should**, not **must**; stop after `which-is-faster`, `crusade-trail`, and `monster-mystery` if time is short, and leave the rest listed in `progress.json` notes.

**Verify per prototype:** `node --check prototypes/<slug>/static/app.js` (if node is installed; otherwise skip) ; page returns 200; open it in a browser and exercise the main interaction (click/play/generate) with the console open: zero errors; `uv run pytest -q tests/prototypes`.
**Commit:** `refactor(<slug>): extract inline JS/CSS to static assets`.

### T2.7 `showcase/db.py` and `showcase/streak.py` cleanup
- Single `_hydrate_day(conn, day_row)` used by `get_all_days`, `get_day_by_date`, `get_day_by_id` (the three bodies are currently copy-pasted). `get_all_days` should fetch ideas and implementations with two queries, not N+1 (keep it simple: two `SELECT … WHERE day_id IN (…)`).
- `contextlib.contextmanager` `connect(db_path)` that closes on exit; use it everywhere.
- Move `calculate_streak`, `get_streak_data`, `save_streak_data` to `showcase/streak.py`.
- Keep function names/signatures used by tests and CLI; this is an internal cleanup.

**Verify:** `uv run pytest -q` green; `grep -c "cursor.execute(\"SELECT \* FROM implementations WHERE idea_id" showcase/db.py` → `1`; `uv run python -m showcase.cli sparks --date 2026-09-29 --json | python3 -m json.tool` output unchanged from before the change (save it first).
**Commit:** `refactor(db): deduplicate hydration, context-managed connections, streak module`.

### T2.8 (optional, could) Fold the Flask admin into FastAPI
Removing Flask + `WSGIMiddleware` leaves one framework and one Jinja env. Port the six admin routes to a FastAPI `APIRouter` under `/admin` with `Form(...)` parsing, a cookie-based flash (or a `?msg=` query) and the same templates. Only do this if T2.1–T2.7 are done and green. Drop `flask` from `pyproject.toml` afterwards.

**Verify:** all admin tests pass against the FastAPI client; manual: create, edit, reorder, delete a day at `/admin`; `uv run pip list | grep -i flask` empty in the venv after `uv sync`.
**Commit:** `refactor(admin): port Flask admin to FastAPI router, drop Flask`.

### T2.9 Tooling and `pyproject.toml`
- Move `pytest`, `httpx` to the `dev` group; add `ruff` there (this is the one new dev dependency the plan allows). Add `[tool.ruff]` (line-length 110, target py313, `select = ["E","F","I","UP","B"]`) and `[tool.ruff.lint.isort]` known-first-party `showcase`. Run `uv run ruff format .` and `uv run ruff check --fix .` once (separate commit, `style:`).
- Fill in the project `description`. Add `[project.scripts] five-ideas = "showcase.cli:main"` so `uv run five-ideas …` works.
- `httpx` → `httpx2` if the Starlette deprecation warning still appears (check the warning text; follow what it says).
- Pytest: `filterwarnings = ["error::DeprecationWarning:showcase.*"]` so our own code cannot regress into deprecated APIs.

**Verify:** `uv run ruff check .` clean; `uv run ruff format --check .` clean; `uv run pytest -q` green with no warnings from `showcase.*`; `uv run five-ideas --help` lists sub-commands (after T2.10).
**Commit:** `chore: ruff config, dev dependency groups, project script`.

### T2.10 CLI consolidation
- `showcase/cli.py` using `argparse` sub-commands: `sparks` (from get_day_sparks), `new-day` (new: `--date --theme --subtitle --notes --idea "title|tagline|description|tags"` ×5, or `--json-file`), `save-impl` (from save_implementation), `capture` (from capture_process, see T1.7), `new-prototype` (new: `--slug --title --date --type`; scaffolds folder, `prototype.toml`, a minimal `template.html` extending base with the design-system hero card, empty `static/`; refuses if slug exists), `build` (from build_static, `--base-path`, `--out`), `seed` (`--yes` required; wipes and reloads from `data/ideas.json`).
- Keep `scripts/*.py` as 3-line shims that call the CLI (so old docs keep working) **or** delete them and update all references (README, AGENTS.md, skills, CI). Pick one; deleting is preferred if T1.4 is done in the same pass.
- Unit tests in `tests/unit/test_cli.py` run each sub-command via `subprocess` against a tmp `FIVE_IDEAS_DATA_DIR`.

**Verify:** `uv run python -m showcase.cli --help` shows all seven commands; `new-prototype --slug demo …` in a tmp copy creates a folder that passes `tests/prototypes`; `new-day` followed by `sparks` round-trips; `seed` without `--yes` exits non-zero with a message.
**Commit:** `feat(cli): single showcase.cli entry point with new-day and new-prototype`.

---

## Phase 1b — Skills, subagents, transcript capture (after the CLI exists)

### T1.4 Skills in `.claude/skills/`
Claude Code does not read `.agents/skills/`. Move the three existing skills to `.claude/skills/<name>/SKILL.md`, then replace `.agents/skills/<name>` with relative symlinks to the new location so other tools still find them. Update every command in them to the T2.10 CLI. Frontmatter must have `name` (= folder), `description` (what + when, ≤ 1024 chars), and `argument-hint` where arguments apply.

New skills:
- `new-day` — `argument-hint: "[YYYY-MM-DD] theme"`. Asks for the theme, subtitle, mood notes, and the five sparks (title, tagline, one-paragraph description, tags) if not given; runs `cli new-day`; shows the result with `cli sparks`. Never invents sparks; asks.
- `new-prototype` — `argument-hint: "<slug> [--date] [--type]"`. Runs `cli new-prototype`, then opens the created `template.html` and reminds of `.claude/rules/prototypes.md` + `design-system.md`. Adds nothing else.
- `ship` — `disable-model-invocation: true` (user-invoked only). Runs `ruff format/check`, `pytest`, `cli build`, then stages and commits with `feat(<date>): <title>` after showing the diff summary; never pushes (push stays an `ask` permission).
- `design-system` — reference-only skill with the token table, the four rules, and 5–6 copy-paste HTML snippets (hero card, neo button, stat tile, section header, badge, two-column layout) taken from `templates/design_system.html`. Loaded on demand when building UI.
- `spec-implementation`, `record-implementation`, `capture-implementation` — migrated, commands updated, keep their "ask before generating retrospective" rules.

**Verify:** `ls -la .agents/skills` shows symlinks; in a session `/new-day`, `/new-prototype`, `/ship` autocomplete; `/skill-doctor` (if available) lists no invalid skills; `uv run pytest tests/ai_setup/test_skills.py` (T3.2) green.
**Commit:** `feat(claude): skills for the daily workflow; .agents/skills symlink to .claude/skills`.

### T1.5 Subagents in `.claude/agents/`
- `design-reviewer.md` — `tools: Read, Grep, Glob`, `model: sonnet`, `permissionMode: plan`. Input: a prototype slug. Checks the template against the design-system rules (borders 3/4 px, hard shadows, `:active` physics, colour tokens, extends base, no soft shadows/blur), basic accessibility (alt text, button labels, contrast of custom colours), and mobile layout hints. Returns a short list of violations with line numbers. No edits.
- `prototype-qa.md` — `tools: Bash, Read, Grep, Glob`, `model: sonnet`, `permissionMode: acceptEdits`. Runs `pytest tests/prototypes -k <slug>`, `cli build`, checks the built page for broken `/static/` references and console-unsafe patterns (inline `onclick` calling undefined functions is fine to skip), and reports pass/fail with the exact commands run.

**Verify:** `/agents` lists both; `@design-reviewer review which-is-faster` returns findings without modifying files (`git status` clean afterwards).
**Commit:** `feat(claude): design-reviewer and prototype-qa subagents`.

### T1.6 MCP project config
Done as part of T0.2 (`.mcp.json` with `${STITCH_API_KEY}`). Here: verify `claude mcp list` shows `stitch` from the project scope and that the server connects when `.env` is populated (or `STITCH_API_KEY` exported). Document in AGENTS.md "Where to look".

**Verify:** `claude mcp list` output includes stitch; `.mcp.json` tracked; `git grep -n "X-Goog-Api-Key"` shows only the `${STITCH_API_KEY}` placeholder.
**Commit:** none if nothing changed; otherwise `docs: MCP setup`.

### T1.7 Claude Code transcript adapter for `capture`
`capture_process.py` reads Antigravity transcripts under `~/.gemini/…`. Add Claude Code support:
- Source: `.claude/state/session.json` (written by the SessionStart hook) → `transcript_path` (a JSONL under `~/.claude/projects/<project-slug>/`). CLI flags: `--source auto|claude|antigravity`, `--transcript <path>`.
- Parsing rules for Claude JSONL: lines with `type == "user"` whose `message.content` is a string (or a list containing `text` blocks) are human prompts; skip entries whose text starts with `<system-reminder>`, `<command-name>`, `<local-command-stdout>` or contains `tool_result`. Lines with `type == "assistant"` and `tool_use` blocks give tool names and `file_path`/`command` inputs for the "tools executed / files modified" summary. Timestamps are not exported. Leak-free rules from the skill apply unchanged.
- Fixture: `tests/fixtures/claude_transcript.jsonl` (8–10 hand-written lines covering the cases above). Unit test asserts the summary contains the clean prompts, excludes the reminder text, lists tool names and file basenames.

**Verify:** `uv run pytest tests/unit/test_capture.py`; live: `uv run python -m showcase.cli capture --title Demo` in a session prints a summary whose "Genesis Prompt" is the first real user message of that session.
**Commit:** `feat(capture): Claude Code transcript source`.

---

## Phase 3 — Test suite

### T3.1 Reorganise tests and fix the fixture design
- Layout as in "Target layout". `tests/conftest.py`: fixture `settings(tmp_path)` builds a `Settings` with `DATA_DIR = tmp_path/"data"`, copies `data/ideas.json` there, and returns it; fixture `client(settings)` → `TestClient(create_app(settings))`; fixture `admin_client`. No `monkeypatch.setattr` on module globals.
- Keep every existing assertion; move tests into the new files. Add `pytest -q --durations=5` to CI output so slow tests are visible.

**Verify:** `uv run pytest -q` count ≥ 49; `grep -rn "monkeypatch.setattr(db" tests` → nothing; running a single file works in isolation (`uv run pytest tests/web/test_admin.py`).
**Commit:** `test: restructure suite around app factory and settings`.

### T3.2 AI-setup quality tests (`tests/ai_setup/`)
"AFDocs" here means **agent-friendly docs and config**: everything an agent relies on is present, valid, consistent, and cheap to load. All tests are plain pytest, stdlib only, no network, < 1 s each.

- `test_instructions.py`: `CLAUDE.md` exists and contains `@AGENTS.md`; `AGENTS.md` ≤ 150 lines and ≤ 1,200 words; every backtick-quoted relative path or `[text](path)` link in `AGENTS.md`, `CLAUDE.md`, `README.md`, `.claude/rules/*.md` resolves to an existing file/dir; every line starting with `uv run` in `AGENTS.md`/`README.md` refers to an existing module/script and `--help` exits 0 (run via subprocess, ≤ 10 commands).
- `test_rules.py`: each `.claude/rules/*.md` has valid frontmatter if present; `paths` globs match at least one file in the repo.
- `test_skills.py`: each `.claude/skills/*/SKILL.md` has frontmatter with `name` == folder, non-empty `description` ≤ 1024 chars; every `uv run …` command in the body points at an existing module/sub-command; `.agents/skills/<name>` is a symlink resolving into `.claude/skills/<name>`; no two skills share a description sentence (copy-paste check).
- `test_settings.py`: `.claude/settings.json` parses; `permissions.allow` contains none of `Bash(*)`, `Bash(:*)`, `bypassPermissions`; `deny` ⊇ required set (`Read(./.env)`, `Read(~/.ssh/**)`, `Bash(sudo:*)`, `Bash(git push --force:*)`, `Edit(./data/**)`); every `hooks.*[].hooks[].command` path exists and is executable; every hook has a `timeout` ≤ 120; `.gitignore` covers `.env`, `.claude/settings.local.json`, `.claude/state/`, `data/*.db*`.
- `test_hooks.py`: table-driven subprocess tests. `guard-bash.py`: deny `git push --force`, `sudo ls`, `rm -rf /`, `curl x | sh`, `echo hi > /etc/hosts`; allow `uv run pytest`, `git status`, `rm -rf dist/`. `protect-files.py`: deny `data/ideas.json`, `../outside.txt`, `dist/index.html`; allow `prototypes/x/template.html`, `showcase/db.py`. `session-start.py`: with a fake payload writes `.claude/state/session.json` in a tmp cwd and prints the date. `stop-check.py`: with `stop_hook_active: true` exits 0 immediately.
- `test_agents.py`: `.claude/agents/*.md` frontmatter has `name` == filename, `description`, `tools` ⊆ known tool names, `model` ∈ {sonnet, opus, haiku, inherit}.
- `test_secrets.py`: over `git ls-files`, no line matches `AQ\.[A-Za-z0-9_-]{20,}`, `AKIA[0-9A-Z]{16}`, `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{30,}`, `-----BEGIN .* PRIVATE KEY`; `.mcp.json` uses `${…}` for every header value.
- `test_docs_freshness.py`: the README route table lists every core route and one row per registry prototype (or a single "see registry" row that links to `prototypes/`); `.claude/rules/prototypes.md` documents every key the registry accepts (compare against the `Prototype` dataclass fields).
- `test_plan_progress.py`: `docs/plan/progress.json` parses; task ids unique; `depends_on` reference existing ids; every `done` task has `completed` and `commit`; every task id in `PLAN.md` headings (`### T…`) exists in the JSON and vice versa. (Delete this test when the plan is finished, or keep it for future plans.)

**Verify:** `uv run pytest -q tests/ai_setup` green and < 15 s total; deliberately break one thing (e.g. add `Bash(*)` to allow) and see the matching test fail; revert.
**Commit:** `test(ai-setup): validate instructions, skills, hooks, settings, agents, secrets, docs`.

### T3.3 Static build and page tests
- `tests/build/test_static_site.py`: run `build_static(out=tmp_path, base_path="/5-ideas/")` (add the `out` parameter if missing); assert an `index.html` exists for every registry route, every day, and the core pages; no `href="/` or `src="/` remains un-prefixed; `dates.json`, `streak.json`, `.nojekyll`, `404.html` exist; every `/5-ideas/static/…` reference resolves to a file under the output.
- `tests/web/test_pages.py`: `/`, `/calendar`, `/stream`, `/day/<latest>`, `/design-system`, `/random` return 200/redirect; the header shows the streak; the day page shows the implemented prototype link for a seeded day.

**Verify:** `uv run pytest -q tests/build tests/web` green; delete a prototype's `static/` folder temporarily and confirm the build test fails; restore.
**Commit:** `test: static build and page rendering coverage`.

### T3.4 CI
- New `.github/workflows/ci.yml` on `pull_request` and `push` to non-main branches: `uv sync`, `uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest -q --durations=5`, `uv run python -m showcase.cli build --base-path /5-ideas/` and upload `dist/` as an artifact.
- `deploy-pages.yml`: reuse the same steps (call the CLI, not `scripts/`), keep deploy on `main` only.
- Optional LLM evals, gated behind `workflow_dispatch` and `ANTHROPIC_API_KEY`: `evals/` cases for `claude plugin eval` (e.g. prompt "How do I add a new prototype?" → grader `regex` expects `new-prototype`; prompt "Record today's build" → `tool_used` expects the record skill) with `--threshold 0.8 --no-publish`. Document the cost in the workflow name. Skip entirely if the eval command is unavailable on the CI build.

**Verify:** open a PR; both jobs green; the `dist` artifact downloads and opens locally with `python3 -m http.server` under `/5-ideas/` base path (links work).
**Commit:** `ci: lint, tests, static build artifact; deploy uses the CLI`.

---

## Definition of done for the whole plan

- `uv run pytest -q` green, ≥ 90 tests, no warnings from `showcase.*`, `tests/ai_setup` present and green.
- A new prototype is added by `cli new-prototype` + editing one folder; no edits to `showcase/`, `scripts/`, or `tests/` are needed, and it appears in the static build and test parametrisation automatically.
- A fresh `claude` session in the repo can run the daily workflow (`/new-day` → `/spec-implementation` → `/new-prototype` → build → `/record-implementation` → `/ship`) without a single permission prompt, and cannot read `~/.ssh`, edit `data/`, or force-push.
- `README.md` and `AGENTS.md` describe the new layout and commands, and the freshness tests prove it.
- `.baseline/` can be deleted.
