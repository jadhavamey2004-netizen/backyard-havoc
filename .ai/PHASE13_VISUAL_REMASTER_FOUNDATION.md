# Phase 13 Visual Remaster Foundation

## Purpose and provenance

Phase 13 is a new post-release Visual Remaster track. The original Phase 1–12 overhaul is complete and release-verified; this work is not unfinished v1 work. The verified v1 production baseline is `802654e517ad28ef5f49d014786f26e5ef50edf0`. The existing Phase 13 branch began at `87aaf06929348acff538291f094ad756d49bf8ba`, a descendant of the baseline. Its earlier prepared commits pin and install the approved toolchain; implementation in this review handoff is limited to the renderer/asset feasibility work and evidence described here.

No main-branch changes, production deployment, gameplay retuning, or Phase 14 implementation are part of this work.

### Prepared toolchain history versus Phase 13 implementation

The commits already present on the branch through the starting head `87aaf06929348acff538291f094ad756d49bf8ba` were prepared handoff material, not implementation from this turn: `b87899e` (free bootstrap script), `039c5c2` (agent guardrails), `207d9db` and `36f9819` (npm bootstrap/package setup), `d3639ac`, `3ca87cf`, and `adf23a7` (stable PixiJS pin), `14937d0` (approved toolchain packages), `05cb197` (remove one-shot bootstrap workflow), and `87aaf06` (remaster roadmap). The new implementation begins with `d158419` (`Add Phase 13 renderer feasibility foundation`); later Phase 13 evidence/snapshot commits are implementation follow-up. This distinction matters because a baseline-to-branch diff also includes the prepared research, roadmap, package lock, and tool bootstrap.

## Baseline and toolchain

Before Phase 13 changes, the recorded baseline was 319/319 Vitest tests across 35 files, a 44-module production build, and 54/58 local E2E scenarios; the four incomplete baseline scenarios were Firefox/WebKit launch failures while those Playwright browser binaries were unavailable. After `npm ci`, the Phase 13 local run passes 324/324 Vitest tests across 36 files, the production build, and 64/64 locally available Chromium E2E projects. Playwright 1.63 requires Firefox build 1543 and WebKit build 2359; the workstation cache contained only Firefox 1490 and WebKit 2203. Both official Firefox download mirrors timed out, so the six Firefox/WebKit scenarios were not runnable locally. The GitHub workflow installs the exact current Playwright browsers on Ubuntu and remains the required authority for those results.

Verified project versions:

| Tool | Version / status |
|---|---|
| Node.js / npm | v24.21.0 / 12.0.2 (local workstation) |
| PixiJS | 8.20.1 |
| AssetPack | 1.7.0 |
| SVGO | 4.1.0 |
| poly-decomp | 0.3.0 |
| lil-gui | 0.21.0 |
| Playwright | 1.63.0 |
| Vitest | 2.1.9 |
| Blender LTS | 4.5.10, installed via winget |
| Inkscape | 1.4.4, installed via winget |
| Krita | 5.3.4, installed via winget |
| Official PixiJS skills | Official `pixijs/pixijs-skills` v8 guidance was loaded for this experiment |
| Spector.js | Not installed; no GPU capture is claimed |

The desktop tools and Pixi skill checkout remain outside tracked runtime assets. Pixi is pinned at the approved 8.20.1 version. No packages were upgraded for this work.

## Existing renderer audit

The current Canvas render order and system coupling are documented in `.ai/PHASE13_RENDERER_FEASIBILITY_AUDIT.md`. `GameEngine.render()` owns draw ordering and applies the authoritative camera transform; `MapRenderer` renders the procedural environment/props/residue; PlayerRenderer and KevinRenderer consume their respective authoritative animation/model state; particles belong to `ParticleSystem`; `VfxDirector` selects presentation feedback; DOM owns menus, accessible controls, HUD, Settings, Garage, Challenges, and Results. The Canvas backing bitmap uses the existing logical 960 × 540 frame at capped DPR, and the existing Canvas element remains the pointer event target.

