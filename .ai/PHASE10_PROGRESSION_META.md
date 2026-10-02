# Phase 10 — Local Progression, Garage, and Challenges

## Scope and source of truth

Phase 10 adds a small local achievement loop around the existing Backyard Havoc run. The core loop remains kick the ball, break the yard, provoke Kevin, parry his attacks, chain plays, and chase a higher score. Progression observes production events and final run statistics; it does not own or detect gameplay.

The accepted source of truth is the Phase 9 release baseline `4c05d173915888438bc1cf611d83b54f01abfad5`, the current runtime and its canonical gameplay-event payloads. Older roadmap concepts such as Street Cred, paid passes, daily/weekly challenges, physics ball variants, extra environments, online leaderboards, and cloud progression remain archived or deferred. Phase 10 adds no account, API, analytics, remote save, external game service, currency, or purchase flow.

## Profile and persistence

- Storage key: `backyard_meta_profile`.
- Schema version: `1`; this release implements v1 normalization and safe defaults, not a v1-to-v2 migration.
- The profile contains an allow-listed set of unlocked cosmetic IDs, one equipped ID per category, challenge progress and completions, bounded lifetime counters, and `firstPlayedAt` / `updatedAt` ISO timestamps.
- Defaults permanently unlock and equip `CLASSIC` Ball, Trail, and Impact. The lifetime combo default is 1; other counters and challenge progress start at 0.
- Loading validates version, field types, known IDs, allowed challenge IDs, numeric bounds, and timestamps. Unknown fields and IDs are ignored. Invalid, missing, oversized, malformed, or unsupported-version data uses defaults. Invalid or locked equipment falls back to its category's `CLASSIC` item.
- If reading storage throws, progression remains usable in memory. Malformed JSON keeps an otherwise working storage adapter available so the next profile write can replace the corrupt value. Write failures are caught and do not block the game.
- Future schema work must add an explicit migration before changing the version. No migration is implied by the current v1 fallback.
- Legacy `backyard_high_score`, `backyard_best_combo`, `backyard_reduced_motion`, and `backyard_muted` ownership remains separate. The profile store writes only its own key. `GameEngine` continues to read and update the two legacy records, with storage failures handled safely.
- Restart Run, Play Again, Back to Main Menu, game over, environment reset, and visibility changes do not clear the progression profile. There is no profile-delete control.

## Canonical evidence and event ownership

`GameEngine` remains the source of gameplay truth. `src/main.js` observes the existing `engine.onGameplayEvent` callback and passes those events to `MetaProgression`; run completion is observed through the existing game-over result callback. No parallel collision, scoring, Havoc, parry, or Kevin detector was added.

The tracker uses these production facts:

- `OBJECT_DESTROYED` for one destroyed-prop count per emitted canonical event.
- `COMBO_CHANGED.current` for highest observed combo.
- `PERFECT_PARRY` for Perfect Parry count.
- `KEVIN_HIT`, including `source: 'PARRIED_PROJECTILE'`, for Kevin hits and returned attacks.
- `HAVOC_STARTED` for Havoc activations.
- The final game-over statistics callback for completed runs, final score, and peak combo.

Unknown event types and invalid combo payloads are ignored. Counters and per-challenge progress are monotonic and bounded. Completion and direct cosmetic rewards are idempotent. Progression does not mutate event payloads, gameplay state, or event ownership.

## Challenge catalog and direct rewards

All challenges are cumulative local achievements with no real-time clock or server dependency.

| Challenge | Canonical requirement | Direct reward |
| --- | --- | --- |
| First Run | Complete 1 run | NEON Ball |
| Yard Wrecker | Destroy 5 props | CARBON Ball |
| Find Your Feet | Reach a 5x combo | NEON Trail |
| Backyard Legend | Reach a 10x combo | EMBER Trail |
| Read the Throw | Land 1 Perfect Parry | COMIC Impact |
| Perfect Form | Land 3 Perfect Parries | ELECTRIC Impact |
| Kevin's Problem | Hit Kevin once | ELECTRIC Trail |
| Return to Sender | Hit Kevin with a parried projectile once | HEAVY Impact |
| Havoc Unleashed | Activate Havoc once | SUNSET Ball |

The Challenge screen shows player-facing names and descriptions, capped progress, a completion state, and the reward name. It does not display internal event names or invent progress for unsupported gameplay.

## Cosmetic catalog and safe presentation hooks

| Category | Items |
| --- | --- |
| Ball skins | CLASSIC — Backyard Classic; NEON — Night League; CARBON — Carbon Five; SUNSET — Last Light |
| Trails | CLASSIC — Clean Touch; NEON — Night League; EMBER — Hot Streak; ELECTRIC — Live Wire |
| Impact styles | CLASSIC — Backyard Impact; COMIC — Comic Pop; ELECTRIC — Live Wire; HEAVY — Big Bonk |

