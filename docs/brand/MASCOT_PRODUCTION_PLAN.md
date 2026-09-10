# Phase 1 continuation plan

This is a derived implementation plan, **not** the missing
`CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1.md`. Import that document verbatim when supplied.

## Toolchain gate

Apple Silicon host. Blender was not found on PATH or in system/user Applications;
no suitable installed 3D authoring application was identified. Nothing installed.
Use Blender **4.5.13 LTS**, pinned for reproducibility. The official Apple Silicon
DMG is **311,910,354 bytes** (about 312 MB / 297.5 MiB). Budget approximately **1–2 GB
installed and 3 GB free working space**; disk estimates are planning allowances,
not measurements from an installation. No account, API key, fee, or subscription.

After explicit installation approval: download
[the official DMG](https://download.blender.org/release/Blender4.5/blender-4.5.13-macos-arm64.dmg),
verify it against the matching entry in
[the official SHA-256 file](https://download.blender.org/release/Blender4.5/blender-4.5.13.sha256),
mount it, copy Blender.app to Applications, then unmount it. Do not change global
preferences or install add-ons. See [official macOS installation instructions](https://docs.blender.org/manual/en/4.5/getting_started/installing/macos.html)
and [LTS version listing](https://www.blender.org/download/lts/).

Run the executable with `--background --factory-startup --python-exit-code 1
--python scripts/mascot/blender-smoke.py`. Record exact build/version. This smoke
script is prepared but unexecuted; it writes no files or preferences.

## Prototype gate

Repository-contained procedural generation is feasible with Blender's bundled
Python: primitive blockout, joined low-detail mesh, approximate cream patches,
collar/tag geometry, one quadruped skeleton, and keyed actions. No external service
is needed. Preparing the metadata and smoke check is useful before installation;
implementing and calling a model approved without the images would be misleading.

After references and tooling are available, add an executable deterministic model
script with seeded randomness (or none), named materials/bones/actions, fixed scene,
camera, transparent render background, lighting, resolution, color management,
and export settings. Store editable `.blend` and valid `.glb` with a settings manifest.
Minimum actions: idle, blendable left/right lean, readable panic, harmless fall if
feasible. Clearly label disconnected geometry, rigid skinning, approximate patches,
missing leather stitches, poor deformation, or other prototype shortcuts.

Validate GLB 2.0 header/chunks, buffer/accessor bounds, finite transforms, skin joint
indices/weights, action names/durations, external URI absence, and loadability with
a real glTF validator. Render twice and compare exported structure and pixel output;
record hashes, tolerances and any nondeterminism instead of claiming byte identity.
Render neutral front/side/back views plus a motion contact sheet against references.

## Preview and integration gate

Use a separate local Vite preview configuration/entry outside the application
entry graph, bound to loopback with no auth or score API. No production route,
feature flag, server change, or live/default character replacement in this phase.
Inspect desktop and 390-pixel narrow layouts. Compare the same pose set and camera
for GLB and atlas outputs. Test reduced-motion presentation and local context loss.

Next phase: finish Phase 1 prototype and measured presentation comparison, then
request only a meaningful creative choice if references leave one unresolved.
Production integration is a subsequent, separately authorized phase.
