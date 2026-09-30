"""Publishing streak: consecutive days with an entry, optionally overridden in streak.json."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from showcase import db
from showcase.config import get_settings


def calculate_streak(db_path: db.DbPath = None) -> int:
    """
    Calculates consecutive daily streak:
    - Real number of consecutive days published.
    - Does NOT count today if nothing was published today.
    """
    published = set(db.get_published_dates(db_path))
    if not published:
        return 0
    today = datetime.now().date()
    # Not counting today if there was nothing published yet today
    check_date = today if today.isoformat() in published else today - timedelta(days=1)
    streak = 0
    while check_date.isoformat() in published:
        streak += 1
        check_date -= timedelta(days=1)
    return streak


def _streak_path(streak_file: db.DbPath) -> Path:
    return Path(streak_file) if streak_file else get_settings().streak_file


def _payload(manual_override: int | None, calculated: int) -> dict[str, Any]:
    current = manual_override if (manual_override is not None and manual_override >= 0) else calculated
    return {
        "streak": current,
        "calculated_streak": calculated,
        "manual_override": manual_override,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
    }


def get_streak_data(db_path: db.DbPath = None, streak_file: db.DbPath = None) -> dict[str, Any]:
    """Reads streak.json and returns streak data with real calculated streak."""
    path = _streak_path(streak_file)
    manual_override = None
    if path.exists():
        try:
            manual_override = json.loads(path.read_text(encoding="utf-8")).get("manual_override")
        except (json.JSONDecodeError, OSError, AttributeError):
            pass
    return _payload(manual_override, calculate_streak(db_path))


def save_streak_data(
    manual_override: int | None, db_path: db.DbPath = None, streak_file: db.DbPath = None
) -> dict[str, Any]:
    """Saves streak configuration to streak.json."""
    data = _payload(manual_override, calculate_streak(db_path))
    _streak_path(streak_file).write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data
