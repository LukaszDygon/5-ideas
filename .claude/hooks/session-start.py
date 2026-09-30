#!/usr/bin/env python3
"""SessionStart: remember the transcript location and give Claude today's context."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime

from _lib import day_summary, load_days, project_root, read_payload, today


def git(root, *args: str) -> str:
    try:
        out = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=3)
        return out.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ""


def main() -> int:
    payload = read_payload()
    root = project_root(payload)

    state_dir = root / ".claude" / "state"
    state_dir.mkdir(parents=True, exist_ok=True)
    state = {
        "session_id": payload.get("session_id"),
        "transcript_path": payload.get("transcript_path"),
        "cwd": payload.get("cwd"),
        "source": payload.get("source"),
        "started": datetime.now().isoformat(timespec="seconds"),
    }
    (state_dir / "session.json").write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

    branch = git(root, "branch", "--show-current") or "(no branch)"
    status = git(root, "status", "--short").splitlines()
    print(f"Today is {today()}. Git branch: {branch}, {len(status)} changed file(s).")
    for line in status[:10]:
        print(f"  {line}")
    if len(status) > 10:
        print(f"  ... and {len(status) - 10} more")
    summary = day_summary(load_days(root), today())
    print(f"Day entry {summary}" if summary else f"No day entry for today ({today()}) yet.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
