"""
Pytest configuration: every test gets its own data directory.

FIVE_IDEAS_DATA_DIR points at a tmp copy of the committed data, so code that resolves
paths from the environment (db defaults, create_app(), the admin) never touches real files.
"""

import shutil

import pytest

from showcase import db
from showcase.config import DEFAULT_DATA_DIR, SEED_FILENAME, STREAK_FILENAME


@pytest.fixture(autouse=True)
def isolate_test_environment(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    shutil.copyfile(DEFAULT_DATA_DIR / SEED_FILENAME, data_dir / SEED_FILENAME)
    streak = DEFAULT_DATA_DIR / STREAK_FILENAME
    if streak.exists():
        shutil.copyfile(streak, data_dir / STREAK_FILENAME)
    else:
        (data_dir / STREAK_FILENAME).write_text('{"streak": 1, "manual_override": null, "last_updated": "2026-09-10"}')

    monkeypatch.setenv("FIVE_IDEAS_DATA_DIR", str(data_dir))
    monkeypatch.delenv("HOSTED_STATIC", raising=False)
    db.ensure_database()
    yield data_dir / "ideas.db"


@pytest.fixture
def client(isolate_test_environment):
    """TestClient for an app built from the isolated environment (lifespan runs on enter)."""
    from starlette.testclient import TestClient

    from showcase.web import create_app

    with TestClient(create_app()) as test_client:
        yield test_client
