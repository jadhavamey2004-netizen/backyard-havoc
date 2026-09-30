# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Phase 1C baseline SHA:** `e383938201825bbc3286c292cdcf35831e8002f4` (`main`)
- **Working branch:** `codex/phase-1c-gameplay-truth`
- **Current phase:** Phase 1C local verification + PR CI PASS; awaiting external review.
- **Phase 1C scope:** Survival run lifecycle, authoritative contextual controls, timed kick/header contact, immediate threat-first defense, deterministic gravity-aware threat prediction, combo/score/event semantics, current-facing documentation, focused browser smoke coverage.
- **Phase 1B predecessor:** Lifecycle/reset/visibility/runtime correctness fixes are included in the baseline. `.ai/INITIAL_AUDIT.md` remains the original historical audit.

## Current implementation notes

- Standard run is survival-based; active time does not end it. Health zero starts defeat/results.
- Football action duration, strike interval, head/foot zones, charge, defense windows, rewards, and grounded grace are named tuning values in `src/gameplay_rules.js`.
- Variable-step simulation time is capped to the physics budget of three fixed 1/60-second ticks per update, keeping player/action clocks from outpacing the capped world simulation.
- Pointer release resolves a qualifying projectile defense immediately using release-time charge/aim and threat state; otherwise it starts one football action. Football consequences require a selected real contact in the strike interval and can occur only once.
- Projectile threat selection uses bounded deterministic fixed steps with Matter gravity and stable tie-breaking. An already-overlapping projectile is not a defense opportunity.
- Combo increments only on successful ball contacts and parry tiers; Perfect Parry is one atomic +2 transition. Ground grace counts only continuous grounded time. Reset/constructor gameplay events remain silent.
- Current controls are A/D or arrows, optional Shift, pointer aim, contextual pointer action, and hold-to-charge. Header is contextual with no dedicated key.

## Verification status

- **Vitest:** `npm test` PASS — 19 files, 110 tests.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 21 modules transformed.
- **Playwright:** `npm run test:e2e` PASS twice — 7 Chromium scenarios per run at 1280×720. Each run reported zero page errors, console errors/warnings, failed requests, and same-origin failures. The browser smoke suite attaches per-test health JSON and a title screenshot; Playwright retains traces/screenshots/videos on failure.
- **GitHub Actions:** See draft PR #4's latest Quality Gate run for the unit/build and Chromium results, browser-health logs, and uploaded `playwright-evidence` artifact.
- **Known limits:** The passing Vitest run prints existing headless Web Audio `window is not defined` diagnostics. Tuning and visual feel still require playtesting. Complete mobile controls, canvas accessibility, reduced-motion support, browser audio/TTS variability, long-session performance, and gameplay balance remain outside this phase.

## Architecture

Single-page Vite app. `src/main.js` wires DOM, keyboard/pointer/touch input and the animation loop. `src/game.js` remains the existing GameEngine coordinator for Matter.js simulation, world/collisions, score/state, camera, particles and rendering. `src/player.js` owns action timing and contact zones; `src/gameplay_rules.js` contains named gameplay tuning and deterministic pure rule helpers. This work does not refactor the engine architecture.

## Deferred

Phase 1D and later: Havoc meter and escalation decisions; timed/daily modes; broad score/balance pass; character, animation, UI, destruction, audio, and mobile redesign; progression; visual polish; and broad architecture refactoring. These areas remain untouched unless an approved Phase 1C correctness rule requires a narrow change.
