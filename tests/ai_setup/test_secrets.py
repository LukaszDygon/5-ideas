"""No secrets in tracked files; MCP config only references environment variables."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SECRET_PATTERNS = {
    "Google API key": re.compile(r"AQ\.[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "OpenAI/Anthropic-style key": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "private key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
}
BINARY_SUFFIXES = {".png", ".jpg", ".jpeg", ".mp3", ".svg", ".db", ".ico", ".woff", ".woff2"}


def tracked_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout
    return [ROOT / f for f in out.split("\0") if f and (ROOT / f).is_file()]


def test_no_secrets_in_tracked_files():
    hits = []
    for path in tracked_files():
        if path.suffix.lower() in BINARY_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                hits.append(f"{path.relative_to(ROOT)}: {name}")
    assert not hits, hits


def test_mcp_headers_use_env_placeholders():
    config = json.loads((ROOT / ".mcp.json").read_text())
    for name, server in config["mcpServers"].items():
        for header, value in server.get("headers", {}).items():
            assert re.fullmatch(r"(Bearer )?\$\{[A-Z0-9_]+(:-[^}]*)?\}", value), (
                f"{name}.{header} must be ${{VAR}}"
            )


def test_env_example_documents_every_mcp_variable():
    env_example = (ROOT / ".env.example").read_text()
    variables = set(re.findall(r"\$\{([A-Z0-9_]+)", (ROOT / ".mcp.json").read_text()))
    documented = set(re.findall(r"^([A-Z0-9_]+)=", env_example, re.M))
    assert variables <= documented


def test_secret_files_are_ignored():
    for path in (".env", "mcp_config.json", ".agents/plugins/stitch/mcp_config.json", "data/ideas.db"):
        result = subprocess.run(["git", "check-ignore", "-q", path], cwd=ROOT)
        assert result.returncode == 0, f"{path} must be gitignored"
