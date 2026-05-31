export const meta = {
  name: 'slipstream-liquid-port',
  description: 'Port the Slipstream Gear static prototype into a production Shopify Online Store 2.0 Liquid theme, then adversarially review and fix',
  phases: [
    { title: 'Build', detail: 'snippets, theme.js, header/footer, homepage, product, collection, cart, standard pages' },
    { title: 'Review', detail: 'parallel adversarial reviewers: liquid correctness, cart/variant, design fidelity, template wiring' },
    { title: 'Fix', detail: 'apply confirmed findings' },
  ],
}

const ROOT = 'C:/Users/1200g/OneDrive/Desktop/Shopify Theme/dropops-command-center/output/slipstream'
const THEME = `${ROOT}/theme`
const SRC = `${ROOT}/preview`

const CONVENTIONS = `
You are porting a STATIC HTML/CSS/JS prototype into a production Shopify Online Store 2.0 (OS 2.0) Liquid theme.

PATHS (use absolute paths for every file op):
- Theme root: ${THEME}
- Source prototype: ${SRC} (HTML pages: index.html, collection.html, product.html, cart.html, about.html, contact.html, faq.html, shipping-returns.html, wishlist.html). Source assets: ${SRC}/assets (slipstream.css, pages.css, slipstream.js, page-collection.js, page-product.js, page-cart.js, page-wishlist.js).
- READ the specific source file(s) named in your task and reproduce their markup faithfully as Liquid.
- The foundation already exists and is DONE: ${THEME}/layout/theme.liquid, ${THEME}/config/settings_schema.json, ${THEME}/config/settings_data.json, ${THEME}/locales/en.default.json, and ${THEME}/assets/{slipstream.css,pages.css,logo-lockup.png,logo-lockup-light.png,icon.png,icon-light.png}. Do NOT recreate these. theme.liquid already renders {% section 'header' %}, {{ content_for_layout }}, {% section 'footer' %}, {% render 'cart-drawer' %}, {% render 'search-overlay' %}, and loads slipstream.css + pages.css + theme.js.

HARD RULES:
- Sections (sections/*.liquid) MUST end with a valid {% schema %} (strict JSON: no comments, no trailing commas, unique stable ids) and include a "presets" array so they are insertable in the Theme Editor.
- Use {% render %} (isolated scope), never the deprecated {% include %}.
- Reference assets via filters: {{ 'file.css' | asset_url }}, {{ 'logo.png' | asset_url }}, {{ image | image_url: width: 800 | image_tag }}. Never hardcode /assets/ paths.
- Money: ALWAYS use the money filter ({{ product.price | money }}). Never do arithmetic on raw cents.
- Cart: the VARIANT id (product.selected_or_first_available_variant.id), not the product id, goes into the cart. Add-to-cart MUST work without JS via {% form 'product', product %} as the baseline, then be enhanced by data attributes.
- PRESERVE FIDELITY: keep EVERY CSS class name and EVERY data-* attribute from the source HTML exactly, so the existing CSS (slipstream.css/pages.css) and the ported theme.js keep working. Do not rename classes.
- Preserve decorative inline SVG art (hero speed-slash, dividers, section icons, save-heart path M12 21C12 21 4 15.5 4 9.5A4.5 4.5 0 0 1 12 7A4.5 4.5 0 0 1 20 9.5C20 15.5 12 21 12 21Z). For PRODUCT imagery use real product images (product.featured_image / media), NOT the prototype's per-product SVG stand-ins; provide a graceful empty/placeholder state.
- Extract merchant-facing content (headings, body copy, button labels, links, images) into schema settings or blocks. Hardcode only structural markup.
- COPY GUARDRAILS: no em-dashes (U+2014) in any customer-facing copy. No false claims, no fake reviews, no fake scarcity, no unverified guarantees. Keep the prototype's honest, policy-based copy ("Reviews open after launch", "road-tested", "Free U.S. shipping over $50", "14-day returns").
- Theme settings available: settings.logo_light, settings.logo_dark, settings.logo_width, settings.favicon, settings.color_accent, settings.color_accent_text, settings.color_ink, settings.show_free_shipping_bar, settings.free_shipping_threshold, settings.social_instagram/tiktok/youtube/facebook.

PALETTE (racing red): page bg #FFFFFF, surface #F2F2F4, ink/dark #0B0C0E / #131418, accent racing red #E11D2A (CTA fills; button text on red = dark #131418), red-as-text uses ember #C20F1B (CSS var --ember), info chip graphite #2E333A. Token names in CSS are legacy (--amber holds red). btn-amber = red fill (primary ATC); btn-outline = outline (bundle CTA when adjacent to a primary ATC). Do not change these.
`

