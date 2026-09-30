# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Baseline SHA:** `c46709e1e4f97bcb49954b360cc8c23e34f6ee44`
- **Current branch:** `codex/overhaul-phase-0-audit`
- **Current phase:** Phase 0 audit only; no gameplay changes
- **Baseline build:** PASS locally in Codex — Vite 5.4.21, 20 modules, 214.64 kB JS (62.73 kB gzip); GitHub did not run it
- **Baseline tests:** PASS locally in Codex — 18 files, 60 passed, 0 failed/skipped; headless Web Audio `window` warnings in two test files; no GitHub CI run/checks
- **Baseline playtest:** Short desktop production-preview smoke test; title, start, HUD, canvas and initial game visible; no console errors/warnings captured. Full gameplay loop, restart, mobile and failed-network inspection remain unverified.

## Architecture

Single-page Vite app. `src/main.js` wires DOM, keyboard/pointer/touch input and the animation loop. A large `src/game.js` `GameEngine` coordinates Matter.js simulation, procedural world, collisions, score/state, camera, particles and rendering; separate modules provide player, Kevin/heuristics, audio, map and effects. Tests are Vitest unit/state tests without browser E2E.

## Highest-priority findings

- **Critical issues:** None confirmed in baseline audit.
- **Gameplay:** simulation scores behind title screen; dead 180-second timer; header is not connected; kick/parry gates do not enforce advertised contact/timing; ball can eject left regardless of hit side.
- **Character:** Kevin behavior is heuristic, with dialogue bubble/TTS clocks unsynchronized, stale singleton listeners on repeated engine creation, and cutscenes assigning unsupported `SHOUTING_OUT` state.
- **Animation:** procedural Canvas drawings and state-based poses; no independent animation system/blending; cutscene shout pose is not implemented; canvas interpolation may be pixel-art-oriented and needs presentation review.
- **Voice/audio:** browser TTS dependency; pending music notes may continue after stop; audio/speech lifecycle is not fully reset.
- **UI:** missing favicon asset; zoom disabled; canvas accessibility and reduced-motion support are limited.
- **Physics:** Matter.js is the runtime, while docs describe custom Verlet/Swept-AABB; many exported physics formula utilities are not production imports.
- **Performance:** roughly 1,400-line game module, dynamic body/particle cleanup paths merit long-session profiling; capped fixed-step accumulator can discard simulation time under sustained load.
- **Testing:** no GitHub Actions checks, browser E2E, screenshot regression, mobile, or performance budget; tests do not verify several production input/render/voice paths. Baseline test/build are local Codex evidence only.

## Next phases

1. **1A Quality gate/reproducibility:** GitHub Actions (`npm ci`, `npm test`, `npm run build`), Playwright Chromium smoke tests, console capture, fixed viewport and artifacts.
2. **1B Run lifecycle correctness:** title/IDLE simulation, duplicate input methods, unsupported Kevin state, reset contract, focus/background pause, hit direction/contact and documented input truth.
3. **1C Gameplay truth:** decide survival vs timed, authoritative controls, header scope and parry timing.

Defer major architecture, gameplay and visual overhaul until those checks and decisions are reviewed.
