"""Command line for the daily workflow: `uv run five-ideas <command>` (or `python -m showcase.cli`).

Commands: sparks, new-day, save-impl, capture, new-prototype, build, seed.
Every command reads paths from the environment (see showcase/config.py), so tests can point
FIVE_IDEAS_DATA_DIR / FIVE_IDEAS_PROTOTYPES_DIR at a temporary directory.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

from showcase import capture, db, registry, streak
from showcase.config import DIST_DIR, ROOT, Settings

IDEA_FIELDS = ("title", "tagline", "description", "tags")


def resolve_date(value: str | None) -> str:
    """'today' / 'now' / empty -> today's date; anything else is returned as given."""
    if not value or value.lower() in ("today", "now"):
        return datetime.now().strftime("%Y-%m-%d")
    return value


def fail(message: str) -> int:
    print(f"Error: {message}", file=sys.stderr)
    return 1


# ---------------------------------------------------------------------------
# sparks
# ---------------------------------------------------------------------------
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


def cmd_sparks(args: argparse.Namespace, settings: Settings) -> int:
    target = resolve_date(args.date)
    day = db.get_day_by_date(target, settings.db_file)
    if not day:
        available = db.get_published_dates(settings.db_file)
        if args.json:
            print(json.dumps({"error": f"Day {target} not found", "available_dates": available}))
        else:
            print(f"Error: Day {target} not found in database.", file=sys.stderr)
            if available:
                print(f"Available dates: {', '.join(available)}", file=sys.stderr)
        return 1

    if args.idea:
        matched = next((i for i in day.get("ideas", []) if i["idea_number"] == args.idea), None)
        if not matched:
            return fail(f"Idea #{args.idea} not found for day {target}")
        if args.json:
            print(json.dumps({**matched, "day_date": day["date"], "day_theme": day["theme"]}, indent=2))
        else:
            print(format_single_idea_terminal(day, matched))
        return 0

    print(json.dumps(day, indent=2) if args.json else format_sparks_terminal(day))
    return 0


# ---------------------------------------------------------------------------
# new-day
# ---------------------------------------------------------------------------
def parse_idea_spec(spec: str, number: int) -> dict[str, Any]:
    """'title|tagline|description|tags' -> idea dict (only the title is required)."""
    parts = [p.strip() for p in spec.split("|")]
    if len(parts) > len(IDEA_FIELDS) or not parts[0]:
        raise ValueError(f"idea #{number} must look like 'title|tagline|description|tags': {spec!r}")
    idea = dict(zip(IDEA_FIELDS, parts + [""] * (len(IDEA_FIELDS) - len(parts)), strict=True))
    return {"idea_number": number, **idea, "icon": "lightbulb", "is_implemented": False}


def create_day(payload: dict[str, Any], replace: bool, db_path: Path) -> dict[str, Any]:
    """Validates and saves a new day with exactly five sparks; returns the stored day."""
    day_date = resolve_date(payload.get("date"))
    date.fromisoformat(day_date)  # raises ValueError on a bad date
    if not payload.get("theme"):
        raise ValueError("a theme is required")
    ideas = payload.get("ideas") or []
    if len(ideas) != 5:
        raise ValueError(f"exactly 5 ideas are required, got {len(ideas)}")
    ideas = [
        parse_idea_spec(i, n)
        if isinstance(i, str)
        else {"icon": "lightbulb", **i, "idea_number": n, "is_implemented": False}
        for n, i in enumerate(ideas, start=1)
    ]
    if db.get_day_by_date(day_date, db_path) and not replace:
        raise ValueError(
            f"day {day_date} already exists; pass --replace to overwrite it (this drops its prototype)"
        )
    db.save_day(
        date_str=day_date,
        theme=payload["theme"],
        subtitle=payload.get("subtitle", ""),
        streak_count=int(payload.get("streak_count", 1)),
        notes=payload.get("notes", ""),
        ideas_data=ideas,
        db_path=db_path,
    )
    return db.get_day_by_date(day_date, db_path)


def cmd_new_day(args: argparse.Namespace, settings: Settings) -> int:
    if args.json_file:
        payload = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
    else:
        payload = {
            "date": args.date,
            "theme": args.theme,
            "subtitle": args.subtitle,
            "notes": args.notes,
            "streak_count": args.streak,
            "ideas": args.idea or [],
        }
    try:
        day = create_day(payload, args.replace, settings.db_file)
    except ValueError as exc:
        return fail(str(exc))
    print(format_sparks_terminal(day))
    return 0


# ---------------------------------------------------------------------------
# save-impl
# ---------------------------------------------------------------------------
def parse_steps_input(steps_input: str | list) -> list[dict[str, Any]]:
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


