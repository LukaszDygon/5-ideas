"""
Database layer for 5 Ideas Daily Showcase.
Using Python stdlib sqlite3 (Ponytail rule: stdlib first).
"""

from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).parent / "ideas.db"
SEED_FILE = Path(__file__).parent / "ideas.json"
STREAK_FILE = Path(__file__).parent / "streak.json"



def get_db(db_path: Path | str | None = None) -> sqlite3.Connection:
    path = db_path or DB_FILE
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                theme TEXT NOT NULL,
                subtitle TEXT DEFAULT '',
                streak_count INTEGER DEFAULT 1,
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
                idea_number INTEGER NOT NULL CHECK (idea_number BETWEEN 1 AND 5),
                title TEXT NOT NULL,
                tagline TEXT DEFAULT '',
                description TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                icon TEXT DEFAULT 'lightbulb',
                is_implemented INTEGER DEFAULT 0,
                UNIQUE(day_id, idea_number)
            );

            CREATE TABLE IF NOT EXISTS implementations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea_id INTEGER UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                build_type TEXT NOT NULL CHECK (build_type IN ('webapp', 'poetry', 'song', 'image', 'interactive')),
                rank INTEGER NOT NULL DEFAULT 999,
                summary TEXT DEFAULT '',
                content TEXT DEFAULT '',
                external_url TEXT DEFAULT '',
                time_spent_hours REAL DEFAULT 4.0,
                ai_tools_used TEXT DEFAULT '',
                process_steps TEXT DEFAULT '[]',
                what_rocked TEXT DEFAULT '[]',
                what_broke TEXT DEFAULT '[]',
                prompt_transcript TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
            CREATE INDEX IF NOT EXISTS idx_impl_rank ON implementations(rank);
            CREATE INDEX IF NOT EXISTS idx_ideas_day ON ideas(day_id);
            """
        )
    conn.close()

    # If initializing main DB and empty, load legit content from ideas.json
    if db_path is None and SEED_FILE.exists():
        conn = get_db(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM days")
        count = cur.fetchone()[0]
        conn.close()
        if count == 0:
            load_from_json(SEED_FILE)


def export_to_json(json_path: Path | str | None = None, db_path: Path | str | None = None) -> None:
    """Exports all days and ideas to a JSON file."""
    path = Path(json_path or SEED_FILE)
    days = get_all_days(db_path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(days, f, indent=2)


def load_from_json(json_path: Path | str | None = None, db_path: Path | str | None = None) -> None:
    """Loads days and ideas from a JSON file into the database."""
    path = Path(json_path or SEED_FILE)
    if not path.exists():
        return
    with open(path, "r", encoding="utf-8") as f:
        days_data = json.load(f)
    for day in days_data:
        save_day(
            date_str=day["date"],
            theme=day["theme"],
            subtitle=day.get("subtitle", ""),
            streak_count=day.get("streak_count", 1),
            notes=day.get("notes", ""),
            ideas_data=day.get("ideas", []),
            db_path=db_path,
            auto_export=False,
        )


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for json_field in ("process_steps", "what_rocked", "what_broke"):
        if json_field in d and isinstance(d[json_field], str):
            try:
                d[json_field] = json.loads(d[json_field])
            except Exception:
                pass
    return d


def get_all_days(db_path: Path | str | None = None) -> List[Dict[str, Any]]:
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM days ORDER BY date DESC")
    days_rows = cursor.fetchall()

    days = []
    for d_row in days_rows:
        day_dict = row_to_dict(d_row)
        cursor.execute("SELECT * FROM ideas WHERE day_id = ? ORDER BY idea_number ASC", (day_dict["id"],))
        ideas_rows = cursor.fetchall()
        ideas = []
        for i_row in ideas_rows:
            i_dict = row_to_dict(i_row)
            cursor.execute("SELECT * FROM implementations WHERE idea_id = ?", (i_dict["id"],))
            impl_row = cursor.fetchone()
            i_dict["implementation"] = row_to_dict(impl_row) if impl_row else None
            ideas.append(i_dict)
        day_dict["ideas"] = ideas
        day_dict["implemented_idea"] = next((i for i in ideas if i["is_implemented"] and i["implementation"]), None)
        days.append(day_dict)
    conn.close()
    return days


def get_day_by_date(date_str: str, db_path: Path | str | None = None) -> Optional[Dict[str, Any]]:
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM days WHERE date = ?", (date_str,))
    day_row = cursor.fetchone()
    if not day_row:
        conn.close()
        return None

    day_dict = row_to_dict(day_row)
    cursor.execute("SELECT * FROM ideas WHERE day_id = ? ORDER BY idea_number ASC", (day_dict["id"],))
    ideas_rows = cursor.fetchall()
    ideas = []
    for i_row in ideas_rows:
        i_dict = row_to_dict(i_row)
        cursor.execute("SELECT * FROM implementations WHERE idea_id = ?", (i_dict["id"],))
        impl_row = cursor.fetchone()
        i_dict["implementation"] = row_to_dict(impl_row) if impl_row else None
        ideas.append(i_dict)
    day_dict["ideas"] = ideas
    day_dict["implemented_idea"] = next((i for i in ideas if i["is_implemented"] and i["implementation"]), None)
    conn.close()
    return day_dict


def get_ranked_implementations(db_path: Path | str | None = None) -> List[Dict[str, Any]]:
    """Returns all implementations ordered by rank ascending (1 is best)."""
    conn = get_db(db_path)
    cursor = conn.cursor()
    query = """
        SELECT 
            impl.*,
            ideas.title AS idea_title,
            ideas.tagline AS idea_tagline,
            ideas.tags AS idea_tags,
            ideas.icon AS idea_icon,
            days.date AS day_date,
            days.theme AS day_theme,
            days.streak_count AS day_streak
        FROM implementations impl
        JOIN ideas ON impl.idea_id = ideas.id
        JOIN days ON ideas.day_id = days.id
        ORDER BY impl.rank ASC, impl.id DESC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    result = [row_to_dict(r) for r in rows]
    conn.close()
    return result


