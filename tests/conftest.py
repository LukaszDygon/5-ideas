"""
Pytest configuration: every test runs against its own copy of the data, with no reliance on
environment variables.

`settings` (autouse) copies data/ideas.json and data/streak.json into tmp_path/data and returns a
`Settings` built explicitly; tests pass it (or `settings.db_file`) to the code under test and pass
`--data-dir` to CLI subprocesses. The variables the app would read (config.ENV_VARS) are removed for
each test, so a developer's shell or a sourced .env cannot leak in, and a session check fails the
run if anything touched the real data/ directory.
"""

import hashlib
import shutil

import pytest
from starlette.testclient import TestClient

from showcase import db
from showcase.config import DB_FILENAME, DEFAULT_DATA_DIR, ENV_VARS, SEED_FILENAME, STREAK_FILENAME, Settings
from showcase.web import create_app


def _real_data_fingerprint() -> dict[str, str | None]:
    """Content hash of each real data file (None if absent); ideas.db by size and mtime."""
    fingerprint = {}
    for name in (SEED_FILENAME, STREAK_FILENAME):
        path = DEFAULT_DATA_DIR / name
        fingerprint[name] = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
    db_path = DEFAULT_DATA_DIR / DB_FILENAME
    fingerprint[DB_FILENAME] = (
        f"{db_path.stat().st_size}:{db_path.stat().st_mtime_ns}" if db_path.exists() else None
    )
    return fingerprint


@pytest.fixture(scope="session", autouse=True)
def real_data_is_untouched():
    before = _real_data_fingerprint()
    yield
    assert _real_data_fingerprint() == before, "a test wrote to the real data/ directory"


@pytest.fixture(autouse=True)
def settings(tmp_path, monkeypatch) -> Settings:
    for name in ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    for name in (SEED_FILENAME, STREAK_FILENAME):
        shutil.copyfile(DEFAULT_DATA_DIR / name, data_dir / name)
    settings = Settings(data_dir=data_dir)
    db.ensure_database(settings.db_file, settings.seed_file)
    return settings


@pytest.fixture
def client(settings):
    """The FastAPI app for this test's data; entering the client runs the lifespan."""
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def admin_client(settings):
    """TestClient whose relative URLs start at /admin (e.g. client.get("/day/new"))."""
    with TestClient(create_app(settings), base_url="http://testserver/admin") as test_client:
        yield test_client