The Garage is available from the title screen only. It shows BALL, TRAIL, and IMPACT groups; owned/equipped/locked labels; and the challenge needed for locked items. Locked controls are disabled. Selecting an owned item updates the existing render presentation immediately, is saved locally, and remains equipped after reload and new runs. The title PLAY control remains primary.

Presentation ownership stays in existing paths:

- Ball palette values are used in the existing `drawBall()` Canvas renderer. They do not create or replace a Matter body.
- Trail color selection feeds the existing bounded `ParticleSystem.addTrailPoint()` path (trail cap 60). Custom color flourish is not applied in reduced-motion mode; existing motion multipliers remain authoritative.
- Non-CLASSIC impact palettes feed `VfxDirector` ring, shockwave, and burst colors after canonical events. CLASSIC leaves each event's authored Phase 7 palette untouched. Material destruction retains its material-owned colors. Camera values, event counts, particles' existing caps, scoring, impulses, and timing are not cosmetic settings.

No cosmetic changes ball density, restitution, friction, radius, mass, inertia, velocity, drag, score, combo, Havoc, Kevin, or destruction behavior. Unit and browser regressions compare gameplay constants and the live Matter ball body before and after appearance changes.

## Results and affiliate behavior

The existing results screen retains run statistics and Play Again. When the run produces challenge completions or new rewards, a compact summary groups challenge completions and newly unlocked looks into two rows; look names include their category so duplicate display names remain distinguishable. Progress is not modal and does not delay Play Again.

The centralized results-only referral remains exactly `https://videogen.io/ai-video-generator?fp_ref=amey-ff39df` with its disclosure, explicit click, `_blank`, `sponsored noopener noreferrer`, and `no-referrer` behavior. The browser regression snapshots the serialized profile before clicking and proves the referral does not mutate progression.

## Accessibility, motion, and resource limits

Garage and Challenges are exclusive title screens inside the Phase 9 controller. Existing focus, Escape/back behavior, `inert`, and overlay handling are retained; focus returns to the title control that opened a screen. Cosmetic tiles are semantic buttons, expose state and lock requirements to assistive technology, and are keyboard reachable. Challenges use labeled progress bars and a visible textual count rather than color alone.

No unlock animation or sound was added. Existing reduced-motion preference and settings behavior remain authoritative; custom trail color variety is suppressed in reduced-motion mode, and all visual effects continue through their existing bounded systems. No new timers, DOM-per-frame work, audio context, particle engine, physics body, or dependency was introduced.

## Verification matrix and evidence

- Vitest final run: 308/308 tests passed across 34 files. Coverage includes profile defaults, valid round trip, legacy-key preservation, malformed/future saves, malformed fields, unknown fields and IDs, invalid equipment, corrupt-save recovery, unavailable storage, challenge thresholds, canonical evidence, duplicate unlocks, reward mapping, run completion, and persistent equipment. Game integration and VFX tests prove appearance changes do not mutate the Matter body or gameplay tuning.
- Production build final run: Vite 5.4.21 PASS, 44 modules transformed. No dependencies or package-lock files changed.
- Playwright final run: 29/29 Chromium scenarios passed; the complete suite passed three times locally. Coverage includes responsive exclusive Garage/Challenges flows at 1280×720, 1366×768, 1920×1080, 390×844, and 768×1024, focus/keyboard use, locked-item rejection, unlock feedback, equipment reload/restart persistence, a rendered ball-skin change, bounded trail evidence during ball motion, a production parry using the equipped impact style, localStorage-unavailable boot, challenge rendering, immediate Play Again, and affiliate isolation.
- All 29 browser-health records in each full run had 0 page errors, 0 console errors, 0 console warnings, 0 failed requests, and 0 same-origin failures.
- Representative screenshots were visually reviewed at 390×844 for Garage and Challenges and 1280×720 for Results. Garage fits the viewport; the Challenges list scrolls inside its panel with the Back action available; Results keeps the affiliate disclosure within the 720 px viewport after multi-unlock feedback.
- The existing Phase 9 and earlier Chromium scenarios remain in the same suite, including title settings, keyboard focus, reduced motion, gameplay, audiovisual health, destruction, and referral checks.
- The Playwright run attaches browser-health JSON per scenario and Garage/Challenges/equipped-state screenshots. Failure traces and videos are retained by the existing Playwright configuration. Final exact-head CI/artifact and Preview provenance are recorded on the Phase 10 draft PR; this document intentionally does not hard-code transient run, artifact, or deployment IDs.
- Final local command results and current branch/commit facts are recorded in `.ai/PROJECT_STATE.md` after verification.

## Known limitations

Progress and equipment are local to the browser profile and have no account sync, export/import, cloud backup, or cross-device transfer. Challenges are cumulative rather than daily or per-run. The current schema version has a safe-default fallback, but only a future deliberate code change can define and test migration from a later schema. Human review of the attached screenshots is still required; automated viewport and browser-health checks are not a substitute for visual judgment.

The baseline `npm ci` reported that the environment blocked the `esbuild` install script under its install-script policy. The production build and all E2E runs passed in this environment; no dependency or lockfile change was made.
