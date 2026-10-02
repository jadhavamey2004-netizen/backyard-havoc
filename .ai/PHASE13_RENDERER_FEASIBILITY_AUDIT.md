# Phase 13 Renderer Feasibility Audit

**Baseline:** `802654e517ad28ef5f49d014786f26e5ef50edf0`
**Prepared branch head:** `87aaf06929348acff538291f094ad756d49bf8ba`
**Logical world:** 960 × 540

## Existing Canvas architecture

`GameEngine.render()` owns the frame boundary in `src/game.js`. It clears the logical canvas, applies a center-pivot zoom, then applies camera shake/rotation and world-X translation. The draw order is:

1. Sky, distant ridges, sun, clouds, and birds (parallax uses camera X; camera zoom applies).
2. Procedural architecture, tree silhouettes, fence, ground, and yard-theme details for the three active chunks.
3. Kevin and his window.
4. Active props, persistent residues, thrown projectiles, destruction shards, and particles.
5. Player, ball, aim guide, ball indicators, and the Canvas power meter.
6. Screen-space chromatic edges, vignettes, Havoc edge treatment, and cutscene bars/titles.

`MapRenderer` owns the hand-drawn sky/environment, per-theme architecture, fence/ground details, prop illustrations, and residues. It is given a Canvas context and active Matter bodies; prop drawing uses each body's center, angle, bounds, label, and material. `PlayerRenderer` and `KevinRenderer` are Canvas drawing modules called by their gameplay objects. They derive poses from each object's existing animation controller and read visual fields such as state, facing, charge, rage, dialogue, and timers. `GameEngine` additionally draws ball, projectiles, aim/readability cues, shards, and cinematic overlays.

Particles are simulated/owned by `ParticleSystem`, updated by gameplay time and drawn by `ParticleSystem.draw()`. `VfxDirector` selects feedback profiles and sends presentation effects to the camera and particles. Camera world X, trauma, impulse, zoom punch, chromatic value, and reduced-motion multiplier are held by `CameraTrauma`; the current Canvas render applies those values directly.

Menus, buttons, pause/settings, Garage, Challenges, Results, accessible descriptions, and HUD are HTML in `index.html` with CSS in `style.css`. The game surface is a focusable 960 × 540 Canvas; the DOM canvas element is also the pointer event target. E2E bridges are enabled by the E2E build, not the default production bundle.

## Canvas backing size and input coordinates

`src/main.js` caps backing resolution at 2.5 × device pixel ratio and sets the bitmap to `960 × 540 × DPR`; CSS scales the canvas to the 16:9 container. Pointer client coordinates are mapped through the canvas `getBoundingClientRect()` into logical 960 × 540 coordinates exactly once. `GameEngine` then performs the existing inverse camera zoom transform for aim. Pixi must share the same element bounds and logical coordinates; it must not introduce a second input surface or a separate camera transform.

## Coupling classification

| Dependency | Classification | Evidence / implication |
|---|---|---|
| Character renderers reading model state and animation poses | Safe read-only render dependency | `Player.draw()` and `NeighborKevinNPC.draw()` call pure presentation paths that consume authoritative state. Keep these values read-only. |
| MapRenderer reading Matter body pose/bounds/material and procedural theme | Safe read-only render dependency | `drawProps()` reads the existing body and never owns collisions or destruction decisions. |
| GameEngine render methods reading ball/projectile/shard/camera/particle/VFX state | Safe read-only render dependency | Rendering is colocated in `GameEngine`, but no gameplay decisions should move into a renderer adapter. |
| GameEngine constructing and directly owning MapRenderer | Unnecessary coupling | It prevents selecting a presentation implementation without a small adapter boundary. The Canvas implementation remains authoritative as the fallback. |
| `Player`/Kevin `draw(ctx)` methods | Render logic adjacent to gameplay models | Calls are delegation only; the renderers consume existing state and do not update movement, attacks, contacts, or score. |
| VfxDirector calling CameraTrauma/ParticleSystem | Presentation-system ownership | Event-to-feedback selection is outside the renderer; preserve this owner and read camera/particle state in Pixi. |
| DOM pointer listeners targeting the Canvas while the Canvas is replaced/hidden | Unnecessary DOM/render coupling risk | Keep the original Canvas in place, same bounds and pointer event target; any Pixi surface must be pointer-transparent. |
| Existing draw methods that render from canonical model references | Safe if read-only; unsafe if copied into a second simulation | Renderer frame inputs must be snapshots/references for presentation only. Pixi must not integrate Matter, score, decide collision/contact, or advance gameplay timers. |

No renderer currently changes Matter bodies or resolves gameplay success. Dynamic vector appearance and collision ownership are separate: Canvas prop art may not match the underlying rectangle/compound fixture, which motivates the single-prop Phase 13 comparison and later Phase 17 review.

## Migration risks and required evidence

| Risk | Phase 13 control/evidence |
|---|---|
| Pointer client-to-world mapping | Preserve Canvas as event target; test DPR, portrait/landscape, mouse/touch and renderer parity in logical coordinates. |
| Camera shake, rotation, zoom and impulse | Apply the authoritative `CameraTrauma.getTransform()` output; do not create a second camera. |
| DPR and responsive resizing | Keep the logical 960 × 540 scene and compare canvas backing/screen geometry at the required viewport matrix. |
| Mobile touch and safe-area controls | Leave touch controls/DOM layout unchanged; add focused Pixi touch/mapping smoke. |
| Reduced motion | Pass current `isReducedMotion`/motion multiplier into renderer effects; preserve danger/projectile readability. |
| Particle/projectile pressure | Use the same active presentation arrays; record counts and frame intervals without claiming headless timing is device performance. |
| Screenshot and character tests | Preserve existing Canvas visual coverage and add deterministic `toHaveScreenshot` evidence for renderer modes. |
| Loading timing | Keep Canvas visible until Pixi has initialized and assets are ready; expose readiness/fallback state to E2E. |
| Browser compatibility | Run only the focused Pixi smoke in Chromium, Firefox, and WebKit while retaining the historical project split. |
| Asset loading and context loss | Keep authored assets local and generated; test load failure and report Pixi initialization/context-loss behavior. Canvas remains a practical fallback during the spike. |
| WebGL absence/context loss | Do not make WebGL mandatory in the baseline. Initialization failure chooses Canvas; context restoration is recorded and exercised where browser support permits. |
| Performance and bundle cost | Record sample/frame count, median/p95/p99/max, DPR/backing size, scene counts, and actual built/gzip deltas. |
| Collision/art mismatch | Keep Matter as sole collision authority; draw debug geometry read-only and compare only one representative irregular prop. |

## Scope boundary

Phase 13 is a presentation feasibility experiment. The adapter may select Canvas or Pixi only in development/E2E. No gameplay rules, Matter materials, input timing, progression schemas, audio ownership, accessibility semantics, or production-facing renderer setting belong in this audit or the spike. The renderer decision may recommend Pixi, a hybrid, or retaining Canvas based on evidence.
