# Phase 13 Visual Remaster Foundation

## Purpose and provenance

Phase 13 is a new post-release Visual Remaster track. The original Phase 1–12 overhaul is complete and release-verified; this work is not unfinished v1 work. The verified v1 production baseline is `802654e517ad28ef5f49d014786f26e5ef50edf0`. The existing Phase 13 branch began at `87aaf06929348acff538291f094ad756d49bf8ba`, a descendant of the baseline. Its earlier prepared commits pin and install the approved toolchain; implementation in this review handoff is limited to the renderer/asset feasibility work and evidence described here.

No main-branch changes, production deployment, gameplay retuning, or Phase 14 implementation are part of this work.

### Prepared toolchain history versus Phase 13 implementation

The commits already present on the branch through the starting head `87aaf06929348acff538291f094ad756d49bf8ba` were prepared handoff material, not implementation from this turn: `b87899e` (free bootstrap script), `039c5c2` (agent guardrails), `207d9db` and `36f9819` (npm bootstrap/package setup), `d3639ac`, `3ca87cf`, and `adf23a7` (stable PixiJS pin), `14937d0` (approved toolchain packages), `05cb197` (remove one-shot bootstrap workflow), and `87aaf06` (remaster roadmap). The new implementation begins with `d158419` (`Add Phase 13 renderer feasibility foundation`); later Phase 13 evidence/snapshot commits are implementation follow-up. This distinction matters because a baseline-to-branch diff also includes the prepared research, roadmap, package lock, and tool bootstrap.

## Baseline and toolchain

Before Phase 13 changes, the recorded baseline was 319/319 Vitest tests across 35 files, a 44-module production build, and 54/58 local E2E scenarios; the four incomplete baseline scenarios were Firefox/WebKit launch failures while those Playwright browser binaries were unavailable. After `npm ci`, the Phase 13 local run passes 324/324 Vitest tests across 36 files, the production build, and 63/63 Chromium E2E projects. Playwright 1.63 requires Firefox build 1543 and WebKit build 2359; the workstation cache contained only Firefox 1490 and WebKit 2203. Both official Firefox download mirrors timed out, so the six Firefox/WebKit scenarios were not runnable locally. The GitHub workflow installs the exact current Playwright browsers on Ubuntu and remains the required authority for those results.

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

The machine-readable renderer/performance comparison is attached as `test-results/phase13-renderer-comparison.json`. The final local Chromium sample reports Canvas median/p95/p99/max intervals of 15.4/16.6/17.3/28.4 ms and Pixi 30.3/47.8/1260.4/1567.3 ms, with 120 frames at DPR 1; median renderer-call costs are 1.2 and 1.0 ms respectively. It also reports logical/backing size, Matter/particle/projectile counts, Pixi texture count, and a render-node proxy. It explicitly labels headless measurements as gross-regression evidence, not low-end-device performance; no fabricated GPU draw-call metrics are present. Large Pixi interval outliers varied between runs and are not used as hardware claims.

The clean v1 JavaScript baseline measured 335,855 bytes / 99,985 gzip. Regular production measures 337,055 bytes / 100,396 gzip (+1,200 / +411). The isolated Pixi spike totals 970,374 bytes / 286,341 gzip (+634,519 / +186,356). The release build retains Canvas; production-build negative assertions verify that development-only Pixi, GUI, overlays, toggles, and test hooks are absent.

## Accessibility, touch, and reduced motion

The existing semantic DOM controls, Canvas description/focus, mobile controls, and DOM HUD remain in place. No `role="application"` was added, and Pixi receives pointer events only through the original Canvas. The required 390 × 844, 412 × 915, 844 × 390, 915 × 412, 768 × 1024, 1024 × 768, 1280 × 720, and 1920 × 1080 geometries are included in pointer/surface parity coverage. Pixi uses the same reduced-motion state as production; nonessential effects reduce while ball and danger cues remain visible.

## Phase 13 cross-phase remediation

No inherited gameplay or other Phase 1–12 behavior needed correction in Phase 13. Production integration only adds the optional renderer seam; the adapter is only activated in development/E2E/spike modes. `.ai/CROSS_PHASE_REMEDIATION_LOG.md` records: `No cross-phase remediation required in Phase 13.`

## Verification and external evidence

| Check | Local result |
|---|---|
| `npm ci` | PASS |
| `npm test` | 324/324 PASS across 36 files |
| `npm run build` | PASS; 770 modules transformed |
| Production hygiene assertion | PASS; 11 output files, no E2E globals, local paths, source maps, Pixi/tuning/debug markers |
| `npm run build:pixi-spike` | PASS |
| `npm run compare:remaster-collision` | PASS; all three bodies finite, no static-body displacement |
| Chromium E2E projects | 63/63 PASS (desktop, inherited touch, Pixi touch, release and visual projects); the six Phase 13 touch/renderer checks and three deterministic visual comparisons re-run PASS after final-source cleanup |
| Firefox/WebKit E2E projects | Not runnable locally: required browser revisions absent and download mirrors timed out; no tests disabled in CI |
| Chromium browser health | All captured records: pageErrors 0, consoleErrors 0, consoleWarnings 0, failedRequests 0, sameOriginFailures 0 |

`npm audit --omit=dev` reports 0 vulnerabilities. Full `npm audit` reports 9 development/transitive advisories (3 moderate, 5 high, 1 critical) involving the pinned tooling tree, including Vite/Vitest and AssetPack's minimatch/Sharp dependencies. No forced dependency changes were made because the prescribed versions are pinned for this experiment; these findings are a review limitation and should be reassessed before broader adoption of the asset tooling.

GitHub must provide exact-head Quality Gate, Chromium visual evidence artifact, Firefox/WebKit smoke results, and Vercel Preview provenance before the Phase 13 review handoff is final. No interim SHA is final evidence.

## Known limits and deferrals

- One representative yard scene does not establish the quality of all four production themes.
- Player/Kevin are current Canvas renderers represented in Pixi rather than fully authored Phase 16 animations.
- No full prop set, environment remaster, collision conversion, VFX redesign, or HUD redesign was attempted.
- No low-end GPU/mobile-device benchmark or Spector.js capture was performed.
- Pixi context restoration is not an elaborate recovery system; the experiment keeps Canvas as fallback and records initialization/render failures.
- Fullscreen/theater/HUD work belongs to Phase 14 and has not started.
- Subsequent environment, character, destruction, VFX, and UI art implementation remains assigned to later remaster phases; see `.ai/PHASE13_VIDEO_DEFECT_MATRIX.md`.
