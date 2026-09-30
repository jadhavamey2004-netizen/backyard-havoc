# Backyard Havoc — Gameplay Truth Contract (Approved)

**Status:** Approved for Phase 1C implementation. Mandatory amendments A–I from the implementation approval are incorporated. This document remains the authoritative gameplay contract; numeric values are initial tuning pending playtest validation.

**Baseline inspected:** `e383938201825bbc3286c292cdcf35831e8002f4` (`main`).

**Scope:** Authoritative Phase 1C run, controls, header, and parry rules. Numeric values marked as initial tuning require playtest validation.

**Provenance note:** “Current implementation conflict” sections below record the baseline observed during design review. They are historical evidence for the approved decisions, not claims about the current Phase 1C branch.

## Authoritative decisions

| Topic | Approved authoritative rule |
|---|---|
| Standard run | Survival arcade run. Start a fresh run through the start interaction and intro; active-run time begins only when gameplay enters `PLAYING`. |
| Run end | Run ends when player health reaches zero. The existing defeat sequence then leads to results. There is no standard-run countdown. |
| Time | Elapsed active survival time, shown in results and used for environmental day-cycle presentation; it remains available as a non-terminal escalation input. It does not end a standard run. A timed challenge is deferred. |
| Health | Three hearts are three damage points. Preserve the current 1.2-second post-hit invulnerability as the initial rule; further damage during it does not remove another heart. |
| Desktop controls | A/D or Left/Right move; Shift is optional/advanced sprint; mouse/pointer movement aims; primary pointer press/release is the contextual action; holding primary pointer charges a power shot. M remains an audio preference shortcut where supported. |
| Mobile concept | Left-side drag/hold moves; right-side tap performs the primary action and hold charges; pointer/touch position aims. This is a design mapping only; mobile controls are deferred. |
| Kick | A short primary action starts a 0.38 s total action/animation with anticipation, strike/contact, follow-through, and recovery. Football contact is allowed only during a narrower normalized strike window, at most once per action. A miss has no ball impulse, contact score, combo/juggle increment, or successful-contact trick event. |
| Power shot | Primary hold begins charge intent; visible charge begins after about 0.20 s. Release at charge ≥0.25 (about 0.41 s total hold on the current curve) attempts a power shot during the strike/contact phase. Movement remains available. No contact means a whiff with no gameplay reward or stored resource. |
| Header | Contextual contact only; no dedicated header control. During the strike/contact phase, valid head-zone contact selects HEADER; otherwise valid foot-zone contact selects KICK; otherwise MISS. Head and foot use distinct spatial zones. Bullet time is removed from the core design. |
| Projectile priority | At primary action resolution, an eligible incoming defensive threat takes priority; otherwise contextual football contact (header before kick) resolves during the strike window; otherwise the action is a miss. One action has one outcome. A projectile that hits before action resolution still causes normal damage. |
| Combo | Represents sustained player skill/control continuity. Valid ball contacts and successful parry tiers advance it. Destruction, Kevin impacts, and blocks do not automatically advance it. A grounded ball beyond the grace window or player damage resets it to 1. Peak combo is the highest multiplier reached in that run. |
| Juggle count | Number of successful ball contacts in the current airborne sequence; reset when the ball lands beyond the grace window. It is a run statistic, not a second multiplier. |
| Trick chain | Short-window sequence of qualifying skill/havoc events (initial window: 3 s), separate from combo. Destruction and Kevin impacts may contribute and award their own points/chain bonuses without advancing combo. The qualifying event list and bonus remain tunable. |
| Score / high score | Score is the total run points from successful ball actions, destruction, Kevin hits, and defensive tiers, with the active combo multiplier applied where specified. A successful power shot uses the same base contact award as a normal kick (initially 100 × resulting combo); charging adds no separate multiplier. High score is the best total run score persisted locally; it is not an online ranking. |
| Restart | A new run resets health, player/NPC transient state, ball, destructibles/world run state, score, time, distance, combo, and event chains, then plays the intro. Preserve local records and mute preference. |

`COMBO_GROUND_GRACE_SECONDS = 0.8` is continuous grounded time: accumulate while grounded; clearly airborne time clears the accumulated duration while preserving combo; successful player contact clears it; only one uninterrupted grounded interval reaching 0.8 s resets combo and juggle. Player damage resets combo immediately. Constructor initialization and run reset are silent for gameplay events. Perfect Parry advances combo by two as one transition and emits one `COMBO_CHANGED` event with previous/current/delta/reason; its defensive score uses the pre-increment combo. Normal kick, power shot, and header use base contact reward 100 before applying resulting combo. Power-shot charge adds no score multiplier. If retained, foot-based Perfect Strike uses a named criterion and radius and has base reward 150; Perfect Strike is distinct from Perfect Parry.

