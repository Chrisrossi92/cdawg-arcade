# Prototype runtime candidates — local review only

The GLB contains one skinned model, four material primitives and five one-second
clips: idle_default, lean_left, lean_right, panic and fall. Idle loops; other clips
hold at their final sample. Fall has authored root motion. The local live viewer
blends neutral and held lean endpoints continuously; physics/score never participate.

The 2048 × 1280 atlas has eight samples per clip in five rows. JSON records source
frames and sampling. Source frames 1..25 are sampled at 24 fps; GLB times are slid
to 0..1 seconds. The atlas is an illustrative export, not a final frame-rate/size
choice. Decoded RGBA is 10 MiB; mipmaps would add roughly a third. No textures are
embedded in the GLB; colors are vertex attributes. Neither candidate may ship yet.
