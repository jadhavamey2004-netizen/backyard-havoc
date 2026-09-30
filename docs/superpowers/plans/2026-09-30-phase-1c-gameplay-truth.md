# Phase 1C Gameplay Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task inline after approval. Steps use checkbox (`- [x]`) syntax. Follow test-first changes: add one focused failing Vitest test, confirm the expected failure, implement the smallest fix, and rerun the test before moving on. Approval amendments A–I from the user are binding and summarized below.

**Goal:** Implement the approved Phase 1C run, contextual-action, kick/header contact, defensive timing, combo, and documentation rules without beginning Phase 1D or broadening the engine architecture.

**Architecture:** Keep `GameEngine` as the existing lifecycle/coordination owner. Add a small rules module for named tunable values and deterministic threat/contact classification; keep action progression on `Player` and resolve pending outcomes in the existing engine update/input paths. Expose future gameplay events through a narrow optional callback, not a general event bus.

**Tech Stack:** JavaScript ES modules, Matter.js, Vitest, Playwright Chromium, Vite.

**Spec:** `.ai/GAMEPLAY_TRUTH.md`

## Global Constraints

- Standard run begins when intro finishes or is skipped and the engine enters active `PLAYING`.
- Standard run ends when player health reaches zero, followed by the existing defeat/results flow.
- Remove the old 180-second countdown from standard runtime; timed challenge modes remain deferred.
- Keep the initial 3 HP and 1.2-second invulnerability tunable, not permanently frozen.
- Desktop controls remain A/D or Left/Right movement, optional/advanced Shift sprint, pointer aim, contextual primary pointer action, and hold-to-charge power shot.
- Keep kick action total duration at the initial 0.38 seconds; ball contact is limited to the normalized strike window.
- Header and kick use separate spatial contact zones; header is contextual and has no dedicated control.
- Defensive eligibility requires both spatial envelope and predicted incoming threat; moving-away projectiles cannot qualify.
- Select the earliest valid projectile threat; one action resolves at most one gameplay outcome and one projectile.
- Combo advances only on valid ball contacts and successful parry tiers; block, destruction, and Kevin impacts do not advance it.
- Keep `COMBO`, `TRICK CHAIN`, and future `HAVOC` distinct.
- Preserve future event boundaries without a large event-system refactor.
- Do not implement Havoc Mode, timed/daily modes, escalation curve, mobile controls, final audiovisual polish, or a broad `GameEngine` refactor.
- Do not change gameplay beyond the approved contract. Do not weaken tests to obtain a passing result.
- Resolve eligible defense immediately at pointer release using release-time charge/aim and projectile state; do not defer defense to the kick strike window.
- Require strictly positive predicted time-to-contact for a defensive opportunity; overlapping/already-hit projectiles remain ordinary collision/damage cases.
- Forecast projectile motion with deterministic, fixed-step gravity-aware prediction over no more than the block horizon.
- Ground grace is continuous grounded duration: airborne time clears accumulated duration but preserves combo; successful player contact clears it; only a continuous grounded interval reaching 0.8 s resets combo/juggle.
- Constructor initialization and run reset are silent for gameplay events. Perfect Parry advances combo atomically by two and emits one transition with `delta: 2`.
- Normal kick, power shot, and header use base contact score 100 before combo. If retained, foot-based Perfect Strike uses a named radius/criterion and base score 150; it is distinct from Perfect Parry.

## Review Focus

1. A projectile moving away or passing outside the predicted contact radius must not be classified as a defensive opportunity; cover with pure threat-prediction tests.
2. The 0.38-second animation must accept ball contact only inside the normalized strike interval, exactly once; cover phase edges and one-contact behavior in `Player` and engine tests.
3. Head/foot overlap and action timing must deterministically select one contact type; cover head priority, radius boundaries, and miss behavior.
4. Simultaneous projectile threats and a kickable ball must select the earliest threat independent of array order and must never also kick; cover sorting and action-arbitration tests.
5. Destruction, Kevin impact, and projectile aftermath must not increment combo; cover score/combo and event callback assertions at the existing collision seams.

---

## File Map

