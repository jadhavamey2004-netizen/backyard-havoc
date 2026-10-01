# Kevin Escalation and Havoc Contract

**Phase:** 5 — Kevin AI, Escalation & Havoc
**Status:** implementation contract; human gameplay balance review required
**Baseline:** `732d853468cd5701f9e47edd699b82d1e2516485`

This document defines the Phase 5 gameplay contract. It adds local, deterministic event-driven escalation and a score-chase meter while preserving Phase 1C combat rules, Phase 2 feel, Phase 3 art, and Phase 4 animation and throw timing.

## Architecture and ownership

- `GameEngine` remains the existing gameplay coordinator and event source. Its `emitGameplayEvent()` is the one-way integration point for ordinary gameplay events.
- `KevinDirector` owns the high-level escalation state, deterministic provocation memory, threshold/hysteresis policy, attack profile, and projectile name sequences. It does not render, move bodies, own dialogue, or use wall-clock time.
- `NeighborKevinNPC` continues to own its Phase 4 low-level action/animation state, timers, throwing execution, dialogue bubble, and the numeric rage value used by the existing renderer. Gameplay events change rage through a finite, clamped API. The director observes the value and derives the separate high-level state.
- `HavocSystem` owns the 0–100 meter, inactivity and active timers, activation count, and event gains. It has no DOM, audio, physics, or wall-clock dependency.
- `src/ai.js` remains local cosmetic dialogue/telemetry simulation. A dialogue response only updates presentation; it cannot change rage, cadence, score, director state, or Havoc.
- The existing floating HUD displays textual Kevin state and Havoc value/active state. It reads engine state and only writes a DOM value when that value changes.

No ECS, behavior tree, generic AI framework, new event bus, dependency, hosted service, model, or asset is introduced.

## State and transition policy

The director state is distinct from `npc.state`. High-level states are exactly:

`CALM`, `SUSPICIOUS`, `ANNOYED`, `ANGRY`, `FURIOUS`, `RAMPAGE`.

| State | Upward rage range | Downward transition when rage is below |
| --- | ---: | ---: |
| CALM | 0–9 | — |
| SUSPICIOUS | 10–19 | 7 |
| ANNOYED | 20–34 | 17 |
| ANGRY | 35–49 | 32 |
| FURIOUS | 50–74 | 47 |
| RAMPAGE | 75–100 | 72 |

### KEVIN ESCALATION TUNING — HUMAN REVIEW REQUIRED

These are the initial balance values for external gameplay review. Tests lock their deterministic behavior, not whether their feel is final.

Rage is clamped to 0–100. A changed state produces one informational `KEVIN_ESCALATION_CHANGED` event with `previous`, `current`, `rage`, `reason`, and a recent-context snapshot. A large direct change may move directly to its final band and emits one transition; intermediate labels are not fabricated. Hysteresis is deterministic and only changes state on crossing its applicable boundary.

### Rage event gains — HUMAN BALANCE REVIEW REQUIRED

| Gameplay event | Rage |
| --- | ---: |
| `OBJECT_DESTROYED` within 280 world pixels of Kevin | +12 |
| `OBJECT_DESTROYED` farther away | +4 |
| Perfect Strike `BALL_CONTACT` | +3 |
| canonical `POWER_SHOT` | +5 |
| `PARRY` | +5 |
| `PERFECT_PARRY` | +10 |
| `TRICK_CHAIN_COMPLETED` | +12 |
| `KEVIN_HIT` | set to 100 |
| `HAVOC_STARTED` | +10, clamped |
| ordinary contact, Power Shot companion `BALL_CONTACT`, `BLOCK`, and unrelated events | 0 |

NPC rage decays after the existing approximately 6-second calm grace at 3.5 rage per simulation second. Every positive gameplay provocation refreshes the calm grace even when rage is capped and the numeric rage delta is zero. Events that are not gameplay provocations and cosmetic dialogue do not refresh this timer or add rage. `Date.now()` dialogue cooldowns can remain because they are cosmetic after this separation.