Renderer dependencies found are read-only state consumption except for the pre-existing `GameEngine`/renderer ownership coupling. No renderer owns physics, contact success, score, destruction decisions, Kevin behavior, or Havoc. Risks and controls for resize, DPR, touch, camera, reduced motion, loading, context loss, screenshots, particles, and fallback behavior are recorded in the audit.

## Architecture added

`RendererAdapter` accepts a canonical frame assembled from the live engine and delegates presentation to a Canvas2D implementation or the development-only Pixi feasibility implementation. Canvas remains the fallback. An error thrown by Pixi switches rendering to Canvas for that frame and subsequent frames. The optional Pixi canvas is pointer-transparent and shares the original Canvas element's bounds; the original Canvas remains mounted and remains the DOM input/focus surface. `GameEngine` continues to own Matter and canonical gameplay state.

Renderer selection is available only in development, the dedicated E2E mode, and the isolated `phase13-pixi-spike` build. The normal production build does not expose Pixi, lil-gui, the collision overlay, renderer switches, or E2E bridges; `scripts/assert-production-build.mjs` rejects those markers and test globals in the built production output.

`src/rendering/coordinate_mapper.js` maps client points through the Canvas bounds to the same logical coordinates for both renderers. Camera position, trauma, shake, zoom and reduced-motion scale are read from the existing camera/game state rather than duplicated. E2E hooks for deterministic snapshots exist only in the E2E build on the local test host.

## Pixi feasibility scene

The one-scene experiment includes authored SVG house, fence, hedge, foreground garden, and hydrangea planter; ground, sky/atmosphere, a distant ridge, yard layers, the existing player and Kevin poses, ball, one thrown projectile, one production prop, particles, contact/score feedback, camera effects, and the existing DOM HUD. The Canvas character renderers are used as source textures so current animation state can be represented without duplicating or changing character/gameplay rules. An actual production destruction state is captured through the deterministic E2E fixture.

The Pixi scene preserves the DOM UI and passes the existing reduced-motion state. The reduced-motion capture verifies lowered decorative feedback while preserving the ball and threat cues. Renderer screenshots and controlled Canvas/Pixi comparisons use a fixed 1280 × 720 viewport, DPR 1, fixed Date/time, seeded cosmetic randomness, reset game/environment state, and repeat captures before comparing with committed Playwright snapshots.

## Asset pipeline

Seven authored SVG sources live under `raw-assets/` with provenance/readme files. `npm run build:remaster-assets` runs SVGO 4.1.0, then AssetPack 1.7.0's final-copy pipeline into `public/assets/generated/`; generated output is never hand-edited.

Latest deterministic pipeline evidence:

| Measure | Bytes |
|---|---:|
| Source SVG inputs | 8,572 (7 assets) |
| SVGO output | 7,521 |
| AssetPack runtime SVG output | 7,521 |
| Runtime assets plus generated manifest | 9,901 |

The machine-readable report is `test-results/phase13-asset-pipeline.json` in the E2E/CI evidence artifact; the source SVGs, generated SVGs, and manifest are committed. Runtime URLs use `/assets/generated/...`.

## Collision comparison

The only fixture study is the authored planter versus its inherited 56 × 34 rectangular target. Three candidates were run for the same 90 fixed Matter steps with one incoming ball:

| Candidate | Fixture count | Approx. area | Stability |
|---|---:|---:|---|
| Old rectangle | 1 | 1,904 | finite state; static body displacement 0 |
| Manual compound | 3 | 1,624 | finite state; static body displacement 0 |
| `fromVertices` + poly-decomp | 3 | 1,118 | finite state; static body displacement 0 |

The JSON is `test-results/phase13-prop-collision-comparison.json`. CPU timings in it are noisy local microbenchmarks and are not device-performance claims. No live gameplay fixture was changed. The current recommendation for Phase 17 is to begin with a maintainable small manual compound and compare it visually/stability-wise against the actual prop before considering generated decomposition; do not apply `poly-decomp` globally.

