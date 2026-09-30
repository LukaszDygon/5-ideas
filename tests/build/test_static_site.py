"""The static build freezes every page under the base path and ships every asset it references."""

import json
import re
import shutil

import pytest

from showcase import db, registry
from showcase.config import DEFAULT_DATA_DIR, SEED_FILENAME, STREAK_FILENAME, Settings
from showcase.pages import CORE_PAGES
from showcase.static_site import build_static, output_file, rewrite_asset_links, rewrite_html_links

BASE = "/5-ideas/"


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    """One build per module, against its own copy of the data."""
    root = tmp_path_factory.mktemp("build")
    data = root / "data"
    data.mkdir()
    for name in (SEED_FILENAME, STREAK_FILENAME):
        shutil.copyfile(DEFAULT_DATA_DIR / name, data / name)
    settings = Settings(data_dir=data)
    out = root / "dist"
    routes = build_static(out=out, base_path=BASE, settings=settings)
    return out, routes, settings


def test_every_page_is_frozen(built):
    out, routes, settings = built
    expected = list(CORE_PAGES)
    expected += [url for proto in registry.discover() for url, _ in proto.pages()]
    expected += [f"/day/{d}" for d in db.get_published_dates(settings.db_file)]
    assert sorted(routes) == sorted(expected)
    missing = [r for r in expected if not output_file(out, r).is_file()]
    assert not missing


def test_github_pages_extras(built):
    out, _, settings = built
    for name in ("dates.json", "streak.json", ".nojekyll", "404.html"):
        assert (out / name).exists(), name
    assert json.loads((out / "dates.json").read_text()) == db.get_published_dates(settings.db_file)


def test_no_unprefixed_root_links(built):
    out, _, _ = built
    offenders = {}
    for page in out.rglob("*.html"):
        if "static" in page.relative_to(out).parts:
            continue
        found = re.findall(r'(?:href|src|action|poster)="(/(?!5-ideas/|/)[^"]*)"', page.read_text())
        if found:
            offenders[str(page.relative_to(out))] = sorted(set(found))[:5]
    assert not offenders


def test_every_static_reference_resolves(built):
    out, _, _ = built
    missing = set()
    files = [p for p in out.rglob("*") if p.suffix in (".html", ".js", ".css")]
    for f in files:
        for ref in re.findall(r"/5-ideas/(static/[^\"'\s)?#`]+)", f.read_text(errors="ignore")):
            if not (out / ref).is_file():
                missing.add(f"{f.relative_to(out)} -> {ref}")
    assert not missing, sorted(missing)[:10]


def test_no_unprefixed_static_urls_in_assets(built):
    out, _, _ = built
    offenders = [
        str(f.relative_to(out))
        for f in (out / "static").rglob("*")
        if f.suffix in (".js", ".css") and re.search(r"""["'`(]/static/""", f.read_text(errors="ignore"))
    ]
    assert not offenders


@pytest.mark.parametrize(
    ("html", "expected"),
    [
        ('<a href="/">', '<a href="/5-ideas/">'),
        ('<a href="/calendar">', '<a href="/5-ideas/calendar/">'),
        ('<a href="/calendar?year=2026&month=8">', '<a href="/5-ideas/calendar/?year=2026&month=8">'),
        ('<a href="/day/2026-09-29#impl">', '<a href="/5-ideas/day/2026-09-29/#impl">'),
        ('<link href="/static/style.css">', '<link href="/5-ideas/static/style.css">'),
        ('<img src="/static/a.png">', '<img src="/5-ideas/static/a.png">'),
        ("<div style=\"background:url('/static/a.png')\">", "<div style=\"background:url('/5-ideas/static/a.png')\">"),
        ("fetch('/static/prototypes/x/data.json')", "fetch('/5-ideas/static/prototypes/x/data.json')"),
        ('<script src="//cdn.example.com/x.js">', '<script src="//cdn.example.com/x.js">'),
        ('<a href="/5-ideas/stream/">', '<a href="/5-ideas/stream/">'),
        ('<a href="https://example.com/x">', '<a href="https://example.com/x">'),
    ],
)
def test_rewrite_html_links(html, expected):
    assert rewrite_html_links(html, BASE) == expected


def test_rewrite_is_a_no_op_at_the_root():
    html = '<a href="/calendar"><img src="/static/a.png">'
    assert rewrite_html_links(html, "/") == html
    assert rewrite_asset_links("fetch('/static/a.json')", "/") == "fetch('/static/a.json')"


def test_rewrite_asset_links():
    js = "const a = '/static/prototypes/x/a.png'; const b = \"/5-ideas/static/b.png\";"
    assert rewrite_asset_links(js, BASE) == "const a = '/5-ideas/static/prototypes/x/a.png'; const b = \"/5-ideas/static/b.png\";"
    assert rewrite_asset_links("body { background: url(/static/bg.png) }", BASE) == "body { background: url(/5-ideas/static/bg.png) }"
