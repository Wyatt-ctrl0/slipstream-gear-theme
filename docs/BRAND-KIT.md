# Slipstream Gear — Brand Kit (build source of truth)

**What it is:** an online store for **clever gadgets & gear for your vehicle** — the
problem-solver finds that fix the small annoyances of driving (organizers, detailing
tools, mounts, chargers, dashcams, trunk storage, comfort, road-trip kit). Forked from the
**Tend & Tool** theme (itself forked from SnagNest ← Molly & Sophie). We reuse the proven
cart / PDP buy-box / bundle / trust plumbing, the WCAG 2.1 AA baseline, and the clean
"living-layer" motion. We **retheme** the brand + content into the auto niche and convert
the neutral palette from warm cream to a cool garage aesthetic. We do NOT rebuild structure.

- **Name:** Slipstream Gear  (wordmark: **Slipstream** bold + **Gear** regular)
- **Domain:** slipstreamgear.com  (RDAP-verified available 2026-05-30)
- **Support email:** support@slipstreamgear.com
- **Social handles:** instagram.com/slipstreamgear · facebook.com/slipstreamgear · tiktok.com/@slipstreamgear

---

## 1. Palette tokens

Unlike Tend & Tool (which kept the cream neutrals and only swapped brand colors), Slipstream
needs a **cool garage** base — warm cream paper reads wrong for an auto-tech brand. So we
convert BOTH the neutrals and the brand colors. Charcoal + amber + cool grays, with a signal
blue as the info/secondary accent.

| Token (settings key) | Old (Tend & Tool) | New (Slipstream) | Role |
|---|---|---|---|
| `color_primary`    | `#3E6B43` | **`#FF6A3D`** | Amber — primary CTA fills, brand accent |
| `color_secondary`  | `#C9683E` | **`#2F6BFF`** | Signal blue — secondary buttons, info |
| `color_accent`     | `#2B2622` | **`#1F2328`** | Asphalt charcoal accent |
| `color_cream`      | `#F3E9D6` | **`#E9ECF1`** | Cool light-gray surface / cards |
| `color_mint`       | `#F0DCC0` | **`#DEE3EA`** | Chrome-tint alt tile bg |
| `color_text`       | `#2B2622` | **`#1F2328`** | Body + headings |
| `color_background` | `#FBF4E7` | **`#F4F5F7`** | Page (cool off-white) |

**Dark sections** (footer, dark bands, bundle spotlight if dark): bg `#1F2328`, text `#F4F5F7`.

### Contrast rules — READ THIS (amber and blue both have text traps)

This is the same class of trap as Tend & Tool's terracotta-as-text failure. The fills are fine;
the **text** uses of these colors are not. All verified against the page bg `#F4F5F7`.

- **btn-primary = amber `#FF6A3D` fill with CHARCOAL `#1F2328` text** (5.55:1 ✅).
  White text on amber is only 2.85:1 ❌. This is the **inverse** of Tend & Tool (which used
  white on green) — do NOT copy `#fff` onto the amber button.
- **btn-secondary = signal blue `#2F6BFF` fill with WHITE text** (4.50:1 ✅, exactly at the AA
  line — keep button text ≥ 16px/bold; do not tint it).
- **Amber as TEXT fails** (2.57:1 on off-white ❌). For any amber-colored text/eyebrows/links,
  use the darkened ember token **`--color-primary-text: #C2451E`** (4.6:1 ✅). Amber `#FF6A3D`
  is FILLS / large icons only.
- **Blue as TEXT fails** (`#2F6BFF` = 4.07:1 on off-white ❌). For blue text links use the
  darkened **`--color-secondary-text: #1F54D6`** (5.8:1 ✅).
- Body text `#1F2328` on `#F4F5F7` = ~15:1 ✅.

**Hard rule:** never regress WCAG 2.1 AA. Text ≥ 4.5:1; large bold (≥18.66px) & UI ≥ 3:1.
When changing any fill that carries text, recompute contrast and darken the fill if needed.
Retint every baked-in cream/green/terracotta hex in `theme.css` + `theme-v4.css` (grep first).

## 2. Type

Swap the warm Fraunces/Nunito spine for a **sporty squared** system that echoes the logo wordmark.
- **Headings:** Saira (or Chakra Petch) — squared, technical, fast. Bold weights for hero/section heads.
- **Body:** Inter — neutral, highly legible at small sizes.
- Load both via Google Fonts in `layout/theme.liquid`; remove the Caveat handwritten accent (garden residue).
- Keep the existing type-scale + responsive sizes; only the font families change.

## 3. Voice (inherited guardrails — enforce strictly)

Practical, driver-literate, a little sporty. Talk like someone who actually lives in their car and
has tested the gear on real commutes and road trips. Confident, not hype.
- **NO em-dashes** in any customer-facing copy (reads as AI-generated). Use periods, commas, or "and".
- **NO false / unverified claims** — no fake scarcity, no invented guarantees, no "tested by experts"
  unless true. Shipping/returns claims must be factual and match policy.