- Create `src/gameplay_rules.js`: named tuning constants and small pure functions for charge progress, contact phase, projectile forecast/selection, and defensive result classification.
- Modify `src/player.js`: normalized 0.38-second action progress, distinct head/foot contact candidates, one-contact action state, and reset behavior.
- Modify `src/game.js`: pending primary action and resolution, projectile threat selection/response, obsolete timer removal, one grounded-grace implementation, combo/event semantics, and reset/game-over paths.
- Modify `src/main.js` and `index.html`: preserve explicit intro skip/restart shortcuts while presenting only authoritative gameplay controls; keep Shift secondary.
- Modify `README.md`, `idea.md`, `memory-bank/progress.md`, `.ai/FEATURE_TRUTH.md`, and `.ai/PROJECT_STATE.md`: replace current claims of Space kick, W/Up bullet-time header, 90-second standard runs, and capped combo; label retained historical/vision text accurately.
- Modify `tests/player.test.js`, `tests/game_flow_integration.test.js`, `tests/combat_parry.test.js`, and `tests/power_shot.test.js`; create `tests/gameplay_rules.test.js` for pure rule boundaries.
- Modify `tests/e2e/smoke.e2e.js` only for browser-visible control/start-flow/health checks that add value beyond deterministic Vitest coverage.

## Interfaces to Establish

- `GAMEPLAY_TUNING` exports named seconds/progress/radius/reward constants from `src/gameplay_rules.js`, including `KICK_ACTION_DURATION = 0.38`, `KICK_CONTACT_START = 0.30`, `KICK_CONTACT_END = 0.70`, `FOOT_CONTACT_RADIUS = 95`, `HEADER_CONTACT_RADIUS = 60`, `POWER_CHARGE_START_DELAY = 0.20`, `POWER_CHARGE_RAMP_DURATION = 0.85`, `POWER_SHOT_MIN_CHARGE = 0.25`, `COMBO_GROUND_GRACE_SECONDS = 0.8`, defense envelope/body radius, block/parry/perfect timing limits, and initial rewards (`BLOCK = 100`, `PARRY = 500`, `PERFECT_PARRY = 1000`, normal kick/power contact = 100, kick perfect-contact = 150). Values remain tunable; contact/parry values require playtest validation.
- `getContactPhase(progress)` returns `true` only for inclusive normalized strike bounds from the spec.
- `getProjectileThreat(projectilePosition, projectileVelocityPerSecond, projectileAccelerationPerSecondSquared, playerPosition, playerVelocityPerSecond, tuning)` returns either `null` or `{ timeToContact, closestDistance }`; use deterministic fixed-step gravity-aware prediction no farther than `BLOCK_MAX_TIME_TO_CONTACT`, reject moving-away, non-intersecting, and already-overlapping trajectories, and require strictly positive time-to-contact. Convert Matter's per-step body velocity and gravity to common world units per second before calling; predict against player combat point `{ x: player.x, y: player.y - 30 }`.
- `selectEarliestThreat(threats)` returns one threat ordered by time-to-contact, closest distance, then Matter body ID. Array ordering must not decide between different threats.
- `classifyDefense(timeToContact, tuning)` returns `BLOCK`, `PARRY`, `PERFECT_PARRY`, or `MISS` at documented inclusive/exclusive boundaries.
- `Player.getContactCandidate(ballPosition)` returns `HEADER`, `KICK`, or `null`, and returns `null` outside strike progress or after the action contact is consumed. Header has priority if both zones contain the ball; setting the head-contact pose must not restart the action clock.
- `GameEngine.emitGameplayEvent(type, payload)` invokes an optional `onGameplayEvent` callback with one event object. Required types: `BALL_CONTACT`, `POWER_SHOT`, `OBJECT_DESTROYED`, `KEVIN_HIT`, `BLOCK`, `PARRY`, `PERFECT_PARRY`, `COMBO_CHANGED`, `PLAYER_DAMAGED`.

## Tasks

### Task 1: Add named rules and deterministic pure classifiers

**Files:**
- Create: `src/gameplay_rules.js`
- Create: `tests/gameplay_rules.test.js`

