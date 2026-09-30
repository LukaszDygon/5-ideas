"""
Admin (content manager) for 5 Ideas Daily Showcase: a FastAPI router mounted at /admin.

Shares the site's Jinja environment. Flash messages travel in a short-lived cookie that the
dashboard reads and clears, so the admin templates keep using `get_flashed_messages()`.
"""

from __future__ import annotations

import base64
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response

from showcase import db, streak
from showcase.config import Settings

router = APIRouter(prefix="/admin")
FLASH_COOKIE = "five_ideas_flash"
DASHBOARD = "/admin/"


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _redirect(request: Request, message: str, category: str) -> RedirectResponse:
    """303 back to the dashboard carrying one flash message (appended to any pending ones)."""
    messages = _read_flashes(request) + [[category, message]]
    response = RedirectResponse(DASHBOARD, status_code=303)
    payload = base64.urlsafe_b64encode(json.dumps(messages).encode()).decode()
    response.set_cookie(FLASH_COOKIE, payload, max_age=60, httponly=True, samesite="lax", path="/admin")
    return response


def _read_flashes(request: Request) -> list[list[str]]:
    raw = request.cookies.get(FLASH_COOKIE)
    if not raw:
        return []
    try:
        messages = json.loads(base64.urlsafe_b64decode(raw.encode()))
    except (ValueError, json.JSONDecodeError):
        return []
    return [[str(c), str(m)] for c, m in messages if isinstance(m, str)] if isinstance(messages, list) else []


def _render(request: Request, name: str, context: dict[str, Any]) -> HTMLResponse:
    flashes = _read_flashes(request)
    context = {
        **context,
        "get_flashed_messages": lambda with_categories=False: (
            [tuple(f) for f in flashes] if with_categories else [m for _, m in flashes]
        ),
    }
    response = request.app.state.templates.TemplateResponse(request=request, name=name, context=context)
    if flashes:
        response.delete_cookie(FLASH_COOKIE, path="/admin")
    return response


@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    s = _settings(request)
    days = db.get_all_days(s.db_file)
    ranked_impls = db.get_ranked_implementations(s.db_file)
    return _render(
        request,
        "admin/index.html",
        {
            "days": days,
            "ranked_impls": ranked_impls,
            "streak_data": streak.get_streak_data(s.db_file, s.streak_file),
            "total_days": len(days),
            "total_ideas": sum(len(d.get("ideas", [])) for d in days),
            "total_impls": len(ranked_impls),
        },
    )


@router.post("/streak/update")
async def update_streak(request: Request):
    s = _settings(request)
    form = await request.form()
    if form.get("action", "save") == "reset":
        streak.save_streak_data(None, s.db_file, s.streak_file)
        return _redirect(request, "Unbroken streak reset to auto-calculated value.", "success")
    try:
        val = int(str(form.get("streak_value", "")).strip())
        if val < 0:
            raise ValueError("Streak must be non-negative")
    except ValueError:
        return _redirect(
            request, "Invalid streak number. Please enter a valid non-negative integer.", "error"
        )
    streak.save_streak_data(val, s.db_file, s.streak_file)
    return _redirect(request, f"Unbroken streak saved to static streak.json (value: {val} days).", "success")


@router.post("/rankings/update")
async def update_rankings(request: Request):
    """Updates the ranks of implementations from the admin form."""
    s = _settings(request)
    for key, value in (await request.form()).items():
        if key.startswith("rank_"):
            try:
                db.update_implementation_rank(int(key.replace("rank_", "")), int(value), s.db_file)
            except ValueError:
                continue
    return _redirect(request, "Implementation rankings updated successfully!", "success")


