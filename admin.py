"""
Flask Admin Application for 5 Ideas Daily Showcase.
Mounted under FastAPI via Starlette WSGIMiddleware.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List
from flask import Flask, flash, redirect, render_template, request, url_for

import db

admin_app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
)
admin_app.secret_key = "five-ideas-memphis-pop-secret-key"
admin_app.jinja_env.globals["all_published_dates"] = lambda: [d["date"] for d in db.get_all_days()]
admin_app.jinja_env.globals["get_streak"] = lambda: db.get_streak_data()["streak"]
admin_app.jinja_env.globals["is_hosted"] = False


@admin_app.route("/")
def dashboard():
    days = db.get_all_days()
    ranked_impls = db.get_ranked_implementations()
    streak_data = db.get_streak_data()
    return render_template(
        "admin/index.html",
        days=days,
        ranked_impls=ranked_impls,
        streak_data=streak_data,
        total_days=len(days),
        total_ideas=sum(len(d.get("ideas", [])) for d in days),
        total_impls=len(ranked_impls),
    )


@admin_app.route("/streak/update", methods=["POST"])
def update_streak():
    action = request.form.get("action", "save")
    if action == "reset":
        db.save_streak_data(None)
        flash("Unbroken streak reset to auto-calculated value.", "success")
    else:
        raw_val = request.form.get("streak_value", "").strip()
        try:
            val = int(raw_val)
            if val < 0:
                raise ValueError("Streak must be non-negative")
            db.save_streak_data(val)
            flash(f"Unbroken streak saved to static streak.json (value: {val} days).", "success")
        except ValueError:
            flash("Invalid streak number. Please enter a valid non-negative integer.", "error")
    return redirect(url_for("dashboard"))


@admin_app.route("/rankings/update", methods=["POST"])
def update_rankings():
    """Updates the ranks of implementations from the admin form."""
    form_data = request.form
    for key, value in form_data.items():
        if key.startswith("rank_"):
            try:
                impl_id = int(key.replace("rank_", ""))
                new_rank = int(value)
                db.update_implementation_rank(impl_id, new_rank)
            except ValueError:
                continue
    flash("Implementation rankings updated successfully!", "success")
    return redirect(url_for("dashboard"))


def parse_day_form_data(form_data, fallback_streak: int = 1) -> Dict[str, Any]:
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

    ideas_data: List[Dict[str, Any]] = []
    for i in range(1, 6):
        title = form_data.get(f"idea_{i}_title", "").strip() or f"Spark #{i}"
        tagline = form_data.get(f"idea_{i}_tagline", "").strip()
        desc = form_data.get(f"idea_{i}_desc", "").strip()
        tags = form_data.get(f"idea_{i}_tags", "").strip()
        icon = form_data.get(f"idea_{i}_icon", "lightbulb").strip()
        is_impl = (i == implemented_idx and implemented_idx in range(1, 6))

        idea_entry: Dict[str, Any] = {
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


@admin_app.route("/day/new", methods=["GET", "POST"])
def new_day():
    if request.method == "POST":
        parsed = parse_day_form_data(request.form, fallback_streak=1)
        db.save_day(
            date_str=parsed["date"],
            theme=parsed["theme"],
            subtitle=parsed["subtitle"],
            streak_count=parsed["streak_count"],
            notes=parsed["notes"],
            ideas_data=parsed["ideas_data"],
        )
        if parsed["implemented_idx"] > 0:
            flash(f"Day {parsed['date']} created successfully with shipped prototype!", "success")
        else:
            flash(f"Day {parsed['date']} created successfully with 5 morning sparks (prototype in progress)!", "success")
        return redirect(url_for("dashboard"))

    # GET
    default_date = datetime.now().strftime("%Y-%m-%d")
    return render_template("admin/edit_day.html", day=None, default_date=default_date, is_new=True)


@admin_app.route("/day/<date_str>/edit", methods=["GET", "POST"])
def edit_day(date_str: str):
    day = db.get_day_by_date(date_str)
    if not day:
        flash(f"Day {date_str} not found.", "error")
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        parsed = parse_day_form_data(request.form, fallback_streak=day["streak_count"])
        db.save_day(
            date_str=parsed["date"],
            theme=parsed["theme"],
            subtitle=parsed["subtitle"],
            streak_count=parsed["streak_count"],
            notes=parsed["notes"],
            ideas_data=parsed["ideas_data"],
            day_id=day["id"],
        )
        if parsed["implemented_idx"] > 0:
            flash(f"Day {parsed['date']} updated successfully with shipped prototype!", "success")
        else:
            flash(f"Day {parsed['date']} updated successfully with morning sparks (prototype in progress).", "success")
        return redirect(url_for("dashboard"))

    return render_template("admin/edit_day.html", day=day, default_date=date_str, is_new=False)


@admin_app.route("/day/<int:day_id>/edit", methods=["GET", "POST"])
def edit_day_by_id(day_id: int):
    day = db.get_day_by_id(day_id)
    if not day:
        flash(f"Day #{day_id} not found.", "error")
        return redirect(url_for("dashboard"))
    return edit_day(day["date"])


@admin_app.route("/day/<int:day_id>/delete", methods=["POST"])
def delete_day(day_id: int):
    db.delete_day(day_id)
    flash(f"Day deleted.", "info")
    return redirect(url_for("dashboard"))


@admin_app.route("/seed", methods=["POST"])
def seed_demo():
    db.seed_demo_data()
    flash("Demo data reseeded with 4 showcase days!", "success")
    return redirect(url_for("dashboard"))
