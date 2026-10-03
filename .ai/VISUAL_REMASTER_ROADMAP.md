# Backyard Havoc Post-Release Visual Remaster Roadmap

Verified v1 production baseline:
`802654e517ad28ef5f49d014786f26e5ef50edf0`

This roadmap is a NEW post-release track. The original Phase 1-12 overhaul remains complete.

The remaster exists to solve the visual/animation/art-production defects found in the final production video without changing the core gameplay rules that already passed the release gate.

## Global invariants

- `main` remains the verified v1 baseline until each remaster phase is independently reviewed and merged.
- Matter.js remains authoritative for physics/gameplay.
- DOM menus/HUD remain accessible HTML unless a reviewed phase explicitly changes presentation.
- No scoring, health, Kevin thresholds, Havoc rules, challenge thresholds, progression rewards, affiliate contract or audio ownership changes during visual-remaster phases unless a later product-design phase explicitly authorizes them.
- No paid authoring/runtime tools are required.
- Generated runtime assets must be reproducible from committed source assets/scripts.
- Every phase ends at a draft PR for external review.
- Every visual phase includes stable Playwright screenshot evidence from the same CI environment.
- Reduced-motion, touch and keyboard behavior must remain green.

---

## Phase 13 — Toolchain, Art Bible, Renderer Feasibility and Visual Baseline

Branch:
`codex/phase-13-visual-remaster-toolchain`

Purpose:
prove the new free/open-source pipeline before replacing production rendering.

Deliverables:
- free/open-source toolchain documented and reproducible
- PixiJS v8 WebGL renderer spike fed from existing Matter/game state
- no gameplay ownership moved into PixiJS
- official PixiJS agent skills installed locally for Codex/compatible agents
- raw asset source structure defined
- AssetPack/SVGO pipeline spike
- development-only lil-gui tuning panel
- custom physics/collision debug overlay
- deterministic screenshot-baseline suite
- visual art bible:
  - global light direction
  - outline hierarchy
  - palette hierarchy
  - saturation/value hierarchy
  - prop scale/readability rules
  - contact-shadow rules
  - world-layer depth rules
  - animation silhouette rules
- renderer performance/parity measurements against current Canvas2D
- choose whether Pixi becomes production renderer

Critical experiment:
render one representative yard, player, ball, Kevin, one irregular prop, one destruction event and existing VFX through Pixi while Matter/game logic stays unchanged.

Acceptance:
- same logical 960x540 gameplay coordinates
- pointer mapping unchanged
- no score/physics/input drift
- stable WebGL across Chromium/Firefox/WebKit release smoke
- visual screenshot evidence
- no production dependency on WebGPU
- renderer spike does not regress mobile performance unacceptably

STOP if the renderer spike does not materially improve quality or creates disproportionate complexity.

---

## Phase 14 — Rendering Foundation, Theater Presentation and HUD Safe Area

Purpose:
remove the “polished website around a small prototype canvas” feeling.

Fixes:
- replace/restructure production Canvas renderer only if Phase 13 approved Pixi
- desktop theater presentation so gameplay uses substantially more available viewport
- preserve 16:9 world and responsive mobile behavior
- optional fullscreen/theater affordance
- create explicit world safe areas for DOM HUD
- Kevin/window/projectiles may never be generated or staged beneath critical HUD
- hide/fade gameplay HUD during defeat/cinematic overlays
- reduce fast-restart kickoff obstruction
- reproduce current camera shake/zoom/chromatic/Havoc presentation in the new renderer
- define render layers:
  1. far atmosphere
  2. far skyline
  3. architecture
  4. fence/vegetation
  5. props/world
  6. characters/ball/projectiles
  7. world VFX
  8. screen VFX
  9. accessible DOM HUD/overlays

Acceptance:
- large-desktop presentation no longer capped to the old visually-small experience without reason
- no gameplay-critical object hidden under HUD
- defeat banner unobscured
- desktop/mobile screenshots approved
- existing UI/focus/accessibility regression green

---

## Phase 15 — Environment Art, Lighting, Depth and Chunk-Seam Remaster

Purpose:
make the world read as authored suburban spaces instead of repeating procedural tiles.