## Primary action and projectile resolution

Resolve one primary action beginning at pointer release, using this order:

1. Find eligible projectiles whose gravity-aware predicted ballistic path intersects or re-enters the player contact region within the forecast horizon. Select the earliest valid threat by predicted time-to-contact/closest approach, not array order. Instantaneous moving-away velocity alone does not disqualify a projectile if gravity curves its trajectory back into danger.
2. If an eligible threat is within the defensive envelope, resolve exactly one defensive result. A held power action is canceled by this defense.
3. Otherwise start the 0.38 s kick action. Check the ball only during its narrower strike/contact phase, in separate head and foot zones. Prefer HEAD when the ball is inside its valid zone; otherwise use KICK if it is inside the foot zone. A charged release uses power-shot impulse. At most one contact consequence may occur.
4. If the strike/contact phase ends without a valid contact, the result is MISS. A miss cannot score, advance combo/juggle count, add a successful-contact trick event, or change ball velocity.

**INITIAL TUNING — REQUIRES PLAYTEST VALIDATION:** represent action phase by normalized progress `0..1`; start with `KICK_ACTION_DURATION = 0.38 s`, `KICK_CONTACT_START = 0.30`, and `KICK_CONTACT_END = 0.70` (about 0.152 s of strike/contact). Use named constants, not scattered millisecond checks. Start with `FOOT_CONTACT_RADIUS = 95 px` and a distinct `HEADER_CONTACT_RADIUS = 45 px`, measured from `getKickPosition()` and `getHeaderPosition()` respectively. This keeps the canonical foot point semantically a KICK while retaining an overlap region; head-zone contact wins deterministically in that overlap.

**INITIAL TUNING — REQUIRES PLAYTEST VALIDATION:** for a valid defensive opportunity, classify by estimated time remaining until body contact, measured at action resolution:

| Result | Initial timing | Outcome and reward | Required eventual feedback |
|---|---:|---|---|
| **BLOCK / SAFE DEFLECTION** | More than 0.25 s and at most 0.60 s | Deflect away from the player; smallest reward (initial proposal +100 × combo at action resolution); no combo increment. | Clear safe-contact cue, distinct from a reward parry. |
| **PARRY** | More than 0.08 s and at most 0.25 s | Return projectile toward Kevin; initial proposal +500 × combo at action resolution; then advance combo once; emit a parry event for later Havoc systems. | Parry text/SFX/VFX and visible return direction. |
| **PERFECT PARRY** | At most 0.08 s | Precise return toward Kevin; initial proposal +1,000 × combo at action resolution; then advance combo twice; emit a distinct perfect-parry event. | Microfreeze, camera snap, signature SFX/VFX, clear “Perfect” text, and Kevin reaction. |
| **MISS** | No eligible threat/envelope, or no action before impact | No defensive effect/reward; ordinary projectile collision may damage the player. | No success feedback; damage feedback remains clear on impact. |

**INITIAL TUNING — REQUIRES PLAYTEST VALIDATION:** name all thresholds, initially `DEFENSE_ENVELOPE_RADIUS = 120 px` centered on the player combat point (`{ x: player.x, y: player.y - 30 }`), `PROJECTILE_PLAYER_CONTACT_RADIUS = 40 px`, `BLOCK_MAX_TIME_TO_CONTACT = 0.60 s`, `PARRY_MAX_TIME_TO_CONTACT = 0.25 s`, and `PERFECT_PARRY_MAX_TIME_TO_CONTACT = 0.08 s`. The projectile must be within the envelope and its gravity-aware predicted path must intersect/re-enter the player contact region within the block window. Instantaneous moving-away velocity alone does not disqualify a projectile if its ballistic path curves back into danger; trajectories that do not intersect within the horizon are ineligible. Timing determines the tier. Resolve one projectile at most. Deflection velocity points away from the player; parry tiers return it toward Kevin with bounded speed. Example rewards are tunable and are not a score rebalance.

