# Phase 4 — Character Animation Contract

**Status:** Phase 4 implementation contract. Animation quality still **REQUIRES HUMAN ANIMATION REVIEW**.

## Purpose and locked boundary

This document governs presentation motion for the existing Canvas player and Kevin. The gameplay models remain authoritative for position, contact, health, charge, rage, throw release, invulnerability, and state transitions. Animation samples those values and never creates a gameplay consequence. Phase 1C gameplay truth, Phase 2 feel, and Phase 3 character designs are locked.

No Kevin escalation state machine, Havoc feature, world/UI/audio redesign, animation package, skeleton runtime, or generalized animation graph is part of this phase.

## Audit of current motion

### Current inputs and coupling

| Character | Existing input | Existing use before Phase 4 |
| --- | --- | --- |
| Player | `runCycle`, `idleTime` | Direct sine offsets for feet, arms, head, and idle bob in `character_style.js`. |
| Player | `kickProgress`, `state`, `getKickPosition()` | Three direct kick-foot offsets; gameplay contact and drawing were not authored from one pose. |
| Player | `powerCharging`, `powerCharge` | Renderer-only charge accents; body posture was unchanged. |
| Player | `hurtTimer`, `invulnerabilityTimer`, `squashY` | Gameplay timers plus a static hurt offset and wall-clock blink. |
| Kevin | `fistShakeAngle`, `pitchArmAngle`, `dizzyAngle`, `stars` | Mixed model and renderer offsets; angry and throw arm motion used `Date.now()`, dizzy/star motion used simulation dt. |
| Kevin | `rageMeter`, `dialogue`, `dialogueEmotion`, `stateTimer`, `throwTimer` | Existing gameplay and speech state selected static visual branches. |

The player’s `Date.now()` invulnerability blink and Kevin’s `Date.now()` fist/throw motion were not pause-safe or deterministic. Furious steam emission used a per-update `Math.random()` test. Pose math lived beside visual-style tokens and mixed action progress with fixed anchor offsets. There was no shared transition/recovery contract; changing pose branches could snap limbs. The renderers already sampled without intentionally changing gameplay, and the phase retains that separation.

## Timing, easing, and layering

- Character pose clocks advance only from elapsed simulation `dt` supplied by the model update. Render calls are pure samples and never advance clocks.
- The game’s existing hit-stop and hidden-page update guards supply no simulation time while frozen; animation therefore holds on the same pose and resumes without wall-clock catch-up.
- `clamp01`, `lerp`, `smoothstep`, `easeOutCubic`, and `easeInOutCubic` are bounded, deterministic helpers. Use only those needed by production poses.
- State-specific pose is the base layer. Locomotion transition blend, charge tension, hurt, expression, and bounded secondary motion are applied in that order. Hurt wins over action presentation; active football action wins over charge; charge wins over locomotion; locomotion wins over idle.
- Contact alignment is measured after facing and vertical squash transforms. Animation must follow the canonical gameplay points; gameplay geometry is never adjusted for art.
- Values marked **ANIMATION TUNING — HUMAN REVIEW REQUIRED** are subjective starting points, not gameplay constants.

## Player contract

### States and priority

Production gameplay states remain `IDLE`, `RUNNING`, `KICKING`, `HEADING`, and `HURT`. Charging is a presentation layer over the current non-hurt pose. The order is `HURT > ACTIVE FOOTBALL ACTION > CHARGING > RUNNING > IDLE`.

Hurt interrupts pose presentation but does not change the gameplay action/timers or invulnerability. Kicking/header pose progress reads `kickProgress` from the existing 0.38-second action. On completion, existing gameplay state selects running/idle; a brief pose blend eases to locomotion. Pointer release, kick contact, Perfect Strike, and Power Shot outcomes stay in `GameEngine`.

### Idle and locomotion

- **ANIMATION TUNING — HUMAN REVIEW REQUIRED:** restrained seamless 3.2-second idle breath/weight-shift loop, with small head, torso, arm, blink, and hairband motion.
- Run is one alternating CONTACT → DOWN → PASSING → UP cycle. Opposite arms counter-swing; hips/knees/ankles stay connected. Existing normal and sprint phase rates start at 16 and 24 radians per second, respectively. Sprint may add bounded stride and lean only.
- **ANIMATION TUNING — HUMAN REVIEW REQUIRED:** start blend 0.10s, stop blend 0.13s, facing-reversal blend 0.10s. Gameplay facing/velocity responds immediately; the blend is visual only.

