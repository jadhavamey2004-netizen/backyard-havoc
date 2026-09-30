# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Phase 2 baseline SHA:** `fc25a4b48887b4112bc168d397ef01c7dcd61553` (`main`, verified Phase 1C merge)
- **Working branch:** `codex/phase-2-core-gameplay-feel`
- **Current phase:** Phase 2 local verification + PR CI PASS; awaiting external review.
- **Phase 2 scope:** Responsive movement, deterministic kick/header/power-shot physics, time-correct ball damping and hit-stop, tiered contact feedback, time-correct camera tracking, procedural pose synchronization, and velocity-led ball presentation. Phase 1C gameplay rules remain authoritative and unchanged.
- **Phase 1B predecessor:** Lifecycle/reset/visibility/runtime correctness fixes remain part of the merged baseline. `.ai/INITIAL_AUDIT.md` remains historical evidence.

## Current implementation notes

- Standard run is survival-based; active time does not end it. Health zero starts defeat/results.
- Football action duration, strike interval, head/foot zones, charge, defense windows, rewards, and grounded grace are named tuning values in `src/gameplay_rules.js`.
- Variable-step simulation time is capped to the physics budget of three fixed 1/60-second ticks per update, keeping player/action clocks from outpacing the capped world simulation.
- Pointer release resolves a qualifying projectile defense immediately using release-time charge/aim and threat state; otherwise it starts one football action. Football consequences require a selected real contact in the strike interval and can occur only once.
- Projectile threat selection uses bounded deterministic fixed steps with Matter gravity and stable tie-breaking. An already-overlapping projectile is not a defense opportunity.
- Combo increments only on successful ball contacts and parry tiers; Perfect Parry is one atomic +2 transition. Ground grace counts only continuous grounded time. Reset/constructor gameplay events remain silent.
- Current controls are A/D or arrows, optional Shift, pointer aim, contextual pointer action, and hold-to-charge. Header is contextual with no dedicated key.
- `.ai/GAMEPLAY_FEEL.md` records initial feel tuning and the human playtest checklist; automated test results do not claim that subjective feel has passed.

## Verification status

- **Vitest:** `npm test` PASS — 20 files, 135 tests.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 22 modules transformed.
- **Playwright:** `npm run test:e2e` PASS twice — 8 Chromium scenarios per run at 1280×720. Each run reported zero page errors, console errors/warnings, failed requests, and same-origin failures. The browser smoke suite attaches per-test health JSON and gameplay screenshots; Playwright retains traces/screenshots/videos on failure.
- **GitHub Actions:** Review the Phase 2 draft PR's latest Quality Gate for unit/build, Chromium browser smoke, browser-health output, and the Playwright evidence artifact.
- **Known limits:** Baseline Vitest runs print existing headless Web Audio `window is not defined` diagnostics. All subjective feel values require human playtesting. Complete mobile controls, canvas accessibility, reduced-motion support, browser audio/TTS variability, long-session performance, and gameplay balance remain outside this phase.

## Architecture

Single-page Vite app. `src/main.js` wires DOM, keyboard/pointer/touch input and the animation loop. `src/game.js` remains the existing GameEngine coordinator for Matter.js simulation, world/collisions, score/state, camera, particles and rendering. `src/player.js` owns action timing/contact zones and locomotion. `src/gameplay_rules.js` contains authoritative Phase 1C rules; `src/gameplay_feel.js` contains deterministic feel tuning and pure response helpers. This work does not refactor the engine architecture.

## Deferred

Later overhaul phases: Havoc meter and escalation decisions; timed/daily modes; broad score/balance pass; character design, full animation, UI, destruction, audio, voice, world art, and mobile redesign; progression; performance profiling; and broad architecture refactoring. Human playtesting of core feel remains required before subjective tuning can be treated as validated.
