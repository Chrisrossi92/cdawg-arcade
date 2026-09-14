# Canonical Discord brand package — v001

Upload directory: `assets/brand/soft-launch/v001/CDAWG-Arcade-Discord-Upload-v001/`. No file was uploaded. This directory and its manifest form the single handoff for a later consolidated Portal session.

| Export | Dimensions / format | Intended destination |
|---|---|---|
| 01-application-icon-1024-v001.png | 1024² PNG | General Information → App Icon |
| 02-bot-avatar-1024-v001.png | 1024² PNG | Bot → Avatar, configured separately |
| 03-activity-cover-1920x1080-v001.png | 1920×1080 PNG | Activities → Art Assets → Cover Art |
| 04-embedded-background-1920x1080-v001.png | 1920×1080 PNG | Activities → Art Assets → Embedded Background |
| 05-social-share-1200x675-v001.png | 1200×675 PNG | Optional future social/share use; no new public hosting route |
| specimen-icon-{size}-v001.png | 16, 24, 32, 48, 64, 128, 256² PNG | Creative review only; do not upload all specimens |

`manifest.json` records every file's dimensions, exact SHA-256, size, input provenance and destination. Editable, self-contained SVG masters are adjacent in `source/`. The repository favicon uses the same icon composition; the page title/description use Arcade copy. Social artwork is packaged without inventing a public share URL or changing DNS.

Sources: approved owned Notched Tag vector, outlined Fredoka identity, and approved V004 default host render. The host is not regenerated or remodeled. The exporter losslessly transcodes its pixels to PNG for SVG compatibility, then scales only derivative compositions. Original source hashes are retained and tested. The outlined lettering retains the existing font provenance/OFL documentation in assets/brand/arcade/fonts; no remote font is required.

Reproduce from repository root with pinned Node 24.20.0 and the existing pinned Sharp 0.34.3 installation:

```
node scripts/soft-launch/export-brand.mjs
```

Run twice; manifests and PNG bytes must match. No timestamp metadata, AI generation, reference-board cropping, private configuration or remote asset fetch occurs. Edit the source composition in the exporter, rebuild and review the editable SVG/PNG pair together; canonical approved inputs stay untouched.

Discord's [official assets and metadata guidance](https://docs.discord.com/developers/activities/development-guides/assets-and-metadata) specifies an embedded background of 16:9 at least 1024px wide, with artwork near the edges. Cover art must also accommodate both 16:9 and 13:11 display. This package uses 1920×1080 with essential cover content within a central 13:11 crop; the local review shows both. Icon/avatar dimensions are our conservative 1024² export choice, not a claim of a required Portal size. The cream/brass C tag has no small text and sits on charcoal with an orange accent. The 16px case is a constrained favicon fallback and must be reviewed at actual size.

Optional Shelf preview concept (not an exported/uploaded video): 0–2s tag and wordmark; 2–4s the real lobby; 4–7s Balance entry and a short active moment; 7–9s return to the lobby. No fake score, audience count or unreleased game. Discord currently specifies 640×360 MP4, under ten seconds and under 1MB for preview video; production of that derivative is deferred. Preserve a static fallback and avoid rapid motion.
