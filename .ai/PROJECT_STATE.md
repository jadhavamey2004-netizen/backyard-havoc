# Project State

## Phase 9 — UI/UX overhaul

- **Status:** Local implementation and verification PASS; final local runs were 293/293 Vitest, production build PASS (39 modules), and 25/25 Chromium E2E. All 25 browser-health records had zero page errors, console errors/warnings, failed requests, and same-origin failures. GitHub Quality Gate, Vercel Preview, and final PR artifact provenance must be verified against the final draft-PR HEAD before external review.
- **Baseline:** `1e050247b0d135a6d2ed61c6848599258b78bd12`, the merged/release-verified Phase 8 production baseline.
- **Branch:** `codex/phase-9-ui-ux-overhaul`.
- **Implementation:** `.ai/UI_UX_OVERHAUL.md` records the screen model, presentation ownership, title, compact HUD, pause, settings, results, responsive strategy, accessibility, verification, evidence, and limitations. `.ai/PHASE9_UI_AUDIT.md` records the evidence-based pre-implementation audit.
- `src/ui/` provides the presentation reducer, pure view-model formatters, and one DOM/focus/overlay controller. `src/main.js` delegates screen and HUD presentation to it.
- `GameEngine.setPaused()` adds user pause separately from run lifecycle and page visibility; it freezes simulation, cancels held input/transient audio, and resumes through the existing sound API. There are no score, physics, collision, AI, character, destruction, VFX-trigger, or audio-ownership changes.
- Active HUD retains score, health, combo, Havoc, and Kevin state. Results retain the five existing run statistics, Share Score, and the unchanged results-only VideoGen referral. Settings expose only existing global mute and reduced motion.
- **Phase 9 tests:** `npm test` passed 293/293 across 33 files; `npm run build` passed; `npm run test:e2e` passed 25/25. The Phase 9 Chromium suite captures 27 screenshots over the five required viewports plus keyboard and reduced-motion evidence. All browser-health counters were zero in all 25 scenario records.
- No dependencies or lockfile changes. The 16:9 Canvas and mobile gameplay controls remain unchanged; independent audio channel sliders and automated axe/screen-reader scanning are deferred. See the UI overhaul document for further limits and Phase 10+ deferrals.
- **Release:** Draft PR only; no merge and no production deployment. Exact-head GitHub CI and Vercel Preview verification remain part of the external-review handoff.

## Phase 8 — Reactive audio and VideoGen referral migration

- **Baseline:** `f7cd90fd5b44e57fe0341633c3d662499314a560` on `main`; implementation branch: `codex/phase-8-reactive-audio`.
- **Status:** Local verification PASS — `npm test` 279/279; production build PASS; Playwright Chromium 21/21 PASS twice. Every browser-health record had zero page errors, console errors/warnings, failed requests, and same-origin failures. The draft PR's latest Quality Gate, Vercel Preview, and artifact evidence are the external review record.
- `.ai/AUDIO_REACTIVE_SYSTEM.md` documents the Web Audio buses, event-to-recipe ownership, voice/music lifecycle, and human review requirements.
- `src/audio_director.js` owns canonical event audio. `src/audio_mix.js` centralizes the compressor/bus levels, priorities, stereo limits, polyphony cap, duck timing, and bounded CALM/BUILD/HEAT/FURY/HAVOC targets. Audio handlers are presentation-only and guarded against audio failures.
- Power charge uses one managed oscillator. Managed one-shots use a 24-voice cap; ducking is leased and recoverable; mute, reset, and visibility loss clear transient audio. The optional procedural vocal bank routes through VOICE; SpeechSynthesis is still browser-owned and optional.
- The seven destruction materials have distinct procedural recipes; grill explosion and gnome bonk retain dedicated identities. Canonical contact, defense, Kevin hit, destruction, damage, trick, escalation, and Havoc audio is event-owned to avoid duplicate direct cues.
- The centralized VideoGen referral is `https://videogen.io/ai-video-generator?fp_ref=amey-ff39df`, shown only in game-over results after an explicit click. Its adjacent disclosure is “Affiliate link — we may earn a commission at no extra cost to you.” The link uses `_blank` with `sponsored noopener noreferrer` and `no-referrer`; attribution is handled by the owner-provided URL, with no custom conversion tracking. The centralized `enabled` flag is the kill switch. Gameplay impact is none.
- The Playwright suite attaches `phase8-audio-diagnostics.json` from runtime snapshots, plus browser-health and gameplay evidence; final-head CI, Preview, and artifact provenance are reported in the draft PR.

