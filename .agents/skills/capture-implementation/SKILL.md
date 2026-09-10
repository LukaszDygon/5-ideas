---
name: capture-implementation
description: >-
  Generates a presentable summary of the implementation process from conversation
  transcripts, including initial prompts, human + computer turns, tech stack,
  architecture steps, and retrospective (What Rocked vs What Broke). Call at the
  end of an idea build process.
---

# Capture Implementation Skill

This skill captures the end-to-end journey of turning a raw idea into a shipped prototype with human and AI collaboration. It parses conversation transcripts and formats the genesis, interaction turns, architecture decisions, and retrospectives into a presentable showcase entry.

## When to Use

Activate this skill when:
- An idea implementation has just finished and you want to record the build.
- The user says:
  - "capture implementation"
  - "summarize the build process"
  - "generate implementation recap"
  - "record prompts and turns"
  - "/capture-implementation"
- You need to populate the `process_steps`, `what_rocked`, `what_broke`, and `prompt_transcript` fields for a daily showcase entry.

---

## Process

### Step 1: Locate the Current Conversation Transcript

Read the active conversation transcript from:
`<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`

Or run the helper script:
```bash
uv run python scripts/capture_process.py --title "<Prototype Name>" --type <webapp|poetry|song|image|interactive>
```

### Step 2: Extract Key Milestones

From the transcript, extract:
1. **Original Human Spark:** The exact initial prompt or problem statement.
2. **Iterative Turns:** Key back-and-forth decisions (clarifications, direction changes, model choices).
3. **Execution Footprint:** Files created/modified and tools executed.
4. **Architecture Steps (3-5 bulleted milestones):**
   - Step 1: Concept & minimal viable scope.
   - Step 2: Data model / core algorithms.
   - Step 3: UI / Design system presentation.
   - Step 4: Edge cases, tests, and polish.
5. **Retrospective:**
   - **What Rocked:** Surprising wins, speed breakthroughs, clean simplifications (e.g. stdlib vs 3rd party bloat).
   - **What Broke:** Latency issues, browser quirks, API constraints, and how they were fixed.

### Step 3: Produce Presentable Output

Format the recap into both:
1. **Showcase Markdown:** A formatted section ready for the Daily Deep-Dive view (`/day/{date}`) or an artifact.
2. **Database Record:** Save to `ideas.db` via `scripts/capture_process.py --json` or directly through `db.save_day(...)` / `PUT /api/implementations/{id}`.

---

## Output Template

```markdown
### How It Was Built With AI in {X} Hours
- **Step 1: {Title}** — {Description}
- **Step 2: {Title}** — {Description}
- **Step 3: {Title}** — {Description}
- **Step 4: {Title}** — {Description}

### What Rocked vs What Broke
**What Rocked:**
- {Win 1}
- {Win 2}

**What Broke & Fixed:**
- {Issue 1 and fix}
- {Issue 2 and fix}

### Original Prompts & Turns
- **Genesis Prompt:** "{Prompt}"
- **Total Interaction Turns:** {N} turns
```
