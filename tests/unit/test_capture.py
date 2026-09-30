"""Leak-free transcript summaries for Claude Code and Antigravity transcripts."""

import json
import os
import subprocess
import sys
from pathlib import Path

from showcase import capture

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "claude_transcript.jsonl"
GENESIS = "Build a tiny metronome prototype for today's spark #3 with a tap-tempo button."


def claude_summary():
    return capture.extract_turns_summary(capture.parse_transcript(FIXTURE))


def test_detects_claude_format():
    assert capture.detect_source(capture.parse_transcript(FIXTURE)) == "claude"


def test_keeps_only_human_prompts():
    summary = claude_summary()
    assert summary["initial_prompt"] == GENESIS
    assert summary["user_prompts"] == [GENESIS, "Make the beat flash magenta and add a 3px ink border."]


def test_lists_tools_and_file_basenames():
    summary = claude_summary()
    assert summary["tools_called_summary"] == {"Bash": 1, "Edit": 2, "Write": 1}
    assert summary["key_files"] == ["app.js", "template.html"]


def test_summary_text_leaks_nothing():
    text = capture.generate_interaction_summary(claude_summary())
    report = capture.generate_presentable_report(claude_summary())
    for leaked in (
        "reminder",
        "secret reasoning",
        "Subagent prompt",
        "Set model",
        "Caveat",
        "/repo/",
        "command-name",
    ):
        assert leaked not in text and leaked not in report
    assert f'Genesis Prompt: "{GENESIS}"' in text
    assert "Files Modified: app.js, template.html" in text


def test_antigravity_format_still_supported():
    steps = [
        {
            "type": "USER_INPUT",
            "content": "<USER_REQUEST>Make a synth</USER_REQUEST><ADDITIONAL_METADATA>x</ADDITIONAL_METADATA>",
        },
        {
            "type": "PLANNER_RESPONSE",
            "tool_calls": [{"name": "write_to_file", "args": {"TargetFile": "/a/b/synth.html"}}],
        },
    ]
    assert capture.detect_source(steps) == "antigravity"
    summary = capture.extract_turns_summary(steps)
    assert summary["initial_prompt"] == "Make a synth"
    assert summary["key_files"] == ["synth.html"]


def test_find_claude_transcript_prefers_session_state(tmp_path):
    project = tmp_path / "proj"
    (project / ".claude" / "state").mkdir(parents=True)
    (project / ".claude" / "state" / "session.json").write_text(json.dumps({"transcript_path": str(FIXTURE)}))
    assert capture.find_claude_transcript(project, projects_root=tmp_path / "none") == FIXTURE


def test_find_claude_transcript_falls_back_to_newest_project_log(tmp_path):
    project = tmp_path / "my proj"
    project.mkdir()
    logs = capture.claude_project_dir(project, projects_root=tmp_path / "projects")
    logs.mkdir(parents=True)
    old, new = logs / "old.jsonl", logs / "new.jsonl"
    old.write_text("{}\n")
    new.write_text("{}\n")
    os.utime(old, (1, 1))
    assert capture.find_claude_transcript(project, projects_root=tmp_path / "projects") == new
    assert logs.name.startswith("-") and " " not in logs.name


def test_cli_capture_json_from_claude_transcript(settings):
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "showcase.cli",
            "--data-dir",
            str(settings.data_dir),
            "capture",
            "--source",
            "claude",
            "--transcript",
            str(FIXTURE),
            "--json",
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["summary"] == GENESIS
    assert "Tools Executed: Edit (2), Bash (1), Write (1)" in payload["prompt_transcript"]