def parse_list_input(list_input: str | list) -> list[str]:
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
    title: str | None = None,
    build_type: str = "webapp",
    rank: int = 1,
    time_spent_hours: float = 2.0,
    ai_tools_used: str = "",
    external_url: str = "",
    summary: str = "",
    content: str = "",
    process_steps: str | list | None = None,
    what_rocked: str | list | None = None,
    what_broke: str | list | None = None,
    prompt_transcript: str = "",
    auto_extract_transcript: bool = False,
    db_path: Path | str | None = None,
) -> dict[str, Any]:
    """Records the implementation into the database for the given day and idea."""
    date_str = resolve_date(date_str)

    day = db.get_day_by_date(date_str, db_path=db_path)
    if not day:
        raise ValueError(f"Day '{date_str}' not found in database. Create the day first.")

    ideas = day.get("ideas", [])
    if not ideas:
        raise ValueError(f"No ideas found for day '{date_str}'.")

    target_idea = next((i for i in ideas if i["idea_number"] == idea_number), None)
    if not target_idea:
        raise ValueError(
            f"Idea #{idea_number} not found for day '{date_str}'. Available ideas: 1 to {len(ideas)}."
        )

    # Auto-extract AI Interaction Summary from transcript if requested
    if auto_extract_transcript and not prompt_transcript:
        t_path = capture.find_transcript("auto", ROOT)
        if t_path and t_path.exists():
            steps_data = capture.parse_transcript(t_path)
            prompt_transcript = capture.generate_interaction_summary(
                capture.extract_turns_summary(steps_data)
            )

    # Resolve defaults
    proto_title = title.strip() if (title and title.strip()) else target_idea["title"]
    proto_summary = summary.strip() if summary.strip() else (target_idea.get("tagline") or proto_title)
    parsed_steps = parse_steps_input(process_steps or [])
    parsed_rocked = parse_list_input(what_rocked or [])
    parsed_broke = parse_list_input(what_broke or [])

    # Validate build_type
    if build_type not in db.BUILD_TYPES:
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
    updated_ideas: list[dict[str, Any]] = []
    for idea in ideas:
        i_num = idea["idea_number"]
        is_target = i_num == idea_number
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


def cmd_save_impl(args: argparse.Namespace, settings: Settings) -> int:
    params: dict[str, Any] = {
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
        "db_path": settings.db_file,
    }
    if args.json_file:
        params.update(json.loads(Path(args.json_file).read_text(encoding="utf-8")))
    try:
        updated_day = save_prototype_implementation(**params)
    except ValueError as exc:
        return fail(str(exc))
    if args.json:
        print(json.dumps(updated_day, indent=2))
        return 0
    idea = updated_day["implemented_idea"]
    impl = idea["implementation"]
    print("=" * 64)
    print(f"SUCCESS: Shipped Prototype recorded for Day {updated_day['date']}!")
    print(f"   Theme: {updated_day['theme']}")
    print(f"   Spark: #{idea['idea_number']} ({idea['title']})")
    print(f"   Prototype Title: {impl['title']}")
    print(f"   Build Type: {impl['build_type'].upper()}")
    print(f"   Rank: #{impl['rank']}")
    print(f"   Time Spent: {impl['time_spent_hours']} hours")
    print(f"   Process Steps: {len(impl['process_steps'])} logged")
    print(f"   What Rocked: {len(impl['what_rocked'])} bullets")
    print(f"   What Broke: {len(impl['what_broke'])} bullets")
    print("=" * 64)
    print(f"Live View: /day/{updated_day['date']}")
    print(f"Admin Edit: /admin/day/{updated_day['date']}/edit")
    return 0


# ---------------------------------------------------------------------------
# capture
# ---------------------------------------------------------------------------
def cmd_capture(args: argparse.Namespace, settings: Settings) -> int:
    t_path = Path(args.transcript) if args.transcript else capture.find_transcript(args.source, ROOT)
    if not t_path or not t_path.exists():
        return fail(f"no {args.source} transcript found; pass --transcript <path>")
    entries = capture.parse_transcript(t_path)
    source = capture.detect_source(entries) if args.source == "auto" else args.source
    summary = capture.extract_turns_summary(entries, source)
    if args.json:
        output = json.dumps(
            {
                "title": args.title,
                "build_type": args.type,
                "time_spent_hours": args.time,
                "summary": summary["initial_prompt"][:250],
                "prompt_transcript": capture.generate_interaction_summary(summary),
            },
            indent=2,
        )
    else:
        output = capture.generate_presentable_report(
            summary=summary,
            idea_title=args.title,
            build_type=args.type,
            time_spent=args.time,
            ai_stack="Claude Code" if source == "claude" else "Gemini, Antigravity CLI",
        )
    if args.out:
        Path(args.out).write_text(output, encoding="utf-8")
        print(f"Report written to {args.out}")
    else:
        print(output)
    return 0


