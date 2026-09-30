# Initial Repository Audit

## Executive summary

The untouched repository is a small Vite browser game using Canvas 2D and Matter.js. Its baseline builds and all 60 existing Vitest tests pass. A short production-preview playtest showed the title screen, transition into the active game, HUD, player, ball and backyard scene. No browser console error/warning was captured. The session did not cover the complete gameplay loop, game-over/restart, device sizes, browser speech output, or failed network requests.

No CRITICAL defect was confirmed. The strongest findings are a dead timed-mode counter, an unconnected header mechanic, misleading physics/AI documentation, input gates that do not match their described timing/contact semantics, lack of browser-level tests, and a `GameEngine` that owns too many systems. Findings below are source-based unless identified as runtime-unverified.

## Baseline and architecture

- Repository: `https://github.com/jadhavamey2004-netizen/backyard-havoc`; `origin` matches exactly.
- Default/current source branch at audit start: `main`; latest fetched baseline SHA: `c46709e1e4f97bcb49954b360cc8c23e34f6ee44`.
- Audit branch: `codex/overhaul-phase-0-audit`, created from fetched `origin/main`; source files remain unchanged.
- Entry: `index.html` imports `src/main.js`. Main wires DOM controls, keyboard/pointer/touch, canvas resize and `requestAnimationFrame` loop.
- Runtime physics: Matter.js engine, four physics updates per 1/60-second tick, in `src/game.js`; `src/physics.js` contains formula helpers and documentation profiles, not a custom Verlet engine.
- Rendering: Canvas 2D drawing distributed between the roughly 1,400-line `src/game.js`, `src/player.js`, `src/npc.js`, map renderer, particles and camera modules.
- Runtime AI: `src/ai.js` selects local dialogue using event telemetry and heuristics. There is no observed remote model/network dispatch or layout director.
- Tests: Vitest, 18 files and 60 tests. No lint, typecheck, E2E, screenshot or perf script is declared.
- Deployment: Vercel config runs `npm run build` and serves `dist`; deployment was not run.

## Baseline verification

`npm ci` completed from `package-lock.json` (45 packages). npm warned that the `esbuild@0.21.5` install script was blocked by install-script policy; the existing production build still succeeded.

| Check | Exact result |
|---|---|
| `npm test` | Exit 0; 18/18 files passed; 60 passed, 0 failed, 0 skipped; duration 961 ms. Four test cases printed `ReferenceError: window is not defined` from Web Audio initialization in headless Node, but Vitest marked those tests passed. |
| `npm run build` | Exit 0; Vite 5.4.21; 20 modules transformed; `dist/index.html` 8.46 kB, CSS 8.41 kB, JS 214.64 kB (62.73 kB gzip); built in 1.07 s. |
| lint/typecheck | Not available as package scripts. |
| browser smoke | Production preview on localhost rendered title screen and active game; console query returned no warning/error entries. Failed request inspection and complete gameplay/device coverage were unavailable in the browser surface. `/vite.svg` request returns the HTML fallback rather than an image (confirmed via local preview response). |

## What genuinely works

- The Vite production bundle loads and the desktop Canvas scene renders.
- A/D or arrow movement, Shift sprint, mouse/touch aiming, pointer/touch kick and hold-to-charge power shot have runtime handlers.
- Matter.js collision callbacks drive destruction, score/combo, projectiles, damage and defeat transitions.
- Local high score/best combo and mute preference use `localStorage`.
- Intro/ending cutscene state and restart flow have unit tests.
- Touch event handlers and narrow-screen CSS exist; actual small-screen usability remains unverified.
- Music and sound effects are generated through Web Audio; voice uses the browser Speech Synthesis API and generated vocal timbres, not recorded voice assets.

## Findings

### Confirmed bugs

#### BH-01 — HIGH · CONFIRMED BUG · Timed mode never ends

