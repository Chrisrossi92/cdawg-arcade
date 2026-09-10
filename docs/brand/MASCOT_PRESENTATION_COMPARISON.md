# First-integration recommendation (provisional)

Prefer pre-rendered sprite/atlas animation for the first Cdawg Balance integration.
Current rendering uses Phaser shapes in `CdawgRig`, hosted in a resizing Phaser
canvas. Sprite animation fits that renderer. No 3D engine currently exists in the
runtime. This recommendation is architectural; model-specific quality, transfer,
load-time and frame-time measurements are blocked until the model exists.

| Dimension | Live 3D | Pre-rendered atlas |
| --- | --- | --- |
| Added size this phase | 0 bytes; not implemented | 0 bytes; not implemented |
| Future transfer | GLB/textures plus chosen renderer/loader; unmeasured | Atlas image/metadata; unmeasured |
| Dependencies | Requires a suitable 3D renderer, loader and integration | Existing Phaser supports sprites; no new rendering engine expected |
| Initial load | Parse model, upload geometry/textures, compile shaders | Decode image, upload atlas; may need multiple pages |
| Memory/GPU | Geometry, skins, textures, render targets and possibly a second context | Decoded textures; 2048² RGBA8 = 16 MiB, about 21.3 MiB with full mip chain, per page |
| Discord Activities | Profile context limits, thermal load, resume/context loss on actual clients | Also profile texture limits and decoded memory; compressed download size is insufficient |
| Narrow layout | Responsive camera/viewport and stable paws/platform registration | Fixed origin/pivot and scale; prevent blurred/downscaled tag and face |
| Visual quality | Continuous lighting/camera; can retain geometry at varied sizes | Consistent baked lighting; limited camera angles and resolution |
| Animation | Smooth lean blending and facial morphs | Sampled frames; more angles/expressions increase atlas area |
| Reduced motion | Freeze decorative idle; retain essential lean feedback | Hold neutral/lean keyframes; suppress looping panic/fall effects as appropriate |
| Determinism | Presentation consumes state only; renderer never advances rules | Presentation consumes state only; frame rate never changes score |
| Future maintenance | Shared model/actions plus renderer integration per game | Shared model/source, reproducible exports per game/view |

The memory figure is arithmetic for an uncompressed RGBA8 texture, not a measured
asset. Budget includes CPU decode copies and renderer overhead when profiling.
Do not choose an atlas size from this illustrative calculation alone.

For a fair comparison, record raw/gzip dependency deltas, GLB/atlas transfer bytes,
frame counts and decoded texture allocation, cold/warm load median and p95,
frame-time p95, narrow-view face/tag readability, and context recovery. Use the same
camera, dimensions, poses, device and motion settings. Capture desktop and narrow
screenshots. Discord-specific GPU/memory measurements remain unverified locally.

Keep the existing simulation clock, ruleset digest, input recording and official
replay code unchanged. A future presentation adapter must consume immutable state
and use presentation time only for non-scoring motion. No adapter is added here.
