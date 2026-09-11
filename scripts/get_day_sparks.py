#!/usr/bin/env python3
"""
CLI helper to inspect a specific day's morning sparks and selected prototype.
Defaults to today's date.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import db


def get_sparks(date_str: str | None = None) -> dict | None:
    if not date_str or date_str.lower() in ("today", "now"):
        date_str = datetime.now().strftime("%Y-%m-%d")
    return db.get_day_by_date(date_str)


def format_sparks_terminal(day: dict) -> str:
    lines = []
    lines.append("=" * 64)
    lines.append(f"★ 5 IDEAS DAILY SHOWCASE // DAY: {day['date']}")
    lines.append(f"THEME: {day['theme']}")
    if day.get("subtitle"):
        lines.append(f"SUBTITLE: {day['subtitle']}")
    lines.append(f"STREAK: Day #{day.get('streak_count', 1)}")
    if day.get("notes"):
        lines.append(f"MORNING NOTES: {day['notes'].strip()}")
    lines.append("=" * 64)
    lines.append("\nTHE 5 MORNING SPARKS:")

    for idea in day.get("ideas", []):
        num = idea["idea_number"]
        is_impl = idea.get("is_implemented")
        impl_mark = " [★ CURRENTLY SELECTED PROTOTYPE]" if is_impl else ""
        lines.append(f"\n  #{num}: {idea['title']}{impl_mark}")
        if idea.get("tagline"):
            lines.append(f"      Tagline: {idea['tagline']}")
        if idea.get("tags"):
            lines.append(f"      Tags: {idea['tags']}")
        if idea.get("description"):
            lines.append(f"      Desc: {idea['description']}")

    impl = day.get("implemented_idea")
    lines.append("\n" + "-" * 64)
    if impl and impl.get("implementation"):
        im = impl["implementation"]
        lines.append("SHIPPED PROTOTYPE & AI PROCESS DETAILS:")
        lines.append(f"  • Selected Spark: #{impl['idea_number']} ({impl['title']})")
        lines.append(f"  • Prototype Title: {im.get('title')}")
        lines.append(f"  • Build Type: {im.get('build_type')}")
        lines.append(f"  • Rank: #{im.get('rank', 1)}")
        lines.append(f"  • Time Spent: {im.get('time_spent_hours', 4.0)} hours")
        lines.append(f"  • Summary: {im.get('summary')}")
        if im.get("ai_tools_used"):
            lines.append(f"  • AI Tools: {im.get('ai_tools_used')}")
        if im.get("external_url"):
            lines.append(f"  • URL: {im.get('external_url')}")
    else:
        lines.append("PROTOTYPE STATUS: ⏳ IN PROGRESS (Sparks logged, no prototype shipped yet)")
    lines.append("=" * 64)
    return "\n".join(lines)


def format_single_idea_terminal(day: dict, idea: dict) -> str:
    lines = []
    lines.append("=" * 64)
    lines.append(f"DAY: {day['date']} // THEME: {day['theme']}")
    lines.append(f"SELECTED SPARK #{idea['idea_number']}: {idea['title']}")
    lines.append("=" * 64)
    if idea.get("tagline"):
        lines.append(f"Tagline:     {idea['tagline']}")
    if idea.get("tags"):
        lines.append(f"Tags:        {idea['tags']}")
    if idea.get("description"):
        lines.append(f"Description: {idea['description']}")
    lines.append(f"Implemented: {'Yes' if idea.get('is_implemented') else 'No (In Progress)'}")
    if idea.get("implementation"):
        im = idea["implementation"]
        lines.append("\nCurrent Implementation:")
        lines.append(f"  Title: {im.get('title')} ({im.get('build_type')})")
        lines.append(f"  Rank: #{im.get('rank', 1)} | Time: {im.get('time_spent_hours', 4.0)}h")
        lines.append(f"  Summary: {im.get('summary')}")
    lines.append("=" * 64)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Inspect daily morning sparks.")
    parser.add_argument(
        "--date",
        default="today",
        help="Date to inspect (YYYY-MM-DD, or 'today', default: today)",
    )
    parser.add_argument(
        "--idea",
        type=int,
        choices=range(1, 6),
        help="Specific idea number (1-5) to inspect",
    )
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    target_date = datetime.now().strftime("%Y-%m-%d") if args.date in ("today", "now") else args.date
    day = get_sparks(target_date)

    if not day:
        all_days = db.get_all_days()
        available = [d["date"] for d in all_days]
        if args.json:
            print(json.dumps({"error": f"Day {target_date} not found", "available_dates": available}))
        else:
            print(f"Error: Day {target_date} not found in database.", file=sys.stderr)
            if available:
                print(f"Available dates: {', '.join(available)}", file=sys.stderr)
        sys.exit(1)

    if args.idea:
        matched = next((i for i in day.get("ideas", []) if i["idea_number"] == args.idea), None)
        if not matched:
            print(f"Error: Idea #{args.idea} not found for day {target_date}", file=sys.stderr)
            sys.exit(1)
        if args.json:
            out = dict(matched)
            out["day_date"] = day["date"]
            out["day_theme"] = day["theme"]
            print(json.dumps(out, indent=2))
        else:
            print(format_single_idea_terminal(day, matched))
        return

    if args.json:
        print(json.dumps(day, indent=2))
    else:
        print(format_sparks_terminal(day))


if __name__ == "__main__":
    main()
