---
name: design-system
description: >-
  Radical Memphis Pop UI reference: colour tokens, the four rules (ink borders,
  hard zero-blur shadows, press physics, saturated palette) and copy-paste HTML
  snippets for a hero card, neo button, stat tile, section header, badge and
  two-column layout. Use when building or reviewing any page or prototype UI.
---

# Design System: Radical Memphis Pop

Live reference: `/design-system` (`templates/design_system.html`). Shared classes: `static/style.css`. Tailwind tokens: `templates/base.html`.

## The four rules
1. **Ink borders:** `border-[3px] border-ink` or `border-[4px] border-ink` (`#1c1b1b`). No thin grey borders.
2. **Hard shadows only:** `shadow-[4px_4px_0px_#1c1b1b]`, `6px`, `8px`. Never blur, glow, glass or `shadow-lg`.
3. **Press physics:** `.neo-btn` lifts on hover and collapses on `:active`; custom buttons use
   `hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none`.
4. **Saturated palette:** `primary-magenta #b40065` / `neon-pink #ff1493`, `secondary-cyan #008190` / `electric-cyan #00e5ff`,
   `tertiary-yellow #fae100`, `acid-lime #39ff14`, `vivid-orange #ff5e00` on `canvas #f5f3ef` with ink `#1c1b1b` text.

Fonts: `font-display` (Bricolage Grotesque) headings, `font-body` (Space Grotesk), `font-mono` (JetBrains Mono) labels. Icons: `<span class="material-symbols-outlined">bolt</span>`.

## Snippets

**Hero card**
```html
<section class="bg-primary-magenta text-white border-[4px] border-ink shadow-[6px_6px_0px_#1c1b1b] p-6 md:p-8">
  <div class="inline-flex items-center gap-2 bg-tertiary-yellow text-ink px-3 py-1 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#1c1b1b] -rotate-1 mb-3">KICKER // LABEL</div>
  <h1 class="font-display font-black text-3xl sm:text-5xl uppercase leading-none tracking-tight">Big Title</h1>
  <p class="font-body text-base text-white/90 max-w-2xl mt-2">One or two sentences.</p>
</section>
```

**Neo button** (variants: `neo-btn-primary | -secondary | -yellow | -lime | -white`)
```html
<button type="button" class="neo-btn neo-btn-primary">
  <span class="material-symbols-outlined">rocket_launch</span><span>Primary Action</span>
</button>
```

**Stat tile**
```html
<div class="bg-electric-cyan border-[4px] border-ink shadow-[5px_5px_0px_#1c1b1b] p-5 flex items-center justify-between hover:-translate-y-1 transition-transform">
  <div>
    <div class="font-mono text-xs font-bold uppercase tracking-wider text-ink">Total Ideas</div>
    <div class="font-display text-4xl font-black text-ink">42</div>
  </div>
  <span class="material-symbols-outlined text-4xl text-ink">lightbulb</span>
</div>
```

**Section header**
```html
<section class="bg-white border-[4px] border-ink shadow-[6px_6px_0px_#1c1b1b] p-6 flex flex-col gap-4">
  <div class="border-b-[3px] border-ink pb-2 flex items-center justify-between">
    <h2 class="font-display font-black text-2xl uppercase text-ink">01. Section Title</h2>
    <span class="font-mono text-xs font-bold text-gray-600">Side note</span>
  </div>
  <!-- content -->
</section>
```

**Badge**
```html
<span class="neo-badge bg-tertiary-yellow text-ink">STREAK #7</span>
```

**Two-column layout**
```html
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div class="neo-card p-6">Left</div>
  <div class="neo-card p-6">Right</div>
</div>
```
