---
name: spec-implementation
description: >-
  Reads a day's entry (today by default), selects the target idea, asks pointed
  technical questions about implementation details, and confirms the spec for
  approval before building.
---

# Spec Implementation

Reads an entry for a specific day, retrieves or selects the target idea, asks pointed questions about the implementation details, and confirms the spec for approval.

## Arguments
- `date` *(optional)*: Date in `YYYY-MM-DD` format (defaults to `today`).
- `idea_number` *(optional)*: Idea number `1`-`5`.

## Workflow

### 1. Read Entry & Get Idea
Run the deterministic inspector script:
```bash
# Read entire day entry and all sparks:
uv run python scripts/get_day_sparks.py --date <date_or_today>

# Or inspect a specific idea directly:
uv run python scripts/get_day_sparks.py --date <date_or_today> --idea <1-5>
```

If `idea_number` was not specified:
- If an idea is already marked implemented, confirm if this is the target build.
- If not, prompt the user with the available ideas to select which one to implement.

### 2. Clarify Implementation Details
Ask pointed technical questions:
- **Build Type:** WebApp, CLI tool, poetry/text, audio/synth, image/visual, or interactive widget.
- **Tech Stack:** Runtime, frameworks, browser APIs, or libraries.
- **Core Mechanics:** What is the primary interaction or output that must work?
- **Scope Limits:** What is deliberately excluded from the initial build?
- **Any Additional Details:** Specific endpoints, routes, parameters, or data formats.

### 3. Confirm Spec for Approval
Present a concise specification:
- **Target Idea:** `#[N]` — *Title*
- **Build Type & Tech Stack:**
- **Core Features & Implementation Steps:**
- **Out of Scope:**

Ask for confirmation before starting implementation:
> *"Does this spec look good? Reply **Proceed** to begin building."*