const CONTRACTS = `
SHARED SNIPPET / DATA-ATTRIBUTE CONTRACTS (every agent must follow these EXACTLY so files interoperate):

snippets/product-card.liquid  — call: {% render 'product-card', product: product %}
  Renders <article class="pcard" data-reveal> matching ${SRC}/index.html .pcard markup:
  - a <a class="pcard-link" href="{{ product.url }}" aria-label="{{ product.title }}"></a>
  - <div class="pimg"> containing:
      * a save button: <button class="save-toggle save-corner" type="button" aria-pressed="false" aria-label="Save {{ product.title }} to wishlist" data-save data-id="{{ product.handle }}"> with the save-heart SVG path above.
      * the product image: {{ product.featured_image | image_url: width: 480 | image_tag: loading: 'lazy', class: 'prod', alt: product.title }} (graceful when no image).
  - <div class="pbody"> with <h3 class="ttl">{{ product.title }}</h3>, optional <div class="spectags"> of up to 3 <span> from product.metafields.custom.spec_tags (a list metafield; render nothing if blank), and <div class="prow"> with <span class="price">{{ product.price | money }}</span> and an Add button:
      <button class="add" data-add data-variant-id="{{ product.selected_or_first_available_variant.id }}" data-product-title="{{ product.title | escape }}" data-product-price="{{ product.price | money }}" {% unless product.available %}disabled{% endunless %}>{% if product.available %}Add{% else %}Sold out{% endif %}</button>

snippets/cart-drawer.liquid — no params; reads the global {{ cart }} object. Slide-out cart with class hooks the JS toggles: a container with [data-cart-drawer], a list of lines (each with [data-line-item], qty steppers [data-cart-minus]/[data-cart-plus]/[data-qty-input], remove [data-cart-remove] carrying the 1-based line index, line price via money), subtotal element [data-cart-subtotal] = {{ cart.total_price | money }}, a free-shipping progress line gated by settings.show_free_shipping_bar + settings.free_shipping_threshold, a "View full cart" link to {{ routes.cart_url }}, and a Checkout button (name="checkout" form action {{ routes.cart_url }} OR a link to /checkout). Empty state when cart.item_count == 0.

snippets/search-overlay.liquid — no params. Search overlay shell: a <form action="{{ routes.search_url }}" method="get" role="search"> with name="q" input [data-search-input], a results container [data-search-results] with role="status" aria-live="polite". theme.js wires predictive search via /search/suggest.json.

theme.js data hooks it expects (preserve these names): [data-reveal], [data-reveal-group], [data-marquee], [data-header], [data-drawer]/[data-drawer-toggle]/[data-drawer-close], [data-cart-btn] + .cart-dot (badge; .cart-dot[hidden] hidden), [data-cart-live] (sr live region in layout), [data-add] (+ data-variant-id/data-product-title/data-product-price), [data-save]/data-id, [data-countup], .qa-q (FAQ), search button [aria-label="Search"], [data-fakeform]/[data-toast] (newsletter/contact non-Shopify forms keep this), product page [data-qty-input], sticky buy-bar [.bb-name/.bb-price].
`

phase('Build')

