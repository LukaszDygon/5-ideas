"""Public HTML pages: home, calendar, stream, day, design system, random."""

from __future__ import annotations

import calendar
import random
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from showcase import db
from showcase.config import Settings

router = APIRouter()
CORE_PAGES = ("/", "/calendar", "/stream", "/design-system")  # frozen by the static build


def _render(request: Request, name: str, context: dict | None = None):
    return request.app.state.templates.TemplateResponse(request=request, name=name, context=context or {})


def _db(request: Request):
    return request.app.state.settings.db_file


@router.get("/", response_class=HTMLResponse)
def home_view(request: Request):
    """Front page: Hero showcase, today's drop, and top-ranked implementations."""
    settings: Settings = request.app.state.settings
    all_days = db.get_all_days(settings.db_file)
    ranked_impls = db.get_ranked_implementations(settings.db_file)
    return _render(
        request,
        "index.html",
        {
            "today_drop": all_days[0] if all_days else None,
            "ranked_implementations": ranked_impls,
            "all_days": all_days,
            "current_streak": db.get_streak_data(settings.db_file, settings.streak_file)["streak"],
            "total_ideas": sum(len(d.get("ideas", [])) for d in all_days),
            "total_shipped": len(ranked_impls),
        },
    )


@router.get("/calendar", response_class=HTMLResponse)
def calendar_view(request: Request, year: int | None = None, month: int | None = None):
    """The biggest view: Interactive month/year calendar selecting days."""
    now = datetime.now()
    cur_year = year or now.year
    cur_month = month or now.month
    weeks = calendar.Calendar(firstweekday=calendar.MONDAY).monthdatescalendar(cur_year, cur_month)
    db_days = {d["date"]: d for d in db.get_calendar_days(cur_year, cur_month, _db(request))}
    return _render(
        request,
        "calendar.html",
        {
            "year": cur_year,
            "month": cur_month,
            "month_name": calendar.month_name[cur_month],
            "weeks": weeks,
            "db_days": db_days,
            "prev_month": cur_month - 1 if cur_month > 1 else 12,
            "prev_year": cur_year if cur_month > 1 else cur_year - 1,
            "next_month": cur_month + 1 if cur_month < 12 else 1,
            "next_year": cur_year if cur_month < 12 else cur_year + 1,
            "today_str": now.strftime("%Y-%m-%d"),
        },
    )


@router.get("/stream", response_class=HTMLResponse)
def stream_view(request: Request):
    """The middle view: Day-by-day scroll of ideas with flexible implementation links."""
    return _render(request, "stream.html", {"days": db.get_all_days(_db(request))})


@router.get("/day/{date_str}", response_class=HTMLResponse)
def day_view(request: Request, date_str: str):
    """Single day deep-dive into the 5 ideas and AI implementation process."""
    day = db.get_day_by_date(date_str, _db(request))
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return _render(request, "day.html", {"day": day, "impl": day.get("implemented_idea")})


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
