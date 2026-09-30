---
name: spec-implementation
description: >-
  Reads a day's five sparks (today by default), settles which idea to build, asks
  pointed technical questions, and confirms a short build spec before any code is
  written. Use when the user wants to start building a prototype for a day.
argument-hint: "[YYYY-MM-DD] [idea 1-5]"
---

# Spec Implementation

Turns a chosen spark into an approved build spec. Writes no code.

## Arguments
- `date` *(optional)*: `YYYY-MM-DD`, default `today`.
- `idea` *(optional)*: idea number `1`-`5`.

## Workflow

### 1. Read the day
```bash
uv run five-ideas sparks --date <date_or_today>              # the whole day
uv run five-ideas sparks --date <date_or_today> --idea <1-5> # one spark
```
If the day does not exist yet, stop and suggest `/new-day`.

If no idea was given:
- If an idea is already marked implemented, confirm whether that is the build.
- Otherwise list the five sparks and ask which one to build.

### 2. Clarify the build
Ask only what is still unclear:
- **Build type:** `webapp`, `poetry`, `song`, `image` or `interactive`.
- **Stack:** browser APIs or CDN libraries (see `.claude/rules/prototypes.md` for the allowed CDNs).
- **Core mechanic:** the one interaction or output that must work.
- **Out of scope:** what the first version deliberately skips.
- **Details:** extra API routes (`routes.py`), data files, pages (`extra_paths`).

### 3. Confirm the spec
Present:
- **Target idea:** `#N` — *Title*
- **Slug and URL:** `<slug>` → `/interactive/<slug>`
- **Build type and stack**
- **Core features and steps**
- **Out of scope**

Then ask: *"Does this spec look good? Reply **Proceed** to begin building."*
On approval, continue with `/new-prototype <slug>`.
