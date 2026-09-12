"""
FastAPI application for 5 Ideas Daily Showcase.
Mounts Flask Admin via WSGIMiddleware and serves public routes, API, and design system.
"""

from __future__ import annotations

import calendar
from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from starlette.middleware.wsgi import WSGIMiddleware

from admin import admin_app
import db

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app = FastAPI(
    title="5 Ideas Daily Showcase",
    description="Daily 5 ideas based on a theme, with 1 implemented prototype. Neo-Brutalist 90s Memphis Pop Design System.",
    version="1.0.0",
)

# Mount Static Files
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount Flask Admin at /admin
app.mount("/admin", WSGIMiddleware(admin_app))

class _HostedCheck:
    def __bool__(self) -> bool:
        return os.getenv("HOSTED_STATIC") == "1"

    def __call__(self) -> bool:
        return self.__bool__()


def _get_published_dates() -> list[str]:
    return [d["date"] for d in db.get_all_days()]


def _get_active_streak() -> int:
    return db.get_streak_data()["streak"]


# Jinja2 Templates for FastAPI
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
templates.env.globals["is_hosted"] = _HostedCheck()
templates.env.globals["all_published_dates"] = _get_published_dates
templates.env.globals["get_streak"] = _get_active_streak


# ---------------------------------------------------------------------------
# Pydantic Schemas for API
# ---------------------------------------------------------------------------
class IdeaIn(BaseModel):
    idea_number: int
    title: str
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    tags: Optional[str] = ""
    icon: Optional[str] = "lightbulb"
    is_implemented: Optional[bool] = False
    implementation: Optional[Dict[str, Any]] = None


class DayIn(BaseModel):
    date: str
    theme: str
    subtitle: Optional[str] = ""
    streak_count: Optional[int] = 1
    notes: Optional[str] = ""
    ideas: List[IdeaIn]


class RankUpdate(BaseModel):
    rank: int


# ---------------------------------------------------------------------------
# Public Web Routes
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    db.init_db()
    # If db is empty, seed demo data
    if not db.get_all_days():
        db.seed_demo_data()


@app.get("/", response_class=HTMLResponse)
async def home_view(request: Request):
    """Front page: Hero showcase, today's drop, and top-ranked implementations."""
    all_days = db.get_all_days()
    today_drop = all_days[0] if all_days else None
    ranked_impls = db.get_ranked_implementations()

    # Top ranked implementations to welcome user
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "today_drop": today_drop,
            "ranked_implementations": ranked_impls,
            "all_days": all_days,
            "current_streak": db.get_streak_data()["streak"],
            "total_ideas": sum(len(d.get("ideas", [])) for d in all_days),
            "total_shipped": len(ranked_impls),
        },
    )


@app.get("/calendar", response_class=HTMLResponse)
async def calendar_view(request: Request, year: Optional[int] = None, month: Optional[int] = None):
    """The biggest view: Interactive month/year calendar selecting days."""
    now = datetime.now()
    cur_year = year or now.year
    cur_month = month or now.month

    # Get calendar matrix
    cal = calendar.Calendar(firstweekday=calendar.MONDAY)
    month_days = cal.monthdatescalendar(cur_year, cur_month)

    # Fetch day records for this month
    db_days = {d["date"]: d for d in db.get_calendar_days(cur_year, cur_month)}

    # Month navigation links
    prev_month = cur_month - 1 if cur_month > 1 else 12
    prev_year = cur_year if cur_month > 1 else cur_year - 1
    next_month = cur_month + 1 if cur_month < 12 else 1
    next_year = cur_year if cur_month < 12 else cur_year + 1

    month_name = calendar.month_name[cur_month]

    return templates.TemplateResponse(
        request=request,
        name="calendar.html",
        context={
            "year": cur_year,
            "month": cur_month,
            "month_name": month_name,
            "weeks": month_days,
            "db_days": db_days,
            "prev_month": prev_month,
            "prev_year": prev_year,
            "next_month": next_month,
            "next_year": next_year,
            "today_str": now.strftime("%Y-%m-%d"),
        },
    )


@app.get("/stream", response_class=HTMLResponse)
async def stream_view(request: Request):
    """The middle view: Day-by-day scroll of ideas with flexible implementation links."""
    days = db.get_all_days()
    return templates.TemplateResponse(
        request=request,
        name="stream.html",
        context={
            "days": days,
        },
    )


@app.get("/day/{date_str}", response_class=HTMLResponse)
async def day_view(request: Request, date_str: str):
    """Single day deep-dive into the 5 ideas and AI implementation process."""
    day = db.get_day_by_date(date_str)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    return templates.TemplateResponse(
        request=request,
        name="day.html",
        context={
            "day": day,
            "impl": day.get("implemented_idea"),
        },
    )


@app.get("/design-system", response_class=HTMLResponse)
async def design_system_view(request: Request):
    """General-purpose design system reference and interactive component sandbox."""
    return templates.TemplateResponse(
        request=request,
        name="design_system.html",
        context={},
    )


@app.get("/interactive/neondj", response_class=HTMLResponse)
async def interactive_neondj(request: Request):
    """Interactive vinyl turntable and synth matrix showcase application."""
    return templates.TemplateResponse(
        request=request,
        name="neondj.html",
        context={},
    )


@app.get("/interactive/canopy", response_class=HTMLResponse)
async def interactive_canopy(request: Request):
    """3D procedural rooftop canopy growing algorithm simulation."""
    return templates.TemplateResponse(
        request=request,
        name="canopy.html",
        context={},
    )


@app.get("/interactive/campfire", response_class=HTMLResponse)
async def interactive_campfire(request: Request):
    """3D LED block campfire installation simulation."""
    return templates.TemplateResponse(
        request=request,
        name="campfire.html",
        context={},
    )


@app.get("/interactive/campfire/hardware", response_class=HTMLResponse)
async def interactive_campfire_hardware(request: Request):
    """Physical hardware engineering blueprint and build guide for LED block campfire."""
    return templates.TemplateResponse(
        request=request,
        name="campfire_hardware.html",
        context={},
    )



@app.get("/random", response_class=RedirectResponse)
async def random_day():
    """Jump to a random day or top implementation."""
    all_days = db.get_all_days()
    if not all_days:
        return RedirectResponse(url="/")
    import random
    chosen = random.choice(all_days)
    return RedirectResponse(url=f"/day/{chosen['date']}")


# ---------------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/days", response_model=List[Dict[str, Any]])
async def api_get_days():
    return db.get_all_days()


@app.get("/api/days/{date_str}")
async def api_get_day(date_str: str):
    day = db.get_day_by_date(date_str)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


@app.post("/api/days")
async def api_create_day(day_in: DayIn):
    ideas_dict = [idea.dict() for idea in day_in.ideas]
    day_id = db.save_day(
        date_str=day_in.date,
        theme=day_in.theme,
        subtitle=day_in.subtitle or "",
        streak_count=day_in.streak_count or 1,
        notes=day_in.notes or "",
        ideas_data=ideas_dict,
    )
    return {"status": "success", "day_id": day_id, "date": day_in.date}


@app.get("/api/implementations")
async def api_get_ranked_implementations():
    return db.get_ranked_implementations()


@app.put("/api/implementations/{impl_id}/rank")
async def api_update_rank(impl_id: int, payload: RankUpdate):
    db.update_implementation_rank(impl_id, payload.rank)
    return {"status": "success", "impl_id": impl_id, "new_rank": payload.rank}


@app.get("/api/calendar/{year}/{month}")
async def api_get_calendar(year: int, month: int):
    return db.get_calendar_days(year, month)
