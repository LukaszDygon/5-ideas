# AGENTS.md

Instructions and index for AI agents working in the **5 Ideas Daily Showcase** repository.

## Core Directives
- **Simplicity First:** Standard library before external packages, native browser APIs before dependencies, and minimal code.
- **Reference Docs:** Do not duplicate full project documentation here. Refer to the table below to locate detailed guides when needed.
- **Verify:** Always run `uv run pytest` after modifying code.

## Documentation Index

| Context / Task | Reference | When to Look |
| :--- | :--- | :--- |
| **Tech Stack & Commands** | [README.md](README.md) | Running the app, routes, CLI scripts, and developer commands |
| **Design System & Styling** | [README.md#design-system-rules-radical-memphis-pop](README.md#design-system-rules-radical-memphis-pop) & [templates/design_system.html](templates/design_system.html) | Borders, hard shadows, active button physics, and color tokens |
| **Idea Planning & Spec** | [.agents/skills/spec-implementation/SKILL.md](.agents/skills/spec-implementation/SKILL.md) | Reading day sparks, selecting an idea, asking tech questions, confirming spec |
| **Prototype Recording** | [.agents/skills/record-implementation/SKILL.md](.agents/skills/record-implementation/SKILL.md) | Saving shipped prototype, process steps, and retrospective to database |
| **AI Interaction Summaries** | [.agents/skills/capture-implementation/SKILL.md](.agents/skills/capture-implementation/SKILL.md) | Generating leak-free AI interaction summary from conversation logs |
| **Data Layer & SQLite** | [db.py](db.py) | Schema for `days`, `ideas`, and `implementations` tables |
| **Web & Admin Apps** | [app.py](app.py) & [admin.py](admin.py) | FastAPI public views and Flask content management |
