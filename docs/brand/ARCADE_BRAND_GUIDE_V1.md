# CDAWG ARCADE — brand system V1

Brand system and lobby direction creatively approved. The corrected V004 mascot was subsequently approved for animation integration. This is a new vector identity and isolated lobby prototype; production continues to use the accepted mascot integration.

## Character and hierarchy

Confident, welcoming, playful and a little mischievous. A warm modern arcade clubhouse. The approved name is **CDAWG ARCADE**; preserve that spelling and capitalization in marks. Product prose can say CDAWG Arcade. Tagline: **A little dog. A lot of attitude.** Never present the Arcade as a casino, currency, esports league or children's learning product.

The primary horizontal lockup combines the Notched Tag with two lines of outlined Fredoka lettering. Use stacked in square/portrait spaces, wordmark-only where the tag would duplicate an adjacent icon, and standalone tag for compact navigation. The round tag on CDAWG's actual collar is unchanged. The newly selected Notched Tag identifies the Arcade, not a redesign of his character.

## Construction and reproduction

The original SVG geometry lives in `assets/brand/arcade/vector`. Its reproducible construction is `scripts/brand/build-assets.py`. No board pixels were cropped, traced or included in a logo. Letter outlines derive from licensed Fredoka 600. No SVG requires an installed font, external image, script, filter or remote URL.

The 128×144-unit tag has a horizontally broad, gently flattened lower body and an integrated top attachment. The 14-unit attachment hole is actual negative space. A burnt-orange inset surrounds it, a muted-brass rim encloses the cream field, a bold open C anchors the face, and one orange arc supplies emphasis. The upper extension must remain visible; never crop it to a circle. The small variant drops the orange arc. One-color variants use one ink and true transparent counters, not a simulated background paint.

Clear space: keep at least the attachment width (38 tag units) around standalone marks and half the cap height around lockups. Minimum recommended CSS sizes: full tag 48px high; simplified tag 24px high (16px favicon is a constrained fallback); horizontal lockup 180px wide; stacked 120px wide; wordmark-only 220px wide. Choose the tag instead of squeezing a wordmark under those sizes. Raster samples at 16/24/32/48px appear on the local review page. Automated raster checks prove alpha, dimensions and unclipped vector edges; human recognition of the custom tag remains part of final creative acceptance.

Use cream/orange on charcoal. The light-background logo uses charcoal and deeper orange `#AD4300`; the bright concept orange is unsuitable as small text on cream. Use flat one-color cream on dark or charcoal on light. Never stretch, rotate the main logo, recolor arbitrarily, add a drop shadow to the wordmark, add currency/casino embellishments, replace the C with ©, or use the reference-board mockups as assets. Decorative card tag rotation does not authorize rotating the primary lockup.

## Color and type

All preview colors come from semantic `tokens.json`, with generated `tokens.css`. Production styles do not import them.

| Role | Value | Contrast evidence |
| --- | --- | --- |
| Background / primary text | `#0F1113` / `#F7E6CD` | 15.46:1 |
| Surface / raised surface | `#191C1E` / `#23272A` | Layering, never sole state cue |
| Secondary text | `#BDB7AE` | 7.56:1 on raised surface |
| Action / on-action | `#FF8A2B` / `#0F1113` | 8.04:1 |
| Hover / active | `#FFA458` / `#EA771A` | Dark label 9.64:1 / 6.44:1 |
| Brass decoration | `#B08B4F` | Decorative trim; not small body copy |
| Focus / control border | `#FF8A2B` / `#77736D` | 6.40:1 / 3.20:1 on raised surface |
| Success / warning / error | `#95D5A7` / `#F2C46D` / `#FFAAAA` | 10.07 / 10.51 / 9.45:1 on surface |
| Disabled text | `#A39F98` | 5.71:1 on raised surface |
| Light accent | `#AD4300` | 4.79:1 on cream |

Subtle divider/glow/shadow tokens are decorative only. Controls use the measured border and focus tokens. Use text labels as well as color for success, unavailable, loading and error states. Fourteen contrast pairs are tested; these are WCAG relative-luminance calculations, not a blanket accessibility certification.

Fredoka 600 is the display face: short headings, brand and primary actions. Atkinson Hyperlegible 400 is the UI/body face: paragraphs, labels, player identity details and scores. Both are SIL OFL 1.1 and hosted locally as renamed, subset WOFF2; originals and complete license text are committed. Arial/system fallback handles missing scripts and load failures. Do not add remote font calls or extra weights. Preserve actual player names and support wrapping. See `assets/brand/arcade/fonts/README.md` for sources, permissions and subset coverage.

## Mascot, cards and motion

One welcoming owned mascot render anchors the lobby; do not repeat him on every card. The 512² render uses the approved corrected V004 model and approved `expr_default` action. It adds no costume, changes no geometry and overwrites no mascot source. Avatar framing consumes this same owned render, with the orange collar visible. The flat vector avatar frame is reusable with approved owned portraits; exports at 64/128/256px are derivatives, not new character authority.

Game-card anatomy: availability eyebrow, real title, restrained game illustration, one-sentence description, clear primary action, quiet supporting footer. CDAWG BALANCE is the sole playable title. Two COMING SOON cards have no speculative names, release dates or working Play buttons. Their feedback buttons explain availability. The reusable component handles practice, playable example, disabled, loading, error and coming-soon states. Loading uses `aria-busy`; actual disabled buttons cannot receive clicks; error preserves local practice; feedback is announced in a live region. Personal best and guild summaries show honest empty states, never invented scores/rankings.

Motion: logo arrives over 380ms; the host welcomes once over 550ms; focus/selection uses 150–160ms; loading arrives once over 250ms. No perpetual CSS animation or render loop. Focus lifts a card by 3px but never changes layout. OS reduced motion and the preview's Less motion setting remove animation/transitions; focus outlines and readable labels remain. No audio is added. The existing game keeps its approved motion behavior.

## Layout, accessibility and isolation

Desktop uses three cards and two summaries. Narrow screens give Balance a full-width card, two compact future cards, stacked summaries and a compact identity area. Touch targets are at least 44px for primary controls; a skip link, native state selector, native checkbox, visible three-pixel focus and logical DOM order support keyboard use. Reduced-motion users receive identical information. The source SVGs have names; decorative images use empty alt text.

The identity component accepts the existing safe public `HostContext` shape and only displays the escaped display name and status. This preview uses `makeDefaultLocalContext()` plus a clearly labeled signed-in example. It never reads Discord sessions, avatars, credentials, guild mappings or scores. A future real lobby will require separately authorized context integration. The Play action opens unchanged Balance with an in-memory repository; leaving resets its temporary scores. Its inherited game UI still uses its general “Saved in this browser” practice label; this isolated harness does not persist those scores.

Canonical inputs: preserved originals under `reference/`, original font files under `fonts/source/`, semantic tokens and vector builder. Production-ready candidate vectors: `vector/`. Generated optional runtime candidates: `runtime/`. Reference boards, font source, Blender source, guides and generators are never runtime imports. Nothing is copied to production `public`, no root route is added, and no production source, package, lockfile or configuration changes in this phase.

Asset names use `cdawg-{purpose}-{variant}-v001`. Increment the version when approved geometry changes; keep source and generated outputs together. Current file hashes, sizes, provenance, contrast, alpha checks, reproducibility and zero-byte production comparison are committed in adjacent JSON reports. All supplied ZIP originals were safely validated against the user-provided SHA-256.
