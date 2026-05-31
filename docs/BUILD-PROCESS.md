# Build process

How the Slipstream Gear theme went from a static prototype to a production Shopify Online Store 2.0 theme.

## Starting point

A complete, hand-built **static prototype** (preserved in [`../prototype/`](../prototype/)): 9 pages of HTML, plus `slipstream.css` (~40 KB), `pages.css` (~36 KB), and `slipstream.js` (~30 KB) implementing the full design system, the velocity/aero motion language, a localStorage cart and wishlist, a client-side search, count-ups, and accordions.

The goal: turn it into a real Shopify theme **keeping everything intact** — same look, same motion, same copy — while replacing the mock data layer with genuine Shopify primitives.

## The loop

```
Foundation (by hand)
        │
        ▼
   Workflow ──►  Build (7 agents)  ──►  Review (4 agents)  ──►  Fix
        │                                                        │
        ▼                                                        ▼
   /redteam  ◄────────────────────────────────────────  verify & apply
        │
        ▼
  Node validation  (0 failures)  ──►  shippable theme
```

### 1. Foundation (hand-written)
The load-bearing contract every section depends on was written by hand for correctness: `layout/theme.liquid`, `config/settings_schema.json` + `settings_data.json`, `locales/en.default.json`, and the CSS/brand assets copied into `assets/`. This gave the parallel agents a stable base.

### 2. Build (Workflow, 7 parallel agents)
A [Workflow](workflow-orchestration.js) fanned the port across seven agents (snippets, `theme.js`, header/footer, homepage, product, collection, cart+pages). To keep the parallel outputs consistent, every agent shared a pinned brief:

- **Preserve fidelity** — keep every CSS class and `data-*` hook so the carried-over CSS and JS keep working.
- **Real data** — real product images (not the prototype's per-product SVG stand-ins); variant id (not product id) into the cart; the `money` filter on every price.
- **Progressive enhancement** — `{% form 'product' %}` and server-rendered pagination as the no-JS baseline; AJAX as enhancement.
- **Rewire the data layer** — cart `localStorage → /cart/*.js`; search → `/search/suggest.json`; newsletter/contact → real `{% form %}`; wishlist stays localStorage (Shopify has no wishlist primitive).
- **Guardrails** — no em-dashes, no false claims, AA contrast, the buy-box outline-button rule.

### 3. Review (Workflow, 4 adversarial agents)
Four reviewers attacked the result along separate axes (Liquid/schema, cart/variant correctness, design fidelity, template wiring) and reported confirmed, file-cited defects.

### 4. Fix — and the catch
The automated Fix agent **crashed on a session limit and applied nothing**, and the fidelity reviewer had crashed without reporting. This is exactly the failure mode the red-team exists to catch.

### 5. Red-team (`/redteam`)
A fresh `superpowers:code-reviewer` subagent — with no memory of the build — independently re-verified the theme, confirmed the real defects, and refuted the findings that were already correct. Its strongest catches were the dead PDP variant JS (wrong-variant-to-cart) and the missing `window.theme` config.

### 6. Apply + validate
All confirmed findings were applied by hand and re-verified with a Node validator that parses every section's `{% schema %}` as JSON, checks every template's section references resolve, detects stray comment tags / `{% include %}`, and bit-checks the PDP data-attribute contract against `theme.js`.

**Final result:** PDP hook alignment 255/255, full theme validation **0 failures**.

## Notable defects found & fixed

See the table in [SKILLS-AND-AGENTS.md](SKILLS-AND-AGENTS.md#what-the-reviewred-team-caught-and-how-it-was-fixed). The highest-severity were:

1. Two stray `{% endcomment %}` tags that would have broken the entire product page render.
2. PDP variant selection being inert (`data-product-json` vs `data-variant-json`, missing `data-product-form`) — would have added the wrong variant to cart on any multi-variant product.
3. Missing `window.theme` config (currency formatting + free-shipping bar).
4. Dead collection filtering/sorting (cards missing `data-cat`/`data-price`).
5. Missing `search` / `404` / generic `page` templates.

## Environment note

This build ran on a OneDrive-synced Windows desktop, where cloud-file hydration intermittently returned partial file reads and the binary `cp` truncated PNGs. The reliable verification channels turned out to be **`Write` (always persisted)**, **Node operating on real file bytes**, and **process exit codes**. Verification was done through those, not by eyeballing tool output. Re-run `shopify theme check` on a clean checkout before publishing.
