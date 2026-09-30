"""
Database layer for 5 Ideas Daily Showcase.
Using Python stdlib sqlite3 (Ponytail rule: stdlib first).

Every function takes an optional `db_path`; None means the configured data directory
(`Settings.from_env().db_file`), resolved at call time.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from showcase.config import SEED_FILENAME, get_settings

DbPath = Path | str | None
BUILD_TYPES = ("webapp", "poetry", "song", "image", "interactive")


def resolve_db_path(db_path: DbPath = None) -> Path:
    """Explicit path wins; otherwise the configured data directory (read at call time)."""
    return Path(db_path) if db_path else get_settings().db_file


def get_db(db_path: DbPath = None) -> sqlite3.Connection:
    path = resolve_db_path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def connect(db_path: DbPath = None) -> Iterator[sqlite3.Connection]:
    """A connection that is always closed. Wrap writes in `with conn:` for a transaction."""
    conn = get_db(db_path)
    try:
        yield conn
    finally:
        conn.close()


def init_db(db_path: DbPath = None) -> None:
    with connect(db_path) as conn, conn:
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


def ensure_database(db_path: DbPath = None, seed_file: DbPath = None) -> None:
    """Creates the schema and, when the database is empty, loads the committed seed/export file."""
    init_db(db_path)
    with connect(db_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM days").fetchone()[0]
    if count == 0:
        load_from_json(seed_file, db_path=db_path)


def export_path_for(db_path: DbPath = None) -> Path:
    """The JSON export lives next to the database it mirrors."""
    return resolve_db_path(db_path).with_name(SEED_FILENAME)


def export_to_json(json_path: DbPath = None, db_path: DbPath = None) -> None:
    """Exports all days and ideas to a JSON file."""
    path = Path(json_path) if json_path else export_path_for(db_path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(get_all_days(db_path), f, indent=2)


def load_from_json(json_path: DbPath = None, db_path: DbPath = None) -> None:
    """Loads days and ideas from a JSON file into the database."""
    path = Path(json_path) if json_path else get_settings().seed_file
    if not path.exists():
        return
    with open(path, encoding="utf-8") as f:
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


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    for json_field in ("process_steps", "what_rocked", "what_broke"):
        if json_field in d and isinstance(d[json_field], str):
            try:
                d[json_field] = json.loads(d[json_field])
            except json.JSONDecodeError:
                pass
    return d


def _placeholders(values: list) -> str:
    return ",".join("?" * len(values))


def _hydrate_days(conn: sqlite3.Connection, day_rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    """Attaches ideas and implementations to day rows with two queries in total."""
    days = [row_to_dict(r) for r in day_rows]
    day_ids = [d["id"] for d in days]
    idea_rows = conn.execute(
        f"SELECT * FROM ideas WHERE day_id IN ({_placeholders(day_ids)}) ORDER BY idea_number ASC", day_ids
    ).fetchall()
    ideas = [row_to_dict(r) for r in idea_rows]
    idea_ids = [i["id"] for i in ideas]
    impl_rows = conn.execute(
        f"SELECT * FROM implementations WHERE idea_id IN ({_placeholders(idea_ids)})", idea_ids
    ).fetchall()
    impl_by_idea = {r["idea_id"]: row_to_dict(r) for r in impl_rows}

    ideas_by_day: dict[int, list[dict[str, Any]]] = {day_id: [] for day_id in day_ids}
    for idea in ideas:
        idea["implementation"] = impl_by_idea.get(idea["id"])
        ideas_by_day[idea["day_id"]].append(idea)
    for day in days:
        day["ideas"] = ideas_by_day[day["id"]]
        day["implemented_idea"] = next(
            (i for i in day["ideas"] if i["is_implemented"] and i["implementation"]), None
        )
    return days


def get_all_days(db_path: DbPath = None) -> list[dict[str, Any]]:
    with connect(db_path) as conn:
        return _hydrate_days(conn, conn.execute("SELECT * FROM days ORDER BY date DESC").fetchall())


def get_published_dates(db_path: DbPath = None) -> list[str]:
    """Dates of all days, newest first (cheap: no ideas or implementations)."""
    with connect(db_path) as conn:
        return [r["date"] for r in conn.execute("SELECT date FROM days ORDER BY date DESC")]


def _get_day(where: str, value: Any, db_path: DbPath) -> dict[str, Any] | None:
    with connect(db_path) as conn:
        rows = conn.execute(f"SELECT * FROM days WHERE {where} = ?", (value,)).fetchall()
        return _hydrate_days(conn, rows)[0] if rows else None


def get_day_by_date(date_str: str, db_path: DbPath = None) -> dict[str, Any] | None:
    return _get_day("date", date_str, db_path)


def get_day_by_id(day_id: int, db_path: DbPath = None) -> dict[str, Any] | None:
    return _get_day("id", day_id, db_path)


def get_ranked_implementations(db_path: DbPath = None) -> list[dict[str, Any]]:
    """Returns all implementations ordered by rank ascending (1 is best)."""
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
    with connect(db_path) as conn:
        return [row_to_dict(r) for r in conn.execute(query)]


def get_calendar_days(year: int, month: int, db_path: DbPath = None) -> list[dict[str, Any]]:
    """Returns day entries for a given year & month for calendar rendering."""
    query = """
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
    """
    with connect(db_path) as conn:
        return [dict(r) for r in conn.execute(query, (f"{year:04d}-{month:02d}-%",))]


def save_day(
    date_str: str,
    theme: str,
    subtitle: str = "",
    streak_count: int = 1,
    notes: str = "",
    ideas_data: list[dict[str, Any]] | None = None,
    db_path: DbPath = None,
    auto_export: bool = True,
    day_id: int | None = None,
) -> int:
    """Creates or updates a day with its 5 ideas and implementation atomically."""
    with connect(db_path) as conn, conn:
        if day_id is not None:
            conn.execute(
                """
                UPDATE days
                SET date = ?, theme = ?, subtitle = ?, streak_count = ?, notes = ?
                WHERE id = ?
                """,
                (date_str, theme, subtitle, streak_count, notes, day_id),
            )
        else:
            conn.execute(
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
            day_id = conn.execute("SELECT id FROM days WHERE date = ?", (date_str,)).fetchone()[0]

        if ideas_data:
            conn.execute("DELETE FROM ideas WHERE day_id = ?", (day_id,))
            for item in ideas_data:
                _insert_idea(conn, day_id, item)
    if auto_export:
        export_to_json(db_path=db_path)
    return day_id


def _insert_idea(conn: sqlite3.Connection, day_id: int, item: dict[str, Any]) -> None:
    idea_num = int(item.get("idea_number", 1))
    title = item.get("title", f"Idea #{idea_num}")
    is_impl = 1 if item.get("is_implemented") else 0
    cursor = conn.execute(
        """
        INSERT INTO ideas (day_id, idea_number, title, tagline, description, tags, icon, is_implemented)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            day_id,
            idea_num,
            title,
            item.get("tagline", ""),
            item.get("description", ""),
            item.get("tags", ""),
            item.get("icon", "lightbulb"),
            is_impl,
        ),
    )
    impl = item.get("implementation")
    if not (is_impl and impl):
        return
    conn.execute(
        """
        INSERT INTO implementations (
            idea_id, title, build_type, rank, summary, content,
            external_url, time_spent_hours, ai_tools_used,
            process_steps, what_rocked, what_broke, prompt_transcript
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            cursor.lastrowid,
            impl.get("title", title),
            impl.get("build_type", "webapp"),
            int(impl.get("rank", 999)),
            impl.get("summary", ""),
            impl.get("content", ""),
            impl.get("external_url", ""),
            float(impl.get("time_spent_hours", 4.0)),
            impl.get("ai_tools_used", ""),
            json.dumps(impl.get("process_steps", [])),
            json.dumps(impl.get("what_rocked", [])),
            json.dumps(impl.get("what_broke", [])),
            impl.get("prompt_transcript", ""),
        ),
    )


def update_implementation_rank(impl_id: int, new_rank: int, db_path: DbPath = None) -> None:
    with connect(db_path) as conn, conn:
        conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (new_rank, impl_id))
    export_to_json(db_path=db_path)


def reorder_ranks(ordered_impl_ids: list[int], db_path: DbPath = None) -> None:
    with connect(db_path) as conn, conn:
        for index, impl_id in enumerate(ordered_impl_ids, start=1):
            conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (index, impl_id))
    export_to_json(db_path=db_path)


def delete_day(day_id: int, db_path: DbPath = None) -> None:
    with connect(db_path) as conn, conn:
        conn.execute("DELETE FROM days WHERE id = ?", (day_id,))
    export_to_json(db_path=db_path)


def seed_demo_data(db_path: DbPath = None, seed_file: DbPath = None) -> None:
    """Wipes the database and reloads it strictly from ideas.json (callers reset the streak file)."""
    init_db(db_path)
    with connect(db_path) as conn, conn:
        conn.execute("DELETE FROM days;")
    load_from_json(seed_file, db_path=db_path)


if __name__ == "__main__":
    from showcase import streak

    print(f"Reseeding database at {resolve_db_path()} from {get_settings().seed_file}...")
    seed_demo_data()
    streak.save_streak_data(None)
    for d in get_all_days():
        impl = d.get("implemented_idea")
        print(f"  • {d['date']}: {d['theme']} (Ranked Build: {impl['implementation']['title'] if impl else 'None'})")
