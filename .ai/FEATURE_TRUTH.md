# Production Feature Truth

Baseline: `c46709e1e4f97bcb49954b360cc8c23e34f6ee44` (`main`, before audit documents). Status is based on executable source; it does not imply quality or full browser coverage.

| Feature | Status | Production evidence / limits |
|---|---|---|
| Movement | IMPLEMENTED | `src/player.js` handles A/D and arrow movement plus Shift sprint; main wires keyboard events. A held-key movement path exists. |
| Kick | PARTIAL | `src/game.js` maps pointer/touch release near the player to a kick. `Player.canKickBall()` is not used as the gate; keyboard kick is not wired. |
| Power shot | PARTIAL | Pointer/touch hold and release charges the kick in `src/game.js`; Spacebar is not wired to charge despite comments/README claims. |
| Header | DEAD/UNUSED | `Player.triggerHeader()` and heading rendering/state exist, but no runtime caller or airborne header input was found. |
| Parry | PARTIAL | Pointer/touch release can reflect a nearby projectile; source gate is proximity, not a kick-phase timing window. |
| Perfect parry | DOCUMENTATION_ONLY | “Golden”/perfect parry language exists in README/design copy; no distinct perfect-parry state or reward gate was found. |
| Combo | IMPLEMENTED | Score events update combo/peak combo and ground grace resets combo in `src/game.js`. Feel/balance remains unverified. |
| Kevin | IMPLEMENTED | `src/npc.js` state/rage/timers, drawing and throws are driven from `src/game.js`; physical/visual quality needs further playtesting. |
| Rage | IMPLEMENTED | Local heuristic response and NPC rage meter drive dialogue and projectile throws; not a learned/adaptive AI. |
| Voice | PARTIAL | Browser `speechSynthesis` with locally generated voice cues; browser voice, availability and synchronization vary and were not tested. |
| Destruction | IMPLEMENTED | Matter collision events remove destructible bodies and create rectangular shard bodies/particles. Shard quality is intentionally simple and needs runtime review. |
| Procedural world | IMPLEMENTED | `src/procedural_world.js` builds chunks and loads adjacent chunks. Repeated chunk/NPC behavior and long-run stability need playtest evidence. |
| Ball variants | DOCUMENTATION_ONLY | Four profiles are exported from `src/physics.js` and tested as formulas; runtime constructs one fixed ball in `src/game.js`, with no selection/unlock path found. |
| Timer | PARTIAL | `survivalSeconds` counts up and drives background progression; `timedModeRemaining` counts down from 180 but has no expiry behavior or HUD. |
| High score | IMPLEMENTED | Best score persists in browser `localStorage`; no account or online leaderboard found. |
| Mobile | PARTIAL | Touch events map to pointer actions and narrow-screen CSS exists; UI hints remain keyboard/mouse-centric and no device test was run. |
| AI | PARTIAL | `src/ai.js` locally chooses lines from heuristic event telemetry. No external model/network inference or layout director is in the runtime path. |
| Cutscenes | IMPLEMENTED | Intro and defeat state/timers/rendering exist; unit-level transitions are covered. Visual/audio synchronization was not verified. |
| Audio | PARTIAL | Web Audio generated effects/music plus browser TTS; runtime quality, support, and lifecycle cleanup were not comprehensively verified. |
| Music | IMPLEMENTED | Procedural sequencer runs in Web Audio and combo changes tempo; stop cancels future scheduler ticks but not already scheduled notes. |
| Replayability | PARTIAL | Restart and persistent high score exist; no daily challenge, unlock progression, replay recording, or seeded deterministic run was found. |
| Persistence | PARTIAL | High score, best combo and mute preference use local storage; gameplay progression/settings are otherwise absent. |
| Accessibility | PARTIAL | Some native buttons/HTML text exist, but canvas has no accessible name/fallback description, browser zoom is disabled, and reduced-motion treatment was not found. |
| Deployment | IMPLEMENTED | Vercel config builds Vite to `dist`; deployment itself was not executed. `/vite.svg` reference resolves to HTML fallback because asset is absent. |
