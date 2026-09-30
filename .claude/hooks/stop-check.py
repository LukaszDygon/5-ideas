#!/usr/bin/env python3
"""Stop: if code changed since HEAD, run the test suite and refuse to stop while it fails."""

from __future__ import annotations

import json
import subprocess
import sys

from _lib import project_root, read_payload

CODE_SUFFIXES = (".py", ".html", ".toml")
PYTEST = ["uv", "run", "pytest", "-q", "-x", "--no-header", "-p", "no:cacheprovider"]


def changed_files(root) -> list[str]:
    tracked = subprocess.run(["git", "diff", "--name-only", "HEAD"], cwd=root, capture_output=True, text=True)
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"], cwd=root, capture_output=True, text=True
    )
    return (tracked.stdout + untracked.stdout).split()


def main() -> int:
    payload = read_payload()
    if payload.get("stop_hook_active"):
        return 0  # already continuing because of this hook; never loop
    root = project_root(payload)
    if not any(f.endswith(CODE_SUFFIXES) for f in changed_files(root)):
        return 0
    try:
        result = subprocess.run(PYTEST, cwd=root, capture_output=True, text=True, timeout=110)
    except subprocess.TimeoutExpired:
        print("stop-check: pytest timed out after 110 s; not blocking.", file=sys.stderr)
        return 0
    if result.returncode in (0, 5):  # 5 = no tests collected
        return 0
    tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-20:])
    print(
        json.dumps(
            {
                "decision": "block",
                "reason": f"Tests fail after your changes; fix them before finishing:\n{tail}",
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