const build = [
  {
    label: 'snippets',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Create the three shared snippets in ${THEME}/snippets/:
1) product-card.liquid per the contract above. READ ${SRC}/index.html (the .pcard markup) and ${SRC}/collection.html to match classes exactly.
2) cart-drawer.liquid per the contract. READ ${SRC}/cart.html and ${SRC}/assets/page-cart.js to mirror the drawer/full-cart structure and classes, but bind to the real {{ cart }} object and {{ routes.cart_url }}. Include the free-shipping progress line.
3) search-overlay.liquid per the contract. READ ${SRC}/index.html header search markup.
Also create snippets/icon.liquid ONLY if helpful for reused inline SVGs (optional). Write real files. Report the files you created and any contract deviations.`
  },
  {
    label: 'theme.js',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Port the prototype JS into ${THEME}/assets/theme.js (a single file loaded by layout/theme.liquid).
READ ${SRC}/assets/slipstream.js fully, plus ${SRC}/assets/page-collection.js, page-product.js, page-cart.js, page-wishlist.js.
Keep these behaviors INTACT (copy logic, preserve selectors): setupReveal, setupMarquee, setupHeader (solid near-black header + red hairline/shadow on scroll), setupDrawer (with inert sync + focus trap), setupCountups, setupFAQ, setupSave (localStorage wishlist keyed by product handle in data-id; wishlist has no Shopify primitive so keep localStorage), reduced-motion guards, focus traps (trapTab), unified syncInert()/closeOverlays() across drawer+cart+search, body scroll-lock.
REWIRE to Shopify (this is the important part):
- setupCart: replace the localStorage cart with Shopify AJAX cart. On [data-add] click: POST /cart/add.js {items:[{id: Number(data-variant-id), quantity}]} (read qty from [data-qty-input] when present, else 1), then refresh the cart drawer + badge. Refresh by GET /cart.js (update [data-cart-subtotal], .cart-dot count, free-shipping progress) and re-render line items, OR use the Section Rendering API (fetch \`/?sections=cart-drawer\`) if a section is available — /cart.js + DOM update is acceptable. Qty steppers in the drawer call /cart/change.js {line, quantity} (1-based). Remove calls /cart/change.js quantity:0. Announce via [data-cart-live]. Open the drawer on add. Keep the cart-dot[hidden] toggle behavior. Update the sticky PDP buy-bar (.bb-name/.bb-price) and badge consistently. Preserve graceful failure (catch → user-visible message, never silent).
- setupSearch: replace the hardcoded CATALOG with Shopify predictive search: debounce input, fetch \`/search/suggest.json?q=\${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6\`, render results (title, price, thumbnail, link) into [data-search-results] with role=status; link the form to /search.
- Collection page (guard by element presence): keep the client-side category filter chips (filter rendered .pcard by a data-cat attribute — collection cards must carry data-cat), sort (reorder by reading data-price), and load-more if present. If server-side pagination is simpler/more correct for Shopify, prefer Liquid pagination and make load-more progressive-enhancement only.
- Product page: variant selection (map option selects -> variant id, update price/availability/ATC data-variant-id), qty stepper [data-qty-input] +/-, sticky mobile buy-bar that is correctly inert+disabled when hidden.
Wrap in the same IIFE/DOMContentLoaded structure. No console errors. Report the file and the Shopify endpoints you wired.`
  },
  {
    label: 'header+footer',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Build ${THEME}/sections/header.liquid and ${THEME}/sections/footer.liquid.
READ ${SRC}/index.html (header, mobile drawer, footer) and ${SRC}/_shared/header-footer.html.
HEADER: solid near-black sticky header [data-header] with brand logo (img src from settings.logo_light | image_url, fallback to {{ 'logo-lockup-light.png' | asset_url }}; width settings.logo_width). Primary nav from a linklist setting (linklist id "menu", default linklist 'main-menu') with a graceful hardcoded fallback (Shop All -> /collections/all, Shop by Problem -> /#need, Our Story -> /pages/about, FAQ -> /pages/faq). Action icons: search button (aria-label Search), wishlist link to /pages/wishlist, cart link [data-cart-btn] to {{ routes.cart_url }} with .cart-dot badge bound to {{ cart.item_count }} (hidden attr when 0; include .cart-dot[hidden] handled by CSS already), burger [data-drawer-toggle]. Mobile drawer [data-drawer] mirroring nav. Keep the marquee/ribbon as its OWN section (announcement-bar) OR include it here — your call, but if separate make it sections/announcement-bar.liquid with blocks for each message; the homepage ribbon in index.html should map to it.
FOOTER: 4 link columns as BLOCKS (heading + menu/links), brand column with logo + tagline (settings), social icons from settings.social_*, bottom bar copyright using {{ shop.name }} and "Secure checkout. Powered by Shopify". Match classes (.site-footer,.fgrid,.fcol,.fbrand,.foot-logo,.fbar).
Both sections need {% schema %} + presets. Header/footer are typically in layout but here they are sections; give them sensible settings. Write real files; report them.`
  },
  {
    label: 'homepage',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Build all homepage sections + ${THEME}/templates/index.json.
READ ${SRC}/index.html fully. Create one section file per band in ${THEME}/sections/, each with {% schema %} + presets, content extracted to settings/blocks:
- hero.liquid  (hero-c "Big Type / Speed Slash": eyebrow, h1 with <em> emphasis, sub, two CTAs (btn-amber + btn-ghost), spec row of 3 items as blocks or settings, .hc-slash + .hc-mark decorative SVG/markup preserved, data-hero entrance attrs preserved).
- shop-by-need.liquid  (#need; kicker+heading; 4 lane tiles as BLOCKS: number, title, body, link to a collection (collection setting or url). Map default links to /collections/all?... or collection settings.)
- featured-collection.liquid  (#picks "Cabin-ready picks": kicker+heading + a "collection" setting; loop collection.products limited by a "products_to_show" range, render {% render 'product-card', product: product %}. If no collection chosen, show a helpful empty state.)
- interstitial.liquid (dark band: kicker, heading, lead, info-chip, foot line, decorative dash SVG preserved).
- bundle.liquid (#kit "The starter kit": items row (blocks: label + inline svg/image), bundle-buy panel: eyebrow, price + compare-at, note, primary btn-amber "Add the kit" (data-add wired to a chosen bundle product/variant via a "product" setting) + btn-outline secondary. Respect the buy-box rule: bundle CTA stays btn-outline only as the SECONDARY; the primary "Add the kit" is btn-amber.)
- proof.liquid (count-up stats as blocks with data-countup; honest proof-note copy "Reviews open after launch...").
- faq.liquid (accordion; Q&A as blocks; .qa/.qa-q[aria-expanded]/.qa-a[hidden] structure preserved for the JS).
- newsletter.liquid (band; use {% form 'customer' %} so it subscribes real emails to Shopify, keeping .news-form classes; keep a .form-msg success line. Note: this replaces the prototype's data-fakeform for the newsletter.)
- marquee/ribbon: if header agent did not make announcement-bar, create sections/marquee.liquid here (data-marquee track of message blocks).
Then write templates/index.json composing them in the source order: header is layout-level (skip), then hero, marquee/announcement (if a section), shop-by-need, featured-collection, interstitial, bundle, proof, faq, newsletter. Use the exact section "type" = filename without .liquid. Report files + the index.json order.`
  },
  {
    label: 'product',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Build the product template. Create ${THEME}/sections/main-product.liquid and ${THEME}/templates/product.json.
READ ${SRC}/product.html and ${SRC}/assets/page-product.js.
main-product.liquid reads the {{ product }} object:
- Gallery + thumbnails from product.media/images (role=group, aria-pressed thumbs as in the fixed prototype, NOT role=tablist). Graceful single/no-image.
- Title, price ({{ product.price | money }}; show compare_at_price struck when on sale), short lead/description.
- Spec table from product.metafields (e.g. custom.spec_table as a list/richtext) with graceful fallback to product.description; spec tags from custom.spec_tags.
- Variant picker: option selects mapping to variant ids; {% form 'product', product %} baseline with hidden id = selected_or_first_available_variant.id; qty stepper [data-qty-input]; full-width red ATC (btn-amber/.add data-add data-variant-id) that the JS enhances; disabled/Sold out when unavailable.
- Trust pills row (free shipping over settings.free_shipping_threshold, 14-day returns, road-tested).
- Cross-sell "Round out the dash": products from product.metafields.custom.complementary_products (product_list) OR a collection setting; render product-card. Graceful empty.
- Bundle band with OUTLINE CTA (buy-box rule: this secondary CTA is btn-outline because it sits near the primary ATC).
- Sticky mobile buy-bar (.bb-name/.bb-price, correctly inert+disabled when hidden) reading product title/price.
Section needs {% schema %} (settings: show cross-sell, cross-sell collection, trust pills toggles) + presets. product.json composes main-product (+ optional related sections). Report files.`
  },
  {
    label: 'collection',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Build the collection template. Create ${THEME}/sections/main-collection.liquid and ${THEME}/templates/collection.json.
READ ${SRC}/collection.html and ${SRC}/assets/page-collection.js.
main-collection.liquid:
- Dark "Shop all gear" hero (heading from collection.title with a setting override, description).
- Category filter chips: prefer Shopify storefront filters (collection.filters) if you wire them; OR keep the prototype's client chips that filter by category, in which case each product card must carry data-cat from the product's type/tag so theme.js can filter. Map the prototype categories mess/clean/charged/road to product.type or tags; honor the ?cat= / Shopify ?filter URL param on load.
- Sort dropdown using Shopify's collection.sort_options (url param sort_by) as the correct baseline; the JS client sort is progressive enhancement.
- Product grid: {% paginate collection.products by 12 %} loop rendering {% render 'product-card', product: product %} (add data-cat to the card wrapper or pass a param — coordinate: extend product-card to accept an optional 'cat' OR derive inside the card from product.type; simplest: derive data-cat from product.type inside product-card. If you need product-card to carry data-cat, note it in your report so the snippet owner aligns — but prefer deriving inside the card to avoid coupling).
- Pagination via {{ paginate | default_pagination }} as the no-JS baseline; load-more is enhancement.
- Empty state.
Section {% schema %} (+ presets) with settings: products_per_page, show_filters, hero heading/description overrides. collection.json composes it. Report files + whether you need product-card to add data-cat.`
  },
  {
    label: 'cart+pages',
    prompt: `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Build the full-page cart + all standard pages.
1) ${THEME}/sections/main-cart.liquid + ${THEME}/templates/cart.json — full-page cart reading {{ cart }} (line items with image/title/variant/qty steppers [data-qty-input]/[data-cart-minus/plus]/[data-cart-remove] 1-based line index, line totals money, subtotal [data-cart-subtotal] {{ cart.total_price | money }}, free-shipping progress gated by settings, {% form 'cart' %} with name="checkout"). Empty state -> /collections/all. READ ${SRC}/cart.html + page-cart.js.
2) Standard pages — create a page-specific section + a page.<handle>.json template for each:
   - about: sections/page-about.liquid + templates/page.about.json (story "Built by people who live in their cars", value rows as blocks, road-tested promise with id="promise"). READ ${SRC}/about.html.
   - contact: sections/page-contact.liquid + templates/page.contact.json using {% form 'contact' %} (real Shopify contact form: name/email/body, success message on form.posted_successfully). support@slipstreamgear.com shown. READ ${SRC}/contact.html.
   - faq: sections/page-faq.liquid + templates/page.faq.json (accordion blocks, .qa structure for JS). READ ${SRC}/faq.html.
   - shipping-returns: sections/page-rich-text.liquid (a reusable richtext/prose section) + templates/page.shipping-returns.json. READ ${SRC}/shipping-returns.html. Make page-rich-text generic enough to reuse.
   - wishlist: sections/page-wishlist.liquid + templates/page.wishlist.json. "Your garage" saved cards + empty state. Wishlist is localStorage (no Shopify primitive); the section renders the shell + empty state and theme.js/page-wishlist logic hydrates saved items NON-DESTRUCTIVELY (render from saved-id list, never card.remove on reconcile). READ ${SRC}/wishlist.html + page-wishlist.js.
   Each section needs {% schema %} + presets; templates compose them. Report all files created.`
  },
]