def parse_day_form_data(form_data, fallback_streak: int = 1) -> dict[str, Any]:
    """Helper to parse day metadata, ideas, and optional implementation from admin form."""
    date_str = form_data.get("date", "").strip() or datetime.now().strftime("%Y-%m-%d")
    theme = form_data.get("theme", "").strip()
    subtitle = form_data.get("subtitle", "").strip()
    try:
        streak_count = int(form_data.get("streak_count", fallback_streak) or fallback_streak)
    except ValueError:
        streak_count = fallback_streak
    notes = form_data.get("notes", "").strip()

    impl_raw = form_data.get("implemented_index", "0").strip()
    try:
        implemented_idx = int(impl_raw)
    except ValueError:
        implemented_idx = 0

    ideas_data: list[dict[str, Any]] = []
    for i in range(1, 6):
        title = form_data.get(f"idea_{i}_title", "").strip() or f"Spark #{i}"
        tagline = form_data.get(f"idea_{i}_tagline", "").strip()
        desc = form_data.get(f"idea_{i}_desc", "").strip()
        tags = form_data.get(f"idea_{i}_tags", "").strip()
        icon = form_data.get(f"idea_{i}_icon", "lightbulb").strip()
        is_impl = i == implemented_idx and implemented_idx in range(1, 6)

        idea_entry: dict[str, Any] = {
            "idea_number": i,
            "title": title,
            "tagline": tagline,
            "description": desc,
            "tags": tags,
            "icon": icon,
            "is_implemented": is_impl,
        }

        if is_impl:
            impl_title = form_data.get("impl_title", "").strip() or title
            build_type = form_data.get("impl_build_type", "webapp").strip() or "webapp"
            try:
                rank = int(form_data.get("impl_rank", 999) or 999)
            except ValueError:
                rank = 999
            summary = form_data.get("impl_summary", "").strip() or tagline
            content = form_data.get("impl_content", "").strip()
            external_url = form_data.get("impl_external_url", "").strip()
            try:
                time_spent = float(form_data.get("impl_time_spent", 4.0) or 4.0)
            except ValueError:
                time_spent = 4.0
            ai_tools = form_data.get("impl_ai_tools", "").strip()

            steps_raw = form_data.get("impl_steps", "").strip()
            steps = []
            if steps_raw:
                for line_no, line in enumerate(steps_raw.splitlines(), start=1):
                    if line.strip():
                        parts = line.split(":", 1)
                        title_part = parts[0].strip() if len(parts) > 1 else f"Step {line_no}"
                        desc_part = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                        steps.append({"step": line_no, "title": title_part, "desc": desc_part})

            rocked_raw = form_data.get("impl_what_rocked", "").strip()
            what_rocked = [line.strip("- *").strip() for line in rocked_raw.splitlines() if line.strip()]

            broke_raw = form_data.get("impl_what_broke", "").strip()
            what_broke = [line.strip("- *").strip() for line in broke_raw.splitlines() if line.strip()]

            idea_entry["implementation"] = {
                "title": impl_title,
                "build_type": build_type,
                "rank": rank,
                "summary": summary,
                "content": content,
                "external_url": external_url,
                "time_spent_hours": time_spent,
                "ai_tools_used": ai_tools,
                "process_steps": steps,
                "what_rocked": what_rocked,
                "what_broke": what_broke,
                "prompt_transcript": form_data.get("impl_transcript", "").strip(),
            }

        ideas_data.append(idea_entry)

    return {
        "date": date_str,
        "theme": theme,
        "subtitle": subtitle,
        "streak_count": streak_count,
        "notes": notes,
        "ideas_data": ideas_data,
        "implemented_idx": implemented_idx,
    }


def _save(parsed: dict[str, Any], db_path, day_id: int | None = None) -> None:
    db.save_day(
        date_str=parsed["date"],
        theme=parsed["theme"],
        subtitle=parsed["subtitle"],
        streak_count=parsed["streak_count"],
        notes=parsed["notes"],
        ideas_data=parsed["ideas_data"],
        day_id=day_id,
        db_path=db_path,
    )


@router.get("/day/new", response_class=HTMLResponse)
def new_day_form(request: Request):
    default_date = datetime.now().strftime("%Y-%m-%d")
    return _render(
        request, "admin/edit_day.html", {"day": None, "default_date": default_date, "is_new": True}
    )


@router.post("/day/new")
async def new_day(request: Request):
    parsed = parse_day_form_data(await request.form(), fallback_streak=1)
    _save(parsed, _settings(request).db_file)
    if parsed["implemented_idx"] > 0:
        return _redirect(
            request, f"Day {parsed['date']} created successfully with shipped prototype!", "success"
        )
    return _redirect(
        request,
        f"Day {parsed['date']} created successfully with 5 morning sparks (prototype in progress)!",
        "success",
    )


def _find_day(request: Request, key: str) -> dict[str, Any] | None:
    """`key` is a date (YYYY-MM-DD) or a numeric day id."""
    db_path = _settings(request).db_file
    return db.get_day_by_id(int(key), db_path) if key.isdigit() else db.get_day_by_date(key, db_path)


@router.get("/day/{key}/edit", response_class=HTMLResponse)
def edit_day_form(request: Request, key: str):
    day = _find_day(request, key)
    if not day:
        return _redirect(request, f"Day {'#' if key.isdigit() else ''}{key} not found.", "error")
    return _render(request, "admin/edit_day.html", {"day": day, "default_date": day["date"], "is_new": False})


@router.post("/day/{key}/edit")
async def edit_day(request: Request, key: str):
    day = _find_day(request, key)
    if not day:
        return _redirect(request, f"Day {'#' if key.isdigit() else ''}{key} not found.", "error")
    parsed = parse_day_form_data(await request.form(), fallback_streak=day["streak_count"])
    _save(parsed, _settings(request).db_file, day_id=day["id"])
    if parsed["implemented_idx"] > 0:
        return _redirect(
            request, f"Day {parsed['date']} updated successfully with shipped prototype!", "success"
        )
    return _redirect(
        request,
        f"Day {parsed['date']} updated successfully with morning sparks (prototype in progress).",
        "success",
    )


@router.post("/day/{day_id}/delete")
def delete_day(request: Request, day_id: int):
    db.delete_day(day_id, _settings(request).db_file)
    return _redirect(request, "Day deleted.", "info")


@router.post("/seed")
def seed_demo(request: Request) -> Response:
    s = _settings(request)
    db.seed_demo_data(s.db_file, s.seed_file)
    streak.save_streak_data(None, s.db_file, s.streak_file)
    return _redirect(request, "Demo data reseeded with 4 showcase days!", "success")
