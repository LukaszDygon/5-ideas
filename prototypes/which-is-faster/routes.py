"""Extra routes for which-is-faster: the question bank as JSON, and embedded in the page."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

BANK = Path(__file__).parent / "static" / "data" / "fleeting_time_bank.json"

router = APIRouter()


def load_events() -> list[dict]:
    if not BANK.exists():
        return []
    return json.loads(BANK.read_text(encoding="utf-8"))


def page_context(request: Request) -> dict:
    return {"events_json": json.dumps(load_events())}


@router.get("/api/which-is-faster/events")
def api_which_is_faster_events():
    """Returns the verified question bank of fleeting time events."""
    if not BANK.exists():
        raise HTTPException(status_code=404, detail="Question bank not found")
    events = load_events()
    return {"count": len(events), "events": events}
