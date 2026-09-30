"""FastAPI application factory: public pages, JSON API, Flask admin, prototypes.

`uvicorn showcase.web:app` serves the module-level app built from the environment;
tests and the static build call `create_app(settings)` directly.
"""

from __future__ import annotations

import calendar
import random
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import ChoiceLoader
from starlette.middleware.wsgi import WSGIMiddleware

from showcase import api, db, legacy_prototypes, registry
from showcase.admin import create_admin_app
from showcase.config import STATIC_DIR, TEMPLATES_DIR, Settings, is_hosted


class _HostedCheck:
    """Truthy while freezing the static site; works as `{% if is_hosted %}` and `is_hosted()`."""

    def __bool__(self) -> bool:
        return is_hosted()

    def __call__(self) -> bool:
        return is_hosted()


def create_templates(settings: Settings, prototypes: list[registry.Prototype]) -> Jinja2Templates:
    templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
    # Site templates by name ("base.html"), prototype templates as "<slug>/template.html".
    templates.env.loader = ChoiceLoader([templates.env.loader, registry.template_loader(prototypes)])
    templates.env.globals["is_hosted"] = _HostedCheck()
    templates.env.globals["all_published_dates"] = lambda: [d["date"] for d in db.get_all_days(settings.db_file)]
    templates.env.globals["get_streak"] = lambda: db.get_streak_data(settings.db_file, settings.streak_file)["streak"]
    return templates


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db.ensure_database(settings.db_file, settings.seed_file)
        yield

    app = FastAPI(
        title="5 Ideas Daily Showcase",
        description="Daily 5 ideas based on a theme, with 1 implemented prototype. "
        "Neo-Brutalist 90s Memphis Pop Design System.",
        version="1.0.0",
        lifespan=lifespan,
    )
    prototypes = registry.discover()
    app.state.settings = settings
    app.state.prototypes = prototypes
    app.state.templates = create_templates(settings, prototypes)
    registry.register(app, prototypes)  # before the /static mount so /static/prototypes/<slug> wins
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    app.mount("/admin", WSGIMiddleware(create_admin_app(settings)))
    app.include_router(api.router)
    app.include_router(pages)
    app.include_router(legacy_prototypes.router)
    return app


pages = APIRouter()
CORE_PAGES = ("/", "/calendar", "/stream", "/design-system")  # frozen by the static build


def _render(request: Request, name: str, context: dict | None = None):
    return request.app.state.templates.TemplateResponse(request=request, name=name, context=context or {})


def _db(request: Request):
    return request.app.state.settings.db_file


@pages.get("/", response_class=HTMLResponse)
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


@pages.get("/calendar", response_class=HTMLResponse)
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


@pages.get("/stream", response_class=HTMLResponse)
def stream_view(request: Request):
    """The middle view: Day-by-day scroll of ideas with flexible implementation links."""
    return _render(request, "stream.html", {"days": db.get_all_days(_db(request))})


@pages.get("/day/{date_str}", response_class=HTMLResponse)
def day_view(request: Request, date_str: str):
    """Single day deep-dive into the 5 ideas and AI implementation process."""
    day = db.get_day_by_date(date_str, _db(request))
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return _render(request, "day.html", {"day": day, "impl": day.get("implemented_idea")})


@pages.get("/design-system", response_class=HTMLResponse)
def design_system_view(request: Request):
    """General-purpose design system reference and interactive component sandbox."""
    return _render(request, "design_system.html")


@pages.get("/random", response_class=RedirectResponse)
def random_day(request: Request):
    """Jump to a random day."""
    all_days = db.get_all_days(_db(request))
    if not all_days:
        return RedirectResponse(url="/")
    return RedirectResponse(url=f"/day/{random.choice(all_days)['date']}")


app = create_app()
