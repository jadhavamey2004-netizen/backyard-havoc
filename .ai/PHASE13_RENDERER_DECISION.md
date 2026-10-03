# Phase 13 Renderer Decision

**Decision:** C — KEEP CANVAS2D as the production renderer for now.

This is a feasibility decision, not a rejection of PixiJS or the authored-asset pipeline. The experiment proves that generated authored SVGs can support a more cohesive environment scene in Pixi, while showing material bundle, integration, and cross-platform visual-baseline costs that are not yet justified for migrating the verified game renderer.

## Evidence

### Quality gain

The Pixi sample replaces repeated high-contrast Canvas fence/yard primitives with a layered authored house, cedar fence, hedge, foreground garden, and hydrangea planter. At the same 960 × 540 logical resolution and unchanged DOM HUD, those assets give the sample clearer depth, softer background values, stronger prop grounding, and less repeated detail. The house, hedge, fence, garden, and planter are generated from the committed SVG pipeline. Player and Kevin remain the existing renderers represented through read-only Canvas textures; this is a renderer proof, not a full character remaster. The images are useful comparative evidence but cover only one yard scene and do not establish a full-game quality ceiling.

### Performance

The controlled headless Chromium sample used 120 frames at 1280 × 720 CSS pixels, DPR 1, with 33 Matter bodies, 18 particles, and one projectile. A representative local run recorded:

| Measure | Canvas2D | Pixi WebGL |
|---|---:|---:|
| Median frame interval | 15.5 ms | 50.6 ms |
| p95 frame interval | 17.0 ms | 63.1 ms |
| p99 frame interval | 92.5 ms | 2008.7 ms |
| Maximum interval | 140.7 ms | 3217.4 ms |
| Median renderer call | 1.2 ms | 0.9 ms |
| Texture count | n/a | 8 |
| Renderable/draw-call proxy | n/a | 46 scene nodes |

This latest full local Chromium sample is software/headless-browser evidence, not a low-end-device or GPU benchmark. The extreme Pixi p99/max interval indicates that the capture environment was unstable and must not be treated as representative hardware FPS. Pixi's renderer-call cost was lower in this sample, but its full frame interval was substantially worse. No Spector.js GPU capture was taken, and the 46-node value is explicitly a scene-node proxy, not measured draw calls.

### Bundle cost

The clean v1 baseline build contained 335,855 JavaScript bytes (99,985 gzip). The regular production build after Phase 13 contains 337,055 bytes (100,396 gzip), a 1,200 byte / 411 gzip increase. Production does not include Pixi or development tools. The isolated Pixi spike build contains 900,090 JavaScript bytes (265,391 gzip), a 564,235 byte / 165,406 gzip increase over the v1 baseline. Pixi's migration cost is therefore material even before a complete art conversion.

### Complexity and testability

The adapter keeps the same canonical `GameEngine` state and sends it to a renderer. The Pixi sample owns no Matter bodies, collisions, scoring, AI, timers, or input rules. The experiment preserves the DOM HUD and the original Canvas event target. That boundary is viable, but asset readiness, renderer lifecycle, a hidden Pixi canvas, coordinate parity, reduced motion, cross-browser WebGL, screenshot baselines, and fallback behavior all add surfaces to verify. There is no production context-loss recovery layer beyond switching back to Canvas after initialization/render failure.

### Browser and asset compatibility

The authored SVG → SVGO → AssetPack final-copy pipeline is small, deterministic, and suitable for either renderer. The Pixi smoke is scoped to Chromium, Firefox, and WebKit; inherited behavior tests remain on their existing projects. The final decision should include the exact-head GitHub browser results. No external assets or runtime services are required.

## Recommendation for later phases

Keep Canvas2D as the production renderer while Phases 14–20 use the art bible and authored-asset pipeline to improve the visual source material. Preserve the renderer adapter and the isolated Pixi sample as a comparison harness. Reconsider production migration only after a representative multi-theme scene, authored player/Kevin silhouettes, real mobile GPU measurements, a real GPU capture, context-loss recovery, and a measured user-visible gain justify Pixi's additional payload and verification complexity.

Do not infer that no visual remaster is needed: the sample demonstrates a promising art direction. The evidence supports investing in authored art and staging first, then reassessing renderer choice with more representative content.
