---
title: Browser Health Contract
tags: [testing, playwright, browser-health]
created: "2026-10-03T06:01:21.822Z"
updated: "2026-10-03T06:01:21.822Z"
source: Backyard Havoc repo
---

Playwright scenario evidence tracks `pageErrors`, `consoleErrors`, `consoleWarnings`, `failedRequests`, and `sameOriginFailures`; clean expected totals are zero unless an approved exception is documented. Use fixed viewport and explicit browser/device projects for screenshot evidence. Attach stable screenshots, traces, videos, or JSON when useful. Preserve accessibility, keyboard/input, touch, reduced-motion, and release assertions; do not weaken inherited tests to obtain a pass.
