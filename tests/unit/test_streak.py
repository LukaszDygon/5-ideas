"""Tests for showcase.streak (consecutive-day streak with manual override)."""

from datetime import date, timedelta

import pytest

from showcase import db, streak


def _day(offset: int) -> str:
    return (date.today() - timedelta(days=offset)).isoformat()


@pytest.fixture
def empty_db(tmp_path):
    path = tmp_path / "streak.db"
    db.init_db(path)
    return path


def _add_days(path, *offsets):
    for off in offsets:
        db.save_day(_day(off), f"Theme {off}", ideas_data=[{"idea_number": 1, "title": "x"}], db_path=path)


def test_empty_database_has_no_streak(empty_db):
    assert streak.calculate_streak(empty_db) == 0


def test_streak_counts_today_and_consecutive_days(empty_db):
    _add_days(empty_db, 0, 1, 2, 4)
    assert streak.calculate_streak(empty_db) == 3


def test_streak_ignores_missing_today(empty_db):
    _add_days(empty_db, 1, 2)
    assert streak.calculate_streak(empty_db) == 2


def test_streak_breaks_on_gap_before_yesterday(empty_db):
    _add_days(empty_db, 2, 3)
    assert streak.calculate_streak(empty_db) == 0


def test_manual_override_round_trip(empty_db, tmp_path):
    _add_days(empty_db, 0, 1)
    streak_file = tmp_path / "streak.json"
    assert streak.save_streak_data(12, empty_db, streak_file)["streak"] == 12
    data = streak.get_streak_data(empty_db, streak_file)
    assert data["streak"] == 12 and data["manual_override"] == 12 and data["calculated_streak"] == 2

    streak.save_streak_data(None, empty_db, streak_file)
    data = streak.get_streak_data(empty_db, streak_file)
    assert data["manual_override"] is None and data["streak"] == 2


def test_corrupt_streak_file_falls_back_to_calculated(empty_db, tmp_path):
    _add_days(empty_db, 0)
    bad = tmp_path / "streak.json"
    bad.write_text("{not json")
    assert streak.get_streak_data(empty_db, bad)["streak"] == 1


def test_published_dates_are_newest_first(isolate_test_environment):
    dates = db.get_published_dates()
    assert dates and dates == sorted(dates, reverse=True)