When multiple projectiles qualify, select the earliest valid threat by smallest nonnegative predicted time-to-contact; break exact ties by smaller predicted closest distance, then stable Matter body ID. Do not use array iteration order as the selection rule. **INITIAL TUNING — REQUIRES PLAYTEST VALIDATION:** use lexicographic ordering by `(timeToContact, closestDistance, body.id)`.

### Power-shot edge cases

- Pointer-down begins charge intent; charge UI begins after 0.20 s and reaches 1.0 over the following 0.85 s. A 0.25 threshold therefore takes about 0.41 s total hold. Keep these as named tunable constants (`POWER_CHARGE_START_DELAY`, `POWER_CHARGE_RAMP_DURATION`, `POWER_SHOT_MIN_CHARGE`); calculate charge from elapsed pointer hold on release so a missed animation frame cannot change threshold results. Movement remains available; sprint is optional/advanced.
- On release, resolve a valid defensive projectile first. If there is none, the charged action starts the kick animation and can launch only on valid contact during the strike/contact phase. A release with no contact is a whiff, clears charge, gives no gameplay reward, and cannot be retried from that hold.
- Below the 0.25 release threshold, resolve the ordinary primary action (projectile defense, ball kick, or miss).
- A projectile that physically hits before the input resolves is not retroactively parried. A defensive result cancels the pending ball action rather than combining outcomes.

## Current implementation conflict, rationale, and migration

### Run, health, score, and restart

- **Current implementation conflict:** `src/game.js` decrements `timedModeRemaining` from 180 without an expiry path or HUD. `survivalSeconds` counts active play and drives environment transitions; zero health starts the ending sequence. `triggerGameOver()` reports score, high score, survival time, peak combo, and distance. Combo advances on successful kicks/power shots and resets after the ball stays grounded or the player takes damage. Destruction/Kevin events score; a rolling `trickChain` awards every three recorded events in its 3-second window. `README.md` also claims 90-second run cycles and a capped 1x–12x combo, neither authoritative in source.
- **Decision:** Health-based survival is the standard run, beginning when intro finishes or is skipped and the engine enters active `PLAYING`. Active time is a duration/stat and environment pacing input. Remove the unused countdown from standard runtime and deprecate 90-second standard-run claims. Combo advances only on valid ball contacts and successful parry tiers; destruction and Kevin impacts score and may contribute to Trick Chain but do not advance combo themselves.
- **Rationale:** This matches the production defeat path, three-heart HUD, procedural environment, and current restart/result flow. A fixed 90/180-second endpoint would conflict with the health defeat loop and would make present projectile pressure and longer mastery runs terminate arbitrarily.
- **Implementation impact:** `src/game.js` run timer/scoring/reset, `src/map_renderer.js` time-based presentation, `src/main.js` results/restart wiring, HUD/results in `index.html`, plus README and lifecycle/scoring tests. Preserve persistent high score/best combo and mute setting across reset.
- **Test requirements:** Verify start/intro does not count as active time; time continues beyond 180 seconds without ending a run; health reaching zero ends once through defeat; hit invulnerability; all per-run fields reset; records/preferences persist; score/high-score/results reflect final run; combo/juggle/trick-chain have separate, tested reset and award rules; repeated ground bounces do not reset combo before the 0.8 s grounded grace expires, and successful contact clears grace.

### Controls, kick, and power shot

- **Current implementation conflict:** `src/player.js` handles A/D/arrows and Shift. `src/main.js` routes pointer/touch to `GameEngine`; a short release attempts kick/parry, while a hold charges after 0.20 s and needs at least 0.25 charge to fire. Movement is not disabled during charge. README claims Space kick and W/Up bullet-time header; Space actually skips intro/restarts after defeat, and W/Up has no header caller. Title and bottom hints say click/kick but do not explain the contextual defense or charging threshold.
- **Decision:** Publish the small desktop control set above; Shift is optional/advanced. Retire Space as a gameplay kick and W/Up as a header action (keeping explicit skip/restart behavior if supported). Primary pointer release resolves a defensive threat first; otherwise it begins one 0.38 s action whose ball consequence can occur only in the normalized strike/contact window. A held action snapshots charge and attempts a power shot only on valid contact. Misses never produce contact rewards.
- **Rationale:** One primary action expresses one player intention and avoids competing kick/parry/header buttons. Contact, not click proximity alone, makes feedback trustworthy.
- **Implementation impact:** `src/main.js` input routing and key instructions, `src/game.js` pointer/action arbitration, `src/player.js` action/contact states, title/bottom instructions in `index.html`, README controls, and focused input/contact tests. Mobile mapping remains future work.
- **Test requirements:** Desktop movement/sprint/aim; short click with ball contact and without contact; contact-window boundaries and no contact outside strike; valid/invalid charge release; movement while charging; threshold/hold duration; no duplicate contact; one action cannot produce multiple outcomes; Space/W no longer imply unsupported gameplay abilities.

