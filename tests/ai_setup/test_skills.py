"""Skills in .claude/skills are well-formed, point at real commands, and are mirrored in .agents/skills."""

import re
import shlex
from pathlib import Path

import pytest

from showcase.cli import build_parser

ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = ROOT / ".claude" / "skills"
SKILLS = sorted(p for p in SKILLS_DIR.iterdir() if (p / "SKILL.md").is_file())
EXPECTED = {
    "new-day",
    "spec-implementation",
    "new-prototype",
    "record-implementation",
    "capture-implementation",
    "ship",
    "design-system",
}


def cli_commands() -> set[str]:
    subparsers = next(a for a in build_parser()._actions if a.dest == "command")
    return set(subparsers.choices)


def test_expected_skills_exist():
    assert {s.name for s in SKILLS} >= EXPECTED


@pytest.mark.parametrize("skill", SKILLS, ids=[s.name for s in SKILLS])
def test_frontmatter(skill, frontmatter):
    meta = frontmatter((skill / "SKILL.md").read_text())
    assert meta.get("name") == skill.name
    assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", meta["name"]) and len(meta["name"]) <= 64
    description = meta.get("description", "")
    assert 40 <= len(description) <= 1024, f"{skill.name}: description must say what and when"


@pytest.mark.parametrize("skill", SKILLS, ids=[s.name for s in SKILLS])
def test_uv_run_commands_exist(skill):
    commands = cli_commands()
    body = (skill / "SKILL.md").read_text()
    for line in re.findall(r"^\s*(uv run [^\n\\]+)", body, re.M):
        argv = shlex.split(line.split("#", 1)[0].replace("<", "").replace(">", ""), posix=True)
        tool = argv[2]
        if tool == "five-ideas":
            assert argv[3] in commands, f"{skill.name}: unknown CLI command in {line!r}"
        else:
            assert tool in {"pytest", "ruff", "python"}, f"{skill.name}: unexpected command {line!r}"
        assert "scripts/" not in line, f"{skill.name} still references the removed scripts/ folder"


@pytest.mark.parametrize("skill", SKILLS, ids=[s.name for s in SKILLS])
def test_agents_mirror_is_a_symlink(skill):
    mirror = ROOT / ".agents" / "skills" / skill.name
    assert mirror.is_symlink(), f".agents/skills/{skill.name} must be a symlink"
    assert mirror.resolve() == skill.resolve()
    assert not Path(mirror.readlink()).is_absolute(), "use a relative symlink"


def test_descriptions_are_not_copy_pasted(frontmatter):
    seen: dict[str, str] = {}
    for skill in SKILLS:
        description = frontmatter((skill / "SKILL.md").read_text())["description"]
        for sentence in filter(None, (s.strip().lower() for s in re.split(r"[.!?]", description))):
            assert sentence not in seen, f"{skill.name} and {seen.get(sentence)} share: {sentence!r}"
            seen[sentence] = skill.name


def test_ship_is_user_invoked_only(frontmatter):
    meta = frontmatter((SKILLS_DIR / "ship" / "SKILL.md").read_text())
    assert meta.get("disable-model-invocation") is True
