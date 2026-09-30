# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Baseline SHA:** `c46709e1e4f97bcb49954b360cc8c23e34f6ee44`
- **Current branch:** `codex/overhaul-phase-0-audit`
- **Current phase:** Phase 0 audit only; no gameplay changes
- **Baseline build:** PASS — Vite 5.4.21, 20 modules, 214.64 kB JS (62.73 kB gzip)
- **Baseline tests:** PASS — 18 files, 60 passed, 0 failed/skipped; headless Web Audio `window` warnings in two test files
- **Baseline playtest:** Short desktop production-preview smoke test; title, start, HUD, canvas and initial game visible; no console errors/warnings captured. Full gameplay loop, restart, mobile and failed-network inspection remain unverified.

## Architecture

Single-page Vite app. `src/main.js` wires DOM, keyboard/pointer/touch input and the animation loop. A large `src/game.js` `GameEngine` coordinates Matter.js simulation, procedural world, collisions, score/state, camera, particles and rendering; separate modules provide player, Kevin/heuristics, audio, map and effects. Tests are Vitest unit/state tests without browser E2E.

## Highest-priority findings

- **Critical issues:** None confirmed in baseline audit.
- **Gameplay:** simulation scores behind title screen; dead 180-second timer; header is not connected; kick/parry gates do not enforce advertised contact/timing; ball can eject left regardless of hit side.
- **Character:** Kevin behavior is heuristic, with dialogue bubble/TTS clocks unsynchronized and stale singleton listeners on repeated engine creation.
- **Animation:** procedural Canvas drawings and state-based poses; no independent animation system/blending; several time effects use wall-clock time.
- **Voice/audio:** browser TTS dependency; pending music notes may continue after stop; audio/speech lifecycle is not fully reset.
- **UI:** missing favicon asset; zoom disabled; canvas accessibility and reduced-motion support are limited.
- **Physics:** Matter.js is the runtime, while docs describe custom Verlet/Swept-AABB; many exported physics formula utilities are not production imports.
- **Performance:** roughly 1,400-line game module, dynamic body/particle cleanup paths merit long-session profiling; capped fixed-step accumulator can discard simulation time under sustained load.
- **Testing:** no browser E2E, screenshot regression, mobile, or performance budget; tests do not verify several production input/render/voice paths.

## Next phase

Wait for external review of the Phase 0 PR. Then agree on a narrow Phase 1 target from the verified findings; do not begin redesign work until review.
