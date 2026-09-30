"""Shared helpers for the AI-setup quality tests (stdlib only, no network)."""

import json
import os
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
HOOKS = ROOT / ".claude" / "hooks"


def run_hook(
    name: str, payload: dict, cwd: Path | None = None, env: dict | None = None
) -> subprocess.CompletedProcess:
    """Runs a hook script the way Claude Code does: JSON payload on stdin, CLAUDE_PROJECT_DIR set."""
    full_env = {**os.environ, "CLAUDE_PROJECT_DIR": str(cwd or ROOT), **(env or {})}
    return subprocess.run(
        [str(HOOKS / name)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=cwd or ROOT,
        env=full_env,
        timeout=30,
    )


@pytest.fixture
def hook():
    return run_hook


def parse_frontmatter(text: str) -> dict:
    """Minimal YAML frontmatter reader: scalars, quoted strings, `>-`/`|` blocks and `- item` lists."""
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}
    data: dict = {}
    lines = match.group(1).splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if not m:
            raise ValueError(f"unsupported frontmatter line: {line!r}")
        key, value = m.group(1), m.group(2).strip()
        i += 1
        if value in (">-", ">", "|", "|-"):
            block = []
            while i < len(lines) and (lines[i].startswith(" ") or not lines[i].strip()):
                block.append(lines[i].strip())
                i += 1
            data[key] = (" " if value.startswith(">") else "\n").join(block).strip()
        elif value == "":
            items = []
            while i < len(lines) and re.match(r"^\s+-\s+", lines[i]):
                items.append(re.sub(r"^\s+-\s+", "", lines[i]).strip().strip("\"'"))
                i += 1
            data[key] = items
        elif value.startswith("[") and value.endswith("]"):
            data[key] = [v.strip().strip("\"'") for v in value[1:-1].split(",") if v.strip()]
        elif value in ("true", "false"):
            data[key] = value == "true"
        else:
            data[key] = value.strip("\"'")
    return data


@pytest.fixture
def frontmatter():
    return parse_frontmatter
