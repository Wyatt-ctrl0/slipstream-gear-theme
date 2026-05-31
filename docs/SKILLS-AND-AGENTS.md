# Skills & Agents used to build this theme

This theme was produced inside [Claude Code](https://claude.com/claude-code) using a combination of **skills** (reusable expert playbooks) and **agents** (subagents dispatched to do focused work in parallel). This document records exactly what was used and what each did, so the process is reproducible.

---

## Skills

| Skill | Role in this build |
|---|---|
| **`superpowers:using-superpowers`** | Session bootstrap. Establishes the discipline of invoking the right skill before acting. |
| **`shopify-theme-dev`** | The implementation backbone. Provided the Online Store 2.0 architecture reference: theme file structure, JSON templates, section `{% schema %}` + blocks + presets, snippets, `settings_schema.json`, and layout conventions. Every section and template follows its patterns. |
| **`redteam`** | Adversarial review. Dispatched a fresh reviewer with zero prior context to attack the ported theme and verify (or refute) the fix claims — the independent second opinion that caught what the build pass missed. |
| **Workflow** (orchestration tool) | Not a skill per se, but the engine that ran the multi-agent build → review → fix pipeline deterministically. The exact script is in [`workflow-orchestration.js`](workflow-orchestration.js). |

---

## Agents

The build was orchestrated by the **Workflow** tool, which spawned subagents in three phases, plus a standalone red-team agent.

### Phase 1 — Build (7 parallel agents)
Each agent owned a coherent slice of the port and wrote real Liquid files. All shared a pinned set of conventions and data-attribute contracts so the outputs interoperated.

| Agent | Produced |
|---|---|
| **snippets** | `product-card.liquid`, `cart-drawer.liquid`, `search-overlay.liquid` |
| **theme.js** | Ported the prototype's vanilla JS; kept reveal/marquee/header/drawer/FAQ/count-up/save intact; rewired cart to Shopify AJAX and search to predictive search |
| **header + footer** | `header.liquid`, `footer.liquid`, `announcement-bar.liquid` |
| **homepage** | hero, marquee, shop-by-need, featured-collection, interstitial, bundle, proof, faq, newsletter + `templates/index.json` |
| **product** | `main-product.liquid` + `templates/product.json` |
| **collection** | `main-collection.liquid` + `templates/collection.json` |
| **cart + pages** | `main-cart.liquid`, about/contact/faq/shipping-returns/wishlist sections + their JSON templates |

### Phase 2 — Review (4 parallel adversarial agents)
Each read the freshly built files and reported confirmed, file-cited defects only.

| Reviewer | Focus |
|---|---|
| **review:liquid** | Schema validity (strict JSON, unique ids, presets), `{% render %}` vs `{% include %}`, `asset_url`, closed `{% paginate %}`/`{% form %}`, template→section resolution |
| **review:cart** | Variant id (not product id) to cart, no-JS form baseline, money filter on all dynamic paths, AJAX endpoints, badge/drawer/sticky-bar sync, data-attribute contract match with `theme.js` |
| **review:fidelity** | Class + data-attribute preservation, decorative SVGs, palette/contrast, reduced-motion, copy guardrails |
| **review:wiring** | Template completeness, nav routes, merchant-editable settings, missing files |

### Phase 3 — Fix (1 agent)
A single agent meant to apply all confirmed findings.

### Red-team — `superpowers:code-reviewer`
A standalone adversarial subagent (dispatched by the `redteam` skill) that independently verified the theme against the same five dimensions, confirmed which review findings were real, and refuted the ones that were already correct.

---

## What the review/red-team caught (and how it was fixed)

The Workflow's automated **Fix phase hit a session limit and applied nothing**, and the fidelity reviewer crashed without reporting — so the findings were re-verified by the red-team and applied by hand, then re-checked with a Node validator. Confirmed and fixed:

- **`window.theme` config was never emitted** → drawer free-shipping bar blanked out and money used a hardcoded `$`. Added the config script to `layout/theme.liquid`.
- **PDP variant JS was dead** → variant `<script>` used `data-product-json` (JS reads `data-variant-json`) and the form lacked `data-product-form`; multi-variant products would have added the **wrong variant** to cart. Renamed + added the hook; aligned the quantity stepper to `data-qty-dec`/`data-qty-inc`, the gallery to `[data-gallery-main]`/`.pdp-thumb[data-full]`, and the price to `.pdp-price .price`.
- **Collection filter + sort were dead** → product cards lacked `data-cat` / `data-price`. Emitted them from `product.type` and `product.price`.
- **Two stray `{% endcomment %}` tags** would have broken the PDP render entirely. Removed.
- **Cart-drawer line race** → server-rendered lines lacked `data-line`. Added.
- **Missing templates** → no `search.json`, `404.json`, or generic `page.json`, so those routes dropped the theme chrome. Added all three with matching sections.

Final automated check: PDP hook alignment 255/255, full theme validation 0 failures.

---

## Reproducing this

1. Open the prototype (`../prototype/`) and this theme in Claude Code.
2. Invoke the `shopify-theme-dev` skill for architecture, then run the Workflow in [`workflow-orchestration.js`](workflow-orchestration.js) (adjust the absolute paths at the top).
3. Run `/redteam` on the output and apply the findings.
4. Validate with `shopify theme check` before publishing.
