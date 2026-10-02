# Phase 12 Final Release Audit

## Audit provenance

- Baseline commit: `a9fc5204e51f6aa3af4f44d2a4139c9064002e3a`
- Branch: `codex/phase-12-final-release-hardening`
- Baseline source: `HEAD`, `origin/main`, and `origin/codex/phase-12-final-release-hardening` all resolve to the baseline commit; working tree was clean before audit work.
- Baseline clean install: `npm ci` completed. npm reported that the local install-script policy blocked the optional `esbuild` postinstall script; the platform package still worked for the baseline build and browser suite.
- Baseline Vitest: 312/312 passed in 34 files.
- Baseline production build: PASS, 44 modules.
- Baseline Playwright: 50/50 passed across 38 desktop and 12 touch contexts. Every emitted browser-health record was zero for page errors, console errors, warnings, failed requests, and same-origin failures.
- Baseline production `dist/`: 5 files, 1,743,947 bytes total; JavaScript 334,669 bytes; CSS 20,863 bytes; static files 1,388,415 bytes. The static size includes the two unreferenced public JPEGs listed below.

This document records the audit before production runtime changes and its disposition after local verification. Findings are not conclusions about legal ownership or physical-device behavior. Exact-head GitHub CI, Preview, and artifact provenance are reported in the associated draft PR and final handoff.

## Scope inspected

Inspected package scripts and dependency declarations, lockfile, Vercel and GitHub Actions configuration, README, `.gitignore`, entry HTML and CSS, game/input/lifecycle, player and Kevin systems, audio ownership/mix/director, particles/VFX, procedural world and destruction, map and affiliate code, metadata and UI modules, Playwright configuration, all tracked Vitest and Playwright test files, all `public/` assets, and the current `.ai/` release/truth documents. Targeted searches covered external requests, browser lifecycle hooks, timers, animation frames, storage, event listeners, audio contexts, test globals, asset references, and resource caps.

## Risk register

| ID | Severity | Subsystem | Evidence | Reproduction | Root cause | Fix required? | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P12-01 | P2 | Project state | `.ai/PROJECT_STATE.md` said Phase 11 PR #14 was open and Phase 12 must not start, while the supplied merged baseline is Phase 11 release-verified at this commit. | Read the current-state section on the baseline branch. | Project state was not advanced after the verified Phase 11 merge. | Yes | Phase 11 and Phase 12 current fields updated without changing historical evidence. | Resolved |
| P12-02 | P2 | README/runtime truth | README stated 19 test files and 107 tests, omitted touch movement, and called `src/ai.js` behavioral gameplay AI despite its local cosmetic-only contract. | Compare README current sections with source/tests and baseline commands. | Product documentation did not track later phases. | Yes | README runtime sections cross-checked against source and verified tests; fragile counts removed. | Resolved |
| P12-03 | P2 | License | Package metadata declares MIT and README links `LICENSE`; no tracked `LICENSE` file was present. | Follow the README badge/link in a clean checkout. | License was declared without its repository notice file. | Yes | Standard MIT text added; attribution uses repository owner handle, not an inferred legal name. | Resolved |
| P12-04 | P2 | Shipped assets | `public/backyard_environment.jpg` (372,383 bytes) and `public/backyard_vibe_map.jpg` (1,004,962 bytes) had no source-code references and were copied into `dist/`. | Search references and inspect production output. | Design/reference images remained under the public deployment root without runtime use. | Yes | Both removed from `public/`; provenance and hashes recorded; production output now has 11,070 bytes of static files. | Resolved |
| P12-05 | P1 | EdgeAI run lifecycle | `dispatchTelemetry()` scheduled an untracked `setTimeout()` that called `handleEdgeResponse()`; `resetSession()` did not invalidate callbacks or reset `lastDialogueDispatch` and `currentNpcRage`. | Fake timers: dispatch in run A, reset before delay, advance; test first run-B dialogue after run-A rate limiting. | Delayed cosmetic responses and rate-limit state were not scoped to a session. | Yes | Session generation, tracked/cancelled timers, run-owned-state reset, deterministic unit regressions, and browser lifecycle evidence. | Resolved |
| P12-06 | P2 | Browser compatibility | Baseline Playwright had Chromium desktop and touch only. A first Firefox/WebKit CI run showed WebKit had received ArrowRight but the new smoke sampled position after a fixed 120 ms before movement was observable. Firefox/WebKit pinned executables are unavailable locally. | Run the focused release smoke; the initial WebKit sample observed no X displacement at 120 ms although the right key was held. | New browser matrix was absent; the initial cross-browser smoke encoded an unnecessarily short fixed observation delay. | Yes | The smoke now polls for actual X movement; Firefox and WebKit each pass both release-smoke scenarios in current PR checks. Local unsupported-engine tests remain unverified. | Resolved by PR CI |
| P12-07 | P2 | Long-run resources | Baseline had no accelerated many-boundary run-history versus active-world plateau evidence. | Stress deterministic world traversal and transient systems; capture metrics. | No release-scale resource evidence. | Yes | 240 boundary traversal, 20 UI lifecycle cycles, bounded VFX/world/fragment/audio samples, and reset evidence attached as JSON. | Resolved |
| P12-08 | P2 | Dependency security | Production audit is clean; full audit reports five Vite/Vitest toolchain findings. | Run `npm ls`, `npm audit --omit=dev`, and `npm audit` with the supported system CA setting. | Development server/test packages include advisories; production dependencies do not. | Audit and document; no major upgrade without a separate compatibility change | Exact advisories and scopes recorded in the hardening report. All proposed fixes are major upgrades; manifests stay unchanged. | Accepted with evidence |
| P12-09 | P2 | Build hygiene | Baseline had no explicit negative assertions for test globals, local paths, source maps, and packaged tests/docs. | Inspect complete production output with machine-readable assertions. | Release output had not been checked by explicit assertions. | Yes | `scripts/assert-production-build.mjs` verifies output paths/content and writes byte totals; current build passes. | Resolved |
| P12-10 | P2 | Release evidence/docs | No Phase 12 hardening report, final checklist, persistence/resource/async JSON evidence, or cross-browser release CI existed at baseline. | Inspect current `.ai/` documents and CI artifact structure. | Phase 12 evidence had not yet been produced. | Yes | Requested reports, local JSON evidence, browser-health records, and CI artifact upload configuration are in place; the live PR records final exact-head CI, artifacts, and Preview. | Resolved |

