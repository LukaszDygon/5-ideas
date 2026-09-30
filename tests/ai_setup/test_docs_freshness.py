"""Docs stay in step with the code they describe."""

import re
from pathlib import Path

from showcase import registry
from showcase.config import ENV_VARS
from showcase.pages import CORE_PAGES

ROOT = Path(__file__).resolve().parents[2]


def readme_routes() -> set[str]:
    text = (ROOT / "README.md").read_text()
    return set(re.findall(r"^\| `(/[^`]*)` \|", text, re.M))


def test_readme_route_table_lists_core_pages():
    routes = readme_routes()
    for page in (*CORE_PAGES, "/day/{date}", "/admin", "/docs"):
        assert page in routes, f"README route table is missing {page}"


def test_readme_route_table_points_at_the_registry():
    text = (ROOT / "README.md").read_text()
    assert "/interactive/<slug>" in readme_routes()
    assert "(prototypes/)" in text, "the /interactive/<slug> row should link to prototypes/"


def test_prototype_rule_documents_every_manifest_key():
    rule = (ROOT / ".claude" / "rules" / "prototypes.md").read_text()
    documented = set(re.findall(r"^\| `([a-z_]+)` \|", rule, re.M))
    assert documented == set(registry.MANIFEST_KEYS)


def test_prototype_rule_lists_the_same_build_types_as_the_registry():
    rule = (ROOT / ".claude" / "rules" / "prototypes.md").read_text()
    for build_type in registry.BUILD_TYPES:
        assert f"`{build_type}`" in rule


def test_agents_md_mentions_every_showcase_module():
    agents = (ROOT / "AGENTS.md").read_text()
    for module in sorted((ROOT / "showcase").glob("*.py")):
        if module.name != "__init__.py":
            assert f"showcase/{module.name}" in agents, (
                f"AGENTS.md repo map is missing showcase/{module.name}"
            )


def test_env_example_documents_every_setting_variable():
    documented = set(re.findall(r"^([A-Z0-9_]+)=", (ROOT / ".env.example").read_text(), re.M))
    assert set(ENV_VARS) <= documented, set(ENV_VARS) - documented
