"""End-to-end tests for `python -m showcase.cli` (each sub-command runs in a subprocess).

Every call passes `--data-dir` (and `--prototypes-dir` where needed) pointing at this test's
tmp copy of the data, so nothing depends on environment variables or touches the real data/.
"""

import json
import subprocess
import sys

import pytest
from starlette.testclient import TestClient

from showcase.config import Settings
from showcase.web import create_app

COMMANDS = ("sparks", "new-day", "save-impl", "capture", "new-prototype", "rank", "tags", "build", "seed")
IDEAS = [f"Spark {n}|Tagline {n}|Description {n}|tag{n}, cli" for n in range(1, 6)]


@pytest.fixture
def cli(settings):
    def run(*args, prototypes_dir=None):
        options = ["--data-dir", str(settings.data_dir)]
        if prototypes_dir:
            options += ["--prototypes-dir", str(prototypes_dir)]
        return subprocess.run(
            [sys.executable, "-m", "showcase.cli", *options, *args],
            capture_output=True,
            text=True,
            timeout=120,
        )

    return run


def new_day(cli, date="2031-01-02", *extra):
    idea_args = [arg for idea in IDEAS for arg in ("--idea", idea)]
    return cli("new-day", "--date", date, "--theme", "CLI Theme", "--subtitle", "Sub", *idea_args, *extra)


def test_help_lists_all_commands(cli):
    result = cli("--help")
    assert result.returncode == 0
    for command in COMMANDS:
        assert command in result.stdout


def test_sparks_known_and_unknown_day(cli):
    result = cli("sparks", "--date", "2026-09-29")
    assert result.returncode == 0 and "Time goes so quick" in result.stdout
    data = json.loads(cli("sparks", "--date", "2026-09-29", "--json").stdout)
    assert data["date"] == "2026-09-29" and len(data["ideas"]) == 5
    missing = cli("sparks", "--date", "1999-01-01")
    assert missing.returncode == 1 and "not found" in missing.stderr


def test_new_day_round_trips_through_sparks(cli):
    result = new_day(cli)
    assert result.returncode == 0, result.stderr
    day = json.loads(cli("sparks", "--date", "2031-01-02", "--json").stdout)
    assert day["theme"] == "CLI Theme" and day["subtitle"] == "Sub"
    assert [i["title"] for i in day["ideas"]] == [f"Spark {n}" for n in range(1, 6)]
    assert day["ideas"][2]["tags"] == "tag3, cli"
    assert day["implemented_idea"] is None


def test_new_day_refuses_duplicates_and_wrong_idea_count(cli):
    assert new_day(cli).returncode == 0
    duplicate = new_day(cli)
    assert duplicate.returncode == 1 and "already exists" in duplicate.stderr
    assert new_day(cli, "2031-01-02", "--replace").returncode == 0
    short = cli("new-day", "--date", "2031-01-03", "--theme", "T", "--idea", "Only one")
    assert short.returncode == 1 and "exactly 5 ideas" in short.stderr


def test_new_day_from_json_file(cli, tmp_path):
    payload = {"date": "2031-02-03", "theme": "From JSON", "ideas": [{"title": f"J{n}"} for n in range(5)]}
    path = tmp_path / "day.json"
    path.write_text(json.dumps(payload))
    assert cli("new-day", "--json-file", str(path)).returncode == 0
    assert json.loads(cli("sparks", "--date", "2031-02-03", "--json").stdout)["theme"] == "From JSON"


def test_save_impl_marks_the_idea_shipped(cli):
    new_day(cli)
    result = cli(
        "save-impl",
        "--date",
        "2031-01-02",
        "--idea",
        "2",
        "--title",
        "Shipped",
        "--type",
        "interactive",
        "--steps",
        "Step 1: Build\nStep 2: Test",
        "--rocked",
        "Fast",
        "--broke",
        "Nothing",
    )
    assert result.returncode == 0, result.stderr
    day = json.loads(cli("sparks", "--date", "2031-01-02", "--json").stdout)
    impl = day["implemented_idea"]
    assert impl["idea_number"] == 2 and impl["implementation"]["title"] == "Shipped"
    assert len(impl["implementation"]["process_steps"]) == 2


def test_new_prototype_scaffold_renders_in_the_app(cli, tmp_path, settings):
    result = cli(
        "new-prototype",
        "--slug",
        "demo",
        "--title",
        "Demo Thing",
        "--date",
        "2031-01-02",
        prototypes_dir=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    assert (tmp_path / "demo" / "prototype.toml").is_file() and (tmp_path / "demo" / "static").is_dir()
    again = cli("new-prototype", "--slug", "demo", "--title", "Demo", prototypes_dir=tmp_path)
    assert again.returncode == 1 and "already exists" in again.stderr
    bad = cli("new-prototype", "--slug", "Bad Slug", "--title", "x", prototypes_dir=tmp_path)
    assert bad.returncode == 1

    scaffolded = Settings(data_dir=settings.data_dir, prototypes_dir=tmp_path)
    with TestClient(create_app(scaffolded)) as client:
        page = client.get("/interactive/demo")
    assert page.status_code == 200
    assert "Demo Thing" in page.text and "IDEAS DAILY" in page.text


def ranking(cli):
    result = cli("rank")
    assert result.returncode == 0, result.stderr
    return [line.split()[1] for line in result.stdout.splitlines()]


def test_rank_puts_the_listed_days_first_and_keeps_the_rest_in_order(cli):
    before = ranking(cli)
    picks = [before[-1], before[0]]
    result = cli("rank", *picks)
    assert result.returncode == 0, result.stderr
    assert ranking(cli) == picks + [d for d in before if d not in picks]
    ranks = [int(line.split(".")[0]) for line in cli("rank").stdout.splitlines()]
    assert ranks == list(range(1, len(before) + 1))


def test_rank_rejects_unknown_and_repeated_days(cli):
    before = ranking(cli)
    unknown = cli("rank", "1999-01-01")
    assert unknown.returncode == 1 and "1999-01-01" in unknown.stderr
    repeated = cli("rank", before[0], before[0])
    assert repeated.returncode == 1 and "more than once" in repeated.stderr
    assert ranking(cli) == before


def test_tags_applies_a_mapping_and_counts_tags(cli, tmp_path):
    new_day(cli)
    mapping = tmp_path / "tags.json"
    mapping.write_text(json.dumps({"2031-01-02": {"1": " Game ,Horror", "5": "Tool"}}))
    result = cli("tags", "--apply", str(mapping))
    assert result.returncode == 0, result.stderr
    assert "Retagged 2 ideas" in result.stdout and "Horror" in result.stdout
    ideas = json.loads(cli("sparks", "--date", "2031-01-02", "--json").stdout)["ideas"]
    assert [ideas[0]["tags"], ideas[4]["tags"]] == ["Game, Horror", "Tool"]

    mapping.write_text(json.dumps({"2031-01-02": {"9": "Nope"}}))
    unknown = cli("tags", "--apply", str(mapping))
    assert unknown.returncode == 1 and "no idea #9 on 2031-01-02" in unknown.stderr


def test_seed_requires_yes(cli):
    refused = cli("seed")
    assert refused.returncode == 1 and "--yes" in refused.stderr
    assert cli("seed", "--yes").returncode == 0


@pytest.mark.parametrize("command", COMMANDS)
def test_every_command_has_help(cli, command):
    assert cli(command, "--help").returncode == 0