# ---------------------------------------------------------------------------
# new-prototype
# ---------------------------------------------------------------------------
TEMPLATE = """{% extends "base.html" %}

{% block title %}{{ prototype.title }} | 5 Ideas Daily{% endblock %}

{% block content %}
<div class="flex flex-col gap-10">
  <section class="bg-primary-magenta text-white border-[4px] border-ink shadow-[6px_6px_0px_#1c1b1b] p-6 md:p-8">
    <div class="inline-flex items-center gap-2 bg-tertiary-yellow text-ink px-3 py-1 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#1c1b1b] -rotate-1 mb-3">
      {{ prototype.date }} // {{ prototype.build_type }}
    </div>
    <h1 class="font-display font-black text-3xl sm:text-5xl uppercase leading-none tracking-tight">{{ prototype.title }}</h1>
    <p class="font-body text-base text-white/90 max-w-2xl mt-2">{{ prototype.description }}</p>
  </section>

  <section class="bg-white border-[4px] border-ink shadow-[6px_6px_0px_#1c1b1b] p-6">
    <!-- Build the prototype here. Rules: .claude/rules/prototypes.md and .claude/rules/design-system.md -->
    <button type="button" class="neo-btn neo-btn-yellow">Start</button>
  </section>
</div>
{% endblock %}
"""


def scaffold_prototype(
    slug: str, title: str, day: str, build_type: str, description: str, root: Path
) -> registry.Prototype:
    """Creates prototypes/<slug>/ (manifest, template, empty static/) and returns the validated prototype."""
    if not registry.SLUG_RE.match(slug):
        raise ValueError(f"slug {slug!r} must be lowercase words joined by hyphens")
    if build_type not in registry.BUILD_TYPES:
        raise ValueError(f"type must be one of {registry.BUILD_TYPES}")
    date.fromisoformat(day)
    folder = root / slug
    if folder.exists():
        raise ValueError(f"{folder} already exists")
    (folder / "static").mkdir(parents=True)
    (folder / "static" / ".gitkeep").touch()
    manifest = "\n".join(
        [
            f"slug = {json.dumps(slug)}",
            f"title = {json.dumps(title)}",
            f"date = {json.dumps(day)}",
            f"build_type = {json.dumps(build_type)}",
            'template = "template.html"',
            f"description = {json.dumps(description)}",
            "extra_paths = []",
            "routes = false",
            "",
        ]
    )
    (folder / "prototype.toml").write_text(manifest, encoding="utf-8")
    (folder / "template.html").write_text(TEMPLATE, encoding="utf-8")
    return registry.load_manifest(folder)


def cmd_new_prototype(args: argparse.Namespace, settings: Settings) -> int:
    try:
        proto = scaffold_prototype(
            args.slug,
            args.title,
            resolve_date(args.date),
            args.type,
            args.description,
            settings.prototypes_dir,
        )
    except ValueError as exc:
        return fail(str(exc))
    print(f"Created {proto.folder}")
    print(f"  page:   {proto.url}")
    print(f"  edit:   {proto.folder / proto.template}")
    print(f"  assets: {proto.static_dir} (served at {proto.static_url}/)")
    return 0


# ---------------------------------------------------------------------------
# build / seed
# ---------------------------------------------------------------------------
def cmd_build(args: argparse.Namespace, settings: Settings) -> int:
    from showcase import static_site  # imports the whole web app; keep other commands light

    static_site.build_static(out=Path(args.out), base_path=args.base_path, settings=settings, log=print)
    return 0


def cmd_seed(args: argparse.Namespace, settings: Settings) -> int:
    if not args.yes:
        return fail(
            f"seed wipes {settings.db_file} and reloads it from {settings.seed_file}; re-run with --yes"
        )
    db.seed_demo_data(settings.db_file, settings.seed_file)
    streak.save_streak_data(None, settings.db_file, settings.streak_file)
    days = db.get_all_days(settings.db_file)
    print(f"Seeded {len(days)} days into {settings.db_file}")
    return 0


