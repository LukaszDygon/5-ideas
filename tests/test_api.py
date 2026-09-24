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


def test_interactive_campfire_view(client):
    response = client.get("/interactive/campfire")
    assert response.status_code == 200
    assert "A Campfire Made Out of LED Blocks" in response.text
    assert "DARK MATTER BERLIN" in response.text.upper()
    assert "SOUNDSCAPE_MATRIX" in response.text
    assert "audio-stem-music" in response.text
    assert "audio-stem-crackle" in response.text


def test_interactive_campfire_hardware_view(client):
    response = client.get("/interactive/campfire/hardware")
    assert response.status_code == 200
    assert "Physical 3D LED Block Campfire" in response.text
    assert "Central Electronic Brain" in response.text
    assert "Full-Surface Optics" in response.text
    assert "1-Wire" in response.text
    assert "Dayton Audio" in response.text
    assert "FastLED" in response.text
    assert "Bill of Materials" in response.text


def test_interactive_house_stats_view(client):
    response = client.get("/interactive/house-stats")
    assert response.status_code == 200
    assert "House Statistics & Dossier Generator" in response.text
    assert "Walkability Index" in response.text
    assert "Nearby Schools & Ofsted Inspection Ratings" in response.text
    assert "Criminal Activity Per Capita vs UK Benchmarks" in response.text


def test_interactive_flute_view(client):
    response = client.get("/interactive/flute")
    assert response.status_code == 200
    assert "A Flute: Custom Woodwind Simulator" in response.text
    assert "Acoustic Geometry Parameters" in response.text
    assert "TONE HOLE FINGERING MATRIX" in response.text
    assert "Harmonic Spectrum Analyzer" in response.text




def test_interactive_fractiles_view(client):
    response = client.get("/interactive/fractiles")
    assert response.status_code == 200
    assert "FRACTILES" in response.text
    assert "Aperiodic Prime Spiral" in response.text
    assert "PORTO AZULEJO PROTOCOL" in response.text
    assert "fractile-canvas" in response.text


def test_interactive_mcnuggets_view(client):
    response = client.get("/interactive/mcnuggets")
    assert response.status_code == 200
    assert "Pasta McNuggetini" in response.text
    assert "WIKIPASTA" in response.text
    assert "Lo Stivale" in response.text
    assert "LA GAZZETTA DELLA PASTA" in response.text
    assert "mcnugget_pasta_shapes.jpg" in response.text
    assert "mcnugget_pasta_dish.jpg" in response.text


def test_interactive_nostalgia_cap_view(client):
    response = client.get("/interactive/nostalgia-cap")
    assert response.status_code == 200
    assert "Nostalgia Cap-o-Matic '99" in response.text
    assert "hatCanvas" in response.text
    assert "SURPRISE DROP" in response.text
    assert "Radical Magenta" in response.text
    assert "Synthwave Sunset" in response.text
    assert "receiptModal" in response.text


def test_interactive_tortoise_view(client):
    response = client.get("/interactive/tortoise")
    assert response.status_code == 200
    assert "Morty's Caretaker Sheet" in response.text
    assert "Eastern Hermann's" in response.text
    assert "The 15-Minute Soak" in response.text
    assert "Enclosure Misting" in response.text
    assert "Florette" in response.text
    assert "The Tortoise Table" in response.text
    assert "checklist" in response.text.lower()





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


def test_interactive_slots1v1(client):
    response = client.get("/interactive/slots1v1")
    assert response.status_code == 200
    assert "Slots 1v1: Tactical Reel Arena" in response.text
    assert "SPIN REELS" in response.text
    assert "PeerJS" in response.text or "peerjs" in response.text
    assert "https://github.com/LukaszDygon/slot-battles" in response.text

    day_resp = client.get("/day/2026-09-13")
    assert day_resp.status_code == 200
    assert "https://github.com/LukaszDygon/slot-battles" in day_resp.text


def test_interactive_house_stats(client):
    response = client.get("/interactive/house-stats")
    assert response.status_code == 200
    assert "House Statistics & Dossier Generator: Home Search Tracker" in response.text
    assert "Home Search Portfolio" in response.text
    assert "Heuristic Valuation Engine" in response.text
    assert "Admin Criteria & Places" in response.text
    assert "Area Dossier & Walk Routes" in response.text
    assert "Sold STC" in response.text
    assert "Under Offer" in response.text
    assert "Active" in response.text
    assert "Quick Auto-Populate from Listing URL" in response.text
    assert "https://github.com/LukaszDygon/house_stats" in response.text


def test_api_house_stats_parse_url(client):
    # Test valid Zoopla URL
    resp = client.post(
        "/api/house-stats/parse-url",
        json={"url": "https://www.zoopla.co.uk/for-sale/details/72635023"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["portal"] == "Zoopla"
    assert "EN2" in data["postcode"]
    assert data["price"] == 675000
    assert data["beds"] == 4
    assert data["sqft"] == 1334

    # Test empty URL
    err_resp = client.post("/api/house-stats/parse-url", json={"url": ""})
    assert err_resp.status_code == 400


def test_interactive_water_calories(client):
    response = client.get("/interactive/water-calories")
    assert response.status_code == 200
    assert "Aqueous Caloric Spectrometer" in response.text
    assert "Certificate of Analytical Determination" in response.text
    assert "0.00000" in response.text





