# Identity Phase 1 — isolated tooling

Run commands from the repository root. Use the repository's pinned Node 24.20.0. No environment file, production configuration or live account is required.

```sh
python3 -m venv /tmp/cdawg-brand-tools
/tmp/cdawg-brand-tools/bin/pip install -r scripts/brand/requirements.txt
/tmp/cdawg-brand-tools/bin/python scripts/brand/build-assets.py
blender --background --python scripts/brand/render-host.py
node scripts/brand/rasterize.mjs
/tmp/cdawg-brand-tools/bin/python scripts/brand/validate.py
node scripts/brand/validate-raster.mjs
node node_modules/typescript/bin/tsc -p scripts/brand/preview/tsconfig.json
node node_modules/vite/bin/vite.js build --config scripts/brand/preview/vite.config.mjs
node node_modules/vite/bin/vite.js --config scripts/brand/preview/vite.config.mjs
```

The existing mascot preview's pinned Sharp 0.34.3 installation is used by raster tooling (`npm ci --prefix scripts/mascot/preview` if absent). Blender must be the already approved 4.5.13 LTS. Create `tmp/brand` before rendering if absent. The renderer loads the owned approved corrected V004 .blend and its `idle_mischief` action, changes only temporary render settings, and never saves the source scene. It uses Cycles CPU, 48 samples, seed 11, transparent 512² output. PNG trim/avatar crop consumes this new owned render, never any reference board.

The local URL is `http://127.0.0.1:5193/`. The page includes lobby, state selector and complete brand specimen panel. The Play button goes to `balance.html`, which mounts the unchanged real game with `makeDefaultLocalContext()` and a new `MemoryScoreRepository`. No host adapter is created, authentication requested, official attempt issued or persistent score written. The signed-in selector is an explicitly labeled public-shape fixture, not proof of a live identity.

The separate Vite config has `envDir:false`, `publicDir:false`, loopback binding, no proxy, a separate root, explicit entries and output in ignored `tmp/brand/preview-dist`. The production root entry/config/package/lockfiles remain unchanged. Opening the lobby does not import Phaser; the game is a separate HTML entry. Source .blend, original TTFs, boards and brand documents cannot enter either graph through folder copying.

Production validation: `npm test`, `npm run test:production`, `npm run test:database`, `node scripts/scan-production.mjs`. Database runner owns a disposable cluster/container and never accepts a production database URL. Brand checks produce committed JSON evidence. Rebuild reproducibility and byte-identical production artifacts are recorded in `docs/brand/`.

Browser checklist: load 1280×900 / 760×620 / 390×844 / 375×667; check fonts/images and horizontal bounds; keyboard through skip/state/motion/header/play/coming-soon/footer; all state-selector options; click coming-soon feedback; enable Less motion; enter real practice and return. Inspect 16/24/32/48px marks in the specimen. Capture screenshots to ignored temporary storage, never commit them. This is one local creative review candidate, not a production route or deployment approval.
