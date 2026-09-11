---
name: record-implementation
description: >-
  Converts a completed prototype implementation into the daily showcase entry
  under 'Shipped Prototype & AI Process Details' in the database.
---

# Record Implementation

Converts a completed implementation into the daily entry under **Shipped Prototype & AI Process Details**.

## Core Rules
- **Ask Before Generating:** NEVER auto-generate or fabricate the **process steps**, **what rocked**, or **what broke** sections. Always prompt the user to provide their own reflections and milestones before running the save script.
- **Leak-Free AI Interaction Summary:** Never dump raw conversation logs or prompt transcripts containing system prompts, skill instructions, slash command bodies, or timestamps. The AI interaction summary must only record clean human prompts, turn count, top tools executed, and files modified.

## Arguments
- `date` *(optional)*: Date in `YYYY-MM-DD` format (defaults to `today`).
- `idea_number` *(required)*: Idea number `1`-`5` that was implemented.
- `title` *(optional)*: Prototype title (defaults to idea title).
- `type` *(optional)*: `webapp`, `poetry`, `song`, `image`, `interactive` (default: `webapp`).
- `rank` *(optional)*: Integer preference rank (default: `1`).
- `time` *(optional)*: Hours spent (float, default: `2.0`).
- `ai_tools` *(optional)*: Stack / tools used.
- `url` *(optional)*: External URL or repository link.
- `summary` *(optional)*: 1-sentence hook / summary.
- `content` *(optional)*: Route (e.g. `/interactive/...`), payload, poem, or asset path.
- `steps` *(required from user)*: Process milestones provided by user.
- `rocked` *(required from user)*: User's bullet points on what went well.
- `broke` *(required from user)*: User's bullet points on issues and fixes.
- `interaction_summary` *(optional)*: Clean, leak-free AI interaction summary (or use `--auto-summary`).

## Workflow

### 1. Ask User for Retrospective & Steps
Before executing any recording script, ask the user:
> *"To complete the showcase entry for Day `YYYY-MM-DD` (Spark `#[N]`), please provide:*
> *1. **Process Steps:** What milestones or build steps should we log?*
> *2. **What Rocked:** What were the biggest wins or highlights?*
> *3. **What Broke & Fixed:** What issues, friction, or bugs occurred and how were they solved?*

### 2. Run Deterministic Recording Script
Save the implementation into SQLite and export to `ideas.json`:

```bash
uv run python scripts/save_implementation.py \
  --date <date_or_today> \
  --idea <1-5> \
  --title "<Prototype Title>" \
  --type <webapp|poetry|song|image|interactive> \
  --rank <rank> \
  --time <hours> \
  --ai-tools "<tools>" \
  --url "<url>" \
  --summary "<summary>" \
  --content "<content_or_route>" \
  --steps "<Step 1: Description\nStep 2: Description>" \
  --rocked "<Win 1\nWin 2>" \
  --broke "<Issue 1 and fix\nIssue 2 and fix>" \
  --auto-summary
```

Alternatively, pass a JSON payload file:
```bash
uv run python scripts/save_implementation.py --idea <1-5> --json-file <path_to_payload.json>
```

### 3. Verify
Verify the database record:
```bash
uv run python scripts/get_day_sparks.py --date <date_or_today> --idea <1-5>
```
Confirm to the user that the implementation has been recorded with links to view or edit the entry.