### Kick and header

The 0.38s gameplay action and normalized 0.30–0.70 contact window remain unchanged.

Kick pose phases are anticipation 0.00–0.30, strike 0.30–0.70, follow-through 0.70–0.88, and recovery 0.88–1.00. At normalized 0.50, the visible forward cleat contact anchor is placed at `player.getKickPosition()` within the named alignment tolerance after facing and squash transforms. Perfect Strike changes only bounded visual accent/recovery parameters.

Header uses the same gameplay action clock and contact window. Preparation compresses the stance; torso and head drive forward through contact, recoil, then return. The head anchor at normalized 0.50 is aligned to `player.getHeaderPosition()`. The player remains grounded; no jump or contact change is introduced.

### Charge, hurt, face, and interruption

Charge reads the existing 0–1 `powerCharge`: posture settles, elbows brace, focus tightens, and tension increases monotonically but remains steady. A confirmed release may add a brief sharper extension/recovery marker. These are presentation-only and never delay controls or gameplay action completion.

Hurt uses a short impact/recoil/stun/recovery envelope derived from the existing `hurtTimer` and simulation elapsed time. It does not alter health or the 1.2s invulnerability. Blinking is deterministic and driven by animation time; gaze is small and clamped. Reset clears pose clocks, blend history, injury age, blink phase, and secondary accumulators.

## Kevin contract

### Existing states and intensity

Only `PEEKING_INSIDE`, `LEANING_OUT_RAGE`, `THROWING_PROJECTILE`, `DIZZY_BONK`, and `REPAIRING` remain. Existing rage is represented with restrained, medium, and high visual intensity bands; those bands do not create or transition gameplay states. Dialogue/emotion can shape brows, gaze, mouth opening, and a bounded torso/hand pulse without phoneme lip-sync.

Watchful breathing/gaze is subtle. Rage gestures increase with `rageMeter`; high rage adds a short bounded lean and shake. **ANIMATION TUNING — HUMAN REVIEW REQUIRED:** watch cycle 3.8s; high-rage torso lean cap 0.11 radians. Repairs use a small repeating wipe/inspect gesture during the existing repair timer.

### Throw and reaction timing

The existing throw schedule and projectile spawn callback remain authoritative. A visual wind-up may read the final 0.22s of the existing `throwTimer`, but does not alter it. `executeThrow()` remains the spawn moment. At that moment, the front-hand anchor is `(10, 12)` in mirrored local coordinates, which maps to `npc.x + npc.facing * 10`, `npc.y + 12`. The hand holds near release briefly, then follows through over the existing 0.65s `THROWING_PROJECTILE` presentation interval and recovers.

Bonk uses the existing `DIZZY_BONK` state and timer: impact recoil, bounded wobble/glasses response, existing secondary stars, then the existing recovery to rage. Repairing has a small hand/cloth tending motion. No state timer, rage, throw interval, projectile, dialogue cooldown, or attack policy is changed. The legacy dialogue cooldown remains wall-clock based gameplay policy and is not used as an animation clock.

Kevin blink, face/body animation, and steam presentation use deterministic simulation time. Furious steam is emitted at a fixed simulation-time interval rather than through random per-frame sampling. Reset clears the Kevin animation clock, throw age, transition state, blink phase, and steam accumulator.

## Shared reset, pause, cutscene, and implementation policy

- Player `resetRunState`, Kevin `resetRunState`, `resetEnvironment`, and intro restart reset their animation runtimes. No prior-run phase or transition leaks forward.
- Existing intro/ending cutscenes continue to own positions and runtime states. Their current positive simulation `dt` is explicitly passed to character animation; no `Player.update()` movement or cutscene geometry is added. Game-over/hidden states that do not update remain frozen.
- The animation controller is a small per-character pose calculator, not a generic clip graph. Renderers draw existing character construction from anchors and do not mutate models or timers.
- Pose sampling is deterministic for the same gameplay state and controller clock. Calculations are elapsed-time based. Secondary motion is bounded. No wall-clock calls or random per-frame animation input are allowed.

