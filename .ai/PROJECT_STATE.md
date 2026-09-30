# Project State

- **Project:** Backyard Havoc (Vite, Canvas 2D, Matter.js)
- **Baseline SHA:** `4b4dc968db7272432690811b8ac41ae28d2fbb2e` (Phase 0 merged to `main`)
- **Current branch:** `codex/phase-1a-quality-gate`
- **Current phase:** Phase 1A — Quality Gate / Reproducibility; no gameplay changes
- **Local quality gate:** `npm ci` PASS; `npm test` PASS — 18 files, 60 passed; `npm run build` PASS — Vite 5.4.21, 20 modules, 214.64 kB JS (62.73 kB gzip)
- **Playwright:** Chromium smoke tests PASS locally in two consecutive runs — 5 scenarios each at 1280×720, one worker. GitHub run `36685340196` also passed all 5 scenarios; each recorded zero page errors, console errors/warnings, failed requests, and same-origin HTTP failures. Scenario screenshots and browser-health diagnostics attach to the HTML report; traces, screenshots and video are retained on failure.
- **GitHub Actions:** Run `36685340196` PASS — unit/build job and Chromium job both green; CI artifact `playwright-evidence` uploaded (7-day retention).
- **Known limitations:** Vitest emits existing headless Web Audio `window is not defined` warnings in two test files. `npm ci` reports 5 dependency audit vulnerabilities (3 moderate, 1 high, 1 critical); no automated dependency upgrades were applied. Full gameplay, mobile, and visual regression coverage remain out of scope.

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

1. **1B Run lifecycle correctness:** title/IDLE simulation, duplicate input methods, unsupported Kevin state, reset contract, focus/background pause, hit direction/contact and documented input truth.
2. **1C Gameplay truth:** decide survival vs timed, authoritative controls, header scope and parry timing.

Defer major architecture, gameplay and visual overhaul until those checks and decisions are reviewed.
