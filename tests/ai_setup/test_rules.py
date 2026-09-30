"""Path-scoped rules in .claude/rules have valid frontmatter whose globs match real files."""

import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
RULES = sorted((ROOT / ".claude" / "rules").glob("*.md"))


def tracked_files() -> list[str]:
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return out.splitlines()


def glob_matches(pattern: str, files: list[str]) -> bool:
    regex = re.escape(pattern).replace(r"\*\*/", "(?:.*/)?").replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
    return any(re.fullmatch(regex, f) for f in files)


def test_rules_exist():
    assert {r.name for r in RULES} >= {"python.md", "prototypes.md", "design-system.md"}


@pytest.mark.parametrize("rule", RULES, ids=[r.name for r in RULES])
def test_rule_paths_match_repo_files(rule, frontmatter):
    meta = frontmatter(rule.read_text())
    paths = meta.get("paths")
    assert isinstance(paths, list) and paths, f"{rule.name} needs a non-empty `paths` list"
    files = tracked_files()
    for pattern in paths:
        assert glob_matches(pattern, files), f"{rule.name}: {pattern!r} matches no tracked file"


@pytest.mark.parametrize("rule", RULES, ids=[r.name for r in RULES])
def test_rule_has_a_body(rule):
    body = re.sub(r"^---\n.*?\n---\n", "", rule.read_text(), flags=re.S)
    assert len(body.split()) > 30
