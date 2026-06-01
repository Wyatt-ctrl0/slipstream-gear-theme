# DESIGN.md — Slipstream Gear

Generated from the shipped prototype (`prototype/assets/slipstream.css` + `pages.css`). These are the live tokens, not aspirational ones. The brand-kit's original amber/blue scheme was superseded by the racing-red palette below.

## Color (racing red on asphalt)
CSS custom properties (token names are legacy; values are current):

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | page background |
| `--surface` | `#F2F2F4` | cards |
| `--tile` | `#E7E8EA` | alt tile |
| `--ink` | `#131418` | body + headings |
| `--amber` | `#E11D2A` | racing red, CTA FILLS only (text on it = `#131418`) |
| `--ember` | `#C20F1B` | red-as-TEXT on white (4.6:1) |
| `--ember-surf` | `#A60D18` | red-as-text on tinted surfaces |
| `--blue` / `--blue-tx` | `#2E333A` | graphite info fill + white text |
| `--dark` / `--dark-2` | `#131418` / `#0B0C0E` | dark sections |
| `--paper` | `#FFFFFF` | light text on dark |
| `--muted` | `#5c636b` | de-emphasized grey (>=4.6:1) |
| `--body-2` | `#3a4047` | secondary body copy |

### Contrast traps (never regress)
- `btn-amber` = red fill + DARK `#131418` text. White on red fails. Enforced by `.btn-amber,.add,.cart-dot{color:#131418!important}`.
- Red as TEXT uses `--ember` (white bg) or `--ember-surf` (tiles), never raw `--amber`.
- Body `#131418` on `#FFFFFF` ~ 15:1.

## Typography
- Display/headings: **Saira** (`--disp`), squared technical sans, weights 500-800.
- Body: **Inter** (`--body`), 400-700.
- Mono (spec tags only): `ui-monospace, SFMono-Regular, Menlo, Consolas`.
- Loaded via Google Fonts with `&display=swap`.
- Headings: `letter-spacing:-.01em` to `-.035em` (tighter as size grows), `line-height` .8-1.05.
- Display scale is fluid `clamp()`: hero `clamp(54px,11vw,158px)`; section h2 `clamp(28px,3.8vw,44px)`.
- Body fixed (15-18px). Eyebrows/kickers: 12-13px, `letter-spacing` .14-.22em, uppercase.

## Spacing & layout
- `--wrap: 1180px`; section padding `84px` desktop, `60px` under 560px.
- Grids: lanes + product grid `repeat(4,1fr)` → 2 at 980px → 1 at 560px.
- Sticky header, `.hdr-inner` height `64px`.

## Motion
- Eases: `--ease-streak: cubic-bezier(.2,.8,.2,1)`, `--ease-expo: cubic-bezier(.16,1,.3,1)`. No bounce.
- Signature: hero speed-slash `slashIn`, headlight `sweep`, streak reveals (`[data-reveal]` arrive from left), count-ups, breathing `hglow`.
- Fully gated by `prefers-reduced-motion` and a `body.motion-off` escape hatch. No-JS safety net keeps `[data-reveal]` visible.

## Elevation
Subtle, tinted shadows only, e.g. `0 18px 40px -18px rgba(31,35,40,.3)` on hover lift. No hard black shadows.
