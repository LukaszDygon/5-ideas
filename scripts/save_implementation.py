#!/usr/bin/env python3
"""
CLI helper to convert and record an implementation into the daily entry
under 'Shipped Prototype & AI Process Details'.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import db
from scripts.capture_process import (
    extract_turns_summary,
    find_latest_transcript,
    generate_interaction_summary,
    parse_transcript,
)


def parse_steps_input(steps_input: str | list) -> List[Dict[str, Any]]:
    if isinstance(steps_input, list):
        return steps_input
    steps = []
    if not steps_input or not steps_input.strip():
        return steps
    
    # Try parsing as JSON first
    try:
        loaded = json.loads(steps_input)
        if isinstance(loaded, list):
            return loaded
    except Exception:
        pass

    for line_no, line in enumerate(steps_input.strip().splitlines(), start=1):
        if line.strip():
            parts = line.split(":", 1)
            title = parts[0].strip() if len(parts) > 1 else f"Step {line_no}"
            desc = parts[1].strip() if len(parts) > 1 else parts[0].strip()
            steps.append({"step": line_no, "title": title, "desc": desc})
    return steps


def parse_list_input(list_input: str | list) -> List[str]:
    if isinstance(list_input, list):
        return list_input
    if not list_input or not list_input.strip():
        return []
    try:
        loaded = json.loads(list_input)
        if isinstance(loaded, list):
            return loaded
    except Exception:
        pass
    return [line.strip("- *").strip() for line in list_input.strip().splitlines() if line.strip()]


def save_prototype_implementation(
    date_str: str = "today",
    idea_number: int = 1,
    title: Optional[str] = None,
    build_type: str = "webapp",
    rank: int = 1,
    time_spent_hours: float = 2.0,
    ai_tools_used: str = "",
    external_url: str = "",
    summary: str = "",
    content: str = "",
    process_steps: Optional[str | list] = None,
    what_rocked: Optional[str | list] = None,
    what_broke: Optional[str | list] = None,
    prompt_transcript: str = "",
    auto_extract_transcript: bool = False,
    db_path: Path | str | None = None,
) -> Dict[str, Any]:
    """Records the implementation into the database for the given day and idea."""
    if not date_str or date_str.lower() in ("today", "now"):
        date_str = datetime.now().strftime("%Y-%m-%d")

    day = db.get_day_by_date(date_str, db_path=db_path)
    if not day:
        raise ValueError(f"Day '{date_str}' not found in database. Create the day first.")

    ideas = day.get("ideas", [])
    if not ideas:
        raise ValueError(f"No ideas found for day '{date_str}'.")

    target_idea = next((i for i in ideas if i["idea_number"] == idea_number), None)
    if not target_idea:
        raise ValueError(f"Idea #{idea_number} not found for day '{date_str}'. Available ideas: 1 to {len(ideas)}.")

    # Auto-extract AI Interaction Summary from transcript if requested
    if auto_extract_transcript and not prompt_transcript:
        t_path = find_latest_transcript()
        if t_path and t_path.exists():
            steps_data = parse_transcript(t_path)
            turn_summary = extract_turns_summary(steps_data)
            prompt_transcript = generate_interaction_summary(turn_summary)

    # Resolve defaults
    proto_title = title.strip() if (title and title.strip()) else target_idea["title"]
    proto_summary = summary.strip() if summary.strip() else (target_idea.get("tagline") or proto_title)
    parsed_steps = parse_steps_input(process_steps or [])
    parsed_rocked = parse_list_input(what_rocked or [])
    parsed_broke = parse_list_input(what_broke or [])

    # Validate build_type
    valid_types = ("webapp", "poetry", "song", "image", "interactive")
    if build_type not in valid_types:
        build_type = "webapp"

    impl_payload = {
        "title": proto_title,
        "build_type": build_type,
        "rank": rank,
        "summary": proto_summary,
        "content": content,
        "external_url": external_url,
        "time_spent_hours": float(time_spent_hours),
        "ai_tools_used": ai_tools_used,
        "process_steps": parsed_steps,
        "what_rocked": parsed_rocked,
        "what_broke": parsed_broke,
        "prompt_transcript": prompt_transcript,
    }

    # Update ideas list: exactly target idea has is_implemented = True
    updated_ideas: List[Dict[str, Any]] = []
    for idea in ideas:
        i_num = idea["idea_number"]
        is_target = (i_num == idea_number)
        idea_dict = {
            "idea_number": i_num,
            "title": idea["title"],
            "tagline": idea.get("tagline", ""),
            "description": idea.get("description", ""),
            "tags": idea.get("tags", ""),
            "icon": idea.get("icon", "lightbulb"),
            "is_implemented": is_target,
        }
        if is_target:
            idea_dict["implementation"] = impl_payload
        updated_ideas.append(idea_dict)

    # Atomically save day and implementation
    db.save_day(
        date_str=day["date"],
        theme=day["theme"],
        subtitle=day.get("subtitle", ""),
        streak_count=day.get("streak_count", 1),
        notes=day.get("notes", ""),
        ideas_data=updated_ideas,
        day_id=day["id"],
        db_path=db_path,
    )

    updated_day = db.get_day_by_date(date_str, db_path=db_path)
    return updated_day


def main():
    parser = argparse.ArgumentParser(description="Save shipped prototype details into daily showcase entry.")
    parser.add_argument("--date", default="today", help="Date string (YYYY-MM-DD or 'today')")
    parser.add_argument("--idea", type=int, required=True, choices=range(1, 6), help="Implemented idea number (1-5)")
    parser.add_argument("--title", help="Prototype title (defaults to idea title)")
    parser.add_argument("--type", default="webapp", choices=["webapp", "poetry", "song", "image", "interactive"], help="Build type")
    parser.add_argument("--rank", type=int, default=1, help="Rank order (1 = highest preference)")
    parser.add_argument("--time", type=float, default=2.0, help="Hours spent")
    parser.add_argument("--ai-tools", default="", help="AI tools used")
    parser.add_argument("--url", default="", help="External URL or repo")
    parser.add_argument("--summary", default="", help="1-sentence hook")
    parser.add_argument("--content", default="", help="Content payload or route")
    parser.add_argument("--steps", default="", help="Process steps (lines of 'Title: Description' or JSON)")
    parser.add_argument("--rocked", default="", help="What rocked (lines or JSON)")
    parser.add_argument("--broke", default="", help="What broke & fixed (lines or JSON)")
    parser.add_argument("--transcript", "--interaction-summary", dest="transcript", default="", help="AI interaction summary (leak-free)")
    parser.add_argument("--auto-transcript", "--auto-summary", dest="auto_transcript", action="store_true", help="Auto-extract leak-free AI interaction summary from latest transcript")
    parser.add_argument("--json-file", help="Path to JSON file containing implementation fields")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")

    args = parser.parse_args()

    # Load from json-file if provided
    params: Dict[str, Any] = {
        "date_str": args.date,
        "idea_number": args.idea,
        "title": args.title,
        "build_type": args.type,
        "rank": args.rank,
        "time_spent_hours": args.time,
        "ai_tools_used": args.ai_tools,
        "external_url": args.url,
        "summary": args.summary,
        "content": args.content,
        "process_steps": args.steps,
        "what_rocked": args.rocked,
        "what_broke": args.broke,
        "prompt_transcript": args.transcript,
        "auto_extract_transcript": args.auto_transcript,
    }

    if args.json_file:
        with open(args.json_file, "r", encoding="utf-8") as f:
            file_data = json.load(f)
            params.update(file_data)

    try:
        updated_day = save_prototype_implementation(**params)
        impl = updated_day["implemented_idea"]["implementation"]

        if args.json:
            print(json.dumps(updated_day, indent=2))
        else:
            print("=" * 64)
            print(f"🎉 SUCCESS: Shipped Prototype recorded for Day {updated_day['date']}!")
            print(f"   Theme: {updated_day['theme']}")
            print(f"   Spark: #{updated_day['implemented_idea']['idea_number']} ({updated_day['implemented_idea']['title']})")
            print(f"   Prototype Title: {impl['title']}")
            print(f"   Build Type: {impl['build_type'].upper()}")
            print(f"   Rank: #{impl['rank']}")
            print(f"   Time Spent: {impl['time_spent_hours']} hours")
            print(f"   Process Steps: {len(impl['process_steps'])} logged")
            print(f"   What Rocked: {len(impl['what_rocked'])} bullets")
            print(f"   What Broke: {len(impl['what_broke'])} bullets")
            print("=" * 64)
            print(f"⚡ Live View: /day/{updated_day['date']}")
            print(f"🛠️ Admin Edit: /admin/day/{updated_day['date']}/edit")
    except Exception as e:
        print(f"❌ Error saving implementation: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
