# Backyard Havoc — Gameplay Feel Contract

Phase 2 tunes the existing Canvas/Matter.js runtime while preserving the authoritative rules in `.ai/GAMEPLAY_TRUTH.md`. Numeric feel values below are **INITIAL FEEL TUNING — REQUIRES PLAYTEST VALIDATION**; automated checks establish consistency and bounds, not subjective quality.

## Locomotion

| Constant | Initial value | Purpose |
|---|---:|---|
| `PLAYER_MAX_SPEED` | 480 px/s | Base horizontal speed |
| `PLAYER_SPRINT_MULTIPLIER` | 1.40× | Optional sprint top speed |
| `PLAYER_ACCELERATION` | 4,200 px/s² | Responsive acceleration toward input |
| `PLAYER_DECELERATION` | 5,600 px/s² | Braking after release or reduced speed target |
| `PLAYER_REVERSAL_ACCELERATION` | 7,500 px/s² | Sharp direction reversal |

Movement uses bounded `moveToward` velocity steps and average endpoint velocity for position integration. Sprint changes the speed target but not steering. Movement remains enabled while the pointer action is charging. Hurt/cutscene state handling remains in the existing lifecycle.

## Football contact response

| Constant | Initial value | Purpose |
|---|---:|---|
| `NORMAL_KICK_SPEED` | 11.5 Matter velocity units | Ordinary foot contact magnitude |
| `PERFECT_STRIKE_SPEED_MULTIPLIER` | 1.18× | Modest physical and spin increase for accurate foot contact |
| `HEADER_SPEED` | 9.5 Matter velocity units | Lower-power contextual head contact |
| `MAX_DOWNWARD_AIM_SLOPE` | 0.20 | Shallow downward aim limit; upward aim remains available |
| `HIT_STOP_CONTACT_SECONDS` / `HIT_STOP_HEADER_SECONDS` | 0.012 / 0.015 s | Light ordinary kick and header pauses |
| `HIT_STOP_PERFECT_STRIKE_SECONDS` | 0.040 s | Stronger Perfect Strike pause |
| `HIT_STOP_POWER_SHOT_BASE_SECONDS` / `HIT_STOP_POWER_SHOT_CHARGE_SECONDS` | 0.025 / 0.020 s | Power Shot pause grows from 0.025 s to 0.045 s at full charge |

The pure `computeBallContactResponse()` helper returns launch velocity, angular velocity, speed, and feedback tier. Combo is not an input to launch calculation. Header uses a lower speed and distinct spin. Aim is normalized, preserves cursor direction, and safely falls back to player facing for invalid/zero aim.

Initial angular response constants are `NORMAL_KICK_FACING_SPIN` 0.12 plus `NORMAL_KICK_AIM_SPIN` 0.05; `PERFECT_STRIKE_FACING_SPIN` 0.22 plus `PERFECT_STRIKE_AIM_SPIN` 0.09; and `HEADER_FACING_SPIN` 0.075 plus `HEADER_AIM_SPIN` 0.035. These add facing and aim influence to spin without changing score rules.

## Power shot

Phase 1C input timing remains locked: charge begins after 0.20 s, ramps to full over 0.85 s, and the power-shot threshold remains 0.25. Charge maps smoothly from `POWER_SHOT_MIN_SPEED` 13.5 to `POWER_SHOT_FULL_SPEED` 22.0 Matter velocity units. The selected cursor direction remains the launch direction; charge increases speed, spin, ball deformation, beam, shockwave, camera response, and hit-stop.

Power shots continue to require real contact and retain ordinary contact base scoring, independent of charge. No score multiplier is added for charge.

Power-shot spin uses `POWER_SHOT_FACING_SPIN` 0.12, adds up to 0.16 from `POWER_SHOT_CHARGE_SPIN`, and adds 0.08 from `POWER_SHOT_AIM_SPIN`. Header power-shot speed uses the `POWER_SHOT_HEADER_MULTIPLIER` 0.80.

## Ball physics and presentation