const buildResults = await parallel(build.map(b => () =>
  agent(b.prompt, { label: b.label, phase: 'Build' })
))

log(`Build phase done: ${build.length} agents. Reviewing.`)

phase('Review')

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
          file: { type: 'string' },
          title: { type: 'string' },
          detail: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'file', 'title', 'detail', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const reviewBase = `${CONVENTIONS}\n${CONTRACTS}\n\nYou are an adversarial reviewer of the freshly ported theme under ${THEME}. READ the actual files you are assigned. Report ONLY real, confirmed defects (verify by reading the code, do not speculate). For each: severity (P0 breaks the storefront/checkout/cart or Liquid won't render; P1 functional/correctness/fidelity bug; P2 polish), exact file path, what's wrong, and the concrete fix.`

const reviews = [
  { label: 'review:liquid', prompt: `${reviewBase}\nFOCUS: Liquid + schema correctness across ALL of ${THEME}/sections/*.liquid, ${THEME}/snippets/*.liquid, ${THEME}/templates/*.json, ${THEME}/layout/theme.liquid. Check: every section has a valid {% schema %} with strict JSON (no trailing commas/comments) + presets; unique section setting ids; {% render %} used (no {% include %}); asset_url for all assets; {% paginate %} closed; {% form %} tags correct; JSON templates reference section "type" filenames that actually exist (no missing sections); no undefined Liquid objects/filters; whitespace/{%- -%} won't break output.` },
  { label: 'review:cart', prompt: `${reviewBase}\nFOCUS: cart/product/variant correctness. READ snippets/cart-drawer.liquid, snippets/product-card.liquid, sections/main-product.liquid, sections/main-cart.liquid, templates/product.json, templates/cart.json, and assets/theme.js. Check: VARIANT id (not product id) added to cart; {% form 'product' %} no-JS baseline present; money filter everywhere (no raw cents math); AJAX endpoints correct (/cart/add.js, /cart/change.js 1-based line, /cart.js); badge + drawer + sticky buy-bar stay in sync; predictive search endpoint correct; data-* contract matches between snippets/sections and theme.js (data-add/data-variant-id/data-qty-input/data-cart-*); graceful failure; no console-error patterns.` },
  { label: 'review:fidelity', prompt: `${reviewBase}\nFOCUS: design fidelity + preservation. Compare ${THEME}/sections + snippets against the SOURCE ${SRC}/*.html. Check: every CSS class + data-* attribute preserved so slipstream.css/pages.css/theme.js still apply (no renamed classes); decorative inline SVGs preserved (hero slash, dividers, save-heart path, section icons); product imagery uses real product images not SVG stand-ins; palette/contrast obeyed (btn-amber red fill + dark text, ember for red-as-text, btn-outline for adjacent secondary CTA / buy-box rule); reduced-motion + data-reveal safety net intact; NO em-dashes (U+2014) in customer copy; no false claims/fake reviews/fake scarcity.` },
  { label: 'review:wiring', prompt: `${reviewBase}\nFOCUS: completeness + Theme Editor wiring. Check: a template exists for every page type used by the prototype (index, product, collection, cart, page.about, page.contact, page.faq, page.shipping-returns, page.wishlist) and each composes existing sections; header/footer render and nav links resolve to real Shopify routes (/collections/all, /pages/<handle>, routes.cart_url, routes.search_url); merchant-editable content is in settings/blocks not hardcoded; settings ids referenced in sections exist in settings_schema.json OR are section-local; missing files (e.g. cart-drawer/search-overlay referenced by layout must exist); 404/search templates optional but note if absent. Also flag any file an agent reported it could NOT create.` },
]

