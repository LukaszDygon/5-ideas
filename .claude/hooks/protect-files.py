#!/usr/bin/env python3
"""PreToolUse(Edit|Write|MultiEdit): keep file edits inside the repo and away from generated or secret files.

Exit 0 allows the edit; exit 2 blocks it and the stderr text is shown to Claude.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from _lib import project_root, read_payload

DATA_HINT = "data changes go through the project CLI (see AGENTS.md > Commands) or the admin at /admin"
TEMP_DIRS = {Path(tempfile.gettempdir()).resolve(), Path("/tmp").resolve(), Path("/var/folders").resolve()}
ALLOWED_OUTSIDE = TEMP_DIRS | {
    (Path.home() / ".claude" / "projects").resolve()
}  # scratch files, agent memory


def inside(p: Path, base: Path) -> bool:
    return p == base or base in p.parents


def reason_for(p: Path, root: Path) -> str | None:
    if not inside(p, root):
        if any(inside(p, base) for base in ALLOWED_OUTSIDE):
            return None
        return f"{p} is outside the repository"
    rel = p.relative_to(root).as_posix()
    name = p.name
    if rel.startswith("data/") or rel in {"ideas.json", "streak.json"}:
        return f"{rel} is a data file; {DATA_HINT}"
    if name.endswith((".db", ".db-wal", ".db-shm")):
        return f"{rel} is a SQLite database; {DATA_HINT}"
    if rel.startswith("dist/"):
        return "dist/ is build output; rebuild the static site instead"
    if rel.startswith(".baseline/"):
        return ".baseline/ holds read-only restructure snapshots"
    if rel == "uv.lock":
        return "uv.lock is generated; use `uv add`, `uv remove` or `uv lock`"
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        return f"{rel} holds secrets; document new variables in .env.example instead"
    return None


def main() -> int:
    payload = read_payload()
    tool_input = payload.get("tool_input") or {}
    raw = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not raw:
        return 0
    root = project_root(payload)
    cwd = Path(payload.get("cwd") or root)
    p = Path(raw).expanduser()
    p = (p if p.is_absolute() else cwd / p).resolve()
    reason = reason_for(p, root)
    if reason:
        print(f"Blocked by .claude/hooks/protect-files.py: {reason}.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
