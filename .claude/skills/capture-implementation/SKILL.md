---
name: capture-implementation
description: >-
  Produces a leak-free AI interaction summary (genesis prompt, turn count, tools,
  files changed) from the agent transcript and combines it with the user's own
  steps and retrospective for the showcase. Use when documenting how a prototype
  was built with AI.
argument-hint: "[--title \"Prototype\"] [--type interactive]"
---

# Capture Implementation

Documents the journey from spark to shipped prototype.

## Core rules
- **Ask before generating:** never invent the user's **process steps**, **what rocked** or **what broke**. Ask for them.
- **Zero leaks:** never export raw transcripts, system prompts, skill instructions, slash-command bodies or timestamps. Only clean human prompts, turn counts, top tools and files modified.

## Process

### 1. Ask for the retrospective
> *"Please give me your reflections for this prototype:*
> *1. **Process steps:** milestones or architecture steps.*
> *2. **What rocked:** your wins or highlights.*
> *3. **What broke & fixed:** friction, bugs, and how they were resolved."*

### 2. Summarise the transcript
```bash
uv run five-ideas capture --title "<Prototype Name>" --type <webapp|poetry|song|image|interactive>
uv run five-ideas capture --title "<Prototype Name>" --json > <scratchpad>/impl.json  # for save-impl
```
Read the output and check it contains no system or skill text before using it.

### 3. Record
Hand over to `/record-implementation` (or run `uv run five-ideas save-impl ... --auto-summary`) with the user's steps and retrospective.

## Output template

```markdown
### How It Was Built in {X} Hours
- **Step 1: {Title}** — {Description}

### What Rocked vs What Broke (User Retrospective)
**What Rocked:**
- {Win}

**What Broke & Fixed:**
- {Issue and fix}

### AI Interaction Summary
- **Genesis Prompt:** "{Clean prompt}"
- **Total Interaction Turns:** {N} human turns across {M} execution steps
- **Tools Executed:** {Tool summary}
- **Files Modified:** {Files}
```
