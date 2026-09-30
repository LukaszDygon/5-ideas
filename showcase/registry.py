"""Prototype registry: each prototypes/<slug>/prototype.toml becomes a page at /interactive/<slug>.

A prototype folder holds its manifest, templates, optional static/ assets (served at
/static/prototypes/<slug>/) and an optional routes.py exposing `router` and, if it needs
server-side data in its page, `page_context(request) -> dict`.
"""

from __future__ import annotations

import importlib.util
import re
import tomllib
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from types import ModuleType

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import BaseLoader, FileSystemLoader, PrefixLoader

from showcase.config import ROOT

PROTOTYPES_DIR = ROOT / "prototypes"
MANIFEST = "prototype.toml"
BUILD_TYPES = ("webapp", "poetry", "song", "image", "interactive")
REQUIRED_KEYS = ("slug", "title", "date", "build_type")
MANIFEST_KEYS = (*REQUIRED_KEYS, "template", "description", "extra_paths", "routes")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ManifestError(ValueError):
    """A prototype folder does not satisfy the contract in .claude/rules/prototypes.md."""


@dataclass(frozen=True)
class Prototype:
    slug: str
    title: str
    date: str
    build_type: str
    folder: Path
    template: str = "template.html"
    description: str = ""
    extra_paths: tuple[str, ...] = ()
    routes: bool = False

    @property
    def url(self) -> str:
        return f"/interactive/{self.slug}"

    @property
    def static_dir(self) -> Path:
        return self.folder / "static"

    @property
    def static_url(self) -> str:
        return f"/static/prototypes/{self.slug}"

    def pages(self) -> list[tuple[str, str]]:
        """(url, template name for the Jinja PrefixLoader) for the main page and every extra path."""
        pages = [(self.url, f"{self.slug}/{self.template}")]
        pages += [(f"{self.url}/{extra}", f"{self.slug}/{extra}.html") for extra in self.extra_paths]
        return pages


def load_manifest(folder: Path) -> Prototype:
    path = folder / MANIFEST
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as exc:
        raise ManifestError(f"{path}: {exc}") from exc

    def fail(message: str) -> ManifestError:
        return ManifestError(f"{path}: {message}")

    missing = [k for k in REQUIRED_KEYS if k not in data]
    if missing:
        raise fail(f"missing keys {missing}")
    unknown = sorted(set(data) - set(MANIFEST_KEYS))
    if unknown:
        raise fail(f"unknown keys {unknown}; allowed: {list(MANIFEST_KEYS)}")

    day = data["date"].isoformat() if isinstance(data["date"], date) else str(data["date"])
    proto = Prototype(
        slug=data["slug"],
        title=data["title"],
        date=day,
        build_type=data["build_type"],
        folder=folder,
        template=data.get("template", "template.html"),
        description=data.get("description", ""),
        extra_paths=tuple(data.get("extra_paths", ())),
        routes=bool(data.get("routes", False)),
    )
    if proto.slug != folder.name:
        raise fail(f"slug {proto.slug!r} must equal the folder name {folder.name!r}")
    if not SLUG_RE.match(proto.slug):
        raise fail(f"slug {proto.slug!r} must be lowercase words joined by hyphens")
    if not DATE_RE.match(proto.date):
        raise fail(f"date {proto.date!r} must be YYYY-MM-DD")
    if proto.build_type not in BUILD_TYPES:
        raise fail(f"build_type {proto.build_type!r} must be one of {BUILD_TYPES}")
    for _, template in proto.pages():
        if not (folder / template.split("/", 1)[1]).is_file():
            raise fail(f"template {template.split('/', 1)[1]!r} not found")
    if proto.routes and not (folder / "routes.py").is_file():
        raise fail("routes = true but routes.py is missing")
    return proto


def discover(root: Path = PROTOTYPES_DIR) -> list[Prototype]:
    """All prototypes under `root`, sorted by slug. Raises ManifestError on the first invalid one."""
    if not root.is_dir():
        return []
    return [load_manifest(folder) for folder in sorted(root.iterdir()) if (folder / MANIFEST).is_file()]


def template_loader(prototypes: list[Prototype]) -> BaseLoader:
    """Serves `<slug>/<file>.html` from each prototype folder."""
    return PrefixLoader({p.slug: FileSystemLoader(str(p.folder)) for p in prototypes})


def load_routes(proto: Prototype) -> ModuleType:
    module_name = f"prototypes_{proto.slug.replace('-', '_')}_routes"
    spec = importlib.util.spec_from_file_location(module_name, proto.folder / "routes.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _page_view(template: str, proto: Prototype, context_hook):
    def view(request: Request):
        context = {"prototype": proto}
        if context_hook:
            context.update(context_hook(request))
        return request.app.state.templates.TemplateResponse(request=request, name=template, context=context)

    return view


def register(app: FastAPI, prototypes: list[Prototype]) -> None:
    """Adds page routes, static mounts and extra API routers. Call before mounting /static."""
    for proto in prototypes:
        module = load_routes(proto) if proto.routes else None
        context_hook = getattr(module, "page_context", None)
        for url, template in proto.pages():
            app.add_api_route(
                url,
                _page_view(template, proto, context_hook),
                methods=["GET"],
                response_class=HTMLResponse,
                name=f"prototype:{url}",
            )
        if module is not None and hasattr(module, "router"):
            app.include_router(module.router)
        if proto.static_dir.is_dir():
            app.mount(proto.static_url, StaticFiles(directory=str(proto.static_dir)), name=f"static:{proto.slug}")
