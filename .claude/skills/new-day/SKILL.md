---
name: new-day
description: >-
  Logs a new day in the showcase: theme, subtitle, mood notes and exactly five
  sparks, saved with the five-ideas CLI and shown back to the user. Use each
  morning before building. Never invents sparks; asks for anything missing.
argument-hint: "[YYYY-MM-DD] theme"
---

# New Day

Creates the day's entry so `/spec-implementation` can pick a spark.

## Rules
- **The sparks are the user's.** Ask for the theme and all five sparks if they were not given. Do not fill gaps with your own ideas unless the user explicitly asks for suggestions, and then label them as suggestions and get approval.
- Each spark needs a **title**; tagline, one-paragraph description and tags are optional but ask once.
- Data changes go through the CLI only; never edit `data/` by hand.

## Workflow

1. **Collect:** date (default today), theme, optional subtitle and mood notes, then sparks 1-5.
2. **Check the date is free:**
   ```bash
   uv run five-ideas sparks --date <date>
   ```
   If the day exists, show it and ask before overwriting; `--replace` also drops an already recorded prototype.
3. **Save.** Short sparks fit on the command line (`title|tagline|description|tags`, repeat `--idea` five times):
   ```bash
   uv run five-ideas new-day --date <date> --theme "<theme>" --subtitle "<subtitle>" --notes "<notes>" \
     --idea "Title 1|Tagline|Description|tag, tag" --idea "..." --idea "..." --idea "..." --idea "..."
   ```
   If any text contains `|` or is long, write a JSON file in the scratchpad instead:
   `{"date": "...", "theme": "...", "subtitle": "...", "notes": "...", "ideas": [{"title": "...", "tagline": "...", "description": "...", "tags": "..."}, ...]}`
   and run `uv run five-ideas new-day --json-file <path>`.
4. **Show it:** the command prints the stored day; point the user to `/day/<date>` and suggest `/spec-implementation <date>`.
