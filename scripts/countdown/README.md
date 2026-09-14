# Countdown-gap validation

These loopback-only fixtures use synthetic identities and mocked official transport. They must never target production. The ordinary production lobby remains disabled. Instrumentation is injected only by these Vite configurations; production artifact validation rejects the diagnostic markers.

Use the repository's Node 24.20.0 runtime. Build fixtures with:

```sh
node node_modules/vite/bin/vite.js build --config scripts/countdown/vite.config.ts
node node_modules/vite/bin/vite.js build --config scripts/countdown/lobby.config.ts --base=/lobby/
python3 scripts/countdown/serve.py
```

In another terminal, run sequentially to avoid browser/resource contention:

```sh
node scripts/countdown/browser.mjs
# Preserve browser.json as matrix.json before subsequent repeated runs overwrite it.
cp tmp/countdown-correction/browser.json tmp/countdown-correction/matrix.json
node scripts/countdown/validation-browser.mjs
```

The primary matrix crosses direct/lobby, audio/muted and Start/Play Again. Boundary cases inject exact timestamps into the countdown clock only; separate real 250 ms busy-loop cases verify actual scheduling stalls. The active-stall case first discards a countdown gap, then blocks only after the first active simulation frame. Unexpected pauses always fail. Resume is used only after deliberately injected lifecycle/active-stall controls and their interruption evidence is checked. Freeze controls use fresh browsers because Chromium can leave a thawed target hidden.

`lifecycle.mjs` covers freeze, navigation cancellation and mocked identity loss after a discarded gap; production deadlines and asynchronous cancellation are additionally covered in `countdownIntegrity.test.ts` using the actual existing deadline constant. Full server/Postgres suites cover server submit expiration and projection/replay behavior.

Run `scripts/audio-readiness/full-validation.mjs --countdown-correction` for unit/typecheck, production/ephemeral Postgres, enabled build/smoke, assets, scope and security checks. The optional scope flag allows only the exact reviewed countdown edit in the previously protected clock file. `scripts/countdown/artifacts.mjs` builds an isolated archive of main `432cba05`, compares bundle sizes and server runtime bytes (excluding the expected client-hash release metadata change), then repeats current ordinary/enabled builds byte-for-byte. It retains a disposable baseline directory for audit. Neither command reads production credentials or changes any Git ref. Historical validators tied to older release snapshots are not substitutes for fresh reports.

Results and failed-run evidence are written under ignored `tmp/countdown-correction/`. Keep unsuccessful diagnostics, distinguish them from functional failures, and report host pressure without inferring causation. No automatic retry hides a failed case.
