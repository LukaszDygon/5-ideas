#!/usr/bin/env python3
"""PostToolUse(Edit|Write|MultiEdit): format Python, sanity-check JSON and Jinja templates.

Never blocks (the edit already happened). Problems are reported with exit 2 so Claude sees them.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from _lib import project_root, read_payload

JINJA_CHECK = "import sys, jinja2; jinja2.Environment().parse(open(sys.argv[1], encoding='utf-8').read())"


def run(cmd: list[str], root: Path) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=25)


def check(p: Path, root: Path) -> str | None:
    venv_bin = root / ".venv" / "bin"
    if p.suffix == ".py":
        ruff = venv_bin / "ruff"
        if not ruff.exists():
            return None  # ruff not installed yet
        run([str(ruff), "format", "--quiet", str(p)], root)
        result = run([str(ruff), "check", "--fix", "--quiet", str(p)], root)
        return result.stdout.strip() or None if result.returncode else None
    if p.suffix == ".json":
        try:
            json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            return f"invalid JSON in {p.name}: {exc}"
        return None
    rel = p.relative_to(root).as_posix() if root in p.parents else ""
    if p.suffix == ".html" and rel.startswith(("prototypes/", "templates/")):
        python = venv_bin / "python"
        if not python.exists():
            return None
        result = run([str(python), "-c", JINJA_CHECK, str(p)], root)
        if result.returncode:
            return f"Jinja syntax error in {rel}: {result.stderr.strip().splitlines()[-1]}"
    return None


def main() -> int:
    payload = read_payload()
    tool_input = payload.get("tool_input") or {}
    raw = tool_input.get("file_path")
    if not raw:
        return 0
    root = project_root(payload)
    p = Path(raw)
    p = (p if p.is_absolute() else root / p).resolve()
    if not p.is_file():
        return 0
    try:
        problem = check(p, root)
    except (OSError, subprocess.TimeoutExpired) as exc:
        problem = f"post-edit check could not run: {exc}"
    if problem:
        print(f"post-edit: {problem}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