- **Project:** Backyard Havoc (Vite, JavaScript ES modules, Canvas 2D, Matter.js)
- **Phase 8 merged baseline:** `1e050247b0d135a6d2ed61c6848599258b78bd12` on `main`.
- **Current working branch:** `codex/phase-9-ui-ux-overhaul`.
- **Current phase:** Phase 9 — UI/UX overhaul.
- **Phase 8 status:** Complete, merged into `main`, and release-verified at the Phase 9 baseline SHA.

## Phase 7 implementation

- `.ai/VFX_CAMERA_POLISH.md` records the audited camera/particle systems, event-to-profile mapping, bounded camera treatment, 60/120 Hz presentation-time policy, reduced-motion behavior, reset/visibility/hit-stop behavior, resource caps, invariants, and visual-review checklist.
- `src/vfx_director.js` is a presentation-only coordinator. It handles contact, defense, Power Shot, Kevin, material, trick-chain, Havoc, player-damage, and major escalation events without owning gameplay values.
- `src/camera.js` adds bounded directional impulse and zoom/chromatic output, time-based recovery, and a low-cost edge treatment. `GameEngine.render()` applies zoom about a stable canvas center; world tracking remains independent.
- `src/particles.js` keeps all effects in the existing bounded system, normalizes motion/lifetimes against elapsed simulation time, uses simulation time for rainbow color, and supports an optional seeded cosmetic PRNG. E2E seed and engine bridge remain limited to `MODE=e2e` on `127.0.0.1`.
- Reduced motion follows `prefers-reduced-motion` at startup and on changes. It scales presentation only; gameplay and Matter results remain unchanged.
- A Phase 7 Playwright scenario captures normal contact, Perfect Strike, charged Power Shot, Block, Parry, Perfect Parry before/after resolution and return, Kevin hit, material impact, Trick Chain, Havoc activation, player damage, high-combo trail, reduced-motion comparison, and cleared gameplay. Perfect Parry uses the production threat and pointer-release path.
- The Phase 6 persistence E2E fixture is frozen in `IDLE` after its production collision setup while screenshots are captured. Its score/persistence assertion remains intact; no production gameplay changed for this stabilization.

## Phase 7 local verification

- **Clean install:** `npm ci` PASS. `package.json` and `package-lock.json` are unchanged; no dependencies or paid/external services/assets were added.
- **Vitest:** `npm test` PASS — 29 files, 244 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 34 modules transformed.
- **Playwright:** `npm run test:e2e` PASS — 20/20 Chromium scenarios, run twice locally.
- **Browser health:** Both full E2E runs reported zero page errors, console errors, console warnings, failed requests, and same-origin failures in all 20 scenarios.
- **Playwright evidence:** Phase 7 E2E attaches representative gameplay screenshots, including incoming/resolved Perfect Parry and its returned projectile trail, plus normal/reduced-motion comparison and cleared-state evidence. The Playwright report includes trace/video on test failure under the existing configuration.
- **GitHub Actions:** PR #10's latest Quality Gate passed; the PR description records final-head and Playwright artifact provenance.
- **Vercel Preview:** PR #10's current final-head Preview passed.
- **Human visual review:** required; browser assertions and screenshots do not replace visual/gameplay approval.

## Phase 6 implementation

