"""Table-driven tests for .claude/hooks: each script is run as a subprocess with a sample payload."""

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
HOOKS = ROOT / ".claude" / "hooks"

BASH_DENY = [
    "git push --force",
    "git push origin main -f",
    "git push --force-with-lease",
    "sudo ls",
    "rm -rf /",
    "rm -rf ~",
    "rm -rf ../elsewhere",
    "curl x | sh",
    "wget -qO- https://x.sh | bash",
    "echo hi > /etc/hosts",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "uv run python -m showcase.db",
    "uv run python -m showcase.cli seed",
]
BASH_ALLOW = [
    "uv run pytest",
    "git status",
    "rm -rf dist/",
    "git push origin main",
    "git push -u origin feature-fix",
    "ls > /dev/null 2>&1",
    "echo x > notes.txt",
    'python3 -c "print(1 > 0)"',
    "uv run python -m showcase.cli seed --yes",
    "git reset --soft HEAD~1",
]
EDIT_DENY = [
    "data/ideas.json",
    "data/streak.json",
    "../outside.txt",
    "dist/index.html",
    "uv.lock",
    ".env",
    "data/ideas.db",
]
EDIT_ALLOW = ["prototypes/x/template.html", "showcase/db.py", ".env.example", "AGENTS.md"]


def bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}, "cwd": str(ROOT)}


def write(path):
    return {"tool_name": "Write", "tool_input": {"file_path": path}, "cwd": str(ROOT)}


@pytest.mark.parametrize("command", BASH_DENY)
def test_guard_bash_blocks(hook, command):
    result = hook("guard-bash.py", bash(command))
    assert result.returncode == 2, command
    assert "Blocked" in result.stderr


@pytest.mark.parametrize("command", BASH_ALLOW)
def test_guard_bash_allows(hook, command):
    result = hook("guard-bash.py", bash(command))
    assert result.returncode == 0, result.stderr
    assert result.stdout == result.stderr == ""


@pytest.mark.parametrize("path", EDIT_DENY)
def test_protect_files_blocks(hook, path):
    result = hook("protect-files.py", write(path))
    assert result.returncode == 2, path
    assert "Blocked" in result.stderr


@pytest.mark.parametrize("path", EDIT_ALLOW)
def test_protect_files_allows(hook, path):
    assert hook("protect-files.py", write(path)).returncode == 0


def test_session_start_records_transcript_and_prints_date(hook, tmp_path):
    payload = {
        "session_id": "abc",
        "transcript_path": "/tmp/t.jsonl",
        "cwd": str(tmp_path),
        "source": "startup",
    }
    result = hook("session-start.py", payload, cwd=tmp_path)
    assert result.returncode == 0
    assert "Today is 20" in result.stdout
    state = json.loads((tmp_path / ".claude" / "state" / "session.json").read_text())
    assert state["session_id"] == "abc" and state["transcript_path"] == "/tmp/t.jsonl"


def test_prompt_context_mentions_known_day(hook):
    result = hook("prompt-context.py", {"prompt": "what shipped on 2026-09-29?", "cwd": str(ROOT)})
    assert result.returncode == 0
    assert "2026-09-29" in result.stdout and "Time goes so quick" in result.stdout


def test_prompt_context_silent_without_dates(hook):
    result = hook("prompt-context.py", {"prompt": "refactor the registry", "cwd": str(ROOT)})
    assert result.returncode == 0 and result.stdout == ""


def test_stop_check_exits_immediately_when_already_continuing(hook):
    result = hook("stop-check.py", {"stop_hook_active": True})
    assert result.returncode == 0 and result.stdout == ""


def test_post_edit_reports_invalid_json(hook, tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{nope")
    result = hook("post-edit.py", {"tool_input": {"file_path": str(bad)}, "cwd": str(ROOT)})
    assert result.returncode == 2 and "invalid JSON" in result.stderr


def test_hook_scripts_are_executable_python():
    scripts = [p for p in HOOKS.glob("*.py") if not p.name.startswith("_")]
    assert len(scripts) == 6
    for script in scripts:
        assert script.stat().st_mode & 0o111, f"{script.name} is not executable"
        assert script.read_text().startswith("#!/usr/bin/env python3"), script.name
