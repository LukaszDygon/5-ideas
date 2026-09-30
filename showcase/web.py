"""FastAPI application factory: public pages, JSON API, Flask admin, prototypes.

`uvicorn showcase.web:app` serves the module-level app built from the environment;
tests and the static build call `create_app(settings)` directly.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import ChoiceLoader
from starlette.middleware.wsgi import WSGIMiddleware

from showcase import api, db, pages, registry, streak
from showcase.admin import create_admin_app
from showcase.config import STATIC_DIR, TEMPLATES_DIR, Settings, is_hosted


class _HostedCheck:
    """Truthy while freezing the static site, evaluated at render time (`{% if is_hosted %}`)."""

    def __bool__(self) -> bool:
        return is_hosted()


def create_templates(settings: Settings, prototypes: list[registry.Prototype]) -> Jinja2Templates:
    templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
    # Site templates by name ("base.html"), prototype templates as "<slug>/template.html".
    templates.env.loader = ChoiceLoader([templates.env.loader, registry.template_loader(prototypes)])
    templates.env.globals["is_hosted"] = _HostedCheck()
    templates.env.globals["all_published_dates"] = lambda: db.get_published_dates(settings.db_file)
    templates.env.globals["get_streak"] = lambda: streak.get_streak_data(
        settings.db_file, settings.streak_file
    )["streak"]
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
    prototypes = registry.discover(settings.prototypes_dir)
    app.state.settings = settings
    app.state.prototypes = prototypes
    app.state.templates = create_templates(settings, prototypes)
    registry.register(app, prototypes)  # before the /static mount so /static/prototypes/<slug> wins
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    app.mount("/admin", WSGIMiddleware(create_admin_app(settings)))
    app.include_router(api.router)
    app.include_router(pages.router)
    return app


app = create_app()
