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


@admin_app.route("/")
def dashboard():
    days = db.get_all_days()
    ranked_impls = db.get_ranked_implementations()
    return render_template(
        "admin/index.html",
        days=days,
        ranked_impls=ranked_impls,
        total_days=len(days),
        total_ideas=sum(len(d.get("ideas", [])) for d in days),
        total_impls=len(ranked_impls),
    )


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


@admin_app.route("/day/new", methods=["GET", "POST"])
def new_day():
    if request.method == "POST":
        date_str = request.form.get("date", "").strip() or datetime.now().strftime("%Y-%m-%d")
        theme = request.form.get("theme", "").strip()
        subtitle = request.form.get("subtitle", "").strip()
        streak_count = int(request.form.get("streak_count", 1) or 1)
        notes = request.form.get("notes", "").strip()

        implemented_idx = int(request.form.get("implemented_index", 1))

        ideas_data: List[Dict[str, Any]] = []
        for i in range(1, 6):
            title = request.form.get(f"idea_{i}_title", "").strip() or f"Spark #{i}"
            tagline = request.form.get(f"idea_{i}_tagline", "").strip()
            desc = request.form.get(f"idea_{i}_desc", "").strip()
            tags = request.form.get(f"idea_{i}_tags", "").strip()
            icon = request.form.get(f"idea_{i}_icon", "lightbulb").strip()
            is_impl = (i == implemented_idx)

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
                build_type = request.form.get("impl_build_type", "webapp")
                rank = int(request.form.get("impl_rank", 999) or 999)
                summary = request.form.get("impl_summary", "").strip()
                content = request.form.get("impl_content", "").strip()
                external_url = request.form.get("impl_external_url", "").strip()
                time_spent = float(request.form.get("impl_time_spent", 4.0) or 4.0)
                ai_tools = request.form.get("impl_ai_tools", "").strip()
                
                # Parse steps, rocked, broke from text lines
                steps_raw = request.form.get("impl_steps", "").strip()
                steps = []
                if steps_raw:
                    for line_no, line in enumerate(steps_raw.splitlines(), start=1):
                        if line.strip():
                            parts = line.split(":", 1)
                            title_part = parts[0].strip() if len(parts) > 1 else f"Step {line_no}"
                            desc_part = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                            steps.append({"step": line_no, "title": title_part, "desc": desc_part})

                rocked_raw = request.form.get("impl_what_rocked", "").strip()
                what_rocked = [line.strip("- *").strip() for line in rocked_raw.splitlines() if line.strip()]

                broke_raw = request.form.get("impl_what_broke", "").strip()
                what_broke = [line.strip("- *").strip() for line in broke_raw.splitlines() if line.strip()]

                idea_entry["implementation"] = {
                    "title": title,
                    "build_type": build_type,
                    "rank": rank,
                    "summary": summary or tagline,
                    "content": content,
                    "external_url": external_url,
                    "time_spent_hours": time_spent,
                    "ai_tools_used": ai_tools,
                    "process_steps": steps,
                    "what_rocked": what_rocked,
                    "what_broke": what_broke,
                    "prompt_transcript": request.form.get("impl_transcript", "").strip(),
                }

            ideas_data.append(idea_entry)

        db.save_day(
            date_str=date_str,
            theme=theme,
            subtitle=subtitle,
            streak_count=streak_count,
            notes=notes,
            ideas_data=ideas_data,
        )
        flash(f"Day {date_str} created successfully!", "success")
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
        theme = request.form.get("theme", "").strip()
        subtitle = request.form.get("subtitle", "").strip()
        streak_count = int(request.form.get("streak_count", day["streak_count"]) or 1)
        notes = request.form.get("notes", "").strip()

        implemented_idx = int(request.form.get("implemented_index", 1))

        ideas_data: List[Dict[str, Any]] = []
        for i in range(1, 6):
            title = request.form.get(f"idea_{i}_title", "").strip() or f"Spark #{i}"
            tagline = request.form.get(f"idea_{i}_tagline", "").strip()
            desc = request.form.get(f"idea_{i}_desc", "").strip()
            tags = request.form.get(f"idea_{i}_tags", "").strip()
            icon = request.form.get(f"idea_{i}_icon", "lightbulb").strip()
            is_impl = (i == implemented_idx)

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
                build_type = request.form.get("impl_build_type", "webapp")
                rank = int(request.form.get("impl_rank", 999) or 999)
                summary = request.form.get("impl_summary", "").strip()
                content = request.form.get("impl_content", "").strip()
                external_url = request.form.get("impl_external_url", "").strip()
                time_spent = float(request.form.get("impl_time_spent", 4.0) or 4.0)
                ai_tools = request.form.get("impl_ai_tools", "").strip()

                steps_raw = request.form.get("impl_steps", "").strip()
                steps = []
                if steps_raw:
                    for line_no, line in enumerate(steps_raw.splitlines(), start=1):
                        if line.strip():
                            parts = line.split(":", 1)
                            title_part = parts[0].strip() if len(parts) > 1 else f"Step {line_no}"
                            desc_part = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                            steps.append({"step": line_no, "title": title_part, "desc": desc_part})

                rocked_raw = request.form.get("impl_what_rocked", "").strip()
                what_rocked = [line.strip("- *").strip() for line in rocked_raw.splitlines() if line.strip()]

                broke_raw = request.form.get("impl_what_broke", "").strip()
                what_broke = [line.strip("- *").strip() for line in broke_raw.splitlines() if line.strip()]

                idea_entry["implementation"] = {
                    "title": title,
                    "build_type": build_type,
                    "rank": rank,
                    "summary": summary or tagline,
                    "content": content,
                    "external_url": external_url,
                    "time_spent_hours": time_spent,
                    "ai_tools_used": ai_tools,
                    "process_steps": steps,
                    "what_rocked": what_rocked,
                    "what_broke": what_broke,
                    "prompt_transcript": request.form.get("impl_transcript", "").strip(),
                }

            ideas_data.append(idea_entry)

        db.save_day(
            date_str=date_str,
            theme=theme,
            subtitle=subtitle,
            streak_count=streak_count,
            notes=notes,
            ideas_data=ideas_data,
        )
        flash(f"Day {date_str} updated successfully!", "success")
        return redirect(url_for("dashboard"))

    return render_template("admin/edit_day.html", day=day, default_date=date_str, is_new=False)


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
