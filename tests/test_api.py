"""
Tests for FastAPI application endpoints and views.
"""

import pytest
from starlette.testclient import TestClient
from app import app
import db


@pytest.fixture(scope="module")
def client():
    # Ensure test database is seeded
    db.init_db()
    if not db.get_all_days():
        db.seed_demo_data()
    return TestClient(app)


def test_home_view(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "IDEAS DAILY" in response.text
    assert "Top-Ranked Implementations" in response.text
    assert "RADICAL MEMPHIS POP" in response.text or "SHIPPED PROTOTYPE" in response.text


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


def test_day_view(client):
    days = db.get_all_days()
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


def test_interactive_neondj_view(client):
    response = client.get("/interactive/neondj")
    assert response.status_code == 200
    assert "NeonDJ: 90s Turntable" in response.text


def test_interactive_canopy_view(client):
    response = client.get("/interactive/canopy")
    assert response.status_code == 200
    assert "Canopy Growing Algorithm" in response.text
    assert "Growth Model" in response.text


def test_api_get_days(client):
    response = client.get("/api/days")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_api_get_implementations(client):
    response = client.get("/api/implementations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that it's ranked
    ranks = [item["rank"] for item in data]
    assert ranks == sorted(ranks)


def test_api_update_rank(client):
    response = client.get("/api/implementations")
    first_id = response.json()[0]["id"]

    put_resp = client.put(f"/api/implementations/{first_id}/rank", json={"rank": 99})
    assert put_resp.status_code == 200
    assert put_resp.json()["new_rank"] == 99


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
