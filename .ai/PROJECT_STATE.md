# Project State

- **Project:** Backyard Havoc (Vite, JavaScript ES modules, Canvas 2D, Matter.js)
- **Official Phase 4 baseline SHA:** `449b47f8ca1821d0f102fdbb9732991380ce1075` (`main`, merged Phase 3)
- **Phase 3 merge Quality Gate:** run `36803652153`; 145/145 Vitest tests, production build, 11/11 Chromium scenarios, all browser-health counters zero; Playwright artifact `11136574402` (1,850,337 bytes) matched the exact baseline.
- **Working branch:** `codex/phase-4-character-animation-overhaul`
- **Current phase:** Phase 4 local verification PASS; draft PR #7 open for external review.
- **Phase 4 scope:** deterministic, authored procedural animation for the existing player and Kevin designs. No gameplay, AI escalation, Havoc, world, destruction, VFX, audio, UI, mobile, progression, or broad architecture overhaul.

## Current implementation

- `.ai/CHARACTER_ANIMATION.md` is the Phase 4 animation contract and human-review checklist. `.ai/CHARACTER_ART_DIRECTION.md` remains authoritative for the approved Phase 3 appearance, colors, proportions, and silhouette; its descriptions of earlier motion are historical and superseded by the Phase 4 contract.
- `src/animation_utils.js`, `src/player_animation.js`, and `src/kevin_animation.js` provide bounded easing, simulation-time clocks, deterministic pose functions, and small per-character presentation controllers. Existing character model classes still own gameplay state and pass elapsed simulation time to their controller.
- `src/player_renderer.js` and `src/kevin_renderer.js` draw the existing Phase 3 character construction from production animation anchors. Pose sampling and rendering do not advance timers or mutate models.
- Player kick and header anchors align to the unchanged `getKickPosition()` and `getHeaderPosition()` world points at mid-contact, including the existing vertical squash transform. Kevin's release-hand anchor aligns to the unchanged projectile spawn point in either facing.
- Player/ Kevin body animation, invulnerability blinking, Kevin throw/reaction motion, and cosmetic high-rage steam timing use simulation time. Hidden-page and hit-stop guards therefore hold their current pose. Existing dialogue-cooldown wall-clock timing remains gameplay policy, not character animation.
- The approved 3 HP, invulnerability, movement, sprint, action/contact, charge, defense, score/combo, hit-stop, projectile, Kevin state/rage/throw, and lifecycle rules remain authoritative. GameEngine additions only trigger presentation accents after successful contact and tick pose clocks inside existing cutscene time.
- `src/character_showcase.js` exposes test-build-only production pose sheets and player-kick/Kevin-throw sequence strips. Normal gameplay evidence remains part of the Chromium suite; the test route is limited to the E2E build on the local Playwright host.

## Verification status

- **Vitest:** `npm test` PASS — 22 files, 166 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 28 modules transformed.
- **Playwright:** `npm run test:e2e` PASS twice — 13 Chromium scenarios per run at 1280×720 with one worker. Every scenario reports zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- **Animation evidence:** both runs attach a 10-pose player sheet, 10-pose Kevin sheet, player kick sequence strip, Kevin throw sequence strip, live gameplay screenshot, baseline comparison screenshot, and per-scenario browser-health JSON. Player evidence includes run/contact, anticipation, kick contact, follow-through, header preparation/contact, charge, and hurt. Kevin evidence includes watchful, rage, shout, windup/release/follow-through, bonk/dizzy, and repairing. Traces, screenshots, and videos remain configured for failures; video is optional.
- **GitHub Actions:** check PR #7 for the latest final-head Quality Gate and Playwright evidence artifact; run details are maintained in the PR description.
- **Human animation review:** required. Tests establish timing, contact geometry, deterministic structure, finite poses, immutability, and browser health; they cannot approve motion quality.

## Architecture

The app retains the existing `GameEngine` coordinator for Matter.js simulation, score/state, camera, particles, and render order. Player movement/action/contact remains in `src/player.js`; Kevin state/rage/throw behavior remains in `src/npc.js`. Presentation controllers produce pure local pose anchors and are advanced only by existing simulation `dt`. The Canvas renderers consume those poses without owning clocks. `src/main.js` still owns DOM input and the animation loop. No skeletal runtime, ECS, external animation library, or generic animation graph was added.

## Deferred

Phase 5 Kevin AI/escalation/Havoc remains untouched, including new gameplay states or rage policy, Havoc meter/mode/scoring/UI/music, and gameplay changes to Kevin throws. World/environment art, destruction, VFX, audio/VO, UI/UX, mobile controls, accessibility overhaul, progression, profiling, and broad architecture work also remain out of scope. Human animation approval is still required.
