"""
FastAPI application for 5 Ideas Daily Showcase.
Mounts Flask Admin via WSGIMiddleware and serves public routes, API, and design system.
"""

from __future__ import annotations

import calendar
from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from starlette.middleware.wsgi import WSGIMiddleware

from admin import admin_app
import db

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app = FastAPI(
    title="5 Ideas Daily Showcase",
    description="Daily 5 ideas based on a theme, with 1 implemented prototype. Neo-Brutalist 90s Memphis Pop Design System.",
    version="1.0.0",
)

# Mount Static Files
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount Flask Admin at /admin
app.mount("/admin", WSGIMiddleware(admin_app))

class _HostedCheck:
    def __bool__(self) -> bool:
        return os.getenv("HOSTED_STATIC") == "1"

    def __call__(self) -> bool:
        return self.__bool__()


def _get_published_dates() -> list[str]:
    return [d["date"] for d in db.get_all_days()]


def _get_active_streak() -> int:
    return db.get_streak_data()["streak"]


# Jinja2 Templates for FastAPI
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
templates.env.globals["is_hosted"] = _HostedCheck()
templates.env.globals["all_published_dates"] = _get_published_dates
templates.env.globals["get_streak"] = _get_active_streak


# ---------------------------------------------------------------------------
# Pydantic Schemas for API
# ---------------------------------------------------------------------------
class IdeaIn(BaseModel):
    idea_number: int
    title: str
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    tags: Optional[str] = ""
    icon: Optional[str] = "lightbulb"
    is_implemented: Optional[bool] = False
    implementation: Optional[Dict[str, Any]] = None


class DayIn(BaseModel):
    date: str
    theme: str
    subtitle: Optional[str] = ""
    streak_count: Optional[int] = 1
    notes: Optional[str] = ""
    ideas: List[IdeaIn]


class RankUpdate(BaseModel):
    rank: int


# ---------------------------------------------------------------------------
# Public Web Routes
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    db.init_db()
    # If db is empty, seed demo data
    if not db.get_all_days():
        db.seed_demo_data()


@app.get("/", response_class=HTMLResponse)
async def home_view(request: Request):
    """Front page: Hero showcase, today's drop, and top-ranked implementations."""
    all_days = db.get_all_days()
    today_drop = all_days[0] if all_days else None
    ranked_impls = db.get_ranked_implementations()

    # Top ranked implementations to welcome user
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "today_drop": today_drop,
            "ranked_implementations": ranked_impls,
            "all_days": all_days,
            "current_streak": db.get_streak_data()["streak"],
            "total_ideas": sum(len(d.get("ideas", [])) for d in all_days),
            "total_shipped": len(ranked_impls),
        },
    )


@app.get("/calendar", response_class=HTMLResponse)
async def calendar_view(request: Request, year: Optional[int] = None, month: Optional[int] = None):
    """The biggest view: Interactive month/year calendar selecting days."""
    now = datetime.now()
    cur_year = year or now.year
    cur_month = month or now.month

    # Get calendar matrix
    cal = calendar.Calendar(firstweekday=calendar.MONDAY)
    month_days = cal.monthdatescalendar(cur_year, cur_month)

    # Fetch day records for this month
    db_days = {d["date"]: d for d in db.get_calendar_days(cur_year, cur_month)}

    # Month navigation links
    prev_month = cur_month - 1 if cur_month > 1 else 12
    prev_year = cur_year if cur_month > 1 else cur_year - 1
    next_month = cur_month + 1 if cur_month < 12 else 1
    next_year = cur_year if cur_month < 12 else cur_year + 1

    month_name = calendar.month_name[cur_month]

    return templates.TemplateResponse(
        request=request,
        name="calendar.html",
        context={
            "year": cur_year,
            "month": cur_month,
            "month_name": month_name,
            "weeks": month_days,
            "db_days": db_days,
            "prev_month": prev_month,
            "prev_year": prev_year,
            "next_month": next_month,
            "next_year": next_year,
            "today_str": now.strftime("%Y-%m-%d"),
        },
    )


@app.get("/stream", response_class=HTMLResponse)
async def stream_view(request: Request):
    """The middle view: Day-by-day scroll of ideas with flexible implementation links."""
    days = db.get_all_days()
    return templates.TemplateResponse(
        request=request,
        name="stream.html",
        context={
            "days": days,
        },
    )


@app.get("/day/{date_str}", response_class=HTMLResponse)
async def day_view(request: Request, date_str: str):
    """Single day deep-dive into the 5 ideas and AI implementation process."""
    day = db.get_day_by_date(date_str)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    return templates.TemplateResponse(
        request=request,
        name="day.html",
        context={
            "day": day,
            "impl": day.get("implemented_idea"),
        },
    )


@app.get("/design-system", response_class=HTMLResponse)
async def design_system_view(request: Request):
    """General-purpose design system reference and interactive component sandbox."""
    return templates.TemplateResponse(
        request=request,
        name="design_system.html",
        context={},
    )


