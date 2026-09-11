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
    assert len(days) >= 1


def test_admin_streak_update(flask_client):
    response = flask_client.post(
        "/streak/update",
        data={"action": "save", "streak_value": "7"},
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert b"Unbroken streak saved to static streak.json (value: 7 days)" in response.data
    assert db.get_streak_data()["streak"] == 7

    response_reset = flask_client.post(
        "/streak/update",
        data={"action": "reset"},
        follow_redirects=True,
    )
    assert response_reset.status_code == 200
    assert b"Unbroken streak reset to auto-calculated value" in response_reset.data
    assert db.get_streak_data()["streak"] == db.get_streak_data()["calculated_streak"]


def test_admin_morning_sparks_flow_save_then_implement(flask_client):
    """
    Test user workflow:
    1. Morning: Come up with 5 ideas, save without an implementation (in progress).
    2. Afternoon: Implement Idea #3, update the entry with prototype details.
    """
    test_date = "2031-05-20"
    morning_data = {
        "date": test_date,
        "streak_count": "150",
        "theme": "Modular Audio Synthesizers",
        "subtitle": "Patch cables and oscillator waves",
        "notes": "Spawned at 8:00 AM over green tea",
        "implemented_index": "0",  # No implementation yet!
        "idea_1_title": "Wavetable Synth",
        "idea_1_tagline": "Morphing digital shapes",
        "idea_1_desc": "Scan 256 sample tables",
        "idea_1_tags": "Audio, DSP",
        "idea_2_title": "Tape Echo Delay",
        "idea_2_tagline": "Saturated flutter and wow",
        "idea_2_desc": "Vintage tape loop emulation",
        "idea_2_tags": "Audio, Analog",
        "idea_3_title": "Euclidean Drum Sequencer",
        "idea_3_tagline": "Geometric polyrhythms made easy",
        "idea_3_desc": "Bjorklund algorithm with live SVG circle visualizer",
        "idea_3_tags": "Audio, Math, UI",
        "idea_4_title": "FM Bell Generator",
        "idea_4_tagline": "Chime tones and glass",
        "idea_4_desc": "2-operator carrier/modulator pairing",
        "idea_4_tags": "Audio, FM",
        "idea_5_title": "Noise Color Palette",
        "idea_5_tagline": "Pink, brown, white, and violet",
        "idea_5_desc": "Spectral filtering of white noise",
        "idea_5_tags": "Audio, Noise",
    }

    # 1. Save morning ideas
    res1 = flask_client.post("/day/new", data=morning_data, follow_redirects=True)
    assert res1.status_code == 200
    assert b"created successfully" in res1.data
    assert b"prototype in progress" in res1.data

    day = db.get_day_by_date(test_date)
    assert day is not None
    assert day["theme"] == "Modular Audio Synthesizers"
    assert len(day["ideas"]) == 5
    assert all(not i["is_implemented"] for i in day["ideas"])
    assert day["implemented_idea"] is None

    # Check that the dashboard shows in-progress badge and ship prototype action
    dash_res = flask_client.get("/")
    assert b"IN PROGRESS (Sparks Logged)" in dash_res.data
    assert b"Ship Prototype" in dash_res.data

    # 2. Check edit page loads in-progress state correctly
    edit_get = flask_client.get(f"/day/{test_date}/edit")
    assert edit_get.status_code == 200
    assert b"Euclidean Drum Sequencer" in edit_get.data
    assert b"In Progress (None yet)" in edit_get.data

    # 3. Afternoon: Implement Idea #3 and update the entry
    update_data = {
        "date": test_date,
        "streak_count": "150",
        "theme": "Modular Audio Synthesizers",
        "subtitle": "Patch cables and oscillator waves",
        "notes": "Finished building Euclidean sequencer at 4:30 PM",
        "implemented_index": "3",  # Now implemented!
        "idea_1_title": "Wavetable Synth",
        "idea_1_tagline": "Morphing digital shapes",
        "idea_1_desc": "Scan 256 sample tables",
        "idea_1_tags": "Audio, DSP",
        "idea_2_title": "Tape Echo Delay",
        "idea_2_tagline": "Saturated flutter and wow",
        "idea_2_desc": "Vintage tape loop emulation",
        "idea_2_tags": "Audio, Analog",
        "idea_3_title": "Euclidean Drum Sequencer",
        "idea_3_tagline": "Geometric polyrhythms made easy",
        "idea_3_desc": "Bjorklund algorithm with live SVG circle visualizer",
        "idea_3_tags": "Audio, Math, UI",
        "idea_4_title": "FM Bell Generator",
        "idea_4_tagline": "Chime tones and glass",
        "idea_4_desc": "2-operator carrier/modulator pairing",
        "idea_4_tags": "Audio, FM",
        "idea_5_title": "Noise Color Palette",
        "idea_5_tagline": "Pink, brown, white, and violet",
        "idea_5_desc": "Spectral filtering of white noise",
        "idea_5_tags": "Audio, Noise",
        # Shipped prototype fields
        "impl_title": "Euclidean Matrix 9000",
        "impl_build_type": "interactive",
        "impl_rank": "3",
        "impl_time_spent": "3.5",
        "impl_ai_tools": "Web Audio API, Canvas 2D, Gemini Flash",
        "impl_summary": "Generates hypnotic 16-step polyrhythmic patterns on an interactive wheel",
        "impl_content": "/interactive/euclidean",
        "impl_external_url": "https://github.com/example/euclidean-matrix",
        "impl_steps": "Step 1: Implemented Bjorklund distribution\nStep 2: Connected Web Audio oscillators\nStep 3: Rendered Memphis geometry ring",
        "impl_what_rocked": "Zero latency polyrhythms\nHypnotic circular UI",
        "impl_what_broke": "BPM drift on background tab",
        "impl_transcript": "User: Let's build Idea #3...\nAgent: Built canvas renderer and audio loop...",
    }

    res2 = flask_client.post(f"/day/{test_date}/edit", data=update_data, follow_redirects=True)
    assert res2.status_code == 200
    assert b"updated successfully" in res2.data
    assert b"shipped prototype" in res2.data

    updated_day = db.get_day_by_date(test_date)
    assert updated_day is not None
    impl_idea = updated_day["implemented_idea"]
    assert impl_idea is not None
    assert impl_idea["idea_number"] == 3
    assert impl_idea["title"] == "Euclidean Drum Sequencer"
    assert impl_idea["implementation"]["title"] == "Euclidean Matrix 9000"
    assert impl_idea["implementation"]["build_type"] == "interactive"
    assert impl_idea["implementation"]["rank"] == 3
    assert impl_idea["implementation"]["time_spent_hours"] == 3.5
    assert len(impl_idea["implementation"]["process_steps"]) == 3
    assert impl_idea["implementation"]["process_steps"][0]["title"] == "Step 1"
    assert len(impl_idea["implementation"]["what_rocked"]) == 2
    assert len(impl_idea["implementation"]["what_broke"]) == 1

    # Check dashboard shows completed shipped prototype
    dash_res2 = flask_client.get("/")
    assert b"Euclidean Matrix 9000" in dash_res2.data


def test_admin_edit_preserves_steps_in_textarea(flask_client):
    """Verifies that loading an existing day in edit mode preserves process steps in the textarea."""
    days = db.get_all_days()
    day_with_impl = next((d for d in days if d.get("implemented_idea")), None)
    assert day_with_impl is not None

    res = flask_client.get(f"/day/{day_with_impl['date']}/edit")
    assert res.status_code == 200
    # Process steps should not be empty in the textarea
    impl = day_with_impl["implemented_idea"]["implementation"]
    if impl.get("process_steps"):
        first_step = impl["process_steps"][0]
        step_str = first_step["title"].encode("utf-8")
        assert step_str in res.data


def test_admin_edit_by_id_route(flask_client):
    """Test accessing edit by day_id."""
    days = db.get_all_days()
    first_day = days[0]
    res = flask_client.get(f"/day/{first_day['id']}/edit")
    assert res.status_code == 200
    assert b"CONTENT EDITOR" in res.data
    assert first_day["date"].encode("utf-8") in res.data