Fixes:
- eliminate fixed 240px grey patio cadence at every chunk boundary
- ground material becomes theme/layout authored, not chunk-index visual marker
- hide chunk seams through overlapping composition zones
- reduce fence dominance:
  - lower background contrast
  - theme-specific fence families
  - less repeated decorative noise
- four yard themes receive distinct:
  - ground family
  - fence family
  - tree/hedge silhouettes
  - architecture silhouette
  - secondary prop language
  - color/value family
- add controlled foreground layer for depth
- strengthen parallax with value/saturation/atmospheric separation, not only speed factors
- shared lighting system:
  - global upper-left key-light convention
  - lower-right contact/cast-shadow convention
  - ambient tint
- time-of-day affects world palette, not only sky
- remove obvious lollipop-tree repetition
- design overlap between neighboring houses/yards so structures do not appear/disappear as isolated tiles

Authoring:
- Inkscape SVG source for architectural/prop silhouettes
- Krita optional paint-over/texture accents
- AssetPack/SVGO optimized runtime output

Acceptance:
- each of four yard themes recognizable in grayscale/silhouette without HUD labels
- no visible repeated patio-seam cadence in long traversal
- ball/player remain highest gameplay-contrast targets
- world depth visibly separates far/mid/near layers

---

## Phase 16 — Player and Kevin Animation Remaster

Purpose:
remove skating, puppet motion and underpowered action silhouettes.

Player:
- velocity-aware gait
- foot planting / stance locking during run cycle
- stride distance matches root travel closely enough to remove skating perception
- stronger 3/4 lateral run silhouette
- authored start/stop/reversal poses
- sprint only if still mechanically justified
- kick:
  - anticipation
  - support-foot plant
  - pelvis/hip rotation
  - torso counter-rotation
  - contact
  - follow-through
  - recovery
- stronger Power Shot silhouette without changing contact timing/force
- header/hurt/idle cleanup
- preserve exact canonical kick/header contact points used by gameplay

Kevin:
- architecture-owned Kevin opening rather than renderer-owned pasted window
- whole-body throw anticipation
- torso/shoulder wind-up
- release
- overshoot/follow-through
- recovery
- stronger rage posture without constant noise
- improved bonk/repair/shout staging

Authoring options:
- Blender Grease Pencil / cut-out / armature for pose development and sprite/reference export
- Krita cleanup where needed
- procedural runtime animation may remain where it is superior, but must match authored contact poses

Acceptance:
- no visible run skating in representative slow-motion capture
- kick power reads from body before VFX/text
- Kevin throw reads before projectile appears
- animation contact frames still line up with gameplay collision/contact events
- reduced-motion does not remove required action information

---

## Phase 17 — Prop Fidelity, Grounding and Collision-Art Agreement

Purpose:
make props feel like authored objects in a coherent world and make physics match what players see.

Fixes:
- common prop art rules from Phase 13 art bible
- silhouette exaggeration for gameplay scale
- consistent outlines, highlights, shadow side and contact shadows
- redesign major props that currently read as small icons
- key irregular props receive perceptually matching physics bodies:
  - bicycle
  - doghouse
  - BBQ
  - flowerpot
  - gnome
  - trampoline
  - patio table
  - other audit-approved high-contact objects
- prefer small manual compound bodies where clearer
- use `Bodies.fromVertices` + `poly-decomp` only for shapes that genuinely benefit
- avoid thin/sharp collision polygons
- add dev collision-overlay mode
- screenshot evidence overlays visible art and physics silhouette

Acceptance:
- no obvious invisible-corner collisions on audited key props
- physics-body complexity remains bounded
- Matter body counts/stress remain within release budgets
- props remain identifiable at actual gameplay zoom

---

## Phase 18 — Destruction Identity, Ball Readability and VFX Hierarchy

Purpose:
keep the game spectacular while making action easier to read.

Destruction:
- preserve recognizable object identity in selected fracture sets:
  - pot rim/body/soil
  - gnome cap/body
  - BBQ lid/bowl/legs
  - trash lid/body
  - other high-value props
- retain material-system behavior and finite debris limits

VFX hierarchy:
- explicit priority classes:
  - S: Havoc / Perfect Parry / PB / rare climax
  - A: Trick/Line / Kevin hit
  - B: major destruction
  - C: ordinary contact / minor prop
