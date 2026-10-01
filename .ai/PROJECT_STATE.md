# Project State

- **Project:** Backyard Havoc (Vite, JavaScript ES modules, Canvas 2D, Matter.js)
- **Phase 3 baseline SHA:** `b196fb485f6268e6423280428f7cc7643cd6f66d` (`main`, merged Phase 2)
- **Working branch:** `codex/phase-3-character-design-overhaul`
- **Current phase:** Phase 3 implementation complete; local verification PASS; draft PR/CI pending.
- **Phase 3 scope:** Original Canvas-vector character redesign for the player and Kevin, named palettes/proportions/pose anchors, explicit production-state expression mappings, renderer extraction, deterministic Playwright character sheets and baseline comparison. Gameplay remains governed by Phase 1C rules and Phase 2 feel behavior.
- **Phase 2 baseline:** merged to `main`; official Phase 3 baseline quality gate verified 136 unit tests, production build, and 8 Chromium scenarios before this branch was created.

## Current implementation notes

- `.ai/CHARACTER_ART_DIRECTION.md` is the Phase 3 art contract and human-review checklist. It records the pre-redesign audit, origins, proportions, layer order, palette, state/expression mapping, rendering rules, test requirements, and known limitations.
- `src/player.js` and `src/npc.js` retain gameplay/model ownership. Their `draw()` entry points delegate to `src/player_renderer.js` and `src/kevin_renderer.js`; `src/character_style.js` contains named style tokens, explicit state maps and drawing-only pose anchors.
- The player keeps its current world coordinates, kick/header points, timing, movement, charge, damage and invulnerability behavior. Kevin keeps his window-centered position, AI states, rage/throw timings and projectile behavior. No gameplay rule was changed.
- `src/character_showcase.js` is imported only by the dedicated E2E build mode on the local Playwright host. It composes real production model draw methods. Production builds tree-shake the QA route; the QA build goes to ignored `dist-e2e/` and cannot replace `dist/`.
- `tests/e2e/fixtures/phase-3-baseline-gameplay.png` is the gameplay screenshot captured from baseline Quality Gate artifact `11134911638` for the exact baseline SHA. The E2E report attaches it beside live gameplay and both character sheets.
- `#game-canvas` no longer requests pixel-art scaling; Canvas vector artwork uses browser smoothing. The environment, HUD, effects and scene ordering remain otherwise unchanged.

## Verification status

- **Vitest:** `npm test` PASS — 21 files, 145 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 25 modules transformed.
- **Playwright:** `npm run test:e2e` PASS twice — 11 Chromium scenarios per run at 1280×720 and one worker. Both runs reported zero page errors, console errors, console warnings, failed requests, and same-origin failures for every scenario.
- **Character evidence:** each E2E run attaches a player sheet (idle, running, kick, header, hurt, charge), a Kevin sheet (repairing/neutral, watchful, irritated, angry, throwing/shouting, bonked), a live gameplay screenshot, the baseline screenshot, and per-scenario browser-health JSON. Traces, screenshots and videos remain configured for failure cases.
- **GitHub Actions:** pending the Phase 3 draft PR.
- **Human art review:** required. Automated tests verify rendering structure, state coverage, finite coordinates, context balance and non-mutation; they do not approve aesthetics.

## Architecture

The single-page Vite app continues to use the existing GameEngine coordinator for Matter.js simulation, score/state, camera, particles and render order. Player movement/action/contact logic stays in `src/player.js`; Kevin state/AI logic stays in `src/npc.js`. Character-only appearance and draw geometry are separated into style/renderer modules. `src/main.js` still owns DOM input and the animation loop. No animation runtime or full animation architecture was introduced.

## Deferred

Phase 4 full animation remains untouched: no authored clips, skeletal runtime, IK, sprite sheets, motion curves, interpolation, blending, or animation events. Kevin AI/escalation, Havoc systems, world/environment art, destruction, VFX/audio, UI, mobile controls, accessibility overhaul, progression, profiling, and broad architecture work also remain out of scope. Human approval of character design and later Phase 4 motion quality is still required.
