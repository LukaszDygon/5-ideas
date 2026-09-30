"""Claude Code project settings: least-privilege permissions, required denies, runnable hooks.

Validates .claude/settings.json and, while it is still a proposal awaiting installation (plan T1.2),
docs/plan/settings.proposed.json. Both are checked when both exist.
"""

import json
import os
import re
import shlex
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
INSTALLED = ROOT / ".claude" / "settings.json"
PROPOSED = ROOT / "docs" / "plan" / "settings.proposed.json"
CANDIDATES = [p for p in (INSTALLED, PROPOSED) if p.exists()]
REQUIRED_DENY = {"Read(./.env)", "Read(~/.ssh/**)", "Bash(sudo *)"}
# Folders the CLI writes. Edit/Read deny rules are merged into the sandbox, so denying these would
# stop `five-ideas` itself; the protect-files hook guards them from the Edit/Write tools instead.
CLI_WRITES = ("./data/", "./dist/", "data/", "dist/")
# History-rewriting git commands may prompt (ask) or be refused (deny), never run silently.
GUARDED = {"Bash(git push --force *)", "Bash(git reset --hard *)", "Bash(git clean *)", "Bash(git rebase *)"}
FORBIDDEN_ALLOW = {"Bash", "Bash(*)", "Bash(:*)", "Bash( *)", "*"}
IGNORED = [".env", ".claude/settings.local.json", ".claude/state/x", "data/ideas.db", "data/ideas.db-wal"]


def normalise(rule: str) -> str:
    """`Bash(x:*)` and `Bash(x *)` are the same rule; compare in the space form."""
    return re.sub(r":\*\)$", " *)", rule)


@pytest.fixture(params=CANDIDATES, ids=[str(p.relative_to(ROOT)) for p in CANDIDATES])
def config(request) -> dict:
    return json.loads(request.param.read_text(encoding="utf-8"))


def test_settings_installed():
    if not INSTALLED.exists():
        pytest.skip(
            "`.claude/settings.json` not installed yet: review and `cp docs/plan/settings.proposed.json .claude/settings.json`"
        )


def test_no_blanket_permissions(config):
    permissions = config["permissions"]
    assert permissions.get("defaultMode") != "bypassPermissions"
    allow = {normalise(r) for r in permissions.get("allow", [])}
    assert not allow & FORBIDDEN_ALLOW, allow & FORBIDDEN_ALLOW
    assert not [r for r in allow if r.startswith(("Write(", "Edit(/", "Read(/"))], (
        "path-wide allow rules are not allowed"
    )


def test_required_denies(config):
    deny = {normalise(r) for r in config["permissions"].get("deny", [])}
    assert deny >= REQUIRED_DENY, REQUIRED_DENY - deny


def test_cli_folders_are_not_denied(config):
    deny = config["permissions"].get("deny", [])
    blocked = [
        r for r in deny if r.startswith(("Edit(", "Read(")) and r[r.index("(") + 1 :].startswith(CLI_WRITES)
    ]
    assert not blocked, f"these also block the CLI inside the sandbox: {blocked}"


def test_protect_files_hook_guards_edits(config):
    pre = config.get("hooks", {}).get("PreToolUse", [])
    guarded = [g for g in pre if "Edit" in g.get("matcher", "") and "Write" in g.get("matcher", "")]
    assert any("protect-files.py" in h["command"] for g in guarded for h in g["hooks"])


def test_history_rewriting_git_commands_need_approval(config):
    permissions = config["permissions"]
    guarded = {normalise(r) for key in ("deny", "ask") for r in permissions.get(key, [])}
    assert guarded >= GUARDED, GUARDED - guarded
    allow = {normalise(r) for r in permissions.get("allow", [])}
    assert not allow & GUARDED


def test_no_write_path_rules(config):
    """Claude Code only consults Edit(path)/Read(path); Write(path) rules are silently ignored."""
    rules = [r for group in config["permissions"].values() if isinstance(group, list) for r in group]
    assert not [r for r in rules if r.startswith("Write(")]


def hook_commands(config) -> list[dict]:
    return [h for groups in config.get("hooks", {}).values() for group in groups for h in group["hooks"]]


def test_hooks_are_registered_with_timeouts(config):
    events = set(config.get("hooks", {}))
    assert events >= {"SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"}
    for hook in hook_commands(config):
        assert hook["type"] == "command"
        assert 0 < hook.get("timeout", 0) <= 120, hook


def test_hook_commands_exist_and_are_executable(config):
    for hook in hook_commands(config):
        command = (
            hook["command"]
            .replace("$CLAUDE_PROJECT_DIR", str(ROOT))
            .replace("${CLAUDE_PROJECT_DIR}", str(ROOT))
        )
        script = Path(shlex.split(command)[0])
        assert script.is_file(), f"hook script missing: {script}"
        assert os.access(script, os.X_OK), f"hook script not executable: {script}"


def test_gitignore_covers_local_and_secret_files():
    for path in IGNORED:
        assert subprocess.run(["git", "check-ignore", "-q", path], cwd=ROOT).returncode == 0, (
            f"{path} is not ignored"
        )
