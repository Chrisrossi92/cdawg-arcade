# Locally embedded, openly licensed type

- Display: Fredoka, 600 weight / 100 width, by the Fredoka Project Authors. Original variable TTF from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/fredoka), `Fredoka[wdth,wght].ttf`. Downloaded 2026-09-11 from the official google/fonts repository.
- UI: Atkinson Hyperlegible, Regular 400, Braille Institute of America. Original TTF from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegible), `AtkinsonHyperlegible-Regular.ttf`. [Upstream](https://github.com/googlefonts/atkinson-hyperlegible). Downloaded 2026-09-11.
- Both use **SIL Open Font License 1.1**. Full license texts are adjacent; original hashes and sizes are in `../provenance.json`. No purchase or subscription. Embedding and redistribution with license notices are permitted. Font software is not sold by itself.
- The repository's existing `Inter, ui-sans-serif, system-ui` declaration did not include an Inter font file. The isolated preview uses two actual local font files, with `Arial, system-ui, sans-serif` fallback. Production typography stays unchanged.
- Reproducible modified fonts are renamed **CDAWG Display Subset** and **CDAWG Ui Subset**, retain copyright/license records, and are served as local WOFF2. The originals remain authoritative rebuild inputs, never browser imports.
- Subset: printable Latin/Latin-1, general punctuation U+2010–203F, euro, minus, left/right arrows. Unsupported scripts use system fallback. Never transform, uppercase or truncate a player's original display name into a brand wordmark.
- Use Fredoka 600 for short headings/actions only; Atkinson 400 for readable body/UI. Do not synthesize a font family or add extra weight downloads. SVG wordmarks use Fredoka outlines and need no runtime fonts.
- Rebuild tooling: fonttools 4.61.1 with Brotli/WOFF support. See `scripts/brand/README.md`. Current subset byte counts are recorded in `docs/brand/arcade-asset-validation.json`.