- [x] **Step 1: Write failing pure rule tests.** Name/assert: `getContactPhaseIncludesOnlyConfiguredStrikeBounds` (0.30 and 0.70 included, just outside excluded); `getPowerChargeUsesElapsedHoldAndClampsToOne` (0.20 delay, threshold at 0.4125 s, full charge at 1.05 s); `getProjectileThreatRejectsMovingAwayAndMissPaths` (both return `null`, incoming intersecting path returns time/distance); `gravityTurnsPreviouslySafePathIntoThreat`; `gravityKeepsMissPathIneligible`; `upwardProjectileCanDescendIntoPlayerContactRegion`; `alreadyOverlappingProjectileIsNotDefended`; `selectEarliestThreatIsIndependentOfInputOrder` (same projectile wins reversed arrays and exact ties break by body ID); `classifyDefenseUsesDocumentedInclusiveBoundaries` (0.08/0.25/0.60 boundaries map exactly to tiers).
- [x] **Step 2: Run `npm test -- tests/gameplay_rules.test.js` and confirm the intended missing exports or incorrect classifications fail.**
- [x] **Step 3: Implement named `GAMEPLAY_TUNING`, `getContactPhase`, `getPowerCharge`, `getProjectileThreat`, `selectEarliestThreat`, and `classifyDefense`.** Keep helpers pure and avoid magic thresholds in `GameEngine`.
- [x] **Step 4: Rerun the focused Vitest file and verify all boundaries pass.**

### Task 2: Model player action phases and separate head/foot zones

**Files:**
- Modify: `src/player.js`
- Test: `tests/player.test.js`

- [x] **Step 1: Add failing tests.** Name/assert: `kickActionRunsForConfiguredTotalDuration` (completes at 0.38 s); `contactCandidateRequiresStrikePhase` (no candidate immediately before/after configured phase); `contactCandidateUsesSeparateFootAndHeadZones` (foot/head radius edges independently); `headContactWinsWhenZonesOverlap` (returns only `HEADER`); `eachActionConsumesAtMostOneContactAndResetClearsIt` (second contact is null, reset restores fresh state).
- [x] **Step 2: Run `npm test -- tests/player.test.js` and verify the tests fail against the current full-animation/generic-radius behavior.**
- [x] **Step 3: Update `triggerKick()` / contextual header pose, action-progress advancement in `Player.update()`, and `getContactCandidate(ballPosition)` using `GAMEPLAY_TUNING`.** Preserve one total action timeline; selecting a head pose must not restart it or create a second contact window. Remove/replace `canKickBall()` consumers without preserving generic-radius semantics.
- [x] **Step 4: Rerun player tests and verify phase/radius edges and one-contact semantics.**

### Task 3: Resolve normal and charged football actions at strike

**Files:**
- Modify: `src/game.js`
- Test: `tests/game_flow_integration.test.js`

- [x] **Step 1: Add failing engine tests.** Name/assert: `missedPrimaryActionHasNoGameplayConsequences` (ball velocity, score, combo, juggle, and contact events unchanged); `normalKickOnlyConnectsDuringStrikeWindow` (outside misses, inside one score/impulse); `primaryActionSelectsHeaderBeforeKick` (one head contact/event); `chargedActionFiresOnlyOnStrikeContact` (release charge is snapshotted, valid contact launches, absent contact whiffs); `powerShotUsesNormalBaseContactScore` (score equals the normal kick base under resulting combo); `ballEnteringZoneDuringStrikeCanBeContactedOnce` (contact occurs then duplicate award is rejected).
- [x] **Step 2: Run `npm test -- tests/game_flow_integration.test.js` and confirm failures reflect missing strike-phase arbitration.**
- [x] **Step 3: On pointer release, snapshot charge and aim, then immediately inspect and resolve the single earliest eligible projectile threat using the actual input-resolution moment. If a defensive tier resolves, consume the action and do not create a football action; the defense animation may use the action pose but must not delay its gameplay result. If no threat qualifies, start the 0.38-second football action and retain a pending snapshot for contact-window resolution. Calculate charge from elapsed pointer hold via `getPowerCharge()` rather than the last animation frame. Refactor kick/power helpers into contact consequences that accept selected contact type and do not restart/reset the action clock. Consume/reset pending football action on contact, miss, visibility loss, run reset, or state transition.**
- [x] **Step 4: Verify direct helper tests initialize strike progress explicitly, then rerun focused lifecycle/contact tests.**

