"""FastAPI application factory: public pages, JSON API, admin, prototypes.

`uvicorn showcase.web:app` serves the module-level app built from the environment;
tests and the static build call `create_app(settings)` directly.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import ChoiceLoader

from showcase import admin, api, db, pages, registry
from showcase.config import STATIC_DIR, TEMPLATES_DIR, Settings


def create_templates(settings: Settings, prototypes: list[registry.Prototype]) -> Jinja2Templates:
    templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
    # Site templates by name ("base.html"), prototype templates as "<slug>/template.html".
    templates.env.loader = ChoiceLoader([templates.env.loader, registry.template_loader(prototypes)])
    templates.env.globals["is_hosted"] = settings.hosted
    templates.env.globals["all_published_dates"] = lambda: db.get_published_dates(settings.db_file)
    templates.env.globals["project_totals"] = lambda: db.get_totals(settings.db_file)
    templates.env.globals["output_link"] = pages.output_link
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
    app.include_router(api.router)
    app.include_router(admin.router)
    app.include_router(pages.router)
    return app


app = create_app()
