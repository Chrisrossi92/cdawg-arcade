# CDAWG mascot source package

Status: **Appearance approved; Phase 3 gameplay integration validated on the feature branch.**

See [Phase 3 evidence and preview commands](../../../docs/brand/MASCOT_PHASE_3_COMPLETION.md). Versions 001 and 002 retain historical evidence; v003 contains the integrated gameplay atlases.
The original approved images/specification are preserved byte-for-byte. Generated
assets are stylized interpretations. The approved appearance is now integrated into the feature-branch game.

| Directory | Contents | Shipping policy |
| --- | --- | --- |
| reference | Three canonical PNGs and original authority README | Never ship |
| source | Editable `.blend`, model/export settings report | Never ship |
| runtime | Historical prototype plus candidate GLB, split WebP atlases and metadata | Only the eight v003 integration exports enter the feature build; no deployment approval |
| previews | Historical review sheets plus candidate turnaround, nine expressions and motion sheet | Never ship |

The [original specification](../../../docs/brand/CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1.md)
and [identity guide](../../../docs/brand/MASCOT_IDENTITY.md) govern new work.
Anatomy/markings follow the turnaround; facial acting follows the expression sheet;
body language follows the movement sheet. See [production notes and commands](../../../docs/brand/MASCOT_PRODUCTION_PLAN.md)
and [validation](../../../docs/brand/MASCOT_PHASE_1_COMPLETION.md).

`manifest.json` records per-file SHA-256, size, original filenames and image
dimensions. The supplied files were already extracted. The owner-provided ZIP hash
is retained as unverified because the archive itself was not supplied. Individual
file copies are verified; do not represent that as ZIP verification.

Naming: canonical `cdawg-b1-<purpose>-v001`; authored `cdawg-mascot-<purpose>-v001`.
Version future reviewed visual changes instead of silently replacing canonical
references. This v001 prototype evolved locally before its first committed export.
Keep original image formats/quality. No rejected wardrobe art is included.

Only the eight paths in `integrationExports` may be imported into `src`. No broad asset glob, source files, historical models or preview assets enter the application. The isolated preview has its own entry/config under
`scripts/mascot/preview` and builds only into ignored `tmp/mascot/preview-dist`.
No production route or feature flag is added. Validate with:

```sh
node scripts/mascot/validate.mjs
node scripts/mascot/check-bundle.mjs
```

All `generatedAssets` explicitly have `approvedToShip: false`; `runtimeExports`
remains empty because deployment remains unauthorized. `integrationExports` separately records the eight files approved for feature-branch integration. No LFS: originals are each about 1.6–2.1 MB and the model is under
2 MB; the repository has no existing LFS workflow. Trial frames, caches, installer,
logs, repeat exports and Blender backups stay in ignored `tmp/mascot`.