- **Files/functions:** `src/game.js`, constructor, `update()`, `resetEnvironment()`.
- **Evidence:** `timedModeRemaining` starts at 180 and is decremented while positive. No code checks for zero, presents it, or ends the run. `survivalSeconds` instead counts upward; defeat is health-driven.
- **Root cause:** timer field is disconnected from state/HUD/game-over lifecycle.
- **Player consequence:** the apparent three-minute mode cannot be played as a timed mode.
- **Recommended direction:** decide whether the intended game is timed or survival, then connect one authoritative timer to HUD and terminal state.
- **Verification:** source trace; later browser test should advance beyond 180 seconds and assert intended ending.

#### BH-02 — HIGH · CONFIRMED BUG · Header helper is unreachable

- **Files/functions:** `src/player.js` `triggerHeader()`/`canKickBall()`; `src/game.js` input and kick dispatch; `src/main.js` keyboard wiring.
- **Evidence:** heading state/rendering and the helper exist, but no production caller invokes `triggerHeader()` or `canKickBall()`. No airborne W/Up action is dispatched.
- **Root cause:** player animation/helper scaffolding was not connected to gameplay input and ball collision.
- **Player consequence:** advertised header/bullet-time mechanic does not occur.
- **Recommended direction:** implement and test a complete input-to-contact mechanic if retained, or remove claims/scaffolding.
- **Verification:** direct call-site search; later browser test for grounded and airborne inputs.

#### BH-03 — MEDIUM · CONFIRMED BUG · Wrong fixed direction on direct Kevin hit

- **File/function:** `src/game.js`, `setupCollisionHandlers()` direct-hit branch.
- **Evidence:** `const ejectDir = ball.position.x < target.position.x ? -1 : -1` returns `-1` for both sides.
- **Root cause:** both ternary branches specify the same direction.
- **Player consequence:** collision response is directionally wrong when the ball hits Kevin from the opposite side.
- **Recommended direction:** derive impulse direction from relative impact position/velocity.
- **Verification:** focused Matter collision test with left/right approach.

#### BH-04 — MEDIUM · CONFIRMED BUG · Kick award does not require a registered contact

- **File/function:** `src/game.js`, `handlePointerUp()` and `executePlayerKick()`.
- **Evidence:** a click release within a broad 150px foot radius dispatches a kick. This path does not use `Player.canKickBall()` or `hasHitBallThisKick`.
- **Root cause:** input proximity, animation and ball-contact logic are separate.
- **Player consequence:** a kick/score can be awarded when the animated foot is not contacting the ball; rapid clicks may make feedback inconsistent with visible contact.
- **Recommended direction:** define and enforce one explicit contact/cooldown gate shared by gameplay and animation.
- **Verification:** browser input sequence with ball outside/inside contact radius and score/velocity assertions.

#### BH-05 — HIGH · CONFIRMED BUG · Simulation and scoring run behind the title screen

- **Files/functions:** `src/game.js`, constructor/`update()`; `src/main.js`, animation loop.
- **Evidence:** constructor starts in `IDLE`, but `update()` only returns for game-over and cutscene states. `IDLE` falls through to the gameplay physics, collision, scoring and timer path. `main.js` calls `engine.update()` continuously before and after the start button. During the baseline browser smoke test, the title HUD showed 0, then the newly started session showed score 300 and combo 2x before any gameplay input.
- **Root cause:** the idle/title state is not treated as a paused simulation state.
- **Player consequence:** props/ball can move or be destroyed and score can accrue before a run begins; the intro does not establish a clean run baseline.
- **Recommended direction:** keep the world frozen in `IDLE`, or explicitly reset/initialize it at run start so title activity cannot affect play.
- **Verification:** open the title screen for several seconds and assert ball/score/world state stays unchanged until start.

### Architecture problems

#### BH-06 — HIGH · ARCHITECTURAL DEBT · `GameEngine` is a God Object

