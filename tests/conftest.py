"""
Pytest configuration: every test runs against its own copy of the data.

`settings` (autouse) copies data/ideas.json and data/streak.json into tmp_path/data and points
FIVE_IDEAS_DATA_DIR there, so the app, CLI subprocesses and db defaults all see the same isolated
directory. Tests pass `settings.db_file` explicitly; nothing patches module globals.
"""

import shutil

import pytest
from starlette.testclient import TestClient

from showcase import db
from showcase.admin import create_admin_app
from showcase.config import DEFAULT_DATA_DIR, SEED_FILENAME, STREAK_FILENAME, Settings
from showcase.web import create_app


@pytest.fixture(autouse=True)
def settings(tmp_path, monkeypatch) -> Settings:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    for name in (SEED_FILENAME, STREAK_FILENAME):
        shutil.copyfile(DEFAULT_DATA_DIR / name, data_dir / name)
    monkeypatch.setenv("FIVE_IDEAS_DATA_DIR", str(data_dir))
    monkeypatch.delenv("HOSTED_STATIC", raising=False)
    settings = Settings.from_env()
    db.ensure_database(settings.db_file, settings.seed_file)
    return settings


@pytest.fixture
def client(settings):
    """The FastAPI app for this test's data; entering the client runs the lifespan."""
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def admin_client(settings):
    """Flask test client for the admin app (routes without the /admin prefix)."""
    app = create_admin_app(settings)
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client
