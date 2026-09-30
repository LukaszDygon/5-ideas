"""
Tests for FastAPI application endpoints and views.
"""

import re

from showcase import db


def page_with_assets(client, url):
    """Page HTML plus the prototype's own app.js / style.css, for assertions about what the page ships."""
    html = client.get(url).text
    assets = re.findall(r'(?:src|href)="(/static/prototypes/[^"]+\.(?:js|css))"', html)
    return "\n".join([html] + [client.get(a).text for a in assets])


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
    text = page_with_assets(client, "/interactive/canopy")
    assert "Canopy Growing Algorithm" in text
    assert "Growth Model" in text


def test_interactive_campfire_view(client):
    response = client.get("/interactive/campfire")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/campfire")
    assert "A Campfire Made Out of LED Blocks" in text
    assert "DARK MATTER BERLIN" in text.upper()
    assert "SOUNDSCAPE_MATRIX" in text
    assert "audio-stem-music" in text
    assert "audio-stem-crackle" in text


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
    text = page_with_assets(client, "/interactive/house-stats")
    assert "House Statistics & Dossier Generator" in text
    assert "Walkability Index" in text
    assert "Nearby Schools & Ofsted Inspection Ratings" in text
    assert "Criminal Activity Per Capita vs UK Benchmarks" in text


def test_interactive_flute_view(client):
    response = client.get("/interactive/flute")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/flute")
    assert "A Flute: Custom Woodwind Simulator" in text
    assert "Acoustic Geometry Parameters" in text
    assert "TONE HOLE FINGERING MATRIX" in text
    assert "Harmonic Spectrum Analyzer" in text


def test_interactive_fractiles_view(client):
    response = client.get("/interactive/fractiles")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/fractiles")
    assert "FRACTILES" in text
    assert "Aperiodic Prime Spiral" in text
    assert "PORTO AZULEJO PROTOCOL" in text
    assert "fractile-canvas" in text


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
    text = page_with_assets(client, "/interactive/nostalgia-cap")
    assert "Nostalgia Cap-o-Matic '99" in text
    assert "hatCanvas" in text
    assert "SURPRISE DROP" in text
    assert "Radical Magenta" in text
    assert "Synthwave Sunset" in text
    assert "receiptModal" in text


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


def test_interactive_table_steamer_view(client):
    response = client.get("/interactive/table-steamer")
    assert response.status_code == 200
    assert "The Communal Table Steamer" in response.text
    assert "table_steamer_setup.jpg" in response.text
    assert "Classic Juicy Pork & Garlic Chive" in response.text
    assert "Spiced Cumin Beef & Sweet Onion" in response.text
    assert "Ginger Lemongrass Chicken & Shiitake" in response.text
    assert "Golden Tofu, Kimchi & Garlic Greens" in response.text
    assert "Starch Retrogradation" in response.text
    assert "Myosin Extraction" in response.text


def test_interactive_crusade_trail_view(client):
    response = client.get("/interactive/crusade-trail")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/crusade-trail")
    assert "Iter Hierosolymitanum" in text
    assert "cartoCanvas" in text
    assert "Cinzel" in text
    assert "EB Garamond" in text
    assert "crusade_geo.json" in text
    assert "crusade_waypoints.json" in text
    assert "Bouillon & Cologne" in text
    assert "Holy Sepulchre" in text


def test_interactive_monster_mystery_view(client):
    response = client.get("/interactive/monster-mystery")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/monster-mystery")
    assert "The Monster Gala Murder" in text
    assert "CORPSE PENALTY" in text
    assert "Host Master One-Pager" in text
    assert "Count Vladimir of HR" in text
    assert "Fenrir the Agile Scrum Master" in text
    assert "EXHIBIT A: PHYSICAL TRACE" in text
    assert "EXHIBIT D: THE MURDER WEAPON" in text


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
    text = page_with_assets(client, "/interactive/slots1v1")
    assert "Slots 1v1: Tactical Reel Arena" in text
    assert "SPIN REELS" in text
    assert "PeerJS" in text or "peerjs" in text
    assert "https://github.com/LukaszDygon/slot-battles" in text

    day_resp = client.get("/day/2026-09-13")
    assert day_resp.status_code == 200
    assert "https://github.com/LukaszDygon/slot-battles" in day_resp.text


def test_interactive_house_stats(client):
    response = client.get("/interactive/house-stats")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/house-stats")
    assert "House Statistics & Dossier Generator: Home Search Tracker" in text
    assert "Home Search Portfolio" in text
    assert "Heuristic Valuation Engine" in text
    assert "Admin Criteria & Places" in text
    assert "Area Dossier & Walk Routes" in text
    assert "Sold STC" in text
    assert "Under Offer" in text
    assert "Active" in text
    assert "Quick Auto-Populate from Listing URL" in text
    assert "https://github.com/LukaszDygon/house_stats" in text


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
    assert data["postcode"] == "ZZ1 1AA"  # synthetic sample from sample_listings.json
    assert data["price"] == 500000
    assert data["beds"] == 4
    assert data["sqft"] == 1300

    # Test empty URL
    err_resp = client.post("/api/house-stats/parse-url", json={"url": ""})
    assert err_resp.status_code == 400


def test_api_house_stats_parse_url_fallback(client, monkeypatch):
    monkeypatch.delenv("HOUSE_STATS_DIR", raising=False)
    url = "https://www.rightmove.co.uk/properties/123"
    data = client.post("/api/house-stats/parse-url", json={"url": url}).json()
    assert data["portal"] == "Rightmove"
    assert data["postcode"].startswith("ZZ")
    assert data["notes"] == f"Pasted link: {url}"


def test_interactive_water_calories(client):
    response = client.get("/interactive/water-calories")
    assert response.status_code == 200
    text = page_with_assets(client, "/interactive/water-calories")
    assert "Aqueous Caloric Spectrometer" in text
    assert "Certificate of Analytical Determination" in text
    assert "0.00000" in text


def test_interactive_which_is_faster(client):
    response = client.get("/interactive/which-is-faster")
    assert response.status_code == 200
    assert "WHICH ONE IS FASTER?" in response.text
    assert "KING OF THE HILL SURVIVOR" in response.text
    assert "Fleeting Time Discovery Bank" in response.text


def test_api_which_is_faster_events(client):
    response = client.get("/api/which-is-faster/events")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 30
    assert "events" in data
    # Verify accurate scientific data structure
    first = data["events"][0]
    assert "id" in first
    assert "title" in first
    assert "duration_s" in first
    assert "duration_display" in first
    assert "scientific_fact" in first
    assert "source" in first