- **File/function:** `src/game.js`, `GameEngine` (about 1,400 lines).
- **Evidence:** one class constructs and coordinates Matter world, chunks, player/NPC, collisions, input, scoring, cutscenes, timer, particles, projectiles, camera and Canvas rendering (about 1,400 lines).
- **Root cause:** independent systems have accumulated behind one lifecycle/state owner.
- **Player consequence:** behavior changes are hard to isolate and integration regressions are difficult to localize.
- **Recommended direction:** establish tested subsystem boundaries incrementally; preserve current behavior while first extracting clear ownership seams.
- **Verification:** map state ownership and dependency/call graphs before any extraction.

#### BH-07 — MEDIUM · PERFORMANCE RISK · Fixed-step accumulator discards backlog

- **File/function:** `src/game.js`, `update()`.
- **Evidence:** the loop limits catch-up to three fixed ticks and clears remaining accumulator; each tick also performs four Matter updates.
- **Root cause:** explicit lag clamp avoids an unbounded catch-up spiral but loses simulation time on sustained slow frames.
- **Player consequence:** physics may slow/jump under load; severity on target hardware is unknown.
- **Recommended direction:** measure on representative hardware and define intended pause/catch-up behavior before tuning.
- **Verification:** frame-time profiling under representative dynamic-body load.

### Gameplay/design problems

#### BH-08 — MEDIUM · DESIGN WEAKNESS · Parry is proximity-gated, not timing-gated

- **File/function:** `src/game.js`, `handlePointerUp()`.
- **Evidence:** projectile reflection is selected using proximity (`dist < 100`) and early release/charge conditions; no kick animation phase or narrow timing window is checked.
- **Root cause:** collision opportunity is conflated with the input timing skill described by “perfect/golden parry”.
- **Player consequence:** parry may feel automatic/unclear rather than a learnable timing action.
- **Recommended direction:** decide the desired skill rule and make visual feedback match the actual trigger.
- **Verification:** instrumented browser tests plus short player playtest.

#### BH-09 — MEDIUM · DOCUMENTATION MISMATCH · Keyboard control claims disagree with runtime

- **Files:** `README.md`, `src/main.js`, `src/game.js`, `src/player.js`, `index.html`.
- **Evidence:** README advertises Space kick/power and W/Up header. Runtime pointer/touch handles kick/charge; keyboard handler drives movement and sprint. Space prevents scroll and restarts from game-over; W/Up header has no call path. In-page hints instead describe pointer controls.
- **Root cause:** README and in-game controls evolved independently from input implementation.
- **Player consequence:** players may try unavailable actions.
- **Recommended direction:** publish one tested input map and use it in README and overlays.
- **Verification:** keyboard/pointer browser matrix compared against the visible hints.

#### BH-10 — MEDIUM · DESIGN WEAKNESS · Randomness is not injectable/seeded

- **Files:** `src/game.js`, `npc.js`, `ai.js`, `particles.js`, `destructibles.js`, `map_renderer.js`, `audio.js`, `audio_assets.js`.
- **Evidence:** gameplay choices, AI dialogue and cosmetic effects call `Math.random()` directly.
- **Root cause:** no separate injectable random source for gameplay versus presentation.
- **Player consequence:** test/replay sequences are difficult to reproduce; effect variation itself is not a defect.
- **Recommended direction:** only centralize seeded randomness if deterministic replays or stable regression cases become a product goal.
- **Verification:** replay same inputs under a fixed seed and compare gameplay events.

### Character problems

#### BH-11 — HIGH · PERFORMANCE RISK · AI singleton retains engine listeners

- **Files/functions:** `src/game.js`, `setupNpcDialogueRelay()`; `src/ai.js`, `onDialogue()`.
- **Evidence:** each GameEngine adds a callback to module singleton `aiService`; listeners are append-only with no unsubscribe/dispose.
- **Root cause:** subscriber lifetime is not bound to engine lifetime.
- **Player consequence:** repeated engine creation can retain old game instances and relay dialogue into stale NPCs.
- **Recommended direction:** return an unsubscribe handle and dispose with engine lifecycle.
- **Verification:** create/dispose multiple engines; dispatch once and confirm only active NPC receives dialogue.

