# Project State

- **Project:** Backyard Havoc (Vite, JavaScript ES modules, Canvas 2D, Matter.js)
- **Phase 5 merged baseline:** `cdf9db06e132faa4b446f8a3f7a47a75c7c409f1` (`main`)
- **Working branch:** `codex/phase-6-destruction-environment`
- **Current phase:** Phase 6 — Destruction & Environment Overhaul
- **Phase 6 status:** Phase 6 local verification + PR CI PASS; awaiting external review.

## Phase 6 implementation

- `.ai/DESTRUCTION_ENVIRONMENT.md` records the material profiles, fracture policy, stable prop identity, run memory, residue, theme changes, gameplay compatibility, affiliate isolation, and Vercel release process.
- `src/destruction_materials.js` owns the seven immutable validated profiles. `src/destruction_system.js` owns seeded Matter fracture, dimensions, profile-driven physical properties, FIFO fragment eviction, and residue descriptors.
- `src/procedural_world.js` assigns `propKey` values and materials, remembers destroyed props and cleared yards for one run, omits destroyed props on reload, and rebuilds their small visual residue records from deterministic prop definitions.
- `GameEngine` keeps one canonical `OBJECT_DESTROYED` event per object. Existing special cases, score values, Havoc `+8`, near/far Kevin rage `+12`/`+4`, and glass hit-stop remain unchanged.
- Active physical debris is capped at 96 fragments. Debris has finite simulation-time lifetimes and a `SHARDS -> STATIC` collision mask, keeping it outside ball, prop, player, scoring, combo, Havoc, and Kevin gameplay paths.
- The four existing themes gained a small number of representative wood, plastic, soil, and fabric targets and more distinct material rendering. Existing glass, ceramic, and metal targets now carry explicit material profiles.
- `src/affiliate_links.js` centralizes the VideoGen provider, exact URL, disclosure, and one `enabled` kill switch. The semantic link mounts only in the game-over results section after an explicit run end. It has safe external-link attributes and no analytics or gameplay hooks.
- `vercel.json` retains `npm run build`, `dist`, and `vite`. GitHub's Vercel Preview check passed with “Deployment has completed”; dashboard-level verification remains `VERCEL DASHBOARD VERIFICATION REQUIRES EXTERNAL REVIEW` because no Vercel CLI, `.vercel` project link, or Vercel token is available here. No production deployment was run.

## Local verification

- **Vitest:** `npm test` PASS — 27 files, 218 tests. Existing headless Web Audio `window is not defined` diagnostics remain in tests that intentionally initialize audio without a browser.
- **Production build:** `npm run build` PASS — Vite 5.4.21, 33 modules transformed. No package manifests or lockfiles changed.
- **Playwright:** `npm run test:e2e` PASS — 18 Chromium scenarios at 1280×720, completed twice locally.
- **Browser health:** Phase 6 theme, debris/persistence, and affiliate scenarios each report zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- **Visual evidence:** Phase 6 E2E attaches screenshots for all four intact yard themes, night readability, live wood debris, reloaded residue, title placement, and the results affiliate disclosure. Existing smoke coverage supplies ordinary gameplay evidence.
- **GitHub Actions:** see the draft PR's latest Quality Gate and Playwright evidence; the PR description records final-head, run, and artifact provenance.
- **Vercel:** Preview check PASS; dashboard verification remains `VERCEL DASHBOARD VERIFICATION REQUIRES EXTERNAL REVIEW`.
- **Human visual review:** required; browser assertions and screenshots do not replace visual/gameplay approval.

## Preserved rules and architecture

The Phase 1C contact and timing rules, Phase 2 gameplay feel, Phase 3 character designs, Phase 4 authored animation, and Phase 5 Kevin escalation/Havoc remain authoritative. Phase 6 does not redesign ball physics, scores for existing props, action/defense rules, Phase 5 event gains, AI, animation, or sound assets. The existing `ProceduralWorld`, `MapRenderer`, Matter.js collision, and `GameEngine` coordination remain in place.

`GameEngine` remains the existing simulation coordinator. There is no new physics library, package dependency, paid resource, external API/model, Vercel deployment, production promotion, or MCP-downloaded asset.

## Deferred

Phase 7 VFX, Phase 8 audio, and all other later-phase work remain untouched. Production release waits for external review and a human merge to `main`; Vercel production provenance and live smoke testing follow that merge.
