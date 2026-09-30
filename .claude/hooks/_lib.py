"""Shared helpers for the project hooks (stdlib only)."""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path


def read_payload() -> dict:
    try:
        return json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return {}


def project_root(payload: dict | None = None) -> Path:
    """CLAUDE_PROJECT_DIR when Claude Code runs the hook, else the payload cwd, else the repo holding this file."""
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    if payload and payload.get("cwd"):
        return Path(payload["cwd"]).resolve()
    return Path(__file__).resolve().parents[2]


def load_days(root: Path) -> list[dict]:
    """Days from the committed JSON export (cheap; no database or uv needed)."""
    for candidate in (root / "data" / "ideas.json", root / "ideas.json"):
        if candidate.exists():
            try:
                return json.loads(candidate.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return []
    return []


def day_summary(days: list[dict], date_str: str) -> str | None:
    day = next((d for d in days if d.get("date") == date_str), None)
    if not day:
        return None
    impl = day.get("implemented_idea") or {}
    shipped = (impl.get("implementation") or {}).get("title")
    status = f"shipped: {shipped}" if shipped else "prototype in progress"
    return f"{date_str}: {day.get('theme', '?')} ({len(day.get('ideas', []))} sparks, {status})"


def today() -> str:
    return date.today().isoformat()
