# Phase 8 — Reactive audio system

## Scope and invariants

The audio layer is a presentation-only listener to canonical `GameEngine` gameplay events. `AudioDirector` selects recipes and updates music targets; it does not write score, combo, health, ball physics, Kevin rage, Havoc state, or destruction state. Audio API failures are caught at the director boundary so a failed cue cannot interrupt gameplay. The existing gameplay timing and rules remain authoritative.

All audible game content is synthesized with browser Web Audio or the existing local `VocalSoundBank`. There are no audio files, paid assets, remote audio/TTS services, or runtime audio requests. Browser `SpeechSynthesis` remains optional and cannot provide routed, measurable mix output.

## Signal path

```text
procedural SFX -> managed voice gain -> optional StereoPanner -> SFX bus ┐
VocalSoundBank  -> managed voice gain -> optional StereoPanner -> VOICE bus ├-> compressor -> MASTER -> destination
music scheduler -> playback gain -> duck gain -> MUSIC bus ────────────────┤
optional future ambience ---------------------------------> AMBIENCE bus ┘
SpeechSynthesis (browser-owned; not routable through Web Audio)
```

`src/audio_mix.js` owns the central mix constants. The single compressor feeds a master gain, which is the final mute point. Music ducks are multiplicative leases: overlapping events retain the strongest reduction, then ease back when each lease ends. Timed leases are cleared on reset and hidden-page transitions. Speech queue start/end/cancel/error callbacks acquire and release a separate voice lease.

World cues use `StereoPannerNode` where available. Pan is clamped to ±0.7, with a centered fallback when stereo panning is unavailable. Music and buses remain independent of the game clock.

## Audio ownership

| Canonical event | AudioDirector recipe |
| --- | --- |
| `BALL_CONTACT` | restrained normal kick; lighter/sharper Header; layered Perfect Strike |
| `POWER_SHOT` | low impact, rising synthetic transient, and filtered whoosh scaled by charge |
| `BLOCK`, `PARRY`, `PERFECT_PARRY` | separate dull block, rising ping, and multi-layer signature parry |
| `KEVIN_HIT` | heavy/comedic bonk; returned-projectile source adds one compact reward accent |
| `OBJECT_DESTROYED` | grill explosion and gnome bonk retain their special identity; other objects use their material recipe |
| `PLAYER_DAMAGED` | low, filtered negative impact |
| `TRICK_CHAIN_COMPLETED` | compact ascending tonal lift |
| `KEVIN_ESCALATION_CHANGED` | one short sting only when entering ANGRY, FURIOUS, or RAMPAGE |
| `HAVOC_STARTED`, `HAVOC_ENDED` | one start sting and one end resolution; no alarm loop |
| `COMBO_CHANGED` | reactive music state update and milestone fanfare at existing combo milestones |

The corresponding former direct event sounds were removed from `GameEngine` and `NeighborKevinNPC`; the event path owns these cues exactly once. Intentional non-event cues remain direct: intro voice, kickoff whistle, defeat horn, NPC dialogue and throw windup, trampoline/auto-hop/rescue cues, and low-level collision thuds. The `M` key controls mute and its existing HUD message is visual.

The event director receives a copied read-only presentation snapshot (`combo`, Kevin escalation state, Havoc active state, game state, page visibility, and mute state). It catches audio method and music-update errors and records diagnostic failure counts without changing gameplay state.

## Managed SFX and recipes

Each one-shot uses a managed gain voice. Finite oscillators and buffer sources are registered and removed on `ended`; cancellation fades/stops active sources. The shared active-voice cap is 24. Critical voice, player damage, Kevin hit, signature defense, and Havoc cues can displace lower-priority impact/material cues; low-priority cues are dropped when full. Optional per-family rate-limit keys suppress repetitive thuds without applying a global cooldown.

The seven material recipes use different structures: bright staggered scatter for GLASS; square/triangle mid cracks for CERAMIC; low dry tones and filtered noise for WOOD; sustained inharmonic triangle tones for METAL; short hollow square/triangle pops for PLASTIC; two filtered noise textures for FABRIC; low-pass grit plus sub impact for SOIL. Grill and gnome special handling takes precedence over generic material audio.

## Power charge, mute, visibility, and reset

Pointer hold starts one sine charge oscillator only after the existing gameplay charge delay. Subsequent frames change frequency and level through smoothed `AudioParam` targets; they do not create oscillators. Release and pointer cancellation stop it. Game reset, ending/game-over transitions, page hide, and mute clear the charge voice. Pointer cancel, touch cancel, and window blur are handled as cancellations.

The first Start click initializes/resumes the context. Mute preserves the `backyard_muted` localStorage key, sets the final master gain to zero, clears speech and charge, stops/fades music, and stops active managed cues. Unmute affects only future cues; it does not replay dialogue.

On page hide, music, managed voices, charge, queued speech, and duck leases are stopped/cleared. Returning to a visible tab resumes the procedural scheduler only if the game is in active PLAYING state, after refreshing its current presentation state. Run resets clear active one-shots, rate-limit history, duck leases, queue state, charge, scheduler intent, and reactive intensity while preserving persisted mute preference.

## Reactive music and speech

The existing single music scheduler continues through profile changes. CALM, BUILD, HEAT, FURY, and HAVOC choose bounded target tempo, cutoff, and percussion density. Targets move smoothly in the scheduler; tempo stays between 88 and 150 BPM. HAVOC is capped at 150 BPM. Bass cutoff follows the smoothed target; percussion density controls existing offbeat shaker/hat and downbeat accents. State changes do not restart the scheduler or spawn another timer.

SpeechSynthesis has no guaranteed system voice, can be missing, and cannot be routed through the Web Audio buses. It remains optional, retains normalized phonetics, priority interruption, a stale-queue guard, and repeat/cooldown checks. `VocalSoundBank` clips are generated locally and routed through VOICE even when SpeechSynthesis is unavailable; each managed clip gets a finite voice duck, while SpeechSynthesis dialogue gets a lease from queue callbacks. Music restores on clip completion, speech completion, interruption, cancellation, or error.

## Verification and review limits

Unit coverage checks bus routing, mute, bounded voices, recipe structures, defense distinction, pan clamping/fallback, charge lifecycle, mute/visibility/reset cleanup, duck overlap and speech completion paths, reactive states, and scheduler continuity. A gameplay invariance regression compares the same ball-contact result with audio muted and unmuted.

The E2E-only engine bridge exposes read-only audio diagnostics (never a production global). Chromium verifies the actual event sink, active-music state, pointer-charge lifecycle, visibility/mute/reset cleanup, exact game-over referral and disclosure; it attaches `phase8-audio-diagnostics.json` from captured runtime snapshots. Browser assertions cannot judge timbre, fatigue, clipping, or speech intelligibility. Human audio review remains required with headphones and ordinary speakers where practical.
