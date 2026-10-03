# Phase 14 — Rendering Foundation, Theater Presentation & HUD Safe Area

## Status

- Base: `c9a4e779499c6d5bddd595f8da274a91dd41276c`
- Branch: `codex/phase-14-rendering-theater-hud`
- Production renderer: **Canvas2D** (Phase 13 decision C remains in force)
- Matter.js remains authoritative for simulation and gameplay state.
- Phase 14 scope: presentation layout, DOM HUD placement/state, Canvas render-order documentation and repeat-run kickoff presentation.
- Phase 15 environment-art redesign has not started.

## Baseline audit and decision

The original page constrained the Canvas to 1280 px and overlaid a large HUD on the Canvas. It left pronounced outer bands on large screens, put upper gameplay targets behind HUD surfaces, and let defeat copy compete with the DOM HUD. The small landscape touch viewport also inherited a minimum page height that clipped the usable viewport.

Phase 14 uses a viewport-sized theater shell and a three-row grid for the compact header, HUD and gameplay stage. The game frame stays 16:9 and retains the 960 × 540 logical coordinate system. Its CSS width is constrained by the smaller of the safe content width and available viewport height after measured header/HUD allowance. It is not stretched to 100vw × 100vh. The container outline no longer consumes Canvas layout pixels. `dvh`/`svh` sizing and safe-area padding are used while document overflow is clipped at the viewport shell; in-page dialogs retain their own scrolling behavior.

Measured baseline and after rectangles for all 11 requested viewport sizes are in [the presentation audit](PHASE14_PRESENTATION_AUDIT.md) and its raw JSON evidence. At 1920 × 1080 the Canvas grows from 1276 × 716 to 1746 × 982 CSS pixels; at 2560 × 1440 it grows from 1276 × 716 to 2386 × 1342. At 1280 × 720, the new reserved HUD/header rows reduce the Canvas from 1148 × 644 to 1106 × 622; the larger theater benefit is concentrated on displays with enough vertical room, where the legacy ceiling was the constraint.

Fullscreen was evaluated and deferred: automatic theater sizing uses the available viewport without permission, a new focus control, or browser-specific Fullscreen API state. Fullscreen is not required for the presentation improvement.

## HUD safe area and accessibility contract

The semantic DOM HUD is a compact rail above the Canvas, not a Canvas overlay. Its CSS bounds are explicitly measured against client-space projections of Kevin and his window/head, a real Matter projectile, the player/ball action region, and the nearest available upper target. The E2E test fails on any intersection with the header, HUD, HUD cards or controls hint. The current initial world chunk has no destructible-window body; for the “important upper target” case the test uses Kevin’s actual rendered window rectangle. The representative projectile is an actual thrown Clay Pot spawned through Kevin’s projectile callback during test setup.

Visibility/accessibility follows the UI and engine states:

| State | HUD behavior |
|---|---|
| Title/menu | Hidden and unavailable to assistive technology |
| Intro cutscene | Fades out; inert and `aria-hidden` |
| Active play | Visible and available |
| Paused | Shown beneath the modal layer, inert and `aria-hidden` while focus is in the modal |
| Resume/restart | Returns to active HUD state; restart focuses the Canvas as before |
| Ending/defeat cinematic | Fades out so Canvas defeat text owns the scene; inert and `aria-hidden` |
| Results | Hidden while the Results DOM screen owns focus |

The state is class/attribute driven without DOM mount/unmount churn. The Resume and Pause button remain reachable by ordinary keyboard navigation. Existing focus, menu semantics, progress indicators and reduced-motion behavior are retained; the Phase 14 transition is limited to opacity and respects the existing reduced-motion stylesheet.

## Canvas, input and render ordering

- The logical world remains 960 × 540. Resize changes CSS presentation while Canvas backing dimensions follow the existing capped-DPR policy.
- Client pointer coordinates are checked at multiple viewport sizes against the logical 960 × 540 mapping; resize does not add another transform.
- Touch movement stays on the existing DOM controls, above/alongside the safe Canvas area, with at least 48 px target dimensions and safe-area bounds.
- Canvas paint order is made explicit in `GameEngine.render()` comments: far atmosphere, far skyline, architecture, fence/midground vegetation, world props, actors/ball/Kevin/projectiles, world VFX, screen VFX, then the DOM HUD/overlays. No new renderer abstraction or Pixi production import was added.
- Reduced motion remains governed by the existing preference/override system. Theater resize does not animate a camera zoom.

