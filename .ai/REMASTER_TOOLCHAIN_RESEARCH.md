# Backyard Havoc Visual Remaster Toolchain Research

Baseline: `802654e517ad28ef5f49d014786f26e5ef50edf0`

Purpose: prepare a free/open-source production toolchain for the post-release visual and animation remaster without changing gameplay rules, physics ownership, progression, audio ownership, or the verified v1 release on `main`.

## Selected core stack

### PixiJS v8
Role: progressive replacement for the hand-authored Canvas2D rendering layer only. Matter.js remains authoritative for gameplay physics.

Why:
- WebGL renderer is stable and recommended by PixiJS for production.
- Scene graph, spritesheets, SVG/textures, masks, filters, blend modes and batching solve several current rendering limitations.
- Can coexist with Matter.js and existing DOM UI.

Rule: first build a renderer spike. Do not migrate gameplay logic until visual parity, input parity and performance are proved.

### PixiJS official AI skills
Repository: https://github.com/pixijs/pixijs-skills
Role: agent guidance for PixiJS v8 application setup, assets, spritesheets, filters, accessibility and performance.
License: MIT.

### PixiJS AssetPack
Repository: https://github.com/pixijs/assetpack
Role: raw-assets -> optimized web assets, spritesheets, multi-resolution assets, compression and manifests.
License: MIT.

### SVGO
Repository: https://github.com/svg/svgo
Role: optimize authored SVG props/background elements exported from Inkscape.
License: MIT.

### poly-decomp
Repository: https://github.com/schteppe/poly-decomp.js
Role: convex decomposition for selected irregular Matter.js collision silhouettes via `Bodies.fromVertices`.
License: MIT.
Caution: old/stable package. Use only for authored, tested collision polygons; keep simple compound bodies when they are clearer and cheaper.

### lil-gui
Repository: https://github.com/georgealways/lil-gui
Role: development-only tuning panel for lighting, parallax, camera, animation and VFX values.
License: MIT.
Rule: never bundle the tuning GUI into production.

### Blender LTS
Repository mirror: https://github.com/blender/blender
Role: Grease Pencil / cut-out / armature animation, scripted sprite rendering, animation timing and foot-plant prototyping.
License: GPL-3.0-or-later.

### Inkscape
GitHub mirror: https://github.com/inkscape/inkscape
Official development is on GitLab.
Role: authored SVG props, yard structures, silhouettes, vector cleanup and consistent shape language.
License: GPL family.

### Krita
Repository mirror: https://github.com/KDE/krita
Role: paint-over, texture accents, concept sheets, animation cleanup and visual-development references.
License: GPL-3.0.

### Spector.js
Repository: https://github.com/BabylonJS/Spector.js
Role: WebGL frame capture and GPU-state debugging after PixiJS renderer work begins. The repo also includes an MCP server usable by coding agents.
License: MIT.

### Existing tools retained
- Matter.js: gameplay physics.
- Playwright: browser and visual regression; use native `toHaveScreenshot()` rather than adding another screenshot-diff package.
- Vitest: deterministic logic tests.
- Vite: bundling/static deployment.
- Existing browser-health evidence and release stress harness.

## Not selected

- Phaser: unnecessary engine migration and duplicates current game/runtime ownership.
- Spine: editor workflow is paid.
- Rive as core animation workflow: not selected because the complete authoring pipeline is not as straightforwardly free/open-source as the chosen stack.
- DragonBones: not selected because the ecosystem/runtime is stale.
- free-tex-packer: not selected because PixiJS AssetPack is actively maintained and already provides a coherent asset pipeline.
- stats.js: not required; existing frame evidence + browser Performance APIs are enough.
- matter-tools: useful reference, but not installed because current debugging needs can be met with a custom development physics overlay without adding legacy UI dependencies.
- pixi-filters: defer until a concrete effect requires it; PixiJS core already supplies essential filters.

## Architecture boundary

Target architecture:

```
Matter.js + gameplay systems
          |
          | canonical world state
          v
Rendering adapter
          |
          +--> PixiJS scene graph / sprites / authored SVG-raster assets
          +--> DOM HUD / overlays remain accessible HTML
```

The remaster must not turn PixiJS into the gameplay engine.

## Asset pipeline boundary

```
raw-assets/
  vectors/
  characters/
  environments/
  effects/
       |
       +--> Inkscape / Blender / Krita authored sources
       |
       +--> SVGO / AssetPack
       v
public/assets/generated/
```

Generated assets should be reproducible and should not be hand-edited after generation.

## Quality gates introduced by the remaster

- deterministic screenshots for title, four yard themes, player states, Kevin states, Havoc and destruction
- collision-overlay screenshots for major irregular props
- animation contact tests for player kick/header and Kevin projectile release
- GPU/frame-budget evidence once PixiJS is active
- asset-size budgets
- visual hierarchy checks at representative desktop/mobile viewports
- no gameplay-rules drift
