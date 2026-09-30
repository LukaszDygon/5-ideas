"""Content checks for individual prototypes (page HTML plus the prototype's own JS/CSS)."""

import re


def page_with_assets(client, url):
    """Page HTML plus the prototype's own app.js / style.css, for assertions about what the page ships."""
    html = client.get(url).text
    assets = re.findall(r'(?:src|href)="(/static/prototypes/[^"]+\.(?:js|css))"', html)
    return "\n".join([html] + [client.get(a).text for a in assets])


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


def test_interactive_pixel_planet(client):
    text = page_with_assets(client, "/interactive/pixel-planet")
    assert "Pixel Planet Flyover" in text
    assert 'type="module"' in text
    for craft in ("Paraglider", "Hot-air balloon", "Crane"):
        assert craft in text
    assert "Postcard journal" in text
    assert "snapPostcard" in text
    for module in ("world.js", "settlements.js", "biomes.js", "audio.js", "noise.js"):
        response = client.get(f"/static/prototypes/pixel-planet/{module}")
        assert response.status_code == 200, module
        assert "export" in response.text