- `.ai/DESTRUCTION_ENVIRONMENT.md` records the material profiles, fracture policy, stable prop identity, run memory, residue, theme changes, gameplay compatibility, affiliate isolation, and Vercel release process.
- `src/destruction_materials.js` owns the seven immutable validated profiles. `src/destruction_system.js` owns seeded Matter fracture, dimensions, profile-driven physical properties, FIFO fragment eviction, and residue descriptors.
- `src/procedural_world.js` assigns `propKey` values and materials, remembers destroyed props and cleared yards for one run, omits destroyed props on reload, and rebuilds their small visual residue records from deterministic prop definitions.
- `GameEngine` keeps one canonical `OBJECT_DESTROYED` event per object. Existing special cases, score values, Havoc `+8`, near/far Kevin rage `+12`/`+4`, and glass hit-stop remain unchanged.
- Active physical debris is capped at 96 fragments. Debris has finite simulation-time lifetimes and a `SHARDS -> STATIC` collision mask, keeping it outside ball, prop, player, scoring, combo, Havoc, and Kevin gameplay paths.
- The four existing themes gained a small number of representative wood, plastic, soil, and fabric targets and more distinct material rendering. Existing glass, ceramic, and metal targets now carry explicit material profiles.
- `src/affiliate_links.js` centralizes the VideoGen provider, exact URL, disclosure, and one `enabled` kill switch. The semantic link appears only while the game-over results section is shown; opening it requires the user's click. It has safe external-link attributes and no analytics or gameplay hooks.
- `vercel.json` retains `npm run build`, `dist`, and `vite`. GitHub's Vercel Preview check passed with “Deployment has completed”; dashboard-level verification remains `VERCEL DASHBOARD VERIFICATION REQUIRES EXTERNAL REVIEW` because no Vercel CLI, `.vercel` project link, or Vercel token is available here. No production deployment was run.

## Phase 6 merged baseline verification

- **Vitest:** `npm test` PASS — 27 files, 222 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 33 modules transformed. No package manifests or lockfiles changed.
- **Playwright:** `npm run test:e2e` PASS — 19 Chromium scenarios at 1280×720, completed twice locally.
- **Browser health:** All 19 Chromium scenarios report zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- **Visual evidence:** Phase 6 E2E attaches post-impact production screenshots for GLASS, CERAMIC, WOOD, METAL, PLASTIC, FABRIC, and SOIL; four intact yard themes; night readability; reloaded residue; title placement; and the results affiliate disclosure. Existing smoke coverage supplies ordinary gameplay evidence.
- **GitHub Actions:** Phase 6 Quality Gate `36827488156`, attempt 2 PASS; the Playwright artifact is `11146022132` (8,475,287 bytes, SHA-256 `4d73275fec45014a4114a2f6e850c9b09012d8e50f9ff0fb413609bc612d35a4`) and is tied to the exact merged baseline SHA.
- **Vercel:** Before Phase 7 branch creation, project `backyard-havoc` under team `brainy-highlander` was verified on repository `jadhavamey2004-netizen/backyard-havoc`, Production Branch `main`, deployment `7LF5t1Jtbqdu5oMuuDLjUWP6S3hC`, exact SHA `581b64db4261221d13ed1f63763c032ee31b1927`, Ready, with `backyard-havoc.vercel.app` attached. Public live smoke passed.
- **Human visual review:** required; browser assertions and screenshots do not replace visual/gameplay approval.

## Preserved rules and architecture

The Phase 1C contact and timing rules, Phase 2 gameplay feel, Phase 3 character designs, Phase 4 authored animation, and Phase 5 Kevin escalation/Havoc remain authoritative. Phase 6 does not redesign ball physics, scores for existing props, action/defense rules, Phase 5 event gains, AI, animation, or sound assets. The existing `ProceduralWorld`, `MapRenderer`, Matter.js collision, and `GameEngine` coordination remain in place.

`GameEngine` remains the existing simulation coordinator. There is no new physics library, package dependency, paid resource, external API/model, Vercel deployment, production promotion, or MCP-downloaded asset.

## Deferred

At the Phase 8 handoff, Phase 9 UI and later-phase work were deferred. Phase 9 is now being reviewed on its own draft PR. Production release waits for external review and a human merge to `main`; no Phase 9 work promotes Vercel Preview or changes production.
