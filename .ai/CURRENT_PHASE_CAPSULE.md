# Current Phase Capsule

Updated for the one-time context preflight on 2026-10-03. Read this capsule with the exact active phase prompt. It summarizes durable decisions; it is not source code or an implementation specification.

## Current state

- Phase 13 is complete and merged. Its release-verified production SHA at the start of this tooling preflight is `404fef0b1dbb1a68fd6031e7a149a1d850932957`.
- Current work is the context-efficiency preflight on `codex/context-efficiency-preflight`.
- Phase 14 has not started. After this tooling PR is externally approved and merged, the Phase 14 parent MUST be refreshed from the resulting `main` SHA; do not assume `404fef0b1dbb1a68fd6031e7a149a1d850932957` remains the Phase 14 parent after `main` advances.
- Renderer decision: **C — KEEP CANVAS2D** for production. PixiJS is limited to development/E2E and the isolated `phase13-pixi-spike` feasibility build.

## Authority and boundaries

- Matter.js remains authoritative for world state, collisions, impulses, contact, scoring gates, and gameplay. Renderers consume the canonical frame; they do not own gameplay decisions.
- Preserve the Phase 1C gameplay-truth rules, Phase 2 feel, Phase 5 Kevin/Havoc behavior, and approved character, animation, destruction, VFX, audio, progression, accessibility, and release decisions unless a later approved phase explicitly changes them.
- Existing menus, Settings, Garage, Challenges, Results, and HUD remain semantic HTML/DOM. Canvas remains the gameplay input and focus surface.
- The logical game frame is 960 × 540. Preserve the ball/threat visual priority, readable silhouettes, reduced-motion behavior, touch input, keyboard accessibility, and stable screenshot coverage.
- Preserve the exact VideoGen referral URL: `https://videogen.io/ai-video-generator?fp_ref=amey-ff39df`.

## Retrieval and phase workflow

- Start from this capsule and the exact phase prompt. Do not preload all historical phase reports or read all source files.
- For nontrivial JS/TS navigation, prefer Serena symbol outlines, exact symbols, references, and bodies. Use targeted text searches for CSS/HTML, exact test inventories, or anything semantic retrieval omits. Verify callers and tests before editing.
- Use a focused Atlas map only when broad repository orientation would materially help; do not preload it by default. Retrieve Markdown memory only when a durable prior decision is relevant, at most the top 3–5 entries.
- Before an implementation phase, refresh `main`, confirm the exact required base SHA and a clean tree, create only the requested branch, follow its scope, run its stated checks, and preserve inherited tests. Record cross-phase fixes explicitly.
- Complete local verification, push, verify exact-head GitHub checks and artifacts (plus Preview SHA when required), create a draft PR, and stop for external review. Do not merge unless directly instructed.

## Stop condition for this capsule

This preflight ends with its documentation/tooling-only draft PR and an external-review handoff. Do not implement Phase 14 from this task.
