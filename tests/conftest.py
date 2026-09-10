"""
Pytest configuration ensuring tests run in complete database isolation.
"""

import shutil
from pathlib import Path
import pytest
import db
import admin
import app

@pytest.fixture(autouse=True)
def isolate_test_environment(tmp_path, monkeypatch):
    test_db = tmp_path / "test_ideas.db"
    test_streak = tmp_path / "test_streak.json"
    
    # Initialize test db from ideas.json
    db.init_db(test_db)
    if db.SEED_FILE.exists():
        db.load_from_json(db.SEED_FILE, db_path=test_db)
        
    # Copy or create test streak
    if db.STREAK_FILE.exists():
        shutil.copyfile(db.STREAK_FILE, test_streak)
    else:
        test_streak.write_text("{\"streak\": 1, \"manual_override\": null, \"last_updated\": \"2026-09-10\"}")

    monkeypatch.setattr(db, "DB_FILE", test_db)
    monkeypatch.setattr(admin.db, "DB_FILE", test_db)
    monkeypatch.setattr(app.db, "DB_FILE", test_db)
    monkeypatch.setattr(db, "STREAK_FILE", test_streak)
    monkeypatch.setattr(admin.db, "STREAK_FILE", test_streak)
    monkeypatch.setattr(app.db, "STREAK_FILE", test_streak)
    
    yield test_db
