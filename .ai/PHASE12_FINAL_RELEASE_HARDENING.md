# Phase 12 — Final Release QA and Hardening

## Scope and baseline

- Official Phase 12 baseline: `a9fc5204e51f6aa3af4f44d2a4139c9064002e3a`.
- Working branch: `codex/phase-12-final-release-hardening`.
- Phase 12 is release QA and hardening only. No gameplay tuning, product systems, or Phase 13 work is in scope.
- Baseline reproduced before implementation: `npm ci` succeeded; Vitest 312/312 in 34 files; production build passed with 44 modules; Playwright 50/50 with 38 desktop and 12 touch contexts. All baseline browser-health counters were zero.
- Baseline production `dist/`: 5 files / 1,743,947 bytes; JavaScript 334,669 bytes; CSS 20,863 bytes; static output 1,388,415 bytes. The static output included two unreferenced JPEGs later removed.

The pre-change inspection and finding register are in `.ai/PHASE12_FINAL_RELEASE_AUDIT.md`.

## Defects found and fixes

### EdgeAI delayed callback crossed run boundaries

The audit reproduced two independent session leaks in `src/ai.js`: delayed cosmetic dialogue dispatched in Run A could fire after reset into Run B, and Run A's dialogue rate-limit timestamp could suppress Run B's first response. Session rage also survived reset.

The fix gives each session a generation, tracks pending response timers, cancels and invalidates them on reset, clears session counters/warning flags/recent destruction/rage/rate-limit time, and preserves registered telemetry/dialogue listeners. Fake-timer regressions cover old callbacks, a working fresh session, rate-limit reset, and all session counters. This does not affect gameplay state.

### Cross-browser movement sampling

The first Firefox/WebKit CI attempt found a timing assumption in the new release-smoke test: WebKit had the right movement key held, but the test sampled player position after exactly 120 ms and observed no displacement. This did not produce browser-health errors. The regression still requires real displacement; it now uses a bounded Playwright poll for `player.x > startX` and releases the key only after movement is observed. Both release-smoke scenarios then passed in Firefox and WebKit in the latest observed PR checks; local binaries remain unavailable. Verify the latest PR head after every push.

### Release documentation and packaging

The stale Phase 11 current status in `.ai/PROJECT_STATE.md` is corrected to `MERGED + RELEASE VERIFIED` at the Phase 12 baseline; the current phase and branch are Phase 12. The README now documents current keyboard/touch controls, progression, Garage/Challenges, presentation-only cosmetics, audio, input cancellation, current architecture, testing, and runtime network boundaries. Archived prototype concepts are no longer presented as current features.

The repository MIT license file now exists. Its copyright attribution uses the repository owner's established GitHub handle; no legal personal name has been inferred. Matter.js and Google Fonts notices are recorded in `THIRD_PARTY_NOTICES.md`. Two unreferenced public JPEGs with unknown source/rights were removed after recording their baseline sizes and SHA-256 hashes in `.ai/RELEASE_ASSET_PROVENANCE.md`.

## Intentional run memory vs active simulation memory

`destroyedPropKeys` and `clearedChunkKeys` intentionally grow with unique destroyed yards explored in one run so destroyed props do not reappear on revisit. They are not treated as active-memory leaks. The accelerated test traverses 240 chunk boundaries, verifies duplicate destruction does not add duplicate keys, verifies history growth corresponds to unique content, checks every active chunk's Matter bodies against the actual world, and confirms history and active world bodies reset cleanly. Exact peak/baseline values are recorded in the attached `phase12-release-resource-stress.json` after final verification.

## Stress and regression evidence