## Recent provocation context

The director retains at most 8 positive gameplay provocations and expires entries older than 4 simulation seconds. The snapshot includes the last provocation type, recent destruction count, recent parry/perfect-parry count, recent Kevin-hit count, repeated provocation count, and event count. It is bounded, ages only through gameplay `dt`, and is reset for every run. `KEVIN_ESCALATION_CHANGED` and other system events do not re-enter the provocation pipeline.

## Attack cadence and projectile policy

| Escalation | Attack policy | Repeat interval |
| --- | --- | ---: |
| CALM / SUSPICIOUS / ANNOYED | no projectile attack | — |
| ANGRY | existing throw action | 2.8 s |
| FURIOUS | existing throw action | 2.1 s |
| RAMPAGE | existing throw action | 1.4 s |

The existing throw windup, low-level state duration, release frame, spawn coordinates, projectile forecast, return behavior, contact radius, and defense windows remain authoritative. No cadence is faster than 1.4 seconds.

Projectile names are selected in deterministic per-state cycles:

- ANGRY: Clay Pot → Heavy Boot.
- FURIOUS: Clay Pot → Steel Wrench → Heavy Boot.
- RAMPAGE: Steel Wrench → Heavy Boot → Clay Pot → Steel Wrench.

Each pattern index resets on a new run. Existing projectile bodies, shapes, spawn point, and physical constants are unchanged. Cosmetic dialogue randomness, the existing projectile angular-spin variation, and the direct-hit ejection variation are outside this narrow projectile-type determinism contract; no repository-wide RNG conversion is included.

## HAVOC BALANCE — HUMAN REVIEW REQUIRED

These initial meter, decay, duration, and bonus values remain subject to human gameplay review.

### Havoc gains and timing — HUMAN BALANCE REVIEW REQUIRED

| Event | Havoc |
| --- | ---: |
| `OBJECT_DESTROYED` | +8 |
| `KEVIN_HIT` | +20 |
| `PARRY` | +5 |
| `PERFECT_PARRY` | +14 |
| canonical `POWER_SHOT` | +6 |
| Perfect Strike `BALL_CONTACT` | +5 |
| `TRICK_CHAIN_COMPLETED` | +18 |
| ordinary `BALL_CONTACT`, Power Shot companion contact, `BLOCK`, player damage | 0 |

The meter clamps to 0–100. After 3 seconds without a qualifying gain, it decays at 5 meter points per active simulation second. HAVOC MODE begins once at 100 and lasts 6 simulation seconds. The meter stays at 100 while active, ignores additional gains, and does not decay. At the end it emits `HAVOC_ENDED`, resets meter and inactivity time to 0, and cannot retrigger in the ending update. Activation count is per run.

The event that fills the meter activates Havoc but receives no Havoc score bonus. On later eligible gameplay events that occur while Havoc was active before the event, add `Math.round(baseScore * 0.5)` to `GameEngine.score`; preserve the original base points and payload. Eligible events are `OBJECT_DESTROYED`, `KEVIN_HIT`, `PARRY`, `PERFECT_PARRY`, `POWER_SHOT`, Perfect Strike contact, and `TRICK_CHAIN_COMPLETED`. Ordinary contacts, `BLOCK`, `COMBO_CHANGED`, player damage, and `HAVOC_SCORE_BONUS` are ineligible. Emit `HAVOC_SCORE_BONUS` with `source`, `baseScore`, `bonus`, and `currentCombo` without feeding it back into either system.

`BALL_CONTACT` with `contactType: 'POWER_SHOT'` is a companion record only. Kevin rage, Havoc gain, and score bonus use the following canonical `POWER_SHOT` event once. Existing Power Shot contact consumption, base reward, combo increment, and events remain unchanged.

When the existing 3-event, 3-second trick chain completes, keep its `1000 * combo` base award and reset, then publish one `TRICK_CHAIN_COMPLETED` event containing the completed event list, combo, and existing bonus score. Havoc observes this event; it does not replace the existing chain rule.