### Header

- **Current implementation conflict:** `Player.triggerHeader()` and `canKickBall()` support a heading pose/position, but no production input/collision path dispatches `triggerHeader()`; there is no required behavior depending on manual header input. Heading is named in some tests/trick-chain fixtures and in README's nonexistent bullet-time action.
- **Decision:** **CONTEXTUAL** header contact only; **REMOVED** dedicated W/Up/header control and bullet-time claim. `getHeaderPosition()` and `getKickPosition()` define separate contact zones with distinct named radii. During strike, head-zone contact takes priority; otherwise a valid foot-zone contact is a kick. One action cannot do both.
- **Rationale:** Preserves football expression without adding a control. No current production gameplay relies on the unreachable helper.
- **Implementation impact:** `src/player.js` contact pose/position; `src/game.js` shared contact resolver and event labels; retire stale keyboard/header claims in `src/main.js`, `index.html`, and README; update heading fixtures/tests.
- **Test requirements:** Ground-level ball selects foot contact; high ball selects head contact; zone edges/overlap resolve deterministically; both require one action and award at most once; no bullet-time side effect.

### Parry / Perfect Parry / interaction priority

- **Current implementation conflict:** `GameEngine.handlePointerUp()` treats any thrown projectile within 100 px of the kick point as a successful +500-point return, with no incoming-trajectory/timing tier; it returns before checking the ball. README calls this a timed “Golden Parry,” but there is no perfect tier, broad block result, or timing window.
- **Decision:** Use one primary action, deterministic threat-first arbitration, bounded spatial eligibility, and predicted time-to-contact tiers above. Blocks are safe with the smallest reward; normal/perfect tiers return the projectile with distinct rewards. A charged release yields to an eligible projectile; otherwise its pending action may power-kick a valid ball. Resolve the earliest valid threat only.
- **Rationale:** Makes timing and projectile readability the mastery signal while preserving physical plausibility and one learnable action. The explicit priority avoids silently kicking when the player intends defense.
- **Implementation impact:** `src/game.js` threat prediction, result classification, deterministic multi-projectile selection, and score/event dispatch; `src/player.js` shared action timing/contact; later `src/npc.js` reaction dispatch; future audio/camera/VFX; HUD instruction text and dedicated deterministic parry tests. No new parry button.
- **Test requirements:** Ballistic paths that do and do not intersect, including upward then descending and paths with instantaneous moving-away velocity that still curve back; envelope boundary; miss/block/parry/perfect timing edges; returned velocity and one-time resolution; earliest-threat selection and deterministic ties independent of array order; defense wins over kickable ball; charged release cancellation; one damage maximum on a miss; each tier's points/combo/event hook.

### Combo, score, and future Havoc events

- **Current implementation conflict:** Successful kick and power-shot paths increment `combo`; destruction and Kevin impacts score and record trick events but do not increment it. Ground grace and player damage reset it. `recordTrickEvent()` is a local 3-second chain/bonus mechanism, not a general event bus.
- **Decision:** Keep combo as player-skill continuity: valid football contacts and successful parry tiers advance it; blocks, destruction, Kevin impacts, and later impact consequences do not. Those havoc events may score and contribute to the separate Trick Chain. Preserve lightweight event boundaries, via a callback or equivalent, for `BALL_CONTACT`, `POWER_SHOT`, `OBJECT_DESTROYED`, `KEVIN_HIT`, `BLOCK`, `PARRY`, `PERFECT_PARRY`, `COMBO_CHANGED`, and `PLAYER_DAMAGED`; do not replace the engine with a general event framework.
- **Rationale:** Prevents chain reactions from recursively multiplying combo while preserving future Havoc consumers.
- **Implementation impact:** Score/combo update sites and trick/event helpers in `src/game.js`, combo HUD/results, focused tests, and a narrow optional engine callback if needed.
- **Test requirements:** Only valid football contacts and PARRY/PERFECT_PARRY advance combo; BLOCK/destruction/Kevin impacts/projectile aftermath do not. Verify resets, multiplier ordering, and each required gameplay event is emitted once with useful payload. Successful power shot emits one `BALL_CONTACT` (`contactType: POWER_SHOT`) and one `POWER_SHOT`; normal kick/header emit one `BALL_CONTACT` with their contact type.