- lower-priority pop text suppressed/merged while higher-priority feedback owns the focal area
- aggregate nearby minor score notifications
- reserve clear interaction zone around player/ball/projectile
- ball receives consistent clean readability treatment
- tune trails/particles so they reveal motion instead of hiding the ball
- Havoc remains intense but does not saturate every visual channel simultaneously

Acceptance:
- ball silhouette remains readable through representative high-VFX scenarios
- simultaneous text overlays stay bounded
- destruction fragment collections remain within current resource limits
- reduced-motion parity preserved

---

## Phase 19 — HUD, Aim, Cinematic and Moment-to-Moment Staging Polish

Purpose:
make information support gameplay rather than compete with it.

Fixes:
- compact/recompose top HUD based on Phase 14 safe-area evidence
- simplify normal aim feedback
- numeric angle shown only where useful rather than constantly
- charge state readable without dashboard clutter
- improve near-miss/threat readability
- clean intro/defeat/restart staging
- HUD fades for cinematic defeat
- fast restart uses compact kickoff treatment
- unify Results-to-game transition
- preserve semantic HTML, target sizes and keyboard focus behavior

Acceptance:
- Kevin/window/projectiles remain visible under all supported viewports
- player/ball aim area is not obscured by HUD/text
- no regression to Phase 9-12 focus/mobile/accessibility behavior

---

## Phase 20 — Visual Release QA, GPU/Asset Optimization and Remaster Release Gate

Purpose:
prove the remaster is visually and technically better than v1, not merely different.

Tools:
- Spector.js MCP / WebGL frame capture
- AssetPack
- Playwright visual comparisons
- existing browser-health/resource stress harness

Verify:
- draw calls
- texture uploads
- texture memory proxies
- atlas batching
- generated asset sizes
- Canvas/Pixi lifecycle cleanup
- no duplicated render loop
- no dev-only lil-gui/Spector/debug overlay in production
- Chromium/Firefox/WebKit rendering smoke
- desktop/mobile performance sanity
- long traversal
- destruction-heavy gameplay
- Havoc
- Kevin projectile stress
- responsive screenshots
- visual snapshots for:
  - title
  - all four yard themes
  - player idle/run/kick/Power Shot/hurt
  - Kevin calm/rage/throw/bonk
  - representative props
  - collision overlays (dev evidence only)
  - destruction
  - Havoc
  - defeat/results

Final comparison:
record the same representative gameplay route under the v1 baseline and remaster and perform side-by-side review against the original video audit findings.

Release only if:
- visual hierarchy materially improved
- skating/pasted/window/chunk-seam issues fixed
- prop collision-art mismatches addressed
- VFX is more readable
- v1 gameplay truth preserved
- browser/input/accessibility/resource tests remain green

After Phase 20:
return to the separately proposed Backyard Havoc 2.0 gameplay/retention redesign. Do not mix 2.0 mechanics into the visual-remaster track.

---

## Tool mapping

| Problem | Primary tool(s) |
| --- | --- |
| GPU 2D rendering / scene graph | PixiJS v8 WebGL |
| Agent-safe Pixi implementation | pixijs/pixijs-skills |
| SVG authoring | Inkscape |
| Raster paint-over / textures / concept | Krita |
| Character pose/animation authoring | Blender Grease Pencil |
| Asset optimization / atlases / resolutions | PixiJS AssetPack |
| SVG cleanup | SVGO |
| Irregular Matter bodies | Matter.js `Bodies.fromVertices` + poly-decomp |
| Live visual tuning | lil-gui, development only |
| GPU frame debugging | Spector.js MCP |
| Visual regression | existing Playwright `toHaveScreenshot()` |
| Logic regression | existing Vitest |
| Physics/gameplay | existing Matter.js |

## Branch/review model

For each phase:
1. branch exactly from the previous externally approved merged/release-verified SHA;
2. implement one phase only;
3. run unit/build/E2E/visual evidence;
4. create draft PR;
5. external review inspects actual diff and evidence;
6. corrections if needed;
7. exact-head merge;
8. post-merge CI + Vercel verification;
9. lock next baseline.

No phase jumping.