#### BH-12 — MEDIUM · DESIGN WEAKNESS · Kevin bubble and speech are unsynchronized

- **Files/functions:** `src/npc.js`, dialogue timers; `src/audio.js`, `EmotionalVoiceEngine`.
- **Evidence:** bubble timers use fixed durations while TTS splits clauses and uses a separate watchdog; no speech completion event updates bubble timing.
- **Root cause:** visual and audible dialogue lifecycles have separate clocks.
- **Player consequence:** text may vanish early or linger after speech depending on browser/voice.
- **Recommended direction:** use speech completion or an explicit text-first fallback duration policy.
- **Verification:** browser checks with short/long utterances, interruption and missing SpeechSynthesis.

#### BH-13 — MEDIUM · DOCUMENTATION MISMATCH · “AI” and edge architecture overstate runtime

- **Files:** `src/ai.js`; `memory-bank/techContext.md`; `memory-bank/systemPatterns.md`; README.
- **Evidence:** runtime creates telemetry, simulates latency with a timeout, then chooses a local line from pools and heuristic priorities. Memory-bank diagrams/specs describe WebSocket/fetch edge AI and a layout director; none appears in the audited runtime path.
- **Root cause:** design/prototype architecture is presented as implementation truth.
- **Player consequence:** expectations about adaptive behavior are misleading; developers may build on nonexistent services.
- **Recommended direction:** mark vision versus production code explicitly, or implement only after the prototype’s real needs are validated.
- **Verification:** trace runtime imports/calls/network access and keep the truth matrix current.

### Animation problems

#### BH-14 — MEDIUM · PRESENTATION WEAKNESS · Character animation is state-driven Canvas drawing

- **Files:** `src/player.js`, `src/npc.js`, `src/game.js`.
- **Evidence:** characters are drawn procedurally with hand-coded shapes and pose branches; no skeletal rig, clip system, transition blending or authored animation assets were found. Some motion uses `Date.now()` directly.
- **Root cause:** prototype visuals and motion are embedded in render code and game states.
- **Player consequence:** poses are limited and timing/quality is hard to tune independently; perceived quality requires human review.
- **Recommended direction:** evaluate animation scope using actual captured gameplay before selecting a replacement system.
- **Verification:** capture representative movement, kick, hurt, throw and idle states at target screen sizes.

### Voice/audio problems

#### BH-15 — MEDIUM · UNVERIFIED / REQUIRES RUNTIME TEST · Browser speech quality/availability

- **File:** `src/audio.js`.
- **Evidence:** `speechSynthesis` chooses browser-installed voices; no recorded Kevin lines are bundled. If the API is absent, no alternate spoken line is provided.
- **Root cause:** output depends on platform speech engine and installed voices.
- **Player consequence:** voice quality, language and even speech availability vary across browsers/devices.
- **Recommended direction:** treat captions/text as the guaranteed channel and assess whether recorded audio is warranted.
- **Verification:** test supported desktop/mobile browsers and unavailable/disabled synthesis.

#### BH-16 — MEDIUM · CONFIRMED BUG · Category cooldowns are bypassed on dialogue relay

- **Files/functions:** `src/game.js`, `setupNpcDialogueRelay()`; `src/npc.js`, `triggerRage()`.
- **Evidence:** relay omits category; `triggerRage` defaults to `DEFAULT`, so category-specific cooldowns are not selected through this path.
- **Root cause:** response category is not preserved across relay.
- **Player consequence:** dialogue repetition/cadence does not follow the per-category values in code.
- **Recommended direction:** propagate a validated category or remove unused category-specific behavior.
- **Verification:** trigger separate categories and assert their respective cooldowns.

#### BH-17 — MEDIUM · PERFORMANCE RISK · Stopping music leaves scheduled notes

