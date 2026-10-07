"""Core site pages render inside the Memphis layout (FastAPI TestClient)."""

from dataclasses import replace

import pytest
from markupsafe import escape
from starlette.testclient import TestClient

from showcase import db
from showcase.pages import output_link
from showcase.web import create_app


def test_home_view(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "IDEAS DAILY" in response.text
    assert "The Final Ranking" in response.text
    assert "PROJECT COMPLETE" in response.text


def test_home_ranks_every_shipped_prototype_in_order(client, settings):
    html = client.get("/").text
    ranked = db.get_ranked_implementations(settings.db_file)
    positions = [html.find(f">{escape(impl['title'])}</h3>") for impl in ranked]
    assert -1 not in positions
    assert positions == sorted(positions)
    assert f">#{len(ranked)}</span>" in html


def test_home_no_longer_shows_stats_or_the_latest_drop(client):
    html = client.get("/").text
    main = html[html.index("<main") : html.index("</main>")]
    for gone in ("TOTAL IDEAS SPARKED", "SHIPPED BUILDS", "UNBROKEN STREAK", "LATEST DROP", "IDEAS SPARKED"):
        assert gone not in main, gone


def test_calendar_is_gone(client):
    assert client.get("/calendar").status_code == 404
    assert client.get("/api/calendar/2026/9").status_code == 404
    for path in ("/", "/stream", "/day/2026-09-29"):
        assert 'href="/calendar' not in client.get(path).text, path


def test_stream_view(client):
    response = client.get("/stream")
    assert response.status_code == 200
    assert "THE MIDDLE VIEW" in response.text
    assert "Day-By-Day Feed" in response.text


def test_day_view(client, settings):
    days = db.get_all_days(settings.db_file)
    first_date = days[0]["date"]
    response = client.get(f"/day/{first_date}")
    assert response.status_code == 200
    expected_theme = days[0]["theme"].replace("&", "&amp;")
    assert expected_theme in response.text


def test_day_view_404(client):
    response = client.get("/day/1999-01-01")
    assert response.status_code == 404


def test_design_system_view(client):
    response = client.get("/design-system")
    assert response.status_code == 200
    assert "Reusable UI Design System" in response.text
    assert "Radical Magenta" in response.text


def test_random_redirect(client):
    response = client.get("/random", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert "/day/" in response.headers["location"]


def test_admin_visibility_and_transcript_label(client, settings):
    # Local mode: admin links are present
    resp = client.get("/")
    assert resp.status_code == 200
    assert 'href="/admin"' in resp.text

    day_resp = client.get("/day/2026-09-10")
    assert day_resp.status_code == 200
    assert 'href="/admin/day/2026-09-10/edit"' in day_resp.text
    assert "AI Interaction Summary" in day_resp.text

    # Hosted static mode (what the static build renders): admin links are hidden
    with TestClient(create_app(replace(settings, hosted=True))) as hosted:
        resp_hosted = hosted.get("/")
        assert resp_hosted.status_code == 200
        assert 'href="/admin"' not in resp_hosted.text

        day_resp_hosted = hosted.get("/day/2026-09-10")
        assert day_resp_hosted.status_code == 200
        assert 'href="/admin/day/2026-09-10/edit"' not in day_resp_hosted.text
        assert "AI Interaction Summary" in day_resp_hosted.text


def test_core_pages_render(client, settings):
    latest = db.get_published_dates(settings.db_file)[0]
    for path in ("/", "/stream", f"/day/{latest}", "/design-system"):
        response = client.get(path)
        assert response.status_code == 200, path
        assert "IDEAS DAILY" in response.text, path


def test_banner_announces_the_finished_project(client, settings):
    totals = db.get_totals(settings.db_file)
    for path in ("/", "/stream", "/day/2026-09-29"):
        html = client.get(path).text
        assert "PROJECT COMPLETE" in html, path
        assert f"{totals['ideas']} IDEAS SPARKED" in html, path
        assert f"{totals['implementations']} PROTOTYPES SHIPPED" in html, path
        assert "UNBROKEN STREAK" not in html, path


def test_day_page_links_to_its_prototype(client):
    html = client.get("/day/2026-09-29").text
    assert 'href="/interactive/which-is-faster"' in html
    assert "Which One is Faster?" in html


def test_day_page_puts_the_prototype_before_the_sparks(client, settings):
    html = client.get("/day/2026-09-29").text
    launch = html.index('href="/interactive/which-is-faster"')
    assert launch < html.index('id="output"') < html.index('id="sparks"')
    for anchor in ('href="#output"', 'href="#sparks"', 'href="#process"', 'href="#retro"'):
        assert anchor in html, anchor
    dates = sorted(db.get_published_dates(settings.db_file))
    assert f"DAY {dates.index('2026-09-29') + 1} OF {len(dates)}" in html


def test_day_page_links_external_projects_and_their_source(client):
    html = client.get("/day/2026-09-13").text
    assert 'href="/interactive/slots1v1"' in html
    assert 'href="https://github.com/LukaszDygon/slot-battles"' in html and "Source Repo" in html
    repo_only = client.get("/day/2026-09-17").text
    assert 'href="https://github.com/LukaszDygon/macau-rl"' in repo_only and "View on GitHub" in repo_only


@pytest.mark.parametrize(
    ("impl", "depth", "url", "external"),
    [
        ({"content": "/interactive/flute", "external_url": ""}, 0, "/interactive/flute", False),
        ({"content": "", "external_url": "/interactive/tortoise"}, 2, "/interactive/tortoise", False),
        ({"content": "/interactive/x", "external_url": "https://github.com/a/b"}, 0, "/interactive/x", False),
        ({"content": "", "external_url": "https://github.com/a/b"}, 2, "https://github.com/a/b", True),
        ({"content": "/", "external_url": "../power-desk"}, 2, "../../../power-desk", True),
        ({"content": "/", "external_url": "../power-desk"}, 0, "../power-desk", True),
    ],
)
def test_output_link(impl, depth, url, external):
    link = output_link(impl, depth)
    assert (link["url"], link["external"]) == (url, external)


def test_output_link_without_a_destination():
    assert output_link(None) is None
    assert output_link({"content": "You are looking at it", "external_url": ""}) is None


def test_favicon_is_linked_and_served(client):
    assert '<link rel="icon" type="image/svg+xml" href="/static/favicon.svg"/>' in client.get("/").text
    icon = client.get("/static/favicon.svg")
    assert icon.status_code == 200
    assert icon.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in icon.text