- **World/VFX/persistence unit stress:** `tests/phase12_release_stress.test.js` advances 240 chunk boundaries; verifies active-body plateau, no duplicate or unloaded chunk bodies, linear intentional run-history growth and reset; asserts all authored VFX buffer caps and clears; and executes 25 repeated progression runs plus corrupt-profile recovery without damaging legacy settings/high-score records.
- **Destruction cleanup:** integration coverage advances production fragment lifetimes and verifies physical debris bodies leave the Matter world.
- **Cosmetic invariance:** integration coverage enumerates all ball/trail/impact style combinations and compares actual gameplay body properties, player movement, score/combo, Havoc, Kevin rage, and gameplay tuning.
- **Repeated lifecycle:** `tests/e2e/phase12_runtime_stress.e2e.js` uses production UI paths through 20 title/play/intro/movement/action/pause/resume/restart/main-menu/game-over/results/play-again cycles. Deterministic bridge use is limited to Game Over and measurement. It checks input/charge cancellation, Canvas focus, no stale Results/affiliate state, one game-over callback per run, stable initialized listener count, a single AudioContext where browser instrumentation is available, audio cleanup state, and browser health.
- **Visibility and input:** Phase 11 touch coverage, Phase 8 audio lifecycle coverage, and unit lifecycle tests remain enabled in the full Chromium run. They cover blur/hidden-page cancellation, touch control visibility, audio pause/resume cleanup, charge cancellation, and held input reset.
- **Persistence:** `tests/e2e/phase12_release_smoke.e2e.js` records a machine-readable run/reload/corruption recovery sample for all five application storage keys. Existing tests cover unavailable storage and throwing writes.
- **Async lifecycle:** the browser test dispatches a nearby environmental event, resets before its delayed response, proves zero stale deliveries, then proves a fresh response and fresh rate-limit state. It attaches `phase12-async-lifecycle.json`.

Final local counts and resource samples are recorded below. Exact-head workflow/artifact IDs and the Preview identity are checked through the associated draft PR and final handoff.

## Browser compatibility and build hygiene

The complete Chromium desktop and touch suite remains in the `chromium` and `chromium-touch` projects. A small release smoke runs in Chromium, Firefox, and WebKit only. Chromium multi-touch stays Chromium-only; this release smoke does not claim WebKit multi-touch.

`.github/workflows/quality.yml` retains unit/build and full Chromium/touch jobs, adds a Firefox/WebKit-only release compatibility job, and uploads the cross-browser evidence separately. `scripts/assert-production-build.mjs` inspects actual `dist/` output for the three E2E globals, local machine paths, source maps, env files, and test/report/docs directories; it records byte totals and compressed bytes as JSON.

## Security, network, licenses, and limitations

The production dependency audit is separate from development/build/test dependency findings. The full audit's five findings are limited to the Vite/Vitest toolchain (3 moderate, 1 high, 1 critical); no production dependencies are reported vulnerable. No forced upgrades or major dependency changes were made. Full audit details and current applicability are listed in the final evidence section below.

Intentional runtime destinations are Google Fonts CSS/font delivery and the VideoGen affiliate destination after explicit Results-link activation. `src/ai.js` is local cosmetic dialogue/telemetry simulation, with no network client. No analytics, auth, cloud save, LLM service, ad network, or remote telemetry endpoint is configured.

Automated browser checks are not physical-device, low-end performance, screen-reader, or full legal review. A successful Vercel Preview is not a production deployment. The unknown-origin JPEGs are retained only in Git history; their prior redistribution status cannot be established from this audit.

## Final evidence

### Clean-install local verification

