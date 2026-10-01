# Phase 7 — VFX, Camera & Game-Feel Polish

## Scope and preserved gameplay

Phase 7 routes presentation feedback through `VfxDirector` while keeping gameplay events authoritative. The director reads event type and presentation context, then calls the existing `CameraTrauma` and `ParticleSystem`. It does not own or mutate score, health, combo, Kevin AI, Havoc rules, physics, or destruction state.

Phase 1C contact and defense rules, Phase 2 ball and player tuning, Phase 3/4 character design and animation, Phase 5 Kevin escalation/Havoc, and Phase 6 material destruction remain the source of gameplay truth. No audio system or assets were added. No dependencies, paid assets, third-party rendering libraries, external APIs, or services were added.

## Audited presentation systems

- `CameraTrauma` already tracked the world horizontally and accumulated trauma, zoom punch, chromatic intensity, and Perlin-sampled shake. Phase 7 extends that camera with a bounded additive directional impulse, simulation-time decay, reduced-motion scaling, and finite/clamped transforms.
- `ParticleSystem` already owned particles, pop text, shockwaves, speed lines, lightning, trails, rings, vignettes, power beams, and hit-stop. Phase 7 keeps these buffers and hard caps, normalizes movement/decay to elapsed simulation time, and uses an optional seeded PRNG for repeatable local E2E evidence.
- `GameEngine.render()` applies the camera's bounded zoom around the fixed 960×540 canvas center. The horizontal world camera remains separate from presentation offsets. Mouse aim maps through that center zoom and excludes camera shake/impulse, so no visual offset is written into world positions.
- Chromatic aberration is rendered as a few low-alpha colored edge strips. It uses Canvas compositing and bounded rectangles rather than per-pixel work or a new renderer.

## Feedback architecture and hierarchy

`src/vfx_director.js` maps canonical gameplay events to presentation profiles. Profiles only contain visual intensity and effect recipe values. `POWER_SHOT` derives its presentation charge from the existing `GAMEPLAY_TUNING.POWER_SHOT_MIN_CHARGE` rule and scales beam width, rings, shockwave, camera response, and burst size without changing the shot.

The tested intensity hierarchy is:

`ordinary contact < Block < Parry < Perfect Strike / strong Power Shot < Perfect Parry < Kevin Hit / Trick Chain / Havoc activation`.

Normal contact uses a restrained ring/burst and small camera punch. Header feedback is smaller and lighter. Perfect Strike adds compact blue-white emphasis and a sharper shockwave. Block is a brief blue-white cue; Parry adds gold directional sparks; Perfect Parry combines the existing 0.065-second microfreeze, stronger orange rings/shockwave/lightning, a brief vignette, bounded directional camera impulse, readable gameplay pop text, and the existing projectile return trajectory. Kevin hits and trick-chain/Havoc activation receive larger localized bursts and camera emphasis. Player damage gets a short low-opacity red edge vignette and compact impact burst.

Material destruction adds only small presentation accents by material (glass sparkle, ceramic dust, wood splinters, metal sparks, plastic snaps, restrained fabric fibers, and soil dust). Phase 6 physical fragments and their collision/scoring policy are unchanged. Havoc uses a subtle screen-edge warmth and a warmer/stronger ball trail while active; activation and end events use short bounded accents. Major Kevin escalation transitions can receive a small cue; individual rage increments do not.

There is no canonical yard-clear gameplay event in the current game flow. Phase 7 does not invent one, score for it, or attach fireworks to a non-existent trigger.

## Camera, time, and safety

- Directional impulse adds to the existing camera transform, is vector-clamped, and decays exponentially from simulation `dt`.
- Trauma, angle, offset, zoom, and chromatic presentation are clamped. Zoom is bounded to 1.08× and impulse magnitude to at most 10 canvas pixels; ordinary contacts remain far below those limits.
- `camera.decay(dt)` remains in the gameplay update path, so hit-stop pauses its recovery. The existing render-time noise sample remains visual-only.
- No camera presentation value changes `camera.x`, physics coordinates, projectile selection, collision, Kevin targeting, or prop position.
- Particle velocities and gravity are integrated in 60 Hz reference units (`dt * 60`) with elapsed time; rings/shockwaves use elapsed-time exponential expansion and timed effects age by elapsed seconds. Equivalent 60 Hz and 120 Hz simulations are covered by tests.
- The rainbow combo trail uses particle simulation time instead of `Date.now()`. E2E mode seeds cosmetic particle randomness; production retains normal randomness.
- Hit-stop continues to consume only elapsed simulation time and pauses camera/particle advancement in the existing update path. Hidden-page handling clears transient presentation and input state; accumulated frame time is reset on visibility transitions.
- Run, intro, ending, game-over, and hidden-page transient resets clear camera trauma/impulse/zoom/chromatic values, particles, trails, screen effects, hit-stop, and ball deformation without resetting the world camera unless the run itself is reset.

## Reduced motion and resource limits

`main.js` follows `prefers-reduced-motion` and updates the two presentation systems when the preference changes. Reduced mode uses a 0.35 multiplier for camera movement/zoom/chromatic output and Canvas effect travel/opacity, including speed lines and flashes. It does not modify simulation `dt`, gameplay inputs, physics, defense windows, score, combo, health, rage, Havoc, or destruction. The stylesheet disables existing HUD/title/modal transitions and pulse animations under the same media query.

Hard caps remain in place: particles 400, pop text 30, shockwaves 20, speed lines 64, lightning arcs 30, trail points 60, impact rings 25, vignettes 6, and power beams 8. The normal path uses Canvas shapes, gradients, alpha, compositing, and bounded arrays. There is no full-canvas blur, per-pixel processing, or extra rendering engine.

## Verification and human review

Focused camera tests cover trauma/zoom bounds, impulse bounds and decay, reset, chromatic recovery, reduced motion, 60/120 Hz equivalence, finite transforms, and stable world X. Particle tests cover hard caps, elapsed-time movement and lifetimes, seeded trail colors, reduced-motion scaling, reset, and invalid elapsed time. Feedback tests cover hierarchy, charge scaling, presentation-only profiles, and event dispatch. Game integration verifies identical kick and material-destruction gameplay results with normal and reduced-motion presentation, plus zoom rendering/aim mapping and lifecycle reset.

Playwright's Phase 7 scenarios use the test bridge only when `MODE=e2e` and the hostname is `127.0.0.1`. The browser evidence captures representative gameplay feedback and requires clean page-error, console-error/warning, failed-request, and same-origin-failure records. Perfect Parry is resolved through the regular projectile threat selection and pointer-release gameplay path, not by injecting UI text or classes.

The Phase 6 destruction persistence E2E fixture now switches its game state to `IDLE` immediately after the production collision setup, before screenshot capture and the before/after score comparison. This test-only freeze removes the known live-loop timing ambiguity without weakening the persistence assertion or changing production behavior.

Human visual review remains necessary for perceived strength, screen readability, player/ball visibility at zoom extremes, material accent restraint, reduced-motion comfort, and the Perfect Parry signature moment. Automated screenshots and assertions do not replace that review.