## Event order and reset behavior

For an ordinary event, capture whether Havoc was already active, apply any additive score bonus from that prior state, calculate Kevin provocation, apply the Havoc gain, and then publish the original event. Publish score-bonus, escalation, meter, and start/end notifications as informational outputs through a separate non-recursive path. HAVOC activation also applies its +10 rage reaction and a small existing-particle presentation cue; it does not force an attack or a separate state.

Reset director state, memory, pattern indices, transition data, Havoc meter/timers/count, and NPC run state on `resetEnvironment()` and intro/new-run restart. Preserve the existing high score, best combo, audio preference, and callbacks. Game over retains the final run snapshot and stops progression.

Director memory, rage decay, Havoc decay, Havoc duration, and attack cadence advance only in the visible `PLAYING` simulation after entry hit-stop has been consumed. Hidden time and hit-stop time are discarded by existing lifecycle/physics policy and never caught up. Intro/ending cutscenes, IDLE, and game over do not advance gameplay systems or permit attacks. NPC/character presentation clocks continue to use the existing cutscene/simulation timing rules.

## HUD contract

Within the current floating HUD, display `KEVIN: <STATE>`, `HAVOC`, a numeric 0–100 value, a horizontal bar, and explicit `HAVOC MODE` text while active. Text supplements color. Keep the existing HUD layout and avoid rapid flashing or a full UI redesign.

## Test and evidence strategy

- Unit-test every threshold, hysteresis boundary, gain, decay, grace, active duration, no-double-count case, event transition, bounded memory rule, reset, cadence, pattern, and deterministic replay snapshot.
- Integration-test dialogue/gameplay separation, score addition without base-score mutation, Kevin-hit and Power Shot single-contact behavior, trick-chain completion compatibility, lifecycle freezes, and reset.
- Playwright uses only an E2E-build bridge on hostname `127.0.0.1`. Scenarios inject real production gameplay events into `GameEngine.emitGameplayEvent()` and assert engine state as well as the rendered HUD; they do not mutate HUD labels.
- Preserve strict browser-health counters: page errors, console errors/warnings, failed requests, and same-origin failures all remain zero.
- Capture normal gameplay, escalation, RAMPAGE, near-full meter, active mode, reset screenshots, HTML report, and browser-health JSON in the CI Playwright artifact.

## Scope and review

**Locked gameplay constants remain unchanged:** kick action/contact windows, foot/header radii, perfect-strike radius, charge timing, minimum Power Shot charge, player health, defense fairness, score base values, destruction, projectile physics, Phase 4 animation, audio architecture, mobile controls, and progression.

**Free-resource audit:** no new dependency, paid resource/service/API, hosted runtime, external AI model, or downloaded game resource. Local `ai.js` remains cosmetic.

### Human gameplay review checklist

**Kevin — HUMAN REVIEW REQUIRED**

- Does CALM feel calm, with SUSPICIOUS and ANNOYED readable as distinct warnings?
- Does meaningful attack begin at ANGRY, and do FURIOUS/RAMPAGE remain fair and readable?
- Do state changes reflect player-caused behavior and recent context?
- Does Kevin remember repeated chaos without state flicker?
- Can players reliably read and parry every throw?

**Havoc — HUMAN REVIEW REQUIRED**

- Does Havoc fill from meaningful chaos rather than ordinary juggling?
- Are 3-second grace, 5-per-second decay, 6-second duration, and +50% bonus satisfying?
- Is reaching 100 earned, activation obvious, and reset fair?
- Can ordinary contact exploit the meter or score bonus?

**Combined loop — HUMAN REVIEW REQUIRED**

- Does destruction provoke Kevin, attacks create parry opportunities, and mastery feed Havoc?
- Does Havoc briefly reward mastery and support another score-chase run?

Phase 6 destruction/environment work and all later phases remain untouched by this contract.
