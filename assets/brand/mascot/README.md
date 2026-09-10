# CDAWG mascot source package

Status: foundation only. Canonical attachments and Blender are unavailable. No
model, approved export, or replacement character is included in this phase.

| Directory | Purpose | May ship? |
| --- | --- | --- |
| reference | Original approved turnaround, expressions, movement sheets | Never |
| source | Editable Blender source and reproducible authoring inputs | Never |
| runtime | Reviewed, optimized GLB or atlas exports | Only after a separately authorized integration |
| previews | Intentional review renders and contact sheets | Never |

The [identity guide](../../../docs/brand/MASCOT_IDENTITY.md) is authoritative for
new mascot work. Reference precedence is anatomy/markings: turnaround;
facial acting: expression sheet; body language: movement sheet.

`manifest.json` tracks missing inputs explicitly. Do not create placeholder image
files, label generated guesses canonical, or copy wardrobe experiments. On receipt,
copy original bytes without resizing or recompressing; retain the original format
and extension, record SHA-256, byte size, source filename, and provenance. The
proposed PNG names may change to match original formats.

Naming: `cdawg-b1-<purpose>-v001.<ext>` for references; `cdawg-mascot-<purpose>-v001`
for authored assets. Increment versions for reviewed visual/export changes; never
silently replace a canonical reference. Record the source version and export
settings with each runtime candidate. Keep an original production spec verbatim at
the path in the manifest, separately from derived implementation notes.

Reference/source/preview files stay outside `src` and `public`. Never import them
from application code, copy them to `dist`, or add an asset glob spanning this
package. Vite's production public-directory copy is already disabled. Run
`node scripts/mascot/validate.mjs --allow-missing` and
`node scripts/mascot/check-bundle.mjs` after a production build. The latter rejects
mascot inputs in the actual bundle module graph. These are explicit validation
gates, not modifications to production build configuration. No runtime mascot
asset is allowed into the bundle during Phase 1.

No Git LFS: the foundation contains only small text files and the repository has
no existing LFS configuration. Reassess after measuring the supplied binary files.
Local exports, trial renders, caches, and `.blend1` backups belong in ignored
`tmp/mascot/`; move only intentional, reviewed deliverables into this package.