const reviewResults = await parallel(reviews.map(r => () =>
  agent(r.prompt, { label: r.label, phase: 'Review', schema: FINDINGS_SCHEMA })
))

const allFindings = reviewResults.filter(Boolean).flatMap(r => r.findings || [])
const p0 = allFindings.filter(f => f.severity === 'P0')
const p1 = allFindings.filter(f => f.severity === 'P1')
const p2 = allFindings.filter(f => f.severity === 'P2')
log(`Review found ${allFindings.length} findings (P0:${p0.length} P1:${p1.length} P2:${p2.length}).`)

phase('Fix')

if (allFindings.length === 0) {
  log('No findings to fix.')
} else {
  const fixPrompt = `${CONVENTIONS}\n${CONTRACTS}\n\nTASK: Apply fixes for the confirmed review findings below to the theme at ${THEME}. Fix ALL P0 and P1, and P2 where the fix is safe and quick. READ each target file before editing, make the minimal correct change, preserve fidelity contracts, and keep schema JSON valid. Do not introduce regressions. After fixing, report exactly which findings you fixed and any you deliberately skipped (with reason).\n\nFINDINGS (JSON):\n${JSON.stringify(allFindings, null, 2)}`
  const fixReport = await agent(fixPrompt, { label: 'apply-fixes', phase: 'Fix' })
  log('Fixes applied.')
  return { findings: allFindings, counts: { p0: p0.length, p1: p1.length, p2: p2.length }, fixReport, buildResults }
}

return { findings: allFindings, buildResults }
