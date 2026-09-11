---
name: record-implementation
description: >-
  Converts a completed prototype implementation into the daily showcase entry
  under 'Shipped Prototype & AI Process Details' in the database.
---

# Record Implementation

Converts a completed implementation into the daily entry under **Shipped Prototype & AI Process Details**.

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
- `steps` *(optional)*: Multi-line string (`Step Title: Step Description`) or JSON array.
- `rocked` *(optional)*: Bullet points of what went well.
- `broke` *(optional)*: Bullet points of issues encountered and fixes.
- `transcript` *(optional)*: Conversation transcript or key turns.
- `auto_transcript` *(optional)*: Auto-extract turns and tools from the latest transcript log.

## Workflow

### 1. Run Deterministic Recording Script
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
  --auto-transcript
```

Alternatively, pass a JSON payload file:
```bash
uv run python scripts/save_implementation.py --json-file <path_to_payload.json>
```

### 2. Verify
Verify the database record:
```bash
uv run python scripts/get_day_sparks.py --date <date_or_today> --idea <1-5>
```
Confirm to the user that the implementation has been recorded with links to view or edit the entry.
