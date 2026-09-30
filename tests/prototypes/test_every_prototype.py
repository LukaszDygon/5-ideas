"""Contract tests run for every prototype the registry discovers (no per-prototype edits needed)."""

import re
from urllib.parse import urlparse

import pytest

from showcase import registry

PROTOTYPES = registry.discover()
PAGES = [(p, url) for p in PROTOTYPES for url, _ in p.pages()]
ALLOWED_SCRIPT_HOSTS = {"cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com", "cdn.tailwindcss.com"}
SITE_HEADER_MARKER = "IDEAS DAILY"  # rendered by templates/base.html


@pytest.mark.parametrize(("proto", "url"), PAGES, ids=[url for _, url in PAGES])
def test_page_renders_inside_site_layout(client, proto, url):
    resp = client.get(url)
    assert resp.status_code == 200
    assert SITE_HEADER_MARKER in resp.text, f"{url} must extend base.html"


@pytest.mark.parametrize(("proto", "url"), PAGES, ids=[url for _, url in PAGES])
def test_prototype_static_references_exist(client, proto, url):
    html = client.get(url).text
    refs = re.findall(rf"/static/prototypes/{re.escape(proto.slug)}/([^\"'\s)?#`]+)", html)
    missing = sorted({ref for ref in refs if not (proto.static_dir / ref).is_file()})
    assert not missing, f"{url} references missing files under {proto.static_dir}: {missing}"


@pytest.mark.parametrize(("proto", "url"), PAGES, ids=[url for _, url in PAGES])
def test_external_scripts_come_from_allowed_cdns(client, proto, url):
    html = client.get(url).text
    hosts = {urlparse(src).hostname for src in re.findall(r"<script[^>]*\ssrc=[\"'](https?://[^\"']+)", html)}
    assert hosts <= ALLOWED_SCRIPT_HOSTS, f"{url} loads scripts from {sorted(hosts - ALLOWED_SCRIPT_HOSTS)}"


@pytest.mark.parametrize("proto", PROTOTYPES, ids=[p.slug for p in PROTOTYPES])
def test_manifest_matches_folder(proto):
    assert proto.folder.name == proto.slug
    assert (proto.folder / proto.template).is_file()


@pytest.mark.parametrize("proto", PROTOTYPES, ids=[p.slug for p in PROTOTYPES])
def test_static_js_and_css_references_exist(proto):
    """Extracted app.js / style.css may reference their own assets too."""
    missing = []
    for asset in proto.static_dir.rglob("*") if proto.static_dir.is_dir() else []:
        if asset.suffix in (".js", ".css"):
            text = asset.read_text(encoding="utf-8")
            for ref in re.findall(rf"/static/prototypes/{re.escape(proto.slug)}/([^\"'\s)?#`]+)", text):
                if not (proto.static_dir / ref).is_file():
                    missing.append(f"{asset.name}: {ref}")
    assert not missing, missing
