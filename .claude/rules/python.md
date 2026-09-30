---
paths:
  - "**/*.py"
---

# Python conventions

- Stdlib first (`sqlite3`, `argparse`, `tomllib`, `json`, `pathlib`). Ask before adding a dependency.
- Type hints on public functions; `from __future__ import annotations` at the top of modules.
- Format and lint before committing: `uv run ruff format <file>` and `uv run ruff check --fix <file>`.
- No `print` in library code. Only CLI entry points print; libraries return values or raise.
- Talk to SQLite only through the helpers in `showcase/db.py`; never open ad-hoc connections elsewhere.
- Paths come from `showcase/config.py`, never from the current working directory. Pass a `Settings` explicitly;
  only entry points (dev server, CLI) call `Settings.from_env()`.
  Pass `settings.db_file` explicitly in app code; the `db_path=None` default is for the CLI.
- Tests live under `tests/` and run with `uv run pytest -q`. New behaviour gets a test. Tests never set or read
  environment variables: use the `settings` / `client` fixtures and pass `--data-dir` to CLI subprocesses.