# ---------------------------------------------------------------------------
# parser
# ---------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="five-ideas", description="5 Ideas Daily Showcase tools.")
    sub = parser.add_subparsers(dest="command", required=True, metavar="<command>")

    p = sub.add_parser("sparks", help="show a day's five sparks and its shipped prototype")
    p.add_argument("--date", default="today", help="YYYY-MM-DD or 'today' (default)")
    p.add_argument("--idea", type=int, choices=range(1, 6), help="show one idea (1-5)")
    p.add_argument("--json", action="store_true", help="output raw JSON")
    p.set_defaults(func=cmd_sparks)

    p = sub.add_parser("new-day", help="log a day's theme and its five sparks")
    p.add_argument("--date", default="today", help="YYYY-MM-DD or 'today' (default)")
    p.add_argument("--theme", help="the day's theme (required unless --json-file)")
    p.add_argument("--subtitle", default="")
    p.add_argument("--notes", default="", help="morning mood notes")
    p.add_argument("--streak", type=int, default=1, help="streak_count label for the day")
    p.add_argument(
        "--idea", action="append", metavar="'title|tagline|description|tags'", help="repeat 5 times"
    )
    p.add_argument(
        "--json-file", help='JSON with date, theme, subtitle, notes and "ideas" (5 objects or strings)'
    )
    p.add_argument(
        "--replace", action="store_true", help="overwrite an existing day (drops its prototype record)"
    )
    p.set_defaults(func=cmd_new_day)

    p = sub.add_parser("save-impl", help="record the shipped prototype for a day")
    p.add_argument("--date", default="today", help="YYYY-MM-DD or 'today'")
    p.add_argument(
        "--idea", type=int, required=True, choices=range(1, 6), help="implemented idea number (1-5)"
    )
    p.add_argument("--title", help="prototype title (defaults to the idea title)")
    p.add_argument("--type", default="webapp", choices=db.BUILD_TYPES, help="build type")
    p.add_argument("--rank", type=int, default=1, help="rank (1 = favourite)")
    p.add_argument("--time", type=float, default=2.0, help="hours spent")
    p.add_argument("--ai-tools", default="", help="AI tools used")
    p.add_argument("--url", default="", help="external URL or repo")
    p.add_argument("--summary", default="", help="one-sentence hook")
    p.add_argument("--content", default="", help="route (e.g. /interactive/<slug>), poem or asset path")
    p.add_argument("--steps", default="", help="process steps: lines of 'Title: Description' or JSON")
    p.add_argument("--rocked", default="", help="what rocked: lines or JSON")
    p.add_argument("--broke", default="", help="what broke and how it was fixed: lines or JSON")
    p.add_argument(
        "--transcript",
        "--interaction-summary",
        dest="transcript",
        default="",
        help="leak-free AI interaction summary",
    )
    p.add_argument(
        "--auto-transcript",
        "--auto-summary",
        dest="auto_transcript",
        action="store_true",
        help="extract the AI interaction summary from the latest transcript",
    )
    p.add_argument("--json-file", help="JSON file with implementation fields")
    p.add_argument("--json", action="store_true", help="output the updated day as JSON")
    p.set_defaults(func=cmd_save_impl)

    p = sub.add_parser("capture", help="leak-free AI interaction summary from an agent transcript")
    p.add_argument(
        "--source", default="auto", choices=capture.SOURCES, help="transcript format (default: auto)"
    )
    p.add_argument(
        "--transcript", help="path to a transcript .jsonl (default: this session's Claude Code transcript)"
    )
    p.add_argument("--title", default="Prototype Build", help="implementation title")
    p.add_argument("--type", default="webapp", choices=db.BUILD_TYPES, help="build type")
    p.add_argument("--time", type=float, default=4.0, help="hours spent")
    p.add_argument("--out", help="write the report to a file instead of stdout")
    p.add_argument("--json", action="store_true", help="JSON suitable for save-impl --json-file")
    p.set_defaults(func=cmd_capture)

    p = sub.add_parser("new-prototype", help="scaffold prototypes/<slug>/ (manifest, template, static/)")
    p.add_argument("--slug", required=True, help="folder name and URL: /interactive/<slug>")
    p.add_argument("--title", required=True)
    p.add_argument("--date", default="today", help="day it belongs to (default: today)")
    p.add_argument("--type", default="interactive", choices=registry.BUILD_TYPES, help="build type")
    p.add_argument("--description", default="", help="one sentence")
    p.set_defaults(func=cmd_new_prototype)

    p = sub.add_parser("build", help="freeze the site into static HTML")
    p.add_argument(
        "--base-path", default="/5-ideas/", help="URL prefix of the deployment (default /5-ideas/)"
    )
    p.add_argument("--out", default=str(DIST_DIR), help="output directory (default dist/)")
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("seed", help="wipe the database and reload it from data/ideas.json")
    p.add_argument("--yes", action="store_true", help="confirm wiping the database")
    p.set_defaults(func=cmd_seed)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = Settings.from_env()
    if args.command != "seed":
        db.ensure_database(settings.db_file, settings.seed_file)
    return args.func(args, settings)


if __name__ == "__main__":
    raise SystemExit(main())
