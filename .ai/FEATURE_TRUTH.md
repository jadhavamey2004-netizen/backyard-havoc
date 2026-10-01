# Production Feature Truth

Baseline: `fc25a4b48887b4112bc168d397ef01c7dcd61553` (`main`, verified Phase 1C merge). The status below describes the Phase 2 core gameplay feel implementation; subjective tuning remains subject to human playtesting.

| Feature | Status | Production evidence / limits |
|---|---|---|
| Movement | IMPLEMENTED | `src/player.js` handles A/D or arrows plus optional Shift sprint with bounded acceleration, braking, reversal, and time-subdivision-consistent position integration. Page hiding clears held movement/sprint input. Numeric feel needs human playtesting. |
| Primary action | IMPLEMENTED | Pointer press/release snapshots aim and charge. An eligible projectile defense resolves immediately at release; otherwise one kick/header action waits for its strike window and requires real contact. |
| Power shot | IMPLEMENTED | Hold-to-charge pointer action; charge is calculated from elapsed hold on release. Contact is required, charge monotonically changes physical launch/presentation, and base contact reward matches a normal kick. |
| Header | IMPLEMENTED | Contextual head-zone contact during the strike window, selected ahead of foot contact; no dedicated control. Header has distinct lower-power physics and lighter feedback. |
| Defense | IMPLEMENTED | Gravity-aware deterministic short-horizon forecast selects the earliest valid incoming threat. BLOCK, PARRY, and PERFECT_PARRY retain distinct timing, impulse, score, and combo outcomes with increasing camera/impact feedback. Tuning requires human playtest validation. |
| Combo | IMPLEMENTED | Valid football contact and successful parry tiers advance combo. Continuous grounded time beyond the grace period and player damage reset it. Blocks, destruction, Kevin impacts, and returned-projectile aftermath do not advance it. |
| Trick chain | IMPLEMENTED | Separate short-window chain records selected destruction, Kevin, and skill events; it is not the combo multiplier. |
| Run | IMPLEMENTED | Intro transitions to survival play; health zero triggers defeat/results. Active survival time is non-terminal. Restart resets run state while preserving local records and mute preference. |
| Kevin / rage | IMPLEMENTED | Local heuristic state/rage and projectile throws remain the existing runtime. No character or AI redesign is part of Phase 1C. |
| Voice | PARTIAL | Browser speech synthesis availability and timing vary; not comprehensively tested. |
| Destruction | IMPLEMENTED | Matter collision paths remove destructible bodies and produce the existing debris effects. Presentation/balance are unchanged. |
| Procedural world | IMPLEMENTED | Existing chunk/world generation remains in place; long-run behavior requires broader playtesting. |
| Ball variants | DOCUMENTATION_ONLY | Physics profiles are exported/tested as formulas; runtime still constructs one fixed ball and has no selection/unlock path. |
| High score | IMPLEMENTED | Best score and combo persist locally through browser `localStorage`; no account or online leaderboard. |
| Mobile | DEFERRED | Existing touch listeners remain; complete mobile controls and device coverage are not implemented. |
| AI | PARTIAL | `src/ai.js` selects dialogue from local heuristic telemetry; no external inference service is used. |
| Cutscenes | IMPLEMENTED | Intro and defeat lifecycle remain; visual/audio synchronization is not fully verified. |
| Camera / hit-stop | IMPLEMENTED | Horizontal tracking uses dt-aware exponential smoothing; impact stop is measured in elapsed simulation seconds. Numerical shake/pause tuning needs human playtesting. |
| Ball physics / presentation | IMPLEMENTED | Pure deterministic contact response removes combo from physical trajectory, uses Matter air drag without per-update damping, applies a 23.5 speed safety cap, and scales visible stretch/trail from velocity. Tuning needs human playtesting. |
| Audio / music | PARTIAL | Existing generated Web Audio and browser TTS remain; audio lifecycle and device quality need dedicated review. No new sound assets are part of Phase 2. |
| Accessibility | PARTIAL | Native buttons and DOM text exist, but the canvas lacks a complete accessible gameplay alternative; zoom/reduced-motion issues remain. |
| Deployment | IMPLEMENTED | Vite production build is configured; deployment is not part of this implementation task. |

## Authoritative current controls and rules

- A/D or arrows move; Shift is optional/advanced sprint; pointer movement aims.
- Primary pointer press/release is contextual. Eligible projectile defense resolves at release; otherwise football contact can occur only during the action strike phase.
- Hold primary pointer to charge a power shot. Charge alone has no score effect; a ball contact is required.
- Header is a contextual head contact, not a dedicated W/Up ability.
- Standard run has no countdown. Player health reaching zero ends it through the existing defeat/results flow.
- See `.ai/GAMEPLAY_TRUTH.md` for exact tuning, event and contact contracts. Numeric timing/radius/reward values require playtest validation.

## Deferred

Later overhaul work remains deferred: Havoc meter/escalation, daily/timed modes, character/animation/audio/destruction redesign, progression, mobile-control implementation, performance budgets, world art, and broader architecture changes. Human validation of `.ai/GAMEPLAY_FEEL.md` remains outstanding.
