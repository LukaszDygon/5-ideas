---
paths:
  - "**/*.html"
  - "**/*.css"
---

# Radical Memphis Pop design system

Reference page: `/design-system` (`templates/design_system.html`). Shared classes live in `static/style.css`; Tailwind (CDN) is configured in `templates/base.html` with the colour tokens below.

## The four rules

1. **Borders:** solid ink `#1c1b1b`, 3px (`border-[3px] border-ink`, `.neo-border`) or 4px (`border-[4px] border-ink`, `.neo-border-heavy`).
2. **Hard shadows only:** no blur, no frosted glass, no soft `shadow-lg`.
   Level 1 `4px 4px 0px #1c1b1b` (`.neo-shadow`), level 2 `6px 6px 0px` (`.neo-shadow-md`), level 3 `8px 8px 0px` (`.neo-shadow-lg`).
3. **Tactile physics:** buttons lift on hover and press flat on `:active`:
   `hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none` (built into `.neo-btn`).
4. **Colour tokens:**

| Token (Tailwind) | Hex | Role |
| :--- | :--- | :--- |
| `ink` | `#1c1b1b` | Text, borders, shadows |
| `canvas` | `#f5f3ef` | Page background (`.memphis-pattern` adds the dot grid) |
| `primary-magenta` / `neon-pink` | `#b40065` / `#ff1493` | Primary |
| `secondary-cyan` / `electric-cyan` | `#008190` / `#00e5ff` | Secondary |
| `tertiary-yellow` / `yellow-fixed` | `#fae100` / `#ffe243` | Tertiary |
| `acid-lime`, `vivid-orange` | `#39ff14`, `#ff5e00` | Accents |

## Components in `static/style.css`

`neo-btn` + `neo-btn-primary | neo-btn-secondary | neo-btn-yellow | neo-btn-lime | neo-btn-white`,
`neo-card`, `neo-badge`, `neo-input`, `neo-select`, `neo-textarea`, `neo-border`, `neo-border-heavy`,
`neo-shadow-sm | neo-shadow | neo-shadow-md | neo-shadow-lg`, `memphis-pattern`, `marquee-container` / `marquee-content`, `poetry-box`.

Fonts: `font-display` (Bricolage Grotesque) for headings, `font-body` (Space Grotesk), `font-mono` (JetBrains Mono) for labels.
Icons: Material Symbols (`<span class="material-symbols-outlined">bolt</span>`).
