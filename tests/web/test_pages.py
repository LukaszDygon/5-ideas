"""Core site pages render inside the Memphis layout (FastAPI TestClient)."""

from showcase import db


def test_home_view(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "IDEAS DAILY" in response.text
    assert "Top-Ranked Implementations" in response.text
    assert any(term in response.text for term in ("RADICAL MEMPHIS POP", "SHIPPED PROTOTYPE", "LATEST DROP"))


def test_calendar_view(client):
    response = client.get("/calendar")
    assert response.status_code == 200
    assert "THE BIGGEST VIEW" in response.text
    assert "MON" in response.text and "SUN" in response.text


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


def test_admin_visibility_and_transcript_label(client, monkeypatch):
    # Test local mode: admin links should be present
    monkeypatch.delenv("HOSTED_STATIC", raising=False)
    resp = client.get("/")
    assert resp.status_code == 200
    assert 'href="/admin"' in resp.text

    day_resp = client.get("/day/2026-09-10")
    assert day_resp.status_code == 200
    assert 'href="/admin/day/2026-09-10/edit"' in day_resp.text
    assert "AI Interaction Summary" in day_resp.text

    # Test hosted static mode: admin links should be hidden
    monkeypatch.setenv("HOSTED_STATIC", "1")
    resp_hosted = client.get("/")
    assert resp_hosted.status_code == 200
    assert 'href="/admin"' not in resp_hosted.text

    day_resp_hosted = client.get("/day/2026-09-10")
    assert day_resp_hosted.status_code == 200
    assert 'href="/admin/day/2026-09-10/edit"' not in day_resp_hosted.text
    assert "AI Interaction Summary" in day_resp_hosted.text


def test_core_pages_render(client, settings):
    latest = db.get_published_dates(settings.db_file)[0]
    for path in ("/", "/calendar", "/stream", f"/day/{latest}", "/design-system"):
        response = client.get(path)
        assert response.status_code == 200, path
        assert "IDEAS DAILY" in response.text, path


def test_header_shows_the_streak(client, settings):
    from showcase import streak

    value = streak.get_streak_data(settings.db_file, settings.streak_file)["streak"]
    assert f"UNBROKEN STREAK: {value} DAYS" in client.get("/").text


def test_day_page_links_to_its_prototype(client):
    html = client.get("/day/2026-09-29").text
    assert 'href="/interactive/which-is-faster"' in html
    assert "Which One is Faster?" in html


def test_calendar_month_navigation(client):
    response = client.get("/calendar?year=2026&month=9")
    assert response.status_code == 200
    assert "September" in response.text


def test_favicon_is_linked_and_served(client):
    assert '<link rel="icon" type="image/svg+xml" href="/static/favicon.svg"/>' in client.get("/").text
    icon = client.get("/static/favicon.svg")
    assert icon.status_code == 200
    assert icon.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in icon.text