## Initial external-runtime inventory

- `index.html` requests Google Fonts CSS for Bebas Neue and Outfit. Their upstream Google Fonts metadata and SIL OFL 1.1 license files are recorded in `THIRD_PARTY_NOTICES.md`.
- The VideoGen destination is linked from Results through the centralized affiliate behavior after user activation. The expected URL and attributes are verified by existing source/tests; Phase 12 must preserve them.
- `src/ai.js` declares local rule-based cosmetic dialogue/telemetry behavior and no network client. No runtime `fetch`, XHR, analytics, authentication, cloud-save, LLM, or ad-network client was identified by the initial source search.

## Initial resource ownership notes

- Procedural-world destroyed-prop and cleared-chunk keys are run-history state. They must be measured separately from active Matter bodies/chunks and must reset between runs.
- Existing particle, trail, VFX, projectile, and fragment limits are owned by current runtime systems. The hardening tests must assert current caps, not raise them.
- The browser app uses one `requestAnimationFrame` loop registered during `DOMContentLoaded`; Phase 12 will verify lifecycle actions do not add loops/listeners.

## Initial secret/private-data scan

The high-confidence credential-pattern scan completed across 137 tracked/untracked project files. It found zero private-key markers, AWS access-key patterns, or long credential assignments. Secret values are not copied into this report. This is a pattern scan, not a guarantee against every possible secret format.

## Final local disposition

- No P0 or P1 remains open. The confirmed P1 EdgeAI session leak is fixed and covered by deterministic unit and browser evidence.
- P2 documentation, repository-license, unused asset, and production-bundle findings are resolved. Dependency advisories remain documented and limited to build/test/dev-server tooling; the production audit is clean.
- Local Playwright passed all 41 desktop Chromium, 11 Chromium touch, and 2 Chromium release-smoke scenarios. Firefox/WebKit could not launch because the pinned browser executables are absent; previous download attempts timed out. The dedicated exact-head GitHub CI job is the required compatibility verification for those engines.
- Unit/build, Chromium/touch, and Firefox/WebKit jobs passed on the latest observed PR head; exact-head IDs and artifact provenance are taken from the latest PR checks and final handoff. Recheck after every push. This audit does not claim a production deployment or post-merge release gate.