## First-90-seconds learning compatibility

This is a target sequence for onboarding through play, not a scripted implementation requirement:

| Time | Intended discovery | Contract support |
|---|---|---|
| 0–5 s | Move and make a first kick. | Start flow reaches play quickly; movement and primary action are the only essential instructions. |
| 5–20 s | Aim, contact, and keep the ball moving. | Contact feedback and visible ball response teach kick range; combo is tied to successful actions. |
| 20–35 s | Break a yard object. | Aim and existing destructibles reward a successful shot. |
| 35–50 s | Kevin notices/reacts. | Destruction/provocation events drive current rage/dialogue systems. |
| 50–70 s | Kevin begins fighting back. | Rage threshold enables projectile throws; time may alter scene/pacing but is not a hidden run limit. |
| 70–90 s | Read an incoming projectile and learn to defend. | A readable projectile arc plus one primary action supports block, parry, and perfect timing. |
| 90+ s | Escalate and master chains. | Longer survival remains possible; destruction, Kevin hits, parries, and Perfect Parries expose future Havoc event hooks. |

Do not add a large instruction card to teach these steps. Tune projectile readability, tutorial prompts, and escalation pacing only after validating the core action rules.

## Migration map and deferred scope

| Approved decision | Likely production areas |
|---|---|
| Survival run, active time, reset, results | `src/game.js`, `src/main.js`, `src/map_renderer.js`, `index.html`, lifecycle/scoring tests |
| Single authoritative controls and power-shot arbitration | `src/main.js`, `src/game.js`, `src/player.js`, title/HUD hints, README, input tests |
| Contextual header | `src/player.js`, `src/game.js`, heading tests, stale control/docs copy |
| Parry result tiers and threat priority | `src/game.js`, `src/player.js`, later `src/npc.js`/audio/camera/VFX, parry tests and HUD copy |
| Combo/score meanings and future Havoc hooks | `src/game.js`, `src/main.js`, HUD/results, score/trick-chain tests, narrow future-event callback |
| Mobile mapping | Later touch controls and responsive UI; no Phase 1C implementation now |

**Run pressure:** An endless standard run must eventually avoid static low-pressure play. Survival time and/or Kevin rage may feed future escalation; the exact curve belongs to later Kevin/Havoc work and is not part of Phase 1C unless needed for approved-rule correctness.

## Open design risks

- Contact zones and parry timing/reward values are initial tuning and require playtest validation.
- The threat forecast is short-horizon and must account for existing Matter projectile motion closely enough to reject ballistic paths that do not intersect/re-enter while allowing initially moving-away paths that gravity curves back into danger.
- The proposed narrow gameplay-event callback's payload shape should stay minimal and support only the listed future Havoc events.
- The 0–90-second flow describes target pacing; exact tutorial staging and endless-run pressure remain future Kevin/Havoc decisions.

**Deferred:** Timed/daily modes; Havoc meter; full scoring rebalance; character/animation/destruction/audio/voice redesign; progression; world-generation changes; mobile-control implementation; broad `GameEngine` refactor. Phase 1C implementation is approved; validation and review status are tracked in `.ai/PROJECT_STATE.md`.

## Validation and inspection notes

- Inspected `src/game.js`, `src/player.js`, `src/main.js`, `src/npc.js`, `index.html`, `README.md`, `.ai/INITIAL_AUDIT.md`, `.ai/FEATURE_TRUTH.md`, `.ai/PROJECT_STATE.md`, and relevant lifecycle, player, parry, power-shot, and trick-chain tests.
- Existing browser smoke on the production preview reached the kickoff/gameplay scene after the title interaction; no page errors, console errors, or failed requests were observed. It was a short technical smoke, not a feel/balance playtest.
- Baseline `npm test`: PASS, 18 files / 70 tests. Existing headless Web Audio warnings (`window is not defined`) were printed by tests that still passed.
- Baseline `npm run build`: PASS, Vite 5.4.21; 20 modules transformed.
- At contract approval, the baseline notes above described the pre-Phase-1C runtime. Implementation and current status are tracked on `codex/phase-1c-gameplay-truth` and in `.ai/PROJECT_STATE.md`.