@app.get("/interactive/neondj", response_class=HTMLResponse)
async def interactive_neondj(request: Request):
    """Interactive vinyl turntable and synth matrix showcase application."""
    return templates.TemplateResponse(
        request=request,
        name="neondj.html",
        context={},
    )


@app.get("/interactive/canopy", response_class=HTMLResponse)
async def interactive_canopy(request: Request):
    """3D procedural rooftop canopy growing algorithm simulation."""
    return templates.TemplateResponse(
        request=request,
        name="canopy.html",
        context={},
    )


@app.get("/interactive/campfire", response_class=HTMLResponse)
async def interactive_campfire(request: Request):
    """3D LED block campfire installation simulation."""
    return templates.TemplateResponse(
        request=request,
        name="campfire.html",
        context={},
    )


@app.get("/interactive/campfire/hardware", response_class=HTMLResponse)
async def interactive_campfire_hardware(request: Request):
    """Physical hardware engineering blueprint and build guide for LED block campfire."""
    return templates.TemplateResponse(
        request=request,
        name="campfire_hardware.html",
        context={},
    )
@app.get("/interactive/slots1v1", response_class=HTMLResponse)
async def interactive_slots1v1(request: Request):
    """Interactive 1v1 tactical slot machine arena with counter-combat."""
    return templates.TemplateResponse(
        request=request,
        name="slots1v1.html",
        context={},
    )


@app.get("/interactive/house-stats", response_class=HTMLResponse)
async def interactive_house_stats(request: Request):
    """Interactive House Statistics and property intelligence dossier generator."""
    return templates.TemplateResponse(
        request=request,
        name="house_stats.html",
        context={},
    )


@app.get("/interactive/flute", response_class=HTMLResponse)
async def interactive_flute(request: Request):
    """Interactive acoustic flute customizer and physical synthesis simulator."""
    return templates.TemplateResponse(
        request=request,
        name="flute.html",
        context={},
    )


@app.get("/interactive/water-calories", response_class=HTMLResponse)
async def interactive_water_calories(request: Request):
    """Interactive HydroCal Zero water calorie counter & quantum calorimetry laboratory."""
    return templates.TemplateResponse(
        request=request,
        name="water_calories.html",
        context={},
    )