## Visual QA, parity, and performance

`tests/e2e/phase13_visual_evidence.e2e.js` records a Canvas title/baseline and named Pixi states for the scene, player idle/run/kick, Kevin calm/throw, prop, collision overlay, destruction, reduced motion, and Results. Visual captures use Playwright's existing snapshot facility; there is no new image-diff dependency. Eight required screen sizes, Canvas/Pixi coordinate parity, camera effects, real touch movement/action, semantic DOM HUD, and browser-health data are covered by the Phase 13 E2E scenarios. The focused Pixi rendering smoke is assigned to Chromium, Firefox, and WebKit, not the entire historical suite.

The machine-readable renderer/performance comparison is attached as `test-results/phase13-renderer-comparison.json`. The latest local Pixi project run reports Canvas median/p95/p99/max intervals of 15.0/16.6/113.1/148.9 ms and Pixi 52.3/92.2/2026.9/2993 ms, with 120 frames at DPR 1; median renderer-call costs are 1.4 and 1.0 ms respectively. It also reports logical/backing size, Matter/particle/projectile counts, Pixi texture count, and a render-node proxy. It explicitly labels headless measurements as gross-regression evidence, not low-end-device performance; no fabricated GPU draw-call metrics are present. Large Pixi interval outliers varied between runs and are not used as hardware claims.

The clean v1 JavaScript baseline measured 335,855 bytes / 99,985 gzip. Regular production measures 337,055 bytes / 100,396 gzip (+1,200 / +411). The isolated Pixi spike totals 900,090 bytes / 265,391 gzip (+564,235 / +165,406). The release build retains Canvas; production-build negative assertions verify that development-only Pixi, GUI, overlays, toggles, and test hooks are absent.

## Accessibility, touch, and reduced motion

The existing semantic DOM controls, Canvas description/focus, mobile controls, and DOM HUD remain in place. No `role="application"` was added, and Pixi receives pointer events only through the original Canvas. The required 390 × 844, 412 × 915, 844 × 390, 915 × 412, 768 × 1024, 1024 × 768, 1280 × 720, and 1920 × 1080 geometries are included in pointer/surface parity coverage. Pixi uses the same reduced-motion state as production; nonessential effects reduce while ball and danger cues remain visible.

## Phase 13 cross-phase remediation

No inherited gameplay or other Phase 1–12 behavior needed correction in Phase 13. Production integration only adds the optional renderer seam; the adapter is only activated in development/E2E/spike modes. `.ai/CROSS_PHASE_REMEDIATION_LOG.md` records: `No cross-phase remediation required in Phase 13.`

## Corrected test-integrity verification and external evidence

The inherited Phase 12 release regression `tests/e2e/phase12_release_smoke.e2e.js` is byte-for-byte identical to the locked v1 baseline at `802654e517ad28ef5f49d014786f26e5ef50edf0`. Both the baseline Git blob and restored file hash to `093864e87dd0c2b203254de02950fa9e50a27c7c`. The unapproved `test.setTimeout(90_000)` addition was removed without adding a replacement timeout, retry, or assertion change. A baseline-to-Phase-13 test diff audit found no other modified inherited Phase 1–12 regression test; all other Phase 13 test additions are new Phase 13 coverage or the new renderer-adapter unit test.

The new eight-viewport Pixi-touch mapping test exceeded the default 30s budget on one documentation-only CI run (35.3s elapsed); the same test passed in 33.4s on the preceding exact-head run. It now has a 60s test-specific budget so the software-WebGL viewport matrix can finish on the CI runner. The viewport list and all geometry/input assertions are unchanged. This budget applies only to the new Phase 13 test; the inherited Phase 12 test remains the baseline file byte-for-byte.

Clean local verification after restoration:

