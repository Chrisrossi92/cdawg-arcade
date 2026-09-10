# Measured first-integration recommendation

Recommend a **pre-rendered Phaser atlas after asset-size/quality optimization** for
the first integration. It fits the existing 2D renderer and keeps visual animation
isolated from scoring. The current PNG atlas is larger than the GLB; this decision
is about integration cost and presentation consistency, not a download-size win.
Neither path is connected to normal gameplay or approved for production.

| Dimension | Live 3D candidate | Pre-rendered candidate |
| --- | --- | --- |
| Shipping bundle change this phase | 0 bytes | 0 bytes |
| Prototype asset | GLB 1,061,368 bytes (267,571 gzip) | PNG 1,898,883 bytes (1,826,780 gzip), plus 5,367-byte JSON |
| Isolated renderer entry | 586,384-byte JS / 150,353 gzip, plus common helper | 1,162-byte JS / 693 gzip, plus common helper |
| Runtime dependency | Three.js 0.180.0 and GLTFLoader | Canvas2D test harness; future integration uses existing Phaser sprites |
| Geometry/texture allocation | 26,344 triangles, 4 draws, 919 KiB geometry attributes/indices; no textures | 2048×1280 RGBA = 10 MiB decoded; about 13.3 MiB with full mipmaps in a future GPU renderer |
| Three warm local load samples | 52.6, 18.4, 19.9 ms; median 19.9 ms | 56.5, 34.0, 43.8 ms; median 43.8 ms |
| Observed rAF intervals | Approximately 16.7 ms median, 17.5–17.7 ms p95 at n=300 | Approximately 16.7 ms median, 17.5–17.7 ms p95 at n=300 |
| Narrow layout | 390-pixel view readable; independent camera adapts to aspect | Same framing; raster softer when scaled above native 256-pixel cell |
| Visual quality | Crisp geometry; lighting differs from offline area lights | Stable baked appearance, but visible simplification and raster softness |
| Animation flexibility | Continuous blend from neutral to either lean, facial bones | Eight sampled frames per clip; more views/expressions cost atlas area |
| Motion/accessibility | Static by default; animate control; respects reduced-motion preference | Same controls/preference; holds an authored frame |
| Maintenance | Model plus 3D engine, context lifecycle and lighting integration | Same model source plus deterministic exports and per-game atlas budgets |

The shared helper is 844 bytes / 519 gzip and review CSS is 1,424 / 703. The standalone
live candidate asset plus renderer/common is about 1.65 MB raw; the sprite candidate
plus metadata/helper is about 1.91 MB raw. These are measured isolated preview costs,
not the exact result of a future application integration. Gzip numbers are local
compression calculations, not observed production transfer headers.

Load samples measure asset loading/parsing or image decoding after the JS module
starts, **excluding renderer-library transfer and evaluation**. Browser cache was
not forcibly cleared: no cold-network or Discord-client claim. Three reloads are
exploratory samples, not statistically robust latency estimates. rAF intervals
measure browser scheduling, not GPU execution time or whole-game performance.
The two viewers run together, so both share the same scheduling contention.

GLB geometry bytes and atlas RGBA arithmetic are partial resource accounting,
not total process/GPU memory. A live integration can require an additional WebGL
context, render targets, shader compilation, context-loss handling and CPU/GPU copies.
A Phaser atlas consumes texture memory and decode/upload time even when its network
file is small. Actual Discord desktop/mobile thermal, GPU and context limits were
not tested because no Activity/hosting configuration changed.

The browser harness has no gameplay imports or score/API requests. It consumes only
local control values. Future presentation must consume deterministic state and never
advance simulation, record inputs or decide failure. The fall begins only after a
fixed gameplay result. Official-score/replay code remains unchanged and its existing
integration checks pass.

The motion checkbox was automated. Reduced-motion preference handling was reviewed
in code; OS preference emulation and actual GPU context loss were not exercised.
An unsourced in-app-browser MutationObserver error persisted even after removing
all MutationObserver calls from the built preview. Both renderers and controls
worked; no clean-console claim is made. Full-page screenshot stitching also produced
an artifact, so viewport screenshots were used for visual evidence.

Next: refine the character, then test a compact atlas (resolution, alpha compression,
frame reduction/packing) at actual game character size before choosing the first
production asset. Keep live 3D as a proven export/viewer option for future games.