| Constant / setting | Initial value | Purpose |
|---|---:|---|
| `BALL_MAX_SPEED` | 23.5 Matter velocity units | Safety cap, above the 22.0 full-charge target |
| Ball `frictionAir` | 0.0025 | Single Matter-managed air-drag source, integrated through existing 240 Hz substeps |
| `BALL_DEFORM_NORMAL` / `BALL_DEFORM_HEADER` / `BALL_DEFORM_PERFECT_STRIKE` | 1.05 / 0.85 / 1.55 | Relative initial squash/stretch forces |
| `BALL_DEFORM_POWER_BASE` / `BALL_DEFORM_POWER_CHARGE` | 1.20 / 0.80 | Power-shot deformation grows with charge |
| `BALL_FEEDBACK_NORMAL` / `BALL_FEEDBACK_HEADER` / `BALL_FEEDBACK_PERFECT_STRIKE` | 0.45 / 0.30 / 0.80 | Initial strength of temporary presentation emphasis |

The former per-render-update `0.985` horizontal velocity multiplier is removed. No extra damping layer is stacked over Matter drag. Ball stretch and trail size follow actual speed; combo may continue to select trail color. Impact strength can briefly add deformation and a response-tier outline. No gameplay randomness is introduced.

## Defensive and impact feedback

The Phase 1C BLOCK/PARRY/PERFECT_PARRY gameplay effects, scoring and combo rules do not change.

| Outcome | Camera trauma / zoom | Hit-stop | Existing effect emphasis |
|---|---:|---:|---|
| BLOCK | 0.18 / 0.015 | 0.012 s | One light impact ring, blue deflection and existing Parry sound |
| PARRY | 0.42 / 0.035 | 0.035 s | Three rings and a bounded gold shockwave |
| PERFECT_PARRY | 0.78 / 0.065 | 0.065 s | Six orange rings, larger shockwave, short lightning/vignette emphasis, larger clear label |

Hit-stop is consumed by elapsed simulation seconds and any frame time after its expiry continues simulation. A newer impact can extend the stop only to the longer remaining duration; stops do not stack without bound.

## Camera response

`CAMERA_TRACKING_RATE` starts at 5.0 s⁻¹; `CAMERA_CUTSCENE_TRACKING_RATE` starts at 7.5 s⁻¹. Exponential smoothing converts the rate and elapsed `dt` into a consistent interpolation factor. Trauma/zoom remain clamped by `CameraTrauma`; no look-ahead or cinematic redesign is introduced.

Initial normal kick trauma/zoom are 0.18/0.02; Header 0.12/0.012; Perfect Strike 0.38/0.04. Power Shot starts at 0.35 trauma/0.035 zoom and adds 0.25/0.03 at full charge. Corresponding response constants are named `CAMERA_*` in `src/gameplay_feel.js`.

## Pose and effect timing

The existing procedural kick leg pose now uses the authoritative 0.30–0.70 strike interval: anticipation ends at contact start, the striking pose spans the contact phase, and recovery follows contact end. No new animation system, sprite, or art asset is introduced.

## HUMAN PLAYTEST CHECKLIST

Every item below **REQUIRES HUMAN PLAYTEST**. Automated tests do not mark these subjective questions PASS.

- Does movement start quickly without feeling instantaneous?
- Does release/braking feel controllable?
- Is reversal responsive?
- Can the player intentionally aim low/mid/high?
- Does a normal kick feel predictable?
- Is Perfect Strike noticeable but not overpowered?
- Does Header feel different?
- Does power increase clearly with charge?
- Does full charge feel worth the wait?
- Is Block readable as weaker than Parry?
- Is Perfect Parry unmistakable?
- Is camera shake exciting rather than annoying?
- Does hit-stop improve impact without feeling laggy?
- Does the ball retain enough momentum to create chains?
- Can the player predict the ball after several contacts?

## Known subjective tuning risks

- Player speed, acceleration, reversal, and braking may need changes after hands-on play.
- Aim clamping can make low shots safer but may reduce the usefulness of downward aim.
- Power-shot acceleration, header power, and Matter's drag need playtesting across real object impacts and long chains.
- Hit-stop and trauma are intentionally distinct by tier, but repeated impacts may still feel too disruptive.
- The camera remains horizontal-follow only; existing Canvas scaling and pointer-to-world aim behavior remain authoritative.
