"""Agent instructions (CLAUDE.md, AGENTS.md, README.md, rules) are present, small, and point at real things."""

import re
import shlex
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
DOCS = [
    ROOT / "AGENTS.md",
    ROOT / "CLAUDE.md",
    ROOT / "README.md",
    *sorted((ROOT / ".claude" / "rules").glob("*.md")),
]
PATH_SUFFIXES = (
    ".md",
    ".py",
    ".json",
    ".html",
    ".css",
    ".js",
    ".toml",
    ".yml",
    ".yaml",
    ".txt",
    ".db",
    ".jsonl",
)


def is_ignored(rel: str) -> bool:
    return subprocess.run(["git", "check-ignore", "-q", rel], cwd=ROOT).returncode == 0


def path_candidates(text: str) -> set[str]:
    """Backtick-quoted relative paths and markdown link targets that look like files or folders."""
    tokens = set(re.findall(r"`([^`\s]+)`", text)) | set(re.findall(r"\]\(([^)\s]+)\)", text))
    paths = set()
    for token in tokens:
        token = token.split("#", 1)[0].rstrip(":,")
        if (
            not token
            or token.startswith(("/", "http", "~", "$", "-", "@"))
            or re.search(r"[*<>{}|=()]", token)
        ):
            continue
        if "/" in token or token.endswith(PATH_SUFFIXES):
            paths.add(token)
    return paths


def tracked_names() -> set[str]:
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return {name for path in out.splitlines() for name in Path(path).parts}


def resolve(token: str, names: set[str]) -> bool:
    if "/" not in token.rstrip("/"):  # bare file or folder name: must exist somewhere in the repo
        return token.rstrip("/") in names or is_ignored(token)
    return (ROOT / token).exists() or is_ignored(token)


def test_claude_md_imports_agents_md():
    text = (ROOT / "CLAUDE.md").read_text()
    assert re.search(r"^@AGENTS\.md\s*$", text, re.M)


def test_agents_md_is_small():
    text = (ROOT / "AGENTS.md").read_text()
    assert len(text.splitlines()) <= 150
    assert len(text.split()) <= 1200


@pytest.mark.parametrize("doc", DOCS, ids=[str(d.relative_to(ROOT)) for d in DOCS])
def test_referenced_paths_exist(doc):
    names = tracked_names()
    missing = sorted(t for t in path_candidates(doc.read_text()) if not resolve(t, names))
    assert not missing, f"{doc.name} points at missing paths: {missing}"


def uv_run_commands() -> list[list[str]]:
    """Distinct entry points documented in AGENTS.md and README.md as `uv run python ...` or `uv run five-ideas ...`."""
    seen, commands = set(), []
    for doc in (ROOT / "AGENTS.md", ROOT / "README.md"):
        for line in doc.read_text().splitlines():
            line = line.split("  #", 1)[0].strip()
            if line.startswith("uv run five-ideas"):
                argv = shlex.split(line)[3:4]  # the sub-command, if any
                key = ["-m", "showcase.cli", *[a for a in argv if not a.startswith("-")]]
            elif line.startswith("uv run python"):
                argv = shlex.split(line)[3:]
                key = argv[:2] if argv[:1] == ["-m"] else argv[:1]
            else:
                continue
            if tuple(key) not in seen:
                seen.add(tuple(key))
                commands.append(key)
    return commands


def test_documented_commands_have_working_help():
    commands = uv_run_commands()
    assert 0 < len(commands) <= 10
    for argv in commands:
        result = subprocess.run(
            [sys.executable, *argv, "--help"], cwd=ROOT, capture_output=True, text=True, timeout=60
        )
        assert result.returncode == 0, f"`python {' '.join(argv)} --help` failed: {result.stderr[-400:]}"
