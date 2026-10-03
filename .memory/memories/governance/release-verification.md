---
title: Release Verification
tags: [governance, release]
created: "2026-10-03T06:01:21.470Z"
updated: "2026-10-03T06:01:21.470Z"
source: Backyard Havoc repo
---

Release claims require exact commit provenance. Record baseline and final head, local Vitest/build/E2E results, GitHub workflow and each job, artifact ID plus integrity/provenance, browser health, and Vercel Preview SHA when applicable. Separate local results from GitHub/Preview status; never infer CI from a local pass or production deployment from Preview. Keep durable state free of ephemeral workflow IDs unless explicitly requested.
