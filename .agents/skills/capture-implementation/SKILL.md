---
name: capture-implementation
description: >-
  Generates a leak-free AI interaction summary from conversation transcripts,
  and coordinates user-provided process steps and retrospective (What Rocked vs
  What Broke) for daily showcase recording.
---

# Capture Implementation Skill

This skill captures the journey of turning a raw idea into a shipped prototype. It generates a sanitized, leak-free **AI Interaction Summary** and coordinates user-provided architecture steps and retrospectives into a presentable showcase entry.

## Core Directives
- **Ask Before Generating:** NEVER fabricate the user's retrospective (**What Rocked** / **What Broke**) or **Process Steps**. Always ask the user directly for their input before finalizing the record.
- **Zero Leaks:** Never export raw transcripts containing system prompts, skill instructions, slash command bodies, or timestamps. The AI interaction summary must strictly capture clean human prompts, turn count, top tools executed, and files modified.

## Process

### Step 1: Ask User for Retrospective & Milestones
Ask the user directly:
> *"Please provide your reflections to record this prototype:*
> *1. **Process Steps:** Milestones or architecture steps.*
> *2. **What Rocked:** Your personal wins or highlights.*
> *3. **What Broke & Fixed:** Friction, bugs, and how they were resolved.*"

### Step 2: Extract Leak-Free AI Interaction Summary
Run `scripts/capture_process.py`:
```bash
uv run python scripts/capture_process.py --title "<Prototype Name>" --type <webapp|poetry|song|image|interactive>
```
Or use `--json` to prepare data for `save_implementation.py`.

### Step 3: Record to Database
Execute `save_implementation.py` with the user-provided steps and retrospective:
```bash
uv run python scripts/save_implementation.py \
  --date <YYYY-MM-DD> \
  --idea <1-5> \
  --title "<Title>" \
  --steps "<Step 1: Description\nStep 2: Description>" \
  --rocked "<Win 1\nWin 2>" \
  --broke "<Issue 1 and fix\nIssue 2 and fix>" \
  --auto-summary
```

---

## Output Template

```markdown
### How It Was Built in {X} Hours
- **Step 1: {Title}** — {Description}
- **Step 2: {Title}** — {Description}
- **Step 3: {Title}** — {Description}

### What Rocked vs What Broke (User Retrospective)
**What Rocked:**
- {Win 1}
- {Win 2}

**What Broke & Fixed:**
- {Issue 1 and fix}
- {Issue 2 and fix}

### AI Interaction Summary
- **Genesis Prompt:** "{Clean Prompt}"
- **Total Interaction Turns:** {N} human turns across {M} execution steps
- **Key Guidance Turns:**
  • Turn 2: {Clean snippet}
- **Tools Executed:** {Tool summary}
- **Files Modified:** {Files list}
```
