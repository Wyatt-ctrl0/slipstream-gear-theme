# Slipstream Gear — Shopify Theme

A production [Shopify Online Store 2.0](https://shopify.dev/docs/storefronts/themes/architecture) Liquid theme for **Slipstream Gear**, a store for clever gadgets and gear for the daily driver (car organizers, detailing, mounts, fast chargers, dashcams, road-trip kit).

The look is **"big type, speed slash"** on a racing-red palette: oversized uppercase display type, a skewed red speed-slash, cinematic dark sections, and a velocity/aero motion language (streak reveals, headlight sweep, count-ups) that is fully reduced-motion safe.

This theme was ported, one-to-one, from a hand-built static prototype (kept in [`prototype/`](prototype/)) into real, merchant-editable Liquid. Every CSS class and JS hook from the prototype was preserved so the original design and motion carry over intact, while the data layer was rewired to real Shopify primitives.

---

## What's in this repo

```
slipstream-gear-theme/
├── theme/            # ← the deliverable: upload this folder to Shopify
│   ├── assets/       # slipstream.css, pages.css, theme.js, brand PNGs
│   ├── config/       # settings_schema.json, settings_data.json
│   ├── layout/       # theme.liquid
│   ├── locales/      # en.default.json
│   ├── sections/     # 23 sections (header, footer, hero, product, collection, cart, …)
│   ├── snippets/     # product-card, cart-drawer, search-overlay
│   └── templates/    # 12 JSON templates (index, product, collection, cart, search, 404, pages)
├── prototype/        # the original static HTML/CSS/JS the theme was ported from
├── brand/            # logo lockups + favicons (source PNGs)
└── docs/
    ├── BUILD-PROCESS.md          # how it was built (build → review → fix → red-team)
    ├── SKILLS-AND-AGENTS.md      # the Claude Code skills & agents used
    ├── workflow-orchestration.js # the actual multi-agent Workflow script that built it
    └── BRAND-KIT.md              # palette, type, voice, logo source-of-truth
```

---

## The theme

**Online Store 2.0** — JSON templates, sections everywhere, blocks for merchant-editable content, full Theme Editor support (every section has a `{% schema %}` + presets).

**Storefront features**
- **Homepage**: hero (big-type + speed-slash), trust marquee, shop-by-problem lanes, featured collection, dark interstitial, starter-kit bundle, count-up proof stats, FAQ accordion, newsletter.
- **Product (PDP)**: media gallery + thumbnails, variant picker, quantity stepper, AJAX add-to-cart with a no-JS `{% form 'product' %}` baseline, spec table (metafields), trust pills, cross-sell, bundle band, and a sticky mobile buy-bar.
- **Collection**: dark hero, category filter chips, sort, product grid with pagination.
- **Cart**: slide-out drawer **and** full cart page, both on Shopify AJAX (`/cart/add.js`, `/cart/change.js`, `/cart.js`) with a free-shipping progress bar.
- **Search**: predictive search overlay (`/search/suggest.json`) plus a themed results page.
- **Pages**: about, contact (real `{% form 'contact' %}`), FAQ, shipping & returns, wishlist (localStorage), a generic page fallback, and a themed 404.

**Built-in guardrails** (carried from the brand): no em-dashes in customer copy, no fake reviews / fake scarcity / unverified guarantees, AA-checked racing-red contrast, and the buy-box rule (secondary CTAs use the outline button next to a primary add-to-cart).

---

## Install

### Option A — Shopify CLI (recommended)
```bash
cd theme
shopify theme check        # lint
shopify theme dev --store your-store.myshopify.com   # live local preview
shopify theme push --unpublished                     # upload as a draft
```

### Option B — Admin upload
Zip the **contents of `theme/`** (so `layout/`, `sections/`, etc. are at the zip root) and upload via **Online Store → Themes → Add theme → Upload zip file**. Keep it as an unpublished draft until you've reviewed it.

> Always upload to an **unpublished draft** and preview before publishing.

## Setup after install
1. **Theme settings** → set the logo, favicon, free-shipping threshold, and social links. The racing-red palette is preset.
2. **Navigation** → create a `main-menu` linklist (the header falls back to sensible defaults if absent).
3. **Products** → add products and, for full fidelity, these metafields:
   - `custom.spec_tags` — list of short spec chips (e.g. `2K / 60fps`, `140° FOV`)
   - `custom.spec_table` — list of label/value rows for the PDP spec table
   - `custom.lead` — a one-line product lead
   - `custom.complementary_products` — product list for cross-sell
   - **Product type** drives the collection filter chips (`mess` / `clean` / `charged` / `road`).

---

## How it was built

This theme was built and reviewed by an autonomous multi-agent pipeline in Claude Code: a **Workflow** fanned the port across parallel build agents, adversarial reviewers attacked the result, and a separate **red-team** pass verified the fixes. The full story, the skills and agents involved, and the orchestration script are in [`docs/`](docs/):

- [`docs/BUILD-PROCESS.md`](docs/BUILD-PROCESS.md) — the build → review → fix → red-team loop and what each pass caught.
- [`docs/SKILLS-AND-AGENTS.md`](docs/SKILLS-AND-AGENTS.md) — every Claude Code skill and agent used, and what each did.
- [`docs/workflow-orchestration.js`](docs/workflow-orchestration.js) — the actual Workflow script that generated the theme.

---

© Slipstream Gear. All rights reserved. Built with [Claude Code](https://claude.com/claude-code).