- `npm ci`: PASS after removing generated `dist/`, `playwright-report/`, and `test-results/`. npm reported that its local install-script policy blocked esbuild's optional postinstall; the verified Vite build and Chromium E2E build still completed.
- `npm test`: PASS — 319/319 tests across 35 files.
- `npm run build`: PASS — 44 modules transformed.
- `node scripts/assert-production-build.mjs`: PASS — 3 files, 367,788 total bytes, 108,375 bytes summed per-file gzip, 335,855 JavaScript bytes, 20,863 CSS bytes, 11,070 static/HTML bytes. Relative to the recorded Phase 11 output, total output fell by 1,376,159 bytes: the 1,377,345-byte JPEG removal offset by 1,186 bytes of JavaScript growth. The compressor sum is a per-file sum, not a whole-directory archive size.
- Production negative assertions: all three E2E globals absent; no `D:\Backyard Havock` or `C:\Users\` references; no source maps; no tests, reports, `.ai`, `memory-bank`, or env files under `dist/`.
- `package.json` and `package-lock.json`: unchanged.

### Playwright and browser health

- The exact local command `npm run test:e2e` ran all 58 configured scenarios: 54 passed and four could not launch. Breakdown: desktop Chromium 41/41 PASS; Chromium touch 11/11 PASS; Chromium release smoke 2/2 PASS; Firefox 0/2 and WebKit 0/2 because the pinned Playwright executables (`firefox-1543` and `webkit-2359`) are not installed. Prior browser download attempts timed out at the Playwright/CDN mirrors. These are local environment launch failures, not browser assertions or application failures.
- All 54 Chromium scenarios emitted machine-readable health records. Aggregated totals: `pageErrors=0`, `consoleErrors=0`, `consoleWarnings=0`, `failedRequests=0`, and `sameOriginFailures=0`. Firefox/WebKit emitted no health records because the browser processes did not start.
- The GitHub browser job explicitly runs full desktop Chromium, touch Chromium, and the Chromium release smoke. A separate job installs Firefox/WebKit and runs only the two release-smoke scenarios per engine. Read its current PR-head checks and artifacts for final cross-browser status.

### Resource, lifecycle, and performance evidence

Evidence is emitted by `tests/e2e/phase12_runtime_stress.e2e.js` into the Playwright `test-results/` artifact:

- Repeated lifecycle: 20 production-UI cycles; 20/20 Game Over callbacks and 20/20 completed-run increments. After the first cycle's one-time view binding, listener count stayed at 54 through every cycle (41 were registered at boot). Run samples consistently returned to 3 active chunks and 33 world bodies. Every cycle ended with held input released, no active charge voice, `musicDuck=1`, and zero audio failures. AudioContext instrumentation observed one creation; initialized listener registration did not increase per cycle.
- Streaming world: 240 chunk boundaries; 4 active chunks maximum, 12 eligible props maximum in a chunk, and 39 chunk bodies maximum. Total world bodies were 33 at baseline, peaked at 42 during accelerated traversal, and returned to 33 after reset. Actual Matter body IDs matched active chunk props at each boundary; no duplicate or unloaded-chunk body remained.
- Intentional run memory: destruction history grew with unique content (138, 276, 552 keys after 60, 120, 240 explored chunks); clear history grew 12, 24, 48. Duplicate keys were not counted twice, the measured growth was linear, and both histories returned to zero on reset. This run history is intentionally separate from bounded active simulation memory.
- A separate 4.507-second browser sanity sample contained 271 frame intervals: median 16.7 ms, p95 16.8 ms, maximum 33.3 ms, with a 960×540 canvas backing. Representative workload included ordinary play, destruction, Havoc, and Kevin projectiles. Under that sample world bodies peaked at 57, chunks at 4, particles at 86, fragments at 9, projectiles at 6, and active SFX voices at 11. This headless measurement is only a gross-regression signal, not a low-end-device benchmark.
- The later reset snapshot had 0 active shards/projectiles/particles, 0 active SFX voices, no charge voice or speech, `musicDuck=1`, music stopped, and `audioFailures=0`. The 96-fragment and production VFX collection limits are asserted against existing production constants; no cap was increased.
- Async lifecycle evidence: old-session callbacks after reset `0`; fresh-session callback works `true`; stale rate-limit carried across reset `false`. Fake-timer unit tests also verify counter, warning, rage, and recent-destruction reset while preserving registered listeners.
- Persistence evidence records repeated completed runs, reload persistence, malformed-profile recovery, preservation of high-score/combo/mute/reduced-motion values, idempotent unlock/challenge IDs, and storage-unavailable coverage from existing Phase 10 tests.

### Other release regression evidence

- Vitest adds deterministic AI-session timer tests, all-cosmetic-combination runtime invariance comparisons, physical fragment-body cleanup, 240-boundary active-world/VFX stress, and repeated progression/idempotency/corruption checks. No test was skipped or weakened.
- Existing Chromium coverage plus the new release smoke retains desktop keyboard/pointer, touch multi-pointer movement/action, cancellation, visibility/blur, pause/resume, restart, Game Over, Results, responsive layouts, focus/accessibility, audio lifecycle, projectile/parry, destruction, and share-path regressions. Firefox/WebKit smoke covers boot, Settings, Garage, Challenges, start/intro, keyboard/pointer input, Pause/Resume, Results/persistence, affiliate attributes, and browser health when run in CI.
- The VideoGen URL remains `https://videogen.io/ai-video-generator?fp_ref=amey-ff39df`. Existing mouse, keyboard Enter, touch, hit-target, responsive, Results-only, and progression-isolation scenarios remain in the Chromium suite.
- Cosmetic invariance checks compare all ball/trail/impact style combinations against actual live body state, movement, score/combo, Havoc, Kevin rage, collision filters, and the production tuning object.