def get_calendar_days(
    year: int, month: int, db_path: Path | str | None = None
) -> List[Dict[str, Any]]:
    """Returns day entries for a given year & month for calendar rendering."""
    prefix = f"{year:04d}-{month:02d}-%"
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT 
            d.date, d.theme, d.streak_count,
            COUNT(i.id) AS idea_count,
            MAX(CASE WHEN i.is_implemented = 1 THEN 1 ELSE 0 END) AS has_implementation,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.title ELSE NULL END) AS impl_title,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.build_type ELSE NULL END) AS impl_type,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.rank ELSE NULL END) AS impl_rank
        FROM days d
        LEFT JOIN ideas i ON d.id = i.day_id
        LEFT JOIN implementations imp ON i.id = imp.idea_id
        WHERE d.date LIKE ?
        GROUP BY d.id
        ORDER BY d.date ASC
        """,
        (prefix,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _can_auto_export(db_path: Path | str | None, auto_export: bool = True) -> bool:
    import sys
    if "pytest" in sys.modules:
        return False
    return auto_export and (db_path is None or str(db_path) == str(DB_FILE))


def save_day(
    date_str: str,
    theme: str,
    subtitle: str = "",
    streak_count: int = 1,
    notes: str = "",
    ideas_data: Optional[List[Dict[str, Any]]] = None,
    db_path: Path | str | None = None,
    auto_export: bool = True,
) -> int:
    """Creates or updates a day with its 5 ideas and implementation atomically."""
    conn = get_db(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO days (date, theme, subtitle, streak_count, notes)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                theme = excluded.theme,
                subtitle = excluded.subtitle,
                streak_count = excluded.streak_count,
                notes = excluded.notes
            """,
            (date_str, theme, subtitle, streak_count, notes),
        )
        cursor.execute("SELECT id FROM days WHERE date = ?", (date_str,))
        day_id = cursor.fetchone()[0]

        if ideas_data:
            cursor.execute("DELETE FROM ideas WHERE day_id = ?", (day_id,))
            for item in ideas_data:
                idea_num = int(item.get("idea_number", 1))
                title = item.get("title", f"Idea #{idea_num}")
                tagline = item.get("tagline", "")
                description = item.get("description", "")
                tags = item.get("tags", "")
                icon = item.get("icon", "lightbulb")
                is_impl = 1 if item.get("is_implemented") else 0

                cursor.execute(
                    """
                    INSERT INTO ideas (day_id, idea_number, title, tagline, description, tags, icon, is_implemented)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (day_id, idea_num, title, tagline, description, tags, icon, is_impl),
                )
                idea_id = cursor.lastrowid

                if is_impl and item.get("implementation"):
                    impl = item["implementation"]
                    proc_steps = json.dumps(impl.get("process_steps", []))
                    rocked = json.dumps(impl.get("what_rocked", []))
                    broke = json.dumps(impl.get("what_broke", []))

                    cursor.execute(
                        """
                        INSERT INTO implementations (
                            idea_id, title, build_type, rank, summary, content,
                            external_url, time_spent_hours, ai_tools_used,
                            process_steps, what_rocked, what_broke, prompt_transcript
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            idea_id,
                            impl.get("title", title),
                            impl.get("build_type", "webapp"),
                            int(impl.get("rank", 999)),
                            impl.get("summary", ""),
                            impl.get("content", ""),
                            impl.get("external_url", ""),
                            float(impl.get("time_spent_hours", 4.0)),
                            impl.get("ai_tools_used", ""),
                            proc_steps,
                            rocked,
                            broke,
                            impl.get("prompt_transcript", ""),
                        ),
                    )
    conn.close()
    if _can_auto_export(db_path, auto_export):
        export_to_json()
    return day_id


