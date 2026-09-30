"""JSON API endpoints: core /api routes and prototype-specific APIs."""


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


def test_api_house_stats_parse_url_fallback(client):
    url = "https://www.rightmove.co.uk/properties/123"
    data = client.post("/api/house-stats/parse-url", json={"url": url}).json()
    assert data["portal"] == "Rightmove"
    assert data["postcode"].startswith("ZZ")
    assert data["notes"] == f"Pasted link: {url}"


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