## Named starting tuning values

| Name | Initial value | Purpose |
| --- | ---: | --- |
| `IDLE_CYCLE_SECONDS` | 3.2s | Player breath and weight loop. |
| `RUN_CYCLE_RATE_RADIANS_PER_SECOND` | 16 | Normal locomotion cadence, preserving existing phase rate. |
| `SPRINT_CYCLE_RATE_RADIANS_PER_SECOND` | 24 | Sprint cadence, preserving existing phase rate. |
| `START_TRANSITION_SECONDS` | 0.10s | Visual start blend. |
| `STOP_TRANSITION_SECONDS` | 0.13s | Visual settle blend. |
| `REVERSAL_TRANSITION_SECONDS` | 0.10s | Visual turn catch-up. |
| `KICK_CONTACT_PROGRESS` | 0.50 | Cleat alignment sample inside the existing contact window. |
| `HEADER_CONTACT_PROGRESS` | 0.50 | Head alignment sample inside the existing contact window. |
| `CONTACT_ALIGNMENT_TOLERANCE` | 3px | Automated world-anchor alignment tolerance. |
| `KEVIN_WATCH_CYCLE_SECONDS` | 3.8s | Restrained breathing/gaze cycle. |
| `THROW_WINDUP_SECONDS` | 0.22s | Presentation lead-in derived from existing throw timer. |
| `THROW_DURATION` | 0.65s | Mirrors the existing throw state timer; not gameplay-owned. |
| `THROW_RELEASE_HOLD_SECONDS` | 0.08s | Keeps the hand at the spawn point around the authoritative release. |
| `STEAM_INTERVAL_SECONDS` | 0.72s | Deterministic cosmetic steam cadence at high rage. |

All motion magnitudes and the named durations above are **ANIMATION TUNING — HUMAN REVIEW REQUIRED**. They are intentionally separate from gameplay tuning.

## Regression and evidence requirements

Unit coverage verifies bounded easing, finite anchors for every existing state, idle looping, alternating periodic locomotion, sprint cadence, start/stop/reversal blends, deterministic 60/120Hz poses, kick/header world alignment, charge escalation, hurt/recovery, Kevin rage tiers, exact Kevin release-hand location, throw phases, bonk/repair, reset, visibility/hit-stop freeze, render immutability, balanced Canvas save/restore, and the unchanged gameplay constants/contact points/timers.

Playwright produces production-pose player and Kevin sheets, a player kick sequence strip, a Kevin throw sequence strip, charge/hurt examples, browser-health records, and a normal live gameplay screenshot. Evidence uses the same pose functions as gameplay. Video is optional; still strips are mandatory.

## Human review checklist

Automated checks cannot approve animation quality. **REQUIRES HUMAN ANIMATION REVIEW.**

### Player

- Does idle feel alive without becoming distracting?
- Does the run feel athletic rather than mechanical, and does sprint read faster?
- Do start, stop, and reversal blend without delaying control?
- Is kick anticipation clear, contact aligned to the visible foot, and follow-through satisfying?
- Does header read clearly while the player remains grounded?
- Does charge tension rise without shaking uncontrollably?
- Does hurt communicate impact and recovery?
- Does hit-stop hold the impact pose and resume cleanly?

### Kevin

- Does Kevin feel observant while waiting?
- Does irritation build with existing rage without implying new gameplay states?
- Does shouting feel expressive without syllable lip-sync?
- Is the wind-up readable and does release hand motion match projectile spawn?
- Is throw follow-through convincing?
- Does bonk feel comedic and is repair readable at gameplay scale?
- Does Kevin remain readable inside the window?

### Shared

- Do the Phase 3 silhouettes, palettes, and proportions remain recognizable?
- Do limbs remain connected and avoid popping?
- Do the motions read at normal gameplay scale without excessive secondary motion?
- Are transitions smooth and gameplay responsiveness intact?
- Do hidden-page pause, hit-stop, reset, and cutscenes preserve the correct pose clock?