- **File/function:** `src/audio.js`, `scheduleMusicStep()`/`stopMusic()`.
- **Evidence:** note oscillators are scheduled into the next 0.25 seconds; stop clears the scheduler timeout but does not stop or fade scheduled voices.
- **Root cause:** cancellation affects the scheduler, not already-started/scheduled Web Audio nodes.
- **Player consequence:** music may continue briefly after mute/hidden/game-over transitions; audible duration not measured.
- **Recommended direction:** track scheduled nodes or stop through a gain envelope.
- **Verification:** browser audio capture/playback check when stopping during a scheduled note.

### UI/UX and accessibility problems

#### BH-18 — MEDIUM · CONFIRMED BUG · Missing favicon reference

- **File:** `index.html`.
- **Evidence:** references `/vite.svg`; no matching file exists in `public/`. The production preview returns the SPA HTML fallback at that URL, not an image.
- **Root cause:** starter-template icon reference remained after asset removal.
- **Player consequence:** browser tab icon is absent/invalid.
- **Recommended direction:** add a project icon or remove the reference.
- **Verification:** request the referenced asset and check content type.

#### BH-19 — MEDIUM · ACCESSIBILITY · Zoom and canvas access are limited

- **Files:** `index.html`, `style.css`.
- **Evidence:** viewport disables scaling (`maximum-scale=1.0, user-scalable=no`); canvas has no accessible name/fallback description; no reduced-motion CSS path was found; primary gameplay is rendered in canvas.
- **Root cause:** mobile layout constraints and visual-first game UI lack accessible alternatives.
- **Player consequence:** users who need zoom or reduced motion, or cannot interpret the canvas, have limited access.
- **Recommended direction:** provide concise semantic instructions/status and reconsider zoom and motion controls.
- **Verification:** mobile zoom, keyboard-only and screen-reader checks; reduced-motion browser setting.

### Physics and destruction problems

#### BH-20 — HIGH · DOCUMENTATION MISMATCH · Physics descriptions conflict with runtime

- **Files:** README, `memory-bank/techContext.md`, `memory-bank/systemPatterns.md`, `src/game.js`, `src/physics.js`.
- **Evidence:** README says custom continuous Verlet; implementation creates a Matter.js Engine. Memory-bank describes swept-AABB collision; helper exists in `src/physics.js` but has no production import. It also specifies duplicated ball profiles with values differing from exported profiles and runtime hard-coded ball properties.
- **Root cause:** design math, helper prototypes and current runtime are mixed as if they were one authoritative specification.
- **Player consequence:** tuning or later changes based on the docs may not affect the actual ball.
- **Recommended direction:** identify the runtime as truth and label/archive design-only equations/profile tables.
- **Verification:** trace imports from runtime and compare all profile values to body construction.

#### BH-21 — LOW · PRESENTATION WEAKNESS · Destruction fragments are generic rectangles

- **Files:** `src/destructibles.js`, `src/game.js`.
- **Evidence:** destruction creates a 3×3 grid for glass and 2×2 rectangular fragments for other bodies; fragments do not match source polygons/material geometry.
- **Root cause:** low-cost generic shard geometry.
- **Player consequence:** destruction may read as block breakup rather than glass/material-specific destruction. Visual quality needs playtest.
- **Recommended direction:** preserve simple physics where useful but assess material-specific visual fragments independently.
- **Verification:** inspect glass, grill, gnome and other destruction in representative browser capture.

### Mobile, performance and cleanup

#### BH-22 — MEDIUM · UNVERIFIED / REQUIRES RUNTIME TEST · Touch parity and pause behavior

