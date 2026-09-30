"""Extra routes for house-stats: parse a property portal URL into listing fields.

Order of attempts: a synthetic sample preset (matched by listing id), the optional external
house_stats parser (only when HOUSE_STATS_DIR is set), then a token-based fallback.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

SAMPLES = Path(__file__).parent / "static" / "data" / "sample_listings.json"
PARSER_SNIPPET = (
    "import json, asyncio, sys, dataclasses; from house_stats.link_parser import parse_property_url; "
    "res = asyncio.run(parse_property_url(sys.argv[1])); print(json.dumps(dataclasses.asdict(res)))"
)

router = APIRouter()


def load_samples() -> dict:
    return json.loads(SAMPLES.read_text(encoding="utf-8"))


def portal_name(url_lower: str) -> str:
    for token, name in (("zoopla", "Zoopla"), ("rightmove", "Rightmove"), ("onthemarket", "OnTheMarket")):
        if token in url_lower:
            return name
    return "Portal"


def parse_with_house_stats(url: str, house_stats_dir: Path, fallback: dict) -> dict | None:
    """Runs the external parser project; returns None if it is unavailable or fails."""
    cmd = ["uv", "run", "--directory", str(house_stats_dir), "python", "-c", PARSER_SNIPPET, url]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if proc.returncode != 0 or not proc.stdout.strip():
            return None
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return None

    price_num = 0.0
    if data.get("price"):
        m = re.search(r"([0-9,]+)", data["price"])
        if m:
            price_num = float(m.group(1).replace(",", ""))
    postcode = data.get("postcode") or fallback["postcode"]
    outcode = postcode.split()[0]
    features = data.get("key_features") or []
    return {
        "portal": data.get("portal") or "Property Portal",
        "postcode": postcode,
        "outcode": outcode,
        "title": data.get("title") or f"{data.get('bedrooms') or fallback['beds']} Bed Property",
        "price": price_num,
        "priceStr": data.get("price") or (f"£{price_num:,.0f}" if price_num else "POA"),
        "address": data.get("address") or f"{outcode}, UK",
        "beds": data.get("bedrooms") or fallback["beds"],
        "baths": data.get("bathrooms") or fallback["baths"],
        "sqft": data.get("size_sq_ft") or fallback["sqft"],
        "type": data.get("property_type") or fallback["type"],
        "tenure": data.get("tenure") or fallback["tenure"],
        "epc": f"Rating {data['epc_rating']}" if data.get("epc_rating") else fallback["epc"],
        "image": data.get("main_image_url") or "",
        "features": features,
        "notes": " • ".join(features[:3]),
        "status": "Active",
        "priority": "Medium",
    }


@router.post("/api/house-stats/parse-url")
async def api_house_stats_parse_url(request: Request):
    """Parse listing fields (postcode, price, beds, baths, area, tenure, EPC, image) from a portal URL."""
    try:
        payload = await request.json()
    except ValueError:
        payload = {}
    url = (payload.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing listing URL")
    url_lower = url.lower()
    samples = load_samples()

    for preset in samples["presets"]:
        if any(token in url_lower for token in preset["match"]):
            return {"success": True, "url": url, **preset["listing"]}

    house_stats_dir = request.app.state.settings.house_stats_dir
    if house_stats_dir and house_stats_dir.is_dir():
        parsed = parse_with_house_stats(url, house_stats_dir, samples["fallback"])
        if parsed:
            return {"success": True, "url": url, **parsed}

    return {
        "success": True,
        "url": url,
        "portal": portal_name(url_lower),
        **samples["fallback"],
        "notes": f"Pasted link: {url}",
    }