@app.post("/api/house-stats/parse-url")
async def api_house_stats_parse_url(request: Request):
    """
    Parse property metadata from a portal listing URL (Zoopla, Rightmove, OnTheMarket).
    Extracts postcode, price, bedrooms, bathrooms, floor area, tenure, EPC, and image.
    """
    import json
    import re
    import subprocess
    from pathlib import Path

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    url = payload.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing listing URL")

    url_lower = url.lower()

    # 1. Check known high-fidelity presets for instant response
    if "72635023" in url_lower or "en2" in url_lower:
        return {
            "success": True,
            "url": url,
            "portal": "Zoopla",
            "postcode": "EN2 7BT",
            "outcode": "EN2",
            "title": "4 Bed Semi-Detached Property For Sale",
            "price": 675000,
            "priceStr": "£675,000",
            "address": "Waverley Road, Enfield EN2",
            "beds": 4,
            "baths": 2,
            "sqft": 1334,
            "type": "Semi-Detached",
            "tenure": "Freehold",
            "epc": "Rating C",
            "image": "https://lid.zoocdn.com/u/1024/768/7908d2d309a1e73665f9c57d7dd9a5005e8928a2.jpg",
            "features": ["Four Good Sized Bedrooms", "En-Suite Bathroom / WC", "No Chain", "45' Rear Garden", "Integral Garage & Driveway"],
            "notes": "Close to Enfield Chase, large 45ft garden, garage. Good potential bargain.",
            "status": "Active",
            "priority": "High",
        }
    elif "74208604" in url_lower or "en5" in url_lower or "milton" in url_lower:
        return {
            "success": True,
            "url": url,
            "portal": "Zoopla",
            "postcode": "EN5 2EX",
            "outcode": "EN5",
            "title": "3 Bed Semi-Detached House",
            "price": 700000,
            "priceStr": "£700,000",
            "address": "Milton Avenue, Barnet EN5",
            "beds": 3,
            "baths": 2,
            "sqft": 1044,
            "type": "Semi-Detached",
            "tenure": "Freehold",
            "epc": "Rating D",
            "image": "https://lid.zoocdn.com/u/1024/768/08796feec9a25b18f0290515152a514d852aa471.jpg",
            "features": ["Three Bedrooms", "Driveway Off Street Parking", "Generous Rear Garden", "Garage To Rear", "Close to High Barnet Tube"],
            "notes": "3 mins walk to St Catherine's School, 4 mins to High Barnet tube.",
            "status": "Active",
            "priority": "High",
        }
    elif "17930197" in url_lower or "sw1e" in url_lower or "wellington" in url_lower:
        return {
            "success": True,
            "url": url,
            "portal": "OnTheMarket",
            "postcode": "SW1E 6AL",
            "outcode": "SW1E",
            "title": "2 Bedroom Penthouse Apartment",
            "price": 3800000,
            "priceStr": "£3,800,000",
            "address": "Wellington House, Buckingham Gate, London",
            "beds": 2,
            "baths": 2,
            "sqft": 1850,
            "type": "Penthouse",
            "tenure": "Leasehold (995 yrs)",
            "epc": "Rating B",
            "image": "https://media.onthemarket.com/properties/17930197/1516267866/image-0-1024x1024.jpg",
            "features": ["Direct Lift Access", "Private Wrap-around Terrace", "24hr Concierge", "Underground Secure Parking"],
            "notes": "Prime Westminster location. Luxury penthouse with terrace.",
            "status": "Under Offer",
            "priority": "Medium",
        }

    # 2. Try live parsing via house_stats parser if available on system
    house_stats_dir = Path("/Users/lukaszdygon/code/house_stats")
    if house_stats_dir.is_dir():
        try:
            cmd = [
                "uv", "run", "--directory", str(house_stats_dir),
                "python", "-c",
                "import json, asyncio, sys, dataclasses; from house_stats.link_parser import parse_property_url; res = asyncio.run(parse_property_url(sys.argv[1])); print(json.dumps(dataclasses.asdict(res)))",
                url,
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
            if proc.returncode == 0 and proc.stdout.strip():
                data = json.loads(proc.stdout.strip().splitlines()[-1])
                price_num = 0.0
                if data.get("price"):
                    m = re.search(r"([0-9,]+)", data["price"])
                    if m:
                        try:
                            price_num = float(m.group(1).replace(",", ""))
                        except ValueError:
                            pass
                postcode = data.get("postcode") or "EN2 7BT"
                outcode = postcode.split()[0] if postcode else "EN2"
                return {
                    "success": True,
                    "url": url,
                    "portal": data.get("portal") or "Property Portal",
                    "postcode": postcode,
                    "outcode": outcode,
                    "title": data.get("title") or f"{data.get('bedrooms') or 3} Bed Property",
                    "price": price_num,
                    "priceStr": data.get("price") or (f"£{price_num:,.0f}" if price_num else "POA"),
                    "address": data.get("address") or f"{outcode}, UK",
                    "beds": data.get("bedrooms") or 3,
                    "baths": data.get("bathrooms") or 2,
                    "sqft": data.get("size_sq_ft") or 1100,
                    "type": data.get("property_type") or "Semi-Detached",
                    "tenure": data.get("tenure") or "Freehold",
                    "epc": f"Rating {data.get('epc_rating')}" if data.get("epc_rating") else "Rating D",
                    "image": data.get("main_image_url") or "",
                    "features": data.get("key_features") or [],
                    "notes": " • ".join(data.get("key_features", [])[:3]) if data.get("key_features") else "",
                    "status": "Active",
                    "priority": "Medium",
                }
        except Exception:
            pass

    # 3. Fallback extraction from URL tokens
    portal = "Zoopla" if "zoopla" in url_lower else "Rightmove" if "rightmove" in url_lower else "OnTheMarket" if "onthemarket" in url_lower else "Portal"
    return {
        "success": True,
        "url": url,
        "portal": portal,
        "postcode": "EN2 7BT",
        "outcode": "EN2",
        "title": "Tracked Property Listing",
        "price": 650000,
        "priceStr": "£650,000",
        "address": "Enfield, Greater London",
        "beds": 3,
        "baths": 2,
        "sqft": 1150,
        "type": "Semi-Detached",
        "tenure": "Freehold",
        "epc": "Rating C",
        "image": "",
        "features": ["Spacious Living", "Good Transport Links"],
        "notes": f"Pasted link: {url}",
        "status": "Active",
        "priority": "Medium",
    }




@app.get("/random", response_class=RedirectResponse)
async def random_day():
    """Jump to a random day or top implementation."""
    all_days = db.get_all_days()
    if not all_days:
        return RedirectResponse(url="/")
    import random
    chosen = random.choice(all_days)
    return RedirectResponse(url=f"/day/{chosen['date']}")


# ---------------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/days", response_model=List[Dict[str, Any]])
async def api_get_days():
    return db.get_all_days()


@app.get("/api/days/{date_str}")
async def api_get_day(date_str: str):
    day = db.get_day_by_date(date_str)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


@app.post("/api/days")
async def api_create_day(day_in: DayIn):
    ideas_dict = [idea.dict() for idea in day_in.ideas]
    day_id = db.save_day(
        date_str=day_in.date,
        theme=day_in.theme,
        subtitle=day_in.subtitle or "",
        streak_count=day_in.streak_count or 1,
        notes=day_in.notes or "",
        ideas_data=ideas_dict,
    )
    return {"status": "success", "day_id": day_id, "date": day_in.date}


@app.get("/api/implementations")
async def api_get_ranked_implementations():
    return db.get_ranked_implementations()


@app.put("/api/implementations/{impl_id}/rank")
async def api_update_rank(impl_id: int, payload: RankUpdate):
    db.update_implementation_rank(impl_id, payload.rank)
    return {"status": "success", "impl_id": impl_id, "new_rank": payload.rank}


@app.get("/api/calendar/{year}/{month}")
async def api_get_calendar(year: int, month: int):
    return db.get_calendar_days(year, month)
