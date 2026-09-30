"""Unit tests for the prototype registry (manifest parsing and validation)."""

from pathlib import Path

import pytest

from showcase import registry
from showcase.registry import ManifestError, Prototype, discover, load_manifest

VALID = """
slug = "demo"
title = "Demo"
date = "2026-09-30"
build_type = "interactive"
template = "template.html"
description = "A demo."
extra_paths = []
routes = false
"""


def make(tmp_path: Path, manifest: str = VALID, slug: str = "demo", files=("template.html",)) -> Path:
    folder = tmp_path / slug
    folder.mkdir()
    (folder / "prototype.toml").write_text(manifest)
    for name in files:
        (folder / name).write_text('{% extends "base.html" %}')
    return folder


def test_valid_manifest(tmp_path):
    proto = load_manifest(make(tmp_path))
    assert proto == Prototype(
        slug="demo", title="Demo", date="2026-09-30", build_type="interactive", folder=tmp_path / "demo",
        description="A demo.",
    )
    assert proto.url == "/interactive/demo"
    assert proto.static_url == "/static/prototypes/demo"
    assert proto.pages() == [("/interactive/demo", "demo/template.html")]


def test_defaults_and_unquoted_toml_date(tmp_path):
    manifest = 'slug = "demo"\ntitle = "Demo"\ndate = 2026-09-30\nbuild_type = "webapp"\n'
    proto = load_manifest(make(tmp_path, manifest))
    assert proto.date == "2026-09-30"
    assert proto.template == "template.html"
    assert proto.extra_paths == () and proto.routes is False


def test_extra_paths_need_their_templates(tmp_path):
    manifest = VALID.replace("extra_paths = []", 'extra_paths = ["hardware"]')
    with pytest.raises(ManifestError, match="hardware.html"):
        load_manifest(make(tmp_path, manifest))


def test_extra_paths_pages(tmp_path):
    manifest = VALID.replace("extra_paths = []", 'extra_paths = ["hardware"]')
    proto = load_manifest(make(tmp_path, manifest, files=("template.html", "hardware.html")))
    assert proto.pages()[1] == ("/interactive/demo/hardware", "demo/hardware.html")


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (('slug = "demo"', 'slug = "other"'), "must equal the folder name"),
        (('build_type = "interactive"', 'build_type = "movie"'), "build_type"),
        (('date = "2026-09-30"', 'date = "30/09/2026"'), "YYYY-MM-DD"),
        (('title = "Demo"\n', ""), "missing keys"),
        (("routes = false", "routes = false\ncolour = 'red'"), "unknown keys"),
        (("routes = false", "routes = true"), "routes.py is missing"),
        (('template = "template.html"', 'template = "nope.html"'), "not found"),
        (('slug = "demo"', 'slug = "de mo"'), "must equal the folder name"),
    ],
)
def test_invalid_manifests(tmp_path, change, message):
    with pytest.raises(ManifestError, match=message):
        load_manifest(make(tmp_path, VALID.replace(*change)))


def test_broken_toml(tmp_path):
    with pytest.raises(ManifestError):
        load_manifest(make(tmp_path, "slug = "))


def test_discover_skips_folders_without_manifest(tmp_path):
    make(tmp_path)
    (tmp_path / "notes").mkdir()
    assert [p.slug for p in discover(tmp_path)] == ["demo"]
    assert discover(tmp_path / "missing") == []


def test_repo_prototypes_are_valid_and_unique():
    prototypes = discover()
    slugs = [p.slug for p in prototypes]
    assert "which-is-faster" in slugs
    assert len(slugs) == len(set(slugs))
    urls = [url for p in prototypes for url, _ in p.pages()]
    assert len(urls) == len(set(urls))


def test_manifest_keys_match_dataclass():
    fields = set(Prototype.__dataclass_fields__) - {"folder"}
    assert fields == set(registry.MANIFEST_KEYS)
