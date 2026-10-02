# Backyard Havoc post-release remaster agent rules

The verified v1 production baseline is:

`802654e517ad28ef5f49d014786f26e5ef50edf0`

Do not rewrite or force-move `main`.

## Remaster architecture

- Matter.js remains authoritative for physics and collision/gameplay state.
- PixiJS may replace rendering progressively, not gameplay rules.
- Existing DOM UI remains HTML unless a specific reviewed phase changes it.
- Do not change scoring, Kevin thresholds, Havoc rules, progression, health, physics tuning or monetization while doing visual-remaster phases unless a phase explicitly authorizes it.

## Required implementation discipline

- Load/use the official PixiJS agent skills before substantial PixiJS work.
- Prefer PixiJS WebGL for production; do not make WebGPU a release requirement.
- Use `raw-assets/` for authored sources and generated public assets for runtime.
- Never hand-edit generated AssetPack output.
- Keep `lil-gui` development-only.
- Keep Spector.js development-only.
- Any major irregular prop collision must have a debug-overlay screenshot proving visible art and collision silhouette agree.
- Every visual phase must add stable Playwright screenshot evidence in a controlled CI environment.
- Do not hide visual differences by increasing screenshot thresholds broadly.
- Preserve reduced-motion behavior.
- Preserve touch/mobile behavior.
- Preserve exact VideoGen referral behavior unless a later product-design phase explicitly removes it.

## Definition of a successful remaster change

A change must improve one or more of:
- visual hierarchy
- depth/staging
- animation grounding
- prop/environment fidelity
- collision-to-art agreement
- VFX readability
- world variety
- performance

without reducing gameplay correctness or accessibility.
