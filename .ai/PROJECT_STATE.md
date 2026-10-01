# Project State

- **Project:** Backyard Havoc (Vite, JavaScript ES modules, Canvas 2D, Matter.js)
- **Official Phase 5 baseline SHA:** `732d853468cd5701f9e47edd699b82d1e2516485` (`main`, Phase 4 merged)
- **Working branch:** `codex/phase-5-kevin-ai-havoc`
- **Current phase:** Phase 5 — Kevin AI, Escalation & Havoc
- **Phase 5 status:** local verification PASS; draft PR Quality Gate pending. External review follows green CI.

## Phase 5 implementation

- `.ai/KEVIN_HAVOC.md` is the gameplay contract, including the human balance review checklist.
- `src/kevin_director.js` owns high-level escalation (`CALM` through `RAMPAGE`), event gains, hysteresis, bounded simulation-time memory, attack policy, and deterministic per-state projectile type patterns. These states remain separate from `NeighborKevinNPC.state`.
- `src/npc.js` retains Phase 4 action/animation states, rage presentation, local dialogue bubble, simulation-time rage decay, and throw execution. Local asynchronous dialogue can display speech but cannot add rage or change gameplay state/cadence.
- `src/havoc_system.js` owns meter gains/decay, six-second Havoc Mode, activation count, and eligible event score bonus policy. `GameEngine.emitGameplayEvent()` applies the policies once and publishes system events through a non-recursive path.
- The existing three-event, three-second trick chain and `1000 * combo` award remain unchanged; completion now publishes `TRICK_CHAIN_COMPLETED`. Power Shot's companion `BALL_CONTACT` is ignored by both systems, leaving `POWER_SHOT` canonical.
- The existing floating HUD now shows `KEVIN: <STATE>`, a labeled 0–100 Havoc bar, and explicit `HAVOC MODE` text. The E2E engine bridge exists only in `MODE === 'e2e'` on hostname `127.0.0.1`.

## Verification status

- **Vitest:** `npm test` PASS — 24 files, 193 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 30 modules transformed. The test bridge is E2E-build-only.
- **Playwright:** `npm run test:e2e` PASS twice — 15 Chromium scenarios each at 1280×720. Every scenario reports zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- **Phase 5 evidence:** the Playwright report includes normal gameplay, Kevin escalation, RAMPAGE, near-full Havoc, active Havoc, and reset screenshots plus browser-health JSON. Traces/screenshots/videos remain configured for failures.
- **GitHub Actions:** see the draft PR's latest Quality Gate and Playwright evidence; the PR description carries the final run and artifact provenance.
- **Human gameplay review:** required. Tests establish state, event, timing, score, lifecycle, determinism, and browser-health rules; they cannot approve balance or the feel of escalation/Havoc.

## Preserved rules and architecture

Phase 1C contact geometry/timing, Phase 2 gameplay feel, Phase 3 character art, and Phase 4 authored animation remain authoritative. The kick/contact/charge/defense rules, player health, base scores, parry forecast, Kevin throw windup/release, projectile spawn, physics constants, and animation model were not redesigned. Projectile type selection is deterministic; legacy angular-spin and direct-hit ejection variations, plus cosmetic dialogue randomness, remain outside this phase's scoped determinism work.

`GameEngine` remains the existing simulation coordinator. Player actions stay in `src/player.js`; Kevin's low-level actions and animation stay in `src/npc.js` and `src/kevin_animation.js`; `src/main.js` retains DOM input, HUD, and the frame loop. No ECS, behavior tree, generic AI framework, event-bus dependency, external AI/model, hosted runtime, paid resource, or new package was added. The local `src/ai.js` dialogue/telemetry simulation is not gameplay AI and has no network client.

Gameplay systems advance only with visible `PLAYING` simulation time after entry hit-stop is consumed. Hidden-page time, hit-stop time, IDLE, intro/ending cutscenes, and game-over time do not advance rage decay, context memory, Havoc decay/duration, or attack cadence. Each run and intro restart resets director memory/patterns, Havoc state/count, and NPC run state; game over retains the final run snapshot.

## Deferred

Phase 6 destruction/environment overhaul and all later work remain untouched. This includes new destruction architecture, VFX, audio/assets, full UI/UX, mobile controls, accessibility overhaul, progression, profiling, and broader architecture work. Human gameplay balance review is still required.