## Kickoff and gameplay boundary

The first run keeps its larger 1.5 second kickoff treatment. Following runs use a compact 0.55 second banner, reducing repeated central obstruction while preserving the initial communication. No physics, scoring, health, AI, Havoc, progression or affiliate behavior was changed.

## Tests and evidence

`tests/e2e/phase14_theater_hud.e2e.js` adds deterministic coverage for:

- 11 desktop/general viewports: 1280 × 720, 1366 × 768, 1440 × 900, 1920 × 1080, 2560 × 1440, 390 × 844, 412 × 915, 844 × 390, 915 × 412, 768 × 1024 and 1024 × 768;
- six actual touch/DPR 2 viewport cases, safe insets, control bounds and touch target size;
- 16:9 geometry, no overflow, no HUD/critical-world overlap, legacy 1280 px ceiling regression and pointer mapping;
- HUD title/intro/playing/paused/ending/Results visibility and accessibility state;
- clean defeat presentation and compact fast restart with Canvas focus;
- DPR 3 input with effective DPR capped at 2.5, backing dimensions, frame interval sample, particle cap and Matter body count.

The tests attach stable screenshots for active desktop, Kevin/window safe area, defeat, restart, portrait, landscape and tablet states, plus baseline fixtures for direct comparison. Raw measurements are in `.ai/evidence/phase14/`.

Local verification:

- `npm ci`: passed.
- `npm test`: 324/324 tests passed.
- `npm run build`: passed.
- Chromium, Chromium touch, normal Chromium release, Pixi touch and Pixi release E2E projects: 69 passed, 5 project-guard skips. Browser-health attachments were empty in all 74 records.
- The unfiltered `npm run test:e2e` could not finish its Firefox/WebKit projects because their Playwright executables are absent on this machine. Downloading Firefox from the configured CDN progressed at about 50 KB/s, so the browser install was stopped. The unfiltered run’s two Phase 13 full-page snapshot mismatches were the expected Phase 14 layout changes; the strict snapshot fixtures were refreshed and their 3-test Chromium Pixi visual suite passed afterward. Exact-head GitHub CI remains responsible for the Firefox/WebKit release checks.
- `npm audit --omit=dev`: zero findings. Full `npm audit`: 9 findings in the existing development/tooling dependency tree (3 moderate, 5 high, 1 critical); package and lock files are unchanged.

Exact-head CI, workflow artifact and Vercel Preview provenance are recorded in the final handoff and draft PR description after remote verification.

The existing Phase 13 visual test code and strict same-pixel snapshot assertions remain unchanged. Its expected full-page screenshot fixtures were refreshed because the intentionally changed Phase 14 header/HUD/Canvas composition changes those captures. The deterministic production Canvas/Pixi render-state scenarios still run against the same unchanged assertions; no tolerance or retry was added.

## Cross-phase remediation

The inherited DOM HUD could cover Canvas defeat text because the HUD remained visible during the ending/game-over sequence. Phase 14 gives the cinematic state the presentation layer: the HUD becomes transparent, inert and `aria-hidden` during intro/ending, and hidden on Results. Regression coverage captures both ending and Results states. Details are recorded in `.ai/CROSS_PHASE_REMEDIATION_LOG.md`.

## Known limits and Phase 15 deferrals

- A 16:9 game remains letterboxed in portrait because the logical game world is not cropped or distorted; the portrait Canvas is width-limited.
- Very short landscape viewports prioritize the header, HUD and touch controls, so the visible game area is narrower than the screen width.
- CSS rectangle tests prove geometry and visibility, not GPU throughput. The 30-frame sample is a gross-regression observation, not a hardware performance benchmark.
- Phase 15 environment-art, palette/lighting, prop art and renderer decisions remain untouched. Pixi feasibility projects/tests are retained in their Phase 13 isolation.

## Final evidence

Final exact-head Quality Gate, Playwright artifact, Vercel Preview deployment and final branch head are recorded in the Phase 14 handoff and draft PR description after all local checks complete.
