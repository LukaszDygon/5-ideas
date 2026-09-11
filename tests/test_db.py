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
    assert len(days) >= 1
    for d in days:
        assert len(d["ideas"]) == 5
        # Verify exactly one idea is implemented
        implemented = [i for i in d["ideas"] if i["is_implemented"]]
        assert len(implemented) == 1
        assert implemented[0]["implementation"] is not None


def test_ranked_implementations_order(temp_db):
    ranked = db.get_ranked_implementations(temp_db)
    assert len(ranked) >= 1
    ranks = [r["rank"] for r in ranked]
    assert ranks == sorted(ranks)
    assert ranked[0]["rank"] == 1


def test_update_rank(temp_db):
    ranked = db.get_ranked_implementations(temp_db)
    first_impl = ranked[0]
    db.update_implementation_rank(first_impl["id"], 42, temp_db)

    new_ranked = db.get_ranked_implementations(temp_db)
    assert any(r["id"] == first_impl["id"] and r["rank"] == 42 for r in new_ranked)



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


def test_streak_calculation(temp_db):
    streak = db.calculate_streak(temp_db)
    assert streak >= 1

    db.save_streak_data(12, temp_db)
    assert db.get_streak_data(temp_db)["streak"] == 12
    assert db.get_streak_data(temp_db)["manual_override"] == 12

    db.save_streak_data(None, temp_db)
    assert db.get_streak_data(temp_db)["manual_override"] is None
    assert db.get_streak_data(temp_db)["streak"] == streak


def test_get_day_by_id(temp_db):
    days = db.get_all_days(temp_db)
    first_day = days[0]
    fetched = db.get_day_by_id(first_day["id"], temp_db)
    assert fetched is not None
    assert fetched["id"] == first_day["id"]
    assert fetched["date"] == first_day["date"]
    assert fetched["theme"] == first_day["theme"]
    assert len(fetched["ideas"]) == len(first_day["ideas"])


def test_save_day_without_implementation_then_update(temp_db):
    test_date = "2032-03-15"
    day_id = db.save_day(
        date_str=test_date,
        theme="Morning Sparks Test",
        subtitle="Idea generation phase",
        streak_count=10,
        notes="Sparks only",
        ideas_data=[
            {"idea_number": 1, "title": "Spark A", "is_implemented": False},
            {"idea_number": 2, "title": "Spark B", "is_implemented": False},
            {"idea_number": 3, "title": "Spark C", "is_implemented": False},
            {"idea_number": 4, "title": "Spark D", "is_implemented": False},
            {"idea_number": 5, "title": "Spark E", "is_implemented": False},
        ],
        db_path=temp_db,
    )

    day = db.get_day_by_id(day_id, temp_db)
    assert day is not None
    assert day["implemented_idea"] is None
    assert all(not i["is_implemented"] for i in day["ideas"])

    # Now update: implement Spark B
    updated_date = "2032-03-16"  # Also test updating date
    db.save_day(
        date_str=updated_date,
        theme="Morning Sparks Test (Updated)",
        subtitle="Prototype shipped!",
        streak_count=11,
        notes="Shipped prototype",
        ideas_data=[
            {"idea_number": 1, "title": "Spark A", "is_implemented": False},
            {
                "idea_number": 2,
                "title": "Spark B",
                "is_implemented": True,
                "implementation": {
                    "title": "Shipped B Prototype",
                    "build_type": "webapp",
                    "rank": 2,
                    "summary": "Built successfully",
                },
            },
            {"idea_number": 3, "title": "Spark C", "is_implemented": False},
            {"idea_number": 4, "title": "Spark D", "is_implemented": False},
            {"idea_number": 5, "title": "Spark E", "is_implemented": False},
        ],
        db_path=temp_db,
        day_id=day_id,
    )

    # Old date should no longer exist
    assert db.get_day_by_date(test_date, temp_db) is None

    # New date has same day_id
    updated_day = db.get_day_by_date(updated_date, temp_db)
    assert updated_day is not None
    assert updated_day["id"] == day_id
    assert updated_day["implemented_idea"] is not None
    assert updated_day["implemented_idea"]["title"] == "Spark B"
    assert updated_day["implemented_idea"]["implementation"]["title"] == "Shipped B Prototype"


def test_save_prototype_implementation_helper(temp_db):
    from scripts.save_implementation import save_prototype_implementation
    days = db.get_all_days(temp_db)
    target_date = days[0]["date"]

    updated = save_prototype_implementation(
        date_str=target_date,
        idea_number=4,
        title="Custom Synth Deck",
        build_type="interactive",
        rank=1,
        time_spent_hours=3.0,
        ai_tools_used="Antigravity, Web Audio",
        summary="A radical interactive deck",
        process_steps="Step 1: Audio graph\nStep 2: Vinyl drag",
        what_rocked="Super responsive",
        what_broke="None",
        db_path=temp_db,
    )
    assert updated is not None
    impl_idea = updated["implemented_idea"]
    assert impl_idea["idea_number"] == 4
    assert impl_idea["implementation"]["title"] == "Custom Synth Deck"
    assert impl_idea["implementation"]["build_type"] == "interactive"
    assert len(impl_idea["implementation"]["process_steps"]) == 2
    assert impl_idea["implementation"]["process_steps"][0]["title"] == "Step 1"


