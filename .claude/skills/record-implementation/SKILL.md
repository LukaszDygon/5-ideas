---
name: record-implementation
description: >-
  Records a finished prototype in the day's entry (Shipped Prototype & AI Process
  Details) with the user's own process steps and retrospective. Use after a build
  is done and the user wants it logged in the showcase database.
argument-hint: "[YYYY-MM-DD] <idea 1-5>"
---

# Record Implementation

Saves the shipped prototype into the database (which re-exports `data/ideas.json`).

## Core rules
- **Ask before generating:** never write the **process steps**, **what rocked** or **what broke** yourself. Ask the user for them first.
- **Leak-free summary:** never store raw transcripts, system prompts, skill bodies, slash-command text or timestamps. The AI interaction summary holds only clean human prompts, turn counts, tools used and files changed (see `/capture-implementation`).
- **Data only through the CLI:** do not edit `data/` by hand.

## Arguments
- `date` *(optional)*: `YYYY-MM-DD`, default `today`.
- `idea` *(required)*: the implemented idea number `1`-`5`.
- Optional: `title`, `type` (`webapp|poetry|song|image|interactive`), `rank`, `time` (hours), `ai-tools`, `url`, `summary`, `content` (for prototypes: `/interactive/<slug>`).
- From the user: `steps`, `rocked`, `broke`.

## Workflow

### 1. Ask for the retrospective
> *"To complete Day `YYYY-MM-DD` (spark `#N`), please give me:*
> *1. **Process steps:** the milestones or build steps to log.*
> *2. **What rocked:** the wins or highlights.*
> *3. **What broke & fixed:** the friction, bugs, and how you solved them."*

### 2. Save
```bash
uv run five-ideas save-impl \
  --date <date_or_today> --idea <1-5> \
  --title "<Prototype Title>" --type <type> --rank <rank> --time <hours> \
  --ai-tools "<tools>" --url "<url>" --summary "<one sentence>" \
  --content "/interactive/<slug>" \
  --steps "Step 1: Description
Step 2: Description" \
  --rocked "Win 1
Win 2" \
  --broke "Issue 1 and fix
Issue 2 and fix" \
  --auto-summary
```
For long text, write the fields to a JSON file in the scratchpad and pass `--json-file <path>` instead.

### 3. Verify
```bash
uv run five-ideas sparks --date <date_or_today> --idea <1-5>
```
Tell the user it is recorded, with the live page `/day/<date>` and the admin editor `/admin/day/<date>/edit`.
