---
paths:
  - "**/*.py"
---

# Python conventions

- Stdlib first (`sqlite3`, `argparse`, `tomllib`, `json`, `pathlib`). Ask before adding a dependency.
- Type hints on public functions; `from __future__ import annotations` at the top of modules.
- Format and lint before committing: `uv run ruff format <file>` and `uv run ruff check --fix <file>`.
- No `print` in library code. Only CLI entry points print; libraries return values or raise.
- Talk to SQLite only through the helpers in `db.py`; never open ad-hoc connections elsewhere.
- Paths come from module constants built on `Path(__file__)`, never from the current working directory.
- Tests live under `tests/` and run with `uv run pytest -q`. New behaviour gets a test.
