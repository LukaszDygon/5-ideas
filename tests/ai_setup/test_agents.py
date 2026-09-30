"""Subagents in .claude/agents have valid frontmatter and least-privilege tool lists."""

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
AGENTS = sorted((ROOT / ".claude" / "agents").glob("*.md"))
KNOWN_TOOLS = {
    "Read",
    "Write",
    "Edit",
    "MultiEdit",
    "Bash",
    "Glob",
    "Grep",
    "WebFetch",
    "WebSearch",
    "NotebookEdit",
    "Skill",
    "AskUserQuestion",
    "Agent",
    "TodoWrite",
}
MODELS = {"sonnet", "opus", "haiku", "inherit"}
PERMISSION_MODES = {"default", "manual", "acceptEdits", "auto", "dontAsk", "plan"}  # no bypassPermissions


def tools_of(meta: dict) -> set[str]:
    tools = meta.get("tools", [])
    return set(tools) if isinstance(tools, list) else {t.strip() for t in tools.split(",") if t.strip()}


def test_expected_agents_exist():
    assert {a.stem for a in AGENTS} >= {"design-reviewer", "prototype-qa"}


@pytest.mark.parametrize("agent", AGENTS, ids=[a.stem for a in AGENTS])
def test_frontmatter(agent, frontmatter):
    meta = frontmatter(agent.read_text())
    assert meta.get("name") == agent.stem
    assert len(meta.get("description", "")) >= 40
    assert tools_of(meta) and tools_of(meta) <= KNOWN_TOOLS
    assert meta.get("model") in MODELS
    assert meta.get("permissionMode", "default") in PERMISSION_MODES


def test_reviewer_cannot_modify_anything(frontmatter):
    meta = frontmatter((ROOT / ".claude" / "agents" / "design-reviewer.md").read_text())
    assert tools_of(meta) <= {"Read", "Grep", "Glob"}
    assert meta.get("permissionMode") == "plan"


def test_qa_agent_has_no_edit_tools(frontmatter):
    meta = frontmatter((ROOT / ".claude" / "agents" / "prototype-qa.md").read_text())
    assert not tools_of(meta) & {"Edit", "Write", "MultiEdit", "NotebookEdit"}