### Task 4: Add threat-first defense and deterministic result tiers

**Files:**
- Modify: `src/game.js`
- Modify: `tests/combat_parry.test.js`
- Modify: `tests/game_flow_integration.test.js`

- [x] **Step 1: Add failing tests.** Name/assert: `nearbyProjectileMovingAwayIsNotDefended` and `projectileWhosePathMissesPlayerIsNotDefended` (no score, projectile unchanged); `alreadyOverlappingProjectileIsNotDefended`; `defenseClassifiesBlockParryPerfectAndMissBoundaries` (exact edge mapping); `defenseResolvesAtPointerReleaseWithoutWaitingForKickStrike`; `defenseSelectsEarliestThreatRegardlessOfArrayOrder` (same selected body after reversing order); `defenseBreaksExactThreatTieByBodyId` (lower ID wins); `eligibleThreatOverridesBallAndCharge` (exactly one defensive result, no football impulse); `defenseConsumesOneProjectileOnce` (second resolution does nothing); `deflectionAndReturnsUseBoundedSafeDirections` (block away from player, parry tiers toward Kevin, all speed bounded).
- [x] **Step 2: Run the focused parry and integration suites and confirm expected current failures (proximity-only parry, reverse-array selection, and no result tiers).**
- [x] **Step 3: Add a focused `resolvePrimaryAction()`/defense path using the pure rules helpers. Resolve at most one earliest threat; apply named result/reward constants; cancel pending ball action after defense; classify misses without mutating ball or awarding success. Keep existing parry presentation modest and rule-focused.**
- [x] **Step 4: Verify all tier, priority, and multi-projectile tests pass.**

### Task 5: Enforce run, combo, score, and gameplay-event semantics

**Files:**
- Modify: `src/game.js`
- Modify: `tests/game_flow_integration.test.js`
- Modify: `tests/combat_parry.test.js`

- [x] **Step 1: Add failing tests.** Name/assert: `survivalTimeAdvancesOnlyInPlayingAndPastFormerTimer` (intro excluded, >180 s does not end run); `healthZeroStartsDefeatExactlyOnce`; `runResetClearsGameplayButKeepsLocalRecords`; `comboAdvancesOnlyForContactAndParryTiers` (no increment for block/object/Kevin impact); `comboGroundGraceExpiresOnlyAfterContinuousGroundedPeriod` (bounce preserves grace, contact clears it); `comboChangesAndGameplayEventsEmitOnce` (payload/type counts for each required event); `scoreRewardsUseSpecifiedComboSnapshot` (defense uses pre-increment combo, kick/power shot use resulting combo).
- [x] **Step 2: Run the focused integration tests and confirm timer references/score paths violate the approved model.**
- [x] **Step 3: Remove `timedModeRemaining` from constructor, update, reset, tests, and any UI. Add `emitGameplayEvent()` and route ball contact, power shot, object destruction, Kevin hit, defensive tiers, damage, and combo changes through single emission sites. A power shot emits one `BALL_CONTACT` with `contactType: POWER_SHOT` and one `POWER_SHOT`; normal kick/header emits one `BALL_CONTACT`. Centralize combo changes in a small `setCombo(value, reason)` helper so reset/advance/event/music stay aligned. Do not advance combo from destruction/Kevin impacts or block; retain their score and Trick Chain contributions.**
- [x] **Step 4: Use one `COMBO_GROUND_GRACE_SECONDS = 0.8` continuous-grounded timer. Accumulate only while grounded; clear accumulated duration while airborne but preserve combo; clear duration on successful player contact; reset combo/juggle only after one uninterrupted grounded interval reaches 0.8 s. Cover one short bounce, repeated separated bounces, continuous grounded duration, and a successful save/contact during grace. Rerun focused scoring/lifecycle/parry tests and confirm persistence/reset behavior.**