- **Files:** `src/main.js`, `style.css`, `index.html`.
- **Evidence:** touchstart/move/end invoke the same pointer handlers, but no distinct virtual movement/sprint controls exist. `visibilitychange` stops music when hidden, but the main loop and physics updates continue.
- **Root cause:** touch reuse and focus handling are partial; audio visibility behavior is implemented without a simulation pause.
- **Player consequence:** movement/aim parity on touch is unclear; returning to a hidden tab may advance the world unexpectedly.
- **Recommended direction:** test real small-screen interaction and choose explicit pause/focus semantics.
- **Verification:** mobile viewport/device pass, background/foreground pass, and inspect player/projectile state across hidden time.

#### BH-23 — LOW · PERFORMANCE RISK · Reset leaves per-run state to audit

- **Files/functions:** `src/game.js`, `resetEnvironment()` and `camera` state.
- **Evidence:** reset clears health/score, world bodies, key inputs and camera trauma, but does not reset camera world position or all transient counters/timers (`distanceTraveledMeters`, accumulator, some NPC/animation state).
- **Root cause:** reset responsibilities are distributed and incomplete.
- **Player consequence:** a run restarted after traveling/during a transient may begin with stale camera/stat/timing state.
- **Recommended direction:** define a reset contract that names every per-run owner and transient field.
- **Verification:** reach a later chunk, trigger active effects, restart and compare state to a fresh engine.

## Testing weaknesses

- Existing 60 tests pass but primarily validate formula helpers, state transitions and mocked engine behavior.
- Several formula tests exercise exported helpers rather than the production Matter.js collision/input/render path.
- No browser E2E, visual snapshot, screen-size/touch, real audio/TTS, asset/network or performance regression scripts exist.
- Test cases print headless Web Audio warnings (`window is not defined`) while still passing; this makes clean runtime health evidence harder to interpret.
- No performance budget or long-session leak test is declared.

## Documentation mismatches

- Physics engine and collision model differ from README/memory-bank architecture (BH-19).
- AI/edge service descriptions differ from local heuristic runtime (BH-12).
- Header/Space controls differ from runtime (BH-08).
- Ball profiles and unlock claims are reference/roadmap only (BH-19 and feature truth matrix).
- README states MIT, but no `LICENSE` file is present in this checkout.
- README 60-test badge/count agrees with the executed baseline (18 files, 60 tests); no issue found there.
- Prominent README copy describes features, while later sections clearly label some progression/monetization as roadmap; maintain that distinction.

## Technical debt

- Monolithic `GameEngine`, append-only AI listeners, duplicated design/runtime physics specifications, direct `Math.random()` use, hand-drawn character routines, and browser audio lifecycle coupling.
- `src/physics.js` helpers such as swept AABB and ball profiles have no production callers found; only `calculateSubStepDt` is imported in runtime. Test presence alone does not make these runtime capabilities.
- Particle/body lifetime cleanup exists for several arrays; long-session retention has no browser test.

## Candidate systems worth preserving

- Vite build/deploy path and lockfile-based setup.
- Matter.js collision and body integration, existing compact test suite, modular particle/camera/world renderer, and touch-to-pointer coordinate conversion.
- Game loop, fast restart, local score and a clear baseline desktop scene, pending gameplay validation.

## Systems to consider replacing only after evidence

- God-object ownership boundaries, procedural character art/pose system, browser TTS as a primary character voice, rectangular shard rendering, and the heuristic dialogue service if adaptive AI is a real requirement.

## Systems requiring runtime evidence before deciding

- Kick/parry feel and correctness, destruction readability, Kevin reactions and synchronization, music/voice quality, touch/mobile parity, pause/focus behavior, camera and VFX, DPR/resizing, frame-time and memory under long play.

## Recommended overhaul order

1. Let an external reviewer inspect this evidence and agree on product truth/controls.
2. Close correctness gaps with deterministic, production-path tests (timer/header/contact/direction/reset).
3. Add minimal browser smoke/E2E and artifact capture for the main loop before visual redesign.
4. Measure and decide subsystem boundaries; refactor incrementally behind behavior tests.
5. Then prioritize one player-visible area (controls/gameplay, character/animation, audio, destruction or UI) based on playtest evidence.
