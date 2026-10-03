---
title: Physics Authority
tags: [architecture, gameplay]
created: "2026-10-03T06:01:20.291Z"
updated: "2026-10-03T06:01:20.291Z"
source: Backyard Havoc repo
---

Matter.js world and bodies remain authoritative for positions, collisions, impulses, contact, scoring gates, and gameplay state. Renderers consume the canonical frame and draw it; they do not decide physics, scoring, AI, destruction, or Havoc. Preserve `GameEngine` ownership boundaries and existing collision truth when changing presentation. Confirm that a renderer or HUD change does not write to simulation state.