### Task 6: Align player-facing documentation and browser smoke coverage

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `idea.md`
- Modify: `memory-bank/progress.md`
- Modify: `.ai/FEATURE_TRUTH.md`
- Modify: `.ai/PROJECT_STATE.md`
- Modify: `tests/e2e/smoke.e2e.js`
- Modify: `tests/power_shot.test.js` to remove its stale Spacebar gameplay label.

- [x] **Step 1: Add or update Playwright tests.** `titleScreenShowsAuthoritativeControls` asserts concise movement/aim/primary/hold hints and no unsupported Space/W actions; `startFlowKeepsCanvasLiveAndDismissesTitle` asserts start and active session remain visible; `pointerAndKeyboardSmokeHasNoBrowserFailures` exercises move, click, and hold then checks browser-health capture; add a DOM assertion that the results markup contains a run-duration field. Avoid canvas pixel assertions for deterministic engine rules covered by Vitest.
- [x] **Step 2: Run `npm run test:e2e -- --grep "control|primary|start"` (adjust titles to the focused cases) and confirm new assertions catch stale or missing UI claims.**
- [x] **Step 3: Replace Space-kick, W/Up Bullet-Time Header, 90-second standard-run, proximity-only/Golden-Parry, and unsupported combo-cap claims in current-facing copy (`README.md`, `idea.md`, `memory-bank/progress.md`, `index.html`, `src/game.js`, `src/player.js`, `tests/power_shot.test.js`). Publish the approved contextual action and tiered-defense vocabulary; retain Space only for explicit intro skip/restart. Mark Shift as optional/advanced and keep instructional copy concise. Preserve `.ai/INITIAL_AUDIT.md` as a historical snapshot; update `.ai/FEATURE_TRUTH.md` and `.ai/PROJECT_STATE.md` to current runtime truth and deferred balance/Havoc work.**
- [x] **Step 4: Run `npm test`, `npm run build`, and `npm run test:e2e`; repeat `npm run test:e2e` a second time if practical. Verify browser-health attachments show zero unexpected page errors, console errors, failed requests, or same-origin failures.**
- [x] **Step 5: Review the full diff for scope, event duplication, stale claims, and clean reset behavior. The implementation approval authorizes pushing the fresh Phase 1C branch, opening a draft PR, and verifying GitHub Actions; stop for external review without merging.**

## Migration Risks

- Matter.js projectiles have gravity and report velocity in a timebase different from `Player.vx` (world units per second). Convert both to a common timebase and validate the short 0.60-second prediction so an apparently incoming projectile is not misclassified; keep forecast tests deterministic.
- A normalized strike window delays consequences after release. Tune only named progress bounds and confirm input still feels responsive without extending contact to the full 0.38-second animation.
- The head and foot circles may overlap in world space. Explicit header-first priority must remain deterministic and must not double-award.
- Existing tests call `executePlayerKick()` / `executePowerShot()` directly and assume immediate success. Update them to enter the approved strike phase rather than weakening contact requirements.
- Existing points, trick-chain bonuses, combo increment order, and best-combo persistence interact. Preserve intended total score behavior while changing only combo advancement sources and explicitly approved defense rewards.
- Existing E2E has no stable access to private engine state. Keep assertions browser-visible and put physics/contact correctness in Vitest rather than exposing test-only production APIs.
- The game loop uses 60 Hz gameplay updates and 240 Hz Matter substeps. Contact-window sampling and player progress must remain stable across frame durations and one capped catch-up update.

## Expected Diff Scope

Expected production changes: one small `src/gameplay_rules.js` module plus focused edits to `src/game.js`, `src/player.js`, `src/main.js`, and `index.html`. Expected tests: one pure rules test file, updates to player/lifecycle/parry tests, and limited Playwright smoke assertions. Expected documentation edits: README, current-facing `idea.md` / `memory-bank/progress.md` claims, and the two `.ai` truth/state documents. Preserve `.ai/INITIAL_AUDIT.md` as historical evidence. No general event system, new gameplay mode, broad engine extraction, final balance pass, or major presentation rework.
