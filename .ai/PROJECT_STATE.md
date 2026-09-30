# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Baseline SHA:** `149fd28e3ddce8e4826ca15f53876de30b2fffba` (merged Phase 1A baseline)
- **Current branch:** `codex/phase-1b-runtime-correctness`
- **Current phase:** Phase 1B — Run Lifecycle & Verified Runtime Correctness; implementation complete locally, external review pending
- **Confirmed runtime fixes:** `IDLE` and `GAME_OVER` no longer simulate; intro/ending remain cinematic and suppress Kevin attacks; duplicate keyboard handlers are consolidated; Kevin uses supported states; reset restores transient engine/player/NPC/map state while keeping records, mute preference, and callbacks; hidden tabs pause simulation/music and rebase frame time; Kevin ejects according to impact side; kick and power-shot consequences require contact and one hit per kick.
- **Local quality gate:** `npm test` PASS — 18 files, 67 passed; `npm run build` PASS — Vite 5.4.21, 20 modules, 216.50 kB JS (63.04 kB gzip).
- **Playwright:** `npm run test:e2e` PASS twice locally — 6 Chromium scenarios per run at the configured fixed viewport, one worker. Browser-health reports recorded zero page errors, console errors/warnings, failed requests, and same-origin failures. The new title-idle test attaches a screenshot; browser report artifacts follow the Phase 1A CI retention configuration.
- **GitHub Actions:** Phase 1B draft PR and head-specific workflow results are pending.
- **Known limitations:** Vitest continues to emit expected headless Web Audio `window is not defined` warnings in cutscene/input tests. Browser-level visibility emulation is not covered; deterministic engine visibility tests verify the pause/resume contract. Dependency audit findings from Phase 1A remain unchanged and were not remediated here. Full visual, mobile, and performance coverage remain out of scope.

## Architecture

Single-page Vite app. `src/main.js` wires DOM, keyboard/pointer/touch input and the animation loop. A large `src/game.js` `GameEngine` coordinates Matter.js simulation, procedural world, collisions, score/state, camera, particles and rendering; separate modules provide player, Kevin/heuristics, audio, map and effects. Tests are Vitest unit/state tests without browser E2E.

## Highest-priority findings

- **Critical issues:** None confirmed in baseline audit.
- **Gameplay:** Phase 1B regression coverage confirms title-time simulation and non-contact kick scoring are fixed. The 180-second timer design, header wiring, and parry timing remain unresolved by design for Phase 1C.
- **Character:** Kevin still uses heuristic behavior, and dialogue bubble/TTS clocks may be unsynchronized. Phase 1B removed the unsupported cutscene state and suppressed cutscene attacks; other character behavior was not redesigned.
- **Animation:** procedural Canvas drawings and state-based poses; no independent animation system/blending; cutscene shout pose is not implemented; canvas interpolation may be pixel-art-oriented and needs presentation review.
- **Voice/audio:** browser TTS dependency; pending music notes may continue after stop; audio/speech lifecycle is not fully reset.
- **UI:** missing favicon asset; zoom disabled; canvas accessibility and reduced-motion support are limited.
- **Physics:** Matter.js is the runtime, while docs describe custom Verlet/Swept-AABB; many exported physics formula utilities are not production imports.
- **Performance:** roughly 1,400-line game module, dynamic body/particle cleanup paths merit long-session profiling; capped fixed-step accumulator can discard simulation time under sustained load.
- **Testing:** Phase 1A GitHub quality checks and Chromium E2E are in place. Screenshot comparisons, mobile coverage, performance budgets, and several production input/render/voice paths remain outside the current suite.

## Next phases

1. **1B Run lifecycle correctness:** implementation and focused local verification are complete; wait for Phase 1B PR review/CI.
2. **1C Gameplay truth:** survival vs timed mode, authoritative controls, header scope, and parry timing remain undecided and untouched.

Defer major architecture, gameplay and visual overhaul until those checks and decisions are reviewed.
