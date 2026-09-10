"""
Tests for Flask admin application (admin.py).
"""

import pytest
from admin import admin_app
import db


@pytest.fixture
def flask_client():
    admin_app.config["TESTING"] = True
    db.init_db()
    if not db.get_all_days():
        db.seed_demo_data()
    with admin_app.test_client() as client:
        yield client


def test_admin_dashboard(flask_client):
    response = flask_client.get("/")
    assert response.status_code == 200
    assert b"Showcase Content Manager" in response.data
    assert b"Implementation Rankings" in response.data
    assert b"Daily Log Archive" in response.data


def test_admin_update_rankings(flask_client):
    impls = db.get_ranked_implementations()
    first_id = impls[0]["id"]

    response = flask_client.post(
        "/rankings/update",
        data={f"rank_{first_id}": "42"},
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert b"Implementation rankings updated" in response.data

    updated = [i for i in db.get_ranked_implementations() if i["id"] == first_id]
    assert updated[0]["rank"] == 42


def test_admin_new_day_get(flask_client):
    response = flask_client.get("/day/new")
    assert response.status_code == 200
    assert b"Create New Daily Drop" in response.data
    assert b"The 5 Morning Sparks" in response.data


def test_admin_new_day_post(flask_client):
    test_date = "2029-12-31"
    post_data = {
        "date": test_date,
        "streak_count": "199",
        "theme": "Flask Admin Integration Test Theme",
        "subtitle": "Tested via Flask test client",
        "notes": "Automated test",
        "implemented_index": "2",
        "idea_1_title": "Test Idea 1",
        "idea_1_tagline": "Tagline 1",
        "idea_1_desc": "Description 1",
        "idea_1_tags": "test, python",
        "idea_2_title": "Implemented Test Idea 2",
        "idea_2_tagline": "Hero Tagline",
        "idea_2_desc": "Hero Description",
        "idea_2_tags": "hero, test",
        "impl_build_type": "poetry",
        "impl_rank": "7",
        "impl_time_spent": "1.5",
        "impl_ai_tools": "pytest, Flask",
        "impl_summary": "Test poem implementation summary",
        "impl_content": "Line 1\nLine 2\nLine 3",
        "impl_steps": "Step 1: Setup test\nStep 2: Run assertion",
        "impl_what_rocked": "Fast execution\nClean syntax",
        "impl_what_broke": "None",
        "idea_3_title": "Test Idea 3",
        "idea_4_title": "Test Idea 4",
        "idea_5_title": "Test Idea 5",
      }
    response = flask_client.post("/day/new", data=post_data, follow_redirects=True)
    assert response.status_code == 200
    assert b"created successfully" in response.data

    day = db.get_day_by_date(test_date)
    assert day is not None
    assert day["theme"] == "Flask Admin Integration Test Theme"
    assert day["implemented_idea"]["title"] == "Implemented Test Idea 2"
    assert day["implemented_idea"]["implementation"]["build_type"] == "poetry"


def test_admin_edit_day_get(flask_client):
    days = db.get_all_days()
    first_date = days[0]["date"]
    response = flask_client.get(f"/day/{first_date}/edit")
    assert response.status_code == 200
    assert b"Edit Day:" in response.data
    assert days[0]["theme"].encode("utf-8") in response.data


def test_admin_seed(flask_client):
    response = flask_client.post("/seed", follow_redirects=True)
    assert response.status_code == 200
    assert b"Demo data reseeded" in response.data
    days = db.get_all_days()
    assert len(days) == 4
