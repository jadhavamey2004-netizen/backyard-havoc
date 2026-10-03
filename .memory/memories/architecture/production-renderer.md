---
title: Production Renderer
tags: [architecture, renderer]
created: "2026-10-03T06:01:19.971Z"
updated: "2026-10-03T06:01:19.971Z"
source: Backyard Havoc repo
---

Canvas2D remains the production renderer after Phase 13 decision C — KEEP CANVAS2D. PixiJS is isolated to development, E2E, and the `phase13-pixi-spike` feasibility build; it is not a gameplay authority or production default. Revisit only through an externally reviewed renderer decision backed by visual, performance, bundle, and cross-platform evidence. A feasibility experiment does not authorize production migration.
