---
name: ship
description: >-
  Final gate for the day's work: formats and lints, runs the tests, rebuilds the
  static site, shows the diff summary, then makes one local feat(<date>) commit.
  Never pushes. Only runs when the user invokes /ship.
disable-model-invocation: true
argument-hint: "[YYYY-MM-DD] [commit title]"
---

# Ship

Stops at the first failing step and reports it; does not "fix forward" silently.

1. **Format and lint**
   ```bash
   uv run ruff format .
   uv run ruff check .
   ```
2. **Test**
   ```bash
   uv run pytest -q
   ```
3. **Build** (catches broken pages and missing assets)
   ```bash
   uv run five-ideas build --base-path /5-ideas/
   ```
   `dist/` is build output and stays uncommitted.
4. **Review:** run `git status` and `git diff --stat`, list what will be committed (normally `prototypes/<slug>/`, `data/ideas.json`, `data/streak.json`), and flag anything unexpected such as `.env`, `*.db` or unrelated files.
5. **Commit** after the user agrees to the file list and message. Stage paths explicitly (no `git add -A`):
   ```bash
   git add prototypes/<slug> data/ideas.json
   git commit -m "feat(<date>): <what shipped>"
   ```
6. **Stop.** Do not push. Tell the user the branch is ready and that pushing (`git push`) is theirs to run.
