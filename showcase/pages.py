"""Public HTML pages: home (final ranking), stream, day, design system, random."""

from __future__ import annotations

import random
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from showcase import db

router = APIRouter()
CORE_PAGES = ("/", "/stream", "/design-system")  # frozen by the static build


def _render(request: Request, name: str, context: dict | None = None):
    return request.app.state.templates.TemplateResponse(request=request, name=name, context=context or {})


def _db(request: Request):
    return request.app.state.settings.db_file


def output_link(impl: dict[str, Any] | None, depth: int = 0) -> dict[str, Any] | None:
    """Where a shipped implementation's main output lives: its prototype page, else its project URL.

    `depth` is how many folders below the site root the linking page sits (home 0, /day/<date> 2),
    so a sibling-site link such as `../power-desk` still resolves from deeper pages.
    """
    if not impl:
        return None
    content, url = impl.get("content") or "", impl.get("external_url") or ""
    for candidate in (content, url):
        if candidate.startswith("/interactive/"):
            return {"url": candidate, "label": "Launch prototype", "icon": "rocket_launch", "external": False}
    if url.startswith(("http://", "https://")):
        on_github = "github.com" in url
        return {
            "url": url,
            "label": "View on GitHub" if on_github else "Open project",
            "icon": "code" if on_github else "open_in_new",
            "external": True,
        }
    if url.startswith("../"):
        return {"url": "../" * depth + url, "label": "Open project", "icon": "open_in_new", "external": True}
    return None


@router.get("/", response_class=HTMLResponse)
def home_view(request: Request):
    """Front page: the project-complete broadcast and the final ranking of every shipped prototype."""
    dates = db.get_published_dates(_db(request))
    return _render(
        request,
        "index.html",
        {
            "ranked_implementations": db.get_ranked_implementations(_db(request)),
            "first_date": dates[-1] if dates else None,
            "last_date": dates[0] if dates else None,
        },
    )


@router.get("/stream", response_class=HTMLResponse)
def stream_view(request: Request):
    """Every day, newest first, with its five sparks and shipped prototype."""
    return _render(request, "stream.html", {"days": db.get_all_days(_db(request))})


@router.get("/day/{date_str}", response_class=HTMLResponse)
def day_view(request: Request, date_str: str):
    """Single day: the shipped prototype first, then the 5 sparks and how it was built."""
    day = db.get_day_by_date(date_str, _db(request))
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    dates = sorted(db.get_published_dates(_db(request)))
    return _render(
        request,
        "day.html",
        {
            "day": day,
            "impl": day.get("implemented_idea"),
            "day_number": dates.index(date_str) + 1,
            "total_days": len(dates),
        },
    )


@router.get("/design-system", response_class=HTMLResponse)
def design_system_view(request: Request):
    """General-purpose design system reference and interactive component sandbox."""
    return _render(request, "design_system.html")


@router.get("/random", response_class=RedirectResponse)
def random_day(request: Request):
    """Jump to a random day."""
    all_days = db.get_all_days(_db(request))
    if not all_days:
        return RedirectResponse(url="/")
    return RedirectResponse(url=f"/day/{random.choice(all_days)['date']}")
