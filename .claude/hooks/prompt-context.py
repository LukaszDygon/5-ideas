#!/usr/bin/env python3
"""UserPromptSubmit: when the prompt mentions today or a date, say whether a day entry exists."""

from __future__ import annotations

import re

from _lib import day_summary, load_days, project_root, read_payload, today

DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")


def main() -> int:
    payload = read_payload()
    prompt = payload.get("prompt") or ""
    dates = DATE_RE.findall(prompt)
    if re.search(r"\btoday\b", prompt, re.IGNORECASE):
        dates.insert(0, today())
    if not dates:
        return 0
    days = load_days(project_root(payload))
    notes = []
    for d in dict.fromkeys(dates):
        summary = day_summary(days, d)
        notes.append(f"day entry {summary}" if summary else f"no day entry for {d}")
    print(f"Today is {today()}; " + "; ".join(notes) + ".")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