### Security, dependency, external services, and licensing

- `npm ls`: Matter.js 0.20.0, Vite 5.4.21, Vitest 2.1.9, Playwright 1.63.0.
- `npm audit --omit=dev`: PASS, zero vulnerabilities.
- Full `npm audit`: five development/build/test findings — three moderate, one high, one critical. The affected packages are `@vitest/mocker`, `esbuild`, `vite`, `vite-node`, and `vitest`. Advisories include GHSA-82fw-gwwq-j7x9, GHSA-67mh-4wv8-2f99, GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff, and GHSA-5xrq-8626-4rwp; transitive records overlap across packages. The Vite findings concern optimized-dependency/dev-server and Windows path/editor handling; Vitest's critical issue concerns its optional UI server, which project scripts do not run. None are in the production dependency set. npm offers Vite 8.3.2 and Vitest 5.0.3 major upgrades. No forced or blind upgrade was applied.
- High-confidence secret-pattern scan: zero matches in 137 tracked/untracked files. The scan checked private-key markers, AWS access-key shapes, and long assignments to common credential names without printing values; it is not a substitute for every possible secret format.
- Runtime network destinations remain Google Fonts and the explicitly user-activated VideoGen Results referral. There is no configured analytics, remote telemetry, authentication, LLM, cloud save, or ad network. `src/ai.js` remains local cosmetic simulation.
- `LICENSE` now provides MIT repository terms using the established repository owner handle. Matter.js notice is copied from the installed package license. Bebas Neue and Outfit are remotely served and not bundled; attribution/license source metadata is documented. The removed JPEGs' origin and redistribution rights remain UNKNOWN and are not certified.

### Exact-head CI and Preview

The latest observed PR head passed Unit/Build, Chromium, and Firefox/WebKit checks. Its two uploaded artifacts are tied to that SHA, and its Vercel Preview is READY with matching `sha` and `ref`. The live PR remains the authority: recheck the latest run and deployment after every push. Run IDs and artifact digests are reported in the final handoff rather than frozen here. No production deployment, release tag, merge, or post-merge Final Release Gate is claimed here.

## Final acceptance matrix

| Gate | Current evidence |
| --- | --- |
| P0/P1 audit findings | No known open P0/P1; the confirmed P1 is fixed and has regression coverage. |
| Unit/build/production bundle | PASS locally after clean install. |
| Chromium desktop/touch/release smoke | PASS locally, 54 total Chromium scenarios; all health records clean. |
| Firefox/WebKit | Both release-smoke scenarios pass per browser in the latest observed exact-head CI; local binaries are unavailable. |
| Resource, persistence, async, and audio evidence | Machine-readable JSON generated and attached by the Chromium job. |
| Exact-head GitHub artifacts | Both uploaded artifacts are tied to the latest observed PR head; verify live metadata after every push. |
| Vercel Preview | Latest observed deployment is READY with Git SHA/ref equal to the PR head; verify again after every push. |
| Production verification | Intentionally pending the external post-merge Final Release Gate. |