def update_implementation_rank(impl_id: int, new_rank: int, db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (new_rank, impl_id))
    conn.close()
    if _can_auto_export(db_path):
        export_to_json()


def reorder_ranks(ordered_impl_ids: List[int], db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        for index, impl_id in enumerate(ordered_impl_ids, start=1):
            conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (index, impl_id))
    conn.close()
    if _can_auto_export(db_path):
        export_to_json()


def delete_day(day_id: int, db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.execute("DELETE FROM days WHERE id = ?", (day_id,))
    conn.close()
    if _can_auto_export(db_path):
        export_to_json()



def calculate_streak(db_path: Path | str | None = None) -> int:
    """
    Calculates consecutive daily streak:
    - Real number of consecutive days published.
    - Does NOT count today if nothing was published today.
    """
    all_days = get_all_days(db_path)
    if not all_days:
        return 0

    published_dates = {d["date"] for d in all_days}
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")

    if today_str in published_dates:
        check_date = today
    else:
        # Not counting today if there was nothing published yet today
        check_date = today - timedelta(days=1)

    streak = 0
    while check_date.strftime("%Y-%m-%d") in published_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak


def get_streak_data(db_path: Path | str | None = None) -> Dict[str, Any]:
    """Reads streak.json and returns streak data with real calculated streak."""
    manual_override = None
    if STREAK_FILE.exists():
        try:
            with open(STREAK_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                manual_override = data.get("manual_override")
        except Exception:
            pass

    calculated = calculate_streak(db_path)
    current = manual_override if (manual_override is not None and manual_override >= 0) else calculated

    return {
        "streak": current,
        "calculated_streak": calculated,
        "manual_override": manual_override,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
    }


def save_streak_data(manual_override: Optional[int], db_path: Path | str | None = None) -> Dict[str, Any]:
    """Saves streak configuration to streak.json."""
    calculated = calculate_streak(db_path)
    current = manual_override if (manual_override is not None and manual_override >= 0) else calculated
    streak_data = {
        "streak": current,
        "calculated_streak": calculated,
        "manual_override": manual_override,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
    }
    with open(STREAK_FILE, "w", encoding="utf-8") as f:
        json.dump(streak_data, f, indent=2)
    return streak_data


def seed_demo_data(db_path: Path | str | None = None) -> None:
    """Seeds content strictly from ideas.json."""
    init_db(db_path)
    conn = get_db(db_path)
    with conn:
        conn.execute("DELETE FROM days;")
    conn.close()

    if SEED_FILE.exists():
        load_from_json(SEED_FILE, db_path=db_path)
    # Ensure streak file is updated
    save_streak_data(None, db_path=db_path)


if __name__ == "__main__":
    print(f"Initializing database at {DB_FILE}...")
    init_db()
    seed_demo_data()
    days = get_all_days()
    print(f"Seeded {len(days)} days successfully.")
    for d in days:
        impl = d.get("implemented_idea")
        impl_title = impl["implementation"]["title"] if impl else "None"
        print(f"  • {d['date']}: {d['theme']} (Ranked Build: {impl_title})")