- Avoid filler: "vibrant", "crafted", "meticulously", "elevate", "game-changer", "revolutionary".
- Auto nouns over generic ones: "the cabin", "the trunk", "the dash", "the daily driver",
  "the long haul", "the glovebox", "the center console".

## 4. Homepage content (problem-solver buckets for car gear)

**Hero:** heading "Gear that makes every drive <em>better</em>" ·
sub "We hunt the gadgets and upgrades that actually fix the little annoyances of driving, then stock
only the ones worth the space in your glovebox." · CTA "Shop the gear" → /collections/all ·
badge "Free U.S. shipping over $50".

**Shop-by-need tiles (4):**
1. "Tame the Mess" — organizers, trunk storage, seat-gap fillers, trash. collection `organization`
2. "Clean & Detail" — detailing gadgets, brushes, mini vacuums. collection `detailing`
3. "Charged & Connected" — phone mounts, fast chargers, dashcams. collection `tech`
4. "Road-Trip Ready" — comfort, travel, emergency kit. collection `road-trip`

**Trust strip (4):** Free shipping $50+ / Ships from the USA · 14-day returns / See refund policy ·
"Road-tested picks" / New gear every month · Secure checkout / Powered by Shopify.
Use the theme's SVG glyph system (retheme the glyph set to auto — see §7).

**Featured collection:** eyebrow "Most Loved" · heading "This month's <em>most-installed</em> upgrades" ·
sub "The gear our drivers keep coming back to." · collection `best-sellers`.

**Bundles (bundle-spotlight, 3):**
- "The Tidy Cabin Kit" — organizers that clear the clutter. moment "Daily driver". savings honest or omit.
- "Detailer's Starter Kit" — showroom clean in your driveway. moment "Weekend wash".
- "Road-Trip Ready Kit" — everything for the long haul. moment "Before the trip".

**FAQ:** keep shipping / free-shipping / returns Qs (factual, matching policy). Replace the 4th with a
fitment one: "Will this fit my vehicle?" → note universal vs vehicle-specific fitment on each product.
Footer email → support@slipstreamgear.com.

## 5. About / story

A small crew tired of cheap car gadgets that break, rattle, or don't fit. They test gear in real daily
drivers and on real road trips, and stock only what earns its place in the cabin. Honest and specific.
No garden/pet/rescue content (Tend & Tool / M&S residue) anywhere. No fake founder lore.

## 6. Logo

Extracted, production-ready PNGs live in `brand/` (and copy to `theme/assets/`):
- `logo-lockup.png` — charcoal speed-lines + amber arrow + "SLIPSTREAM GEAR", transparent → **header** (light bg).
- `logo-lockup-light.png` — white version → **footer / dark sections**.
- `icon.png` / `icon-light.png` — the speed-lines + arrow mark alone → **favicon / app icon** (square).
The theme's text wordmark (`logo_text_part1`="Slipstream", `logo_text_part2`="Gear") is the safe default
and must render correctly even if the image is absent. Per [[use-real-brand-logo]] do NOT trace/redraw
the mark — wire the real PNGs.

## 7. Things to purge (Tend & Tool / SnagNest / M&S residue)

- **Palette:** every baked green `#3E6B43` / `#2F5234`, terracotta `#C9683E` / `#A8542F`, cream
  `#FBF4E7` / sand `#F3E9D6`, charcoal `#2B2622` → retint to the Slipstream scheme above. Grep first.
- **Glyphs:** the garden icon-glyph set (sprout / container / droplet / tool / leaf / bag) → an auto set
  (wheel / gauge / wrench / plug / road / box), `wheel` as the safe fallback. Remove `leaf` cases.
- **Motion / living-layer:** keep `.reveal`, `.blur-in`, `.hero-parallax`. The garden-specific
  `.unfurl` (leaf clip-path), `.leaf-sway`, `snippets/leaf-divider.liquid`, `.leaf-motif` →
  repurpose to a neutral/auto motif (e.g. a "speed-streak" divider) or remove. Keep `motion_intensity`
  setting + `prefers-reduced-motion` gating + `initLivingLayer()` re-run on `shopify:section:load`.
- **Copy:** any "Tend", "& Tool", garden framing ("grow", "beds", "borders", "the shed", "the season",
  "tested in real gardens") → auto equivalents. Any "Snag"/"Nest" or pet/dog/rescue residue → remove.
- **URLs/handles/email:** tendandtool.com / snagnest.com → slipstreamgear.com.
- **Fonts:** remove Fraunces / Nunito / Caveat loads; add Saira (or Chakra Petch) + Inter.

---

**Owner actions (Claude can't do):** buy slipstreamgear.com · create the separate-subscription
Shopify store · build on an unpublished draft theme and publish manually (same pattern as M&S /
SnagNest / Tend & Tool) · then upload via the themeFilesUpsert pattern and load products.
