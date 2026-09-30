---
paths:
  - "prototypes/**"
---

# Prototype conventions

One prototype = one folder: `prototypes/<slug>/`. Nothing about a prototype lives outside it.

## Folder contract

```
prototypes/<slug>/
  prototype.toml   manifest (required)
  template.html    page template (required, name set by `template`)
  static/          js, css, data, media; served at /static/prototypes/<slug>/
  routes.py        optional extra API routes
```

`prototype.toml` keys:

| Key | Meaning |
| :--- | :--- |
| `slug` | Must equal the folder name. The page is served at `/interactive/<slug>` |
| `title` | Human title |
| `date` | Day it belongs to, `YYYY-MM-DD` |
| `build_type` | One of `webapp`, `poetry`, `song`, `image`, `interactive` |
| `template` | Template file name relative to the folder, usually `template.html` |
| `description` | One sentence |
| `extra_paths` | Extra pages, e.g. `["hardware"]` serves `/interactive/<slug>/hardware` from `hardware.html` |
| `routes` | `true` imports `routes.py` and includes its `router` |

## Templates

- Start with `{% extends "base.html" %}` and fill `{% block content %}`.
- Reference assets as `/static/prototypes/<slug>/...`; the static build rewrites root-relative URLs.
- Inline `<script>` up to ~200 lines; beyond that move it to `static/app.js` (and CSS to `static/style.css`).
- External scripts only from `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `unpkg.com`, `cdn.tailwindcss.com`.
- Pass server data to JS with `data-*` attributes or one `<script id="data" type="application/json">{{ value | tojson }}</script>`
  read via `JSON.parse(document.getElementById('data').textContent)`.

## Extra routes

`routes.py` exposes `router = APIRouter()`; keep paths under `/api/<slug>/...` and load files relative to `Path(__file__).parent`.
If the page needs server-side data, also define `page_context(request) -> dict`; its keys become template variables
(see `prototypes/which-is-faster/routes.py`). Registration, discovery and validation live in `showcase/registry.py`.
