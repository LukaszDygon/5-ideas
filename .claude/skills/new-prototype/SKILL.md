---
name: new-prototype
description: >-
  Scaffolds prototypes/<slug>/ (prototype.toml, a template extending base.html,
  empty static/) with the five-ideas CLI so the page is live at /interactive/<slug>.
  Use once a build spec is approved, before writing prototype code.
argument-hint: "<slug> [--date YYYY-MM-DD] [--type interactive]"
---

# New Prototype

Creates the folder for one prototype. Adds nothing beyond the scaffold.

## Workflow

1. Confirm slug (lowercase words joined by hyphens), title, date (default today), build type and a one-sentence description, usually from the approved `/spec-implementation` spec.
2. Scaffold:
   ```bash
   uv run five-ideas new-prototype --slug <slug> --title "<Title>" --date <date> --type <type> --description "<one sentence>"
   ```
   It refuses if the folder exists; pick another slug or edit the existing one.
3. Open `prototypes/<slug>/template.html` and build from there, following
   `.claude/rules/prototypes.md` (folder contract, assets, extra routes) and
   `.claude/rules/design-system.md` (or the `design-system` skill for snippets).
4. Check it: `uv run pytest -q tests/prototypes -k <slug>` and open `http://127.0.0.1:8000/interactive/<slug>`.

No other files need editing: the registry, the static build and the prototype tests pick the folder up automatically.
