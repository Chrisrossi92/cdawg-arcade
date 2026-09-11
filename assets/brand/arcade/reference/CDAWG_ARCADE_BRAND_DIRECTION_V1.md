# CDAWG Arcade Brand Direction V1

Status: Creative direction approved; production vector assets and interface implementation remain pending.

## Brand idea

CDAWG Arcade is a warm modern arcade clubhouse hosted by the canonical CDAWG bulldog. It should feel confident, playful, slightly mischievous, polished, and welcoming—never like a casino, generic esports product, children's learning app, or blue-purple cyberpunk dashboard.

## Approved identity

- Primary name: `CDAWG ARCADE`
- Tagline: `A little dog. A lot of attitude.`
- Primary wordmark treatment: warm-cream `CDAWG` with burnt-orange `ARCADE`
- Typography direction: bold, rounded, geometric uppercase display lettering
- Standalone mark: **Option 2 — Notched Tag**
- App/avatar mark: close crop of the canonical mascot's mischievous face, with orange collar visible
- Environment: charcoal surfaces, warm cream type, burnt-orange interaction color, restrained muted-brass accents
- Product character: an arcade clubhouse rather than a wall of unrelated minigames

## Canonical standalone mark

The selected symbol is the **Notched Tag** shown as Option 2 in `03-notched-tag-selection-board.png`.

Required construction:

- Slightly flattened round collar-tag/arcade-token silhouette
- Integrated top attachment notch that visibly interrupts the enclosing circle
- Small burnt-orange inset in the top notch
- Warm-cream central field
- Muted-brass rim in the full-color version
- Bold charcoal capital `C`
- Restrained orange accent near the outer rim
- Recognizable at 24–32 px
- Reproducible as flat one-color SVG

The mark must read as a custom dog tag or arcade badge, not a copyright symbol, casino chip, currency, or cryptocurrency token.

## Mascot usage

Use the already approved canonical black-and-cream bulldog with orange collar and circular `C` tag. The mascot should host, welcome, celebrate, react, and guide attention. He should not be pasted into every panel or become decorative clutter.

Permanent clothing is limited to his collar and tag. Game-specific costumes may be designed later but are not part of this brand phase.

## Preliminary palette

The concept boards suggest the following starting values. Production implementation must verify contrast and may adjust values slightly while preserving appearance.

| Token | Concept value | Role |
| --- | --- | --- |
| Charcoal | `#0F1113` | Primary background and dark surfaces |
| Warm cream | `#F7E6CD` | Primary text, light mark, warm highlights |
| CDAWG orange | `#FF8A2B` | Primary action, wordmark accent, focus energy |
| Muted brass | `#B08B4F` | Premium secondary accent and tag rim |

Do not rely on brass or orange for small low-contrast body text. Accessible states and focus treatments take priority over exact concept sampling.

## Arcade-shell direction

- Strong `CDAWG ARCADE` header and compact authenticated-player area
- Featured game card for `CDAWG BALANCE`
- Scalable reusable game-card anatomy for future titles
- Clear playable, unavailable, coming-soon, loading, and error states
- Compact personal-best and guild-leaderboard surfaces
- Large touch-friendly actions compatible with Discord Activity and pop-out layouts
- Subtle grid, token, ticket, and warm edge-light motifs
- Background richness should remain restrained enough for performance and readability
- Mascot presence should guide the eye without competing with game cards or scores

## Source-board authority

1. `01-arcade-identity-board.png` — overall lobby atmosphere and product hierarchy
2. `02-logo-family-board.png` — wordmark, mascot icon, palette, and logo-family direction
3. `03-notched-tag-selection-board.png` — mark comparison; **only Option 2 is approved**

These boards are visual references, not shippable production assets. Do not crop their logos, icons, or UI elements for application use. Rebuild final marks as deterministic vector artwork and construct the interface in code.

## Still to be resolved in production

- Exact licensed display and UI font families after repository/dependency audit
- Final optical spacing and clear-space rules
- Exact SVG curves and small-size simplification
- Accessible light-background variants
- Final app-icon crop derived from approved owned mascot assets
- Responsive lobby details at all supported Activity sizes
- Motion behavior for the logo, cards, and mascot host

## Production acceptance conditions

- Vector marks are clean, deterministic, and visually consistent with the selected direction
- Standalone tag cannot reasonably be mistaken for a copyright symbol at small sizes
- Wordmark spelling is always exact
- App icon remains recognizable at Discord sizes
- Color contrast meets applicable accessibility targets
- Keyboard, pointer, touch, reduced-motion, loading, and error states are complete
- Brand source/reference files remain outside the shipped frontend bundle
- Existing gameplay, authentication, official scoring, replay, sessions, leaderboards, and database behavior remain unchanged unless a separately approved integration explicitly requires otherwise