| Check | Result |
|---|---|
| `npm ci` | PASS |
| `npm test` | 324/324 PASS across 36 files |
| `npm run build` | PASS; 770 modules transformed |
| `npm run test:e2e -- --project=chromium --project=chromium-touch --project=chromium-release` | 54/54 PASS; the two normal Phase 12 release smoke tests took 2.2s and 2.4s |
| `npm run test:e2e -- --project=chromium-pixi-touch --project=chromium-pixi-release` | 10/10 PASS |
| Combined requested Chromium projects | 64/64 PASS |

The exact-head correction Quality Gate was run on restored-test commit `295e8493774abbc5442caa881a5db1c70a9e40a4`: [Quality Gate run 37096648535](https://github.com/jadhavamey2004-netizen/backyard-havoc/actions/runs/37096648535). All four jobs passed:

- Unit tests and production build.
- Chromium desktop, touch, and normal Phase 12 release: 54/54; the inherited Phase 12 tests took 2.3s and 2.2s on the normal Desktop Chrome project.
- Chromium Pixi touch, renderer, and visual evidence: 10/10.
- Firefox and WebKit release smoke: 6/6.

All 70 browser-health records report `pageErrors: 0`, `consoleErrors: 0`, `consoleWarnings: 0`, `failedRequests: 0`, and `sameOriginFailures: 0`.

Artifacts from that exact-head run:

| Artifact | ID | Size | Digest |
|---|---:|---:|---|
| `chromium-release-evidence` | `11264861487` | 34,720,107 bytes | `sha256:34a05cb9e8c6aeedf941cc06eb4c9e3c996fc1d8aa5276c9f1bbd3644f6a7ab4` |
| `phase13-pixi-evidence` | `11263944191` | 5,184,625 bytes | `sha256:4db36a4616fae85c6c3a4f967114c984303ba34565924628638adb358f233b8b` |
| `phase12-cross-browser-evidence` | `11264028670` | 8,542,801 bytes | `sha256:3fc65a83406164360a54864c1d808388f525e3e06a0f224fa6cd53696bb53d33` |

The Vercel Preview deployment `6823240251` is Ready at [backyard-havoc-eokuwiszu-brainy-highlander.vercel.app](https://backyard-havoc-eokuwiszu-brainy-highlander.vercel.app) with deployment SHA exactly `295e8493774abbc5442caa881a5db1c70a9e40a4`. PR #16 remains a draft; its current checks and Preview are the authority for any later documentation-only evidence refresh.

The Firefox/WebKit smoke also asserts that the Pixi canvas is already attached when its WebGL context is created and that no context-loss event occurs during the run. Pixi's default renderer selection probes WebGL by deliberately losing a temporary test context; Firefox reports that probe as a console warning. The feasibility path initializes the explicitly required WebGL renderer directly, avoiding the temporary probe while retaining the live-renderer browser smoke.

`npm audit --omit=dev` reports 0 vulnerabilities. Full `npm audit` reports 9 development/transitive advisories (3 moderate, 5 high, 1 critical) involving the pinned tooling tree, including Vite/Vitest and AssetPack's minimatch/Sharp dependencies. No forced dependency changes were made because the prescribed versions are pinned for this experiment; these findings are a review limitation and should be reassessed before broader adoption of the asset tooling.

## Known limits and deferrals

- One representative yard scene does not establish the quality of all four production themes.
- Player/Kevin are current Canvas renderers represented in Pixi rather than fully authored Phase 16 animations.
- No full prop set, environment remaster, collision conversion, VFX redesign, or HUD redesign was attempted.
- No low-end GPU/mobile-device benchmark or Spector.js capture was performed.
- Pixi context restoration is not an elaborate recovery system; the experiment keeps Canvas as fallback and records initialization/render failures.
- Fullscreen/theater/HUD work belongs to Phase 14 and has not started.
- Subsequent environment, character, destruction, VFX, and UI art implementation remains assigned to later remaster phases; see `.ai/PHASE13_VIDEO_DEFECT_MATRIX.md`.
