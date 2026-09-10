"""
Tests for SQLite database layer in db.py.
"""

from pathlib import Path
import pytest
import db


@pytest.fixture
def temp_db(tmp_path: Path):
    db_file = tmp_path / "test_ideas.db"
    db.init_db(db_file)
    db.seed_demo_data(db_file)
    return db_file


def test_seed_demo_data(temp_db):
    days = db.get_all_days(temp_db)
    assert len(days) == 4
    for d in days:
        assert len(d["ideas"]) == 5
        # Verify exactly one idea is implemented
        implemented = [i for i in d["ideas"] if i["is_implemented"]]
        assert len(implemented) == 1
        assert implemented[0]["implementation"] is not None


def test_ranked_implementations_order(temp_db):
    ranked = db.get_ranked_implementations(temp_db)
    assert len(ranked) == 4
    ranks = [r["rank"] for r in ranked]
    # Ranks should be sorted ascending: [1, 2, 3, 4]
    assert ranks == sorted(ranks)
    assert ranked[0]["rank"] == 1
    assert "NeonDJ" in ranked[0]["title"]


def test_update_rank(temp_db):
    ranked = db.get_ranked_implementations(temp_db)
    first_impl = ranked[0]
    last_impl = ranked[-1]

    # Swap ranks
    db.update_implementation_rank(first_impl["id"], 10, temp_db)
    db.update_implementation_rank(last_impl["id"], 1, temp_db)

    new_ranked = db.get_ranked_implementations(temp_db)
    assert new_ranked[0]["id"] == last_impl["id"]
    assert new_ranked[0]["rank"] == 1


def test_get_calendar_days(temp_db):
    from datetime import datetime
    now = datetime.now()
    cal_days = db.get_calendar_days(now.year, now.month, temp_db)
    assert len(cal_days) >= 1
    for cd in cal_days:
        assert cd["idea_count"] == 5
        assert cd["has_implementation"] == 1


def test_save_day_and_delete(temp_db):
    test_date = "2030-01-01"
    day_id = db.save_day(
        date_str=test_date,
        theme="Test Sci-Fi Matrix Theme",
        subtitle="A test subtitle",
        streak_count=200,
        notes="Testing db",
        ideas_data=[
            {
                "idea_number": 1,
                "title": "Quantum Coffee",
                "tagline": "Coffee that exists in all states",
                "description": "Brews in parallel universes",
                "tags": "Quantum, Coffee",
                "icon": "coffee",
                "is_implemented": True,
                "implementation": {
                    "title": "Quantum Coffee Brew Simulator",
                    "build_type": "webapp",
                    "rank": 5,
                    "summary": "Simulate quantum espresso",
                    "content": "/interactive/coffee",
                    "time_spent_hours": 2.0,
                    "ai_tools_used": "Python 3.14",
                    "process_steps": [{"step": 1, "title": "Model", "desc": "Wrote equations"}],
                    "what_rocked": ["Parallel brew speed"],
                    "what_broke": ["Cat observed in machine"],
                },
            },
            {"idea_number": 2, "title": "Spark 2", "is_implemented": False},
            {"idea_number": 3, "title": "Spark 3", "is_implemented": False},
            {"idea_number": 4, "title": "Spark 4", "is_implemented": False},
            {"idea_number": 5, "title": "Spark 5", "is_implemented": False},
        ],
        db_path=temp_db,
    )

    day = db.get_day_by_date(test_date, temp_db)
    assert day is not None
    assert day["theme"] == "Test Sci-Fi Matrix Theme"
    assert len(day["ideas"]) == 5
    assert day["implemented_idea"]["title"] == "Quantum Coffee"

    # Delete day
    db.delete_day(day_id, temp_db)
    assert db.get_day_by_date(test_date, temp_db) is None
