"""docs/plan/progress.json stays valid and consistent with docs/plan/PLAN.md."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "docs" / "plan" / "PLAN.md"
PROGRESS = ROOT / "docs" / "plan" / "progress.json"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load():
    return json.loads(PROGRESS.read_text(encoding="utf-8"))


def test_progress_parses_and_ids_are_unique():
    tasks = load()["tasks"]
    ids = [t["id"] for t in tasks]
    assert len(ids) == len(set(ids))
    assert sorted(t["order"] for t in tasks) == list(range(1, len(tasks) + 1))


def test_statuses_and_dependencies_are_valid():
    data = load()
    ids = {t["id"] for t in data["tasks"]}
    for task in data["tasks"]:
        assert task["status"] in data["status_values"], task["id"]
        assert task["priority"] in data["priority_values"], task["id"]
        assert set(task["depends_on"]) <= ids, task["id"]


def test_done_tasks_have_dates_and_commits():
    for task in load()["tasks"]:
        if task["status"] == "done":
            assert task["completed"] and DATE_RE.match(task["completed"]), task["id"]
            assert task["commit"] and re.fullmatch(r"[0-9a-f]{7,40}", task["commit"]), task["id"]
        if task["status"] in ("in_progress", "blocked", "done"):
            assert task["started"] and DATE_RE.match(task["started"]), task["id"]
        if task["status"] == "blocked":
            assert task["notes"], f"{task['id']} is blocked but has no notes"


def test_plan_headings_match_progress_tasks():
    headings = set(re.findall(r"^### (T\d+\.\d+)\b", PLAN.read_text(encoding="utf-8"), re.M))
    assert headings == {t["id"] for t in load()["tasks"]}
