---
title: CI WebGL Isolation
tags: [testing, ci, webgl]
created: "2026-10-03T06:01:22.145Z"
updated: "2026-10-03T06:01:22.145Z"
source: Backyard Havoc repo
---

Normal Desktop Chrome `chromium-release` is isolated from software-WebGL Pixi evidence. The dedicated `chromium-pixi-release` and `chromium-pixi-touch` projects use forced ANGLE/SwiftShader only for Pixi/WebGL proof. Keep inherited Phase 1–12 release tests in the normal Chromium environment and unchanged. Software-WebGL evidence is not a production-GPU benchmark. Phase 13 renderer decision remains C — KEEP CANVAS2D.
