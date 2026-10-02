# Phase 11 — Mobile Gameplay and Accessibility

## Scope and invariants

Phase 11 adds touch locomotion and strengthens responsive and accessibility behavior. The existing `GameEngine.handleKeyDown()` / `handleKeyUp()` and `handlePointerMove()` / `handlePointerDown()` / `handlePointerUp()` / `handlePointerCancel()` paths remain authoritative. Touch does not mutate player position, velocity, speed, ball physics, scoring, defense, or progression. The 960×540 logical playfield and 2.5 DPR ceiling remain unchanged.

Phase 8 audio ownership, Phase 9 screen and focus behavior, Phase 10 progression, and the Phase 1C–7 gameplay, character, animation, destruction, and VFX contracts remain in place. No dependency or lockfile change was needed.

## Input architecture

`src/main.js` now routes mouse, touch, and pen through Pointer Events. The Canvas owns at most one active gameplay-action pointer ID and captures that pointer until release or cancellation. Mouse and pen hover continue to update aim. Canvas `pointerup` resolves through the existing production release path; `pointercancel` and `lostpointercapture` call `handlePointerCancel()` and never synthesize a release.

The touch movement layer contains two native buttons: **Move left** and **Move right**. Their press/release calls the existing player movement API with `ArrowLeft` and `ArrowRight`. Movement pointer IDs are stored separately from the Canvas action ID, so one finger can hold movement while another operates the Canvas. Source sets aggregate keyboard and touch holds; releasing one source cannot clear another still-held source. The buttons expose their momentary state through `aria-pressed`. Keyboard or assistive-technology button activation gets a short canonical movement press.

The controls appear only when a coarse pointer, any coarse pointer, or `navigator.maxTouchPoints` indicates touch capability and UI/engine state is active gameplay. They remain hidden and absent from tab order on ordinary desktop, during the intro, while paused, outside the visible page, and after game over. The controls sit inside the existing inert gameplay stage while menus are open.

## Cancellation and lifecycle

All held input is cleared on pointer cancellation, window blur, `visibilitychange` to hidden, Pause, Restart Run, Back to Main Menu, and Game Over. Cancellation releases captures after local ownership has been cleared, clears aggregate movement sources and button state, calls the engine's cancellation API for an active Canvas action, and prevents a later physical pointer-up from resolving a kick. Engine pause/visibility handlers still clear movement velocity, held charge, and transient audio. A cancelled finger followed by a fresh press is covered by browser regression tests.

## Touch aim, action, and coordinates

Tap is sufficient to aim and act. Holding the Canvas continues the existing charge lifecycle; dragging while held updates aim but is optional. The Canvas and movement controls alone use `touch-action: none`; the document, menus, details/summary disclosure, and scrollable panels retain browser scrolling and zoom gestures.

All pointer types use one bounding-rectangle transform from rendered Canvas CSS pixels to the existing 960×540 logical coordinates. Regression coverage checks portrait, landscape, tablet-landscape resize, and DPR 2. The canvas backing dimensions remain 1920×1080 at DPR 2, and gameplay scale and physics remain unchanged.

## Responsive layout and safe areas

Orientation is advisory; there is no orientation lock. Portrait movement buttons sit below the centered 16:9 playfield where available. In short landscape and wide touchscreen-laptop layouts, the controls move to the safe-area-aware left and right edges beside the playfield. Buttons are 84×76 CSS pixels in the regular layout and at least 68×68 CSS pixels in side layouts. The fixed control layer accounts for `safe-area-inset-left`, `right`, and `bottom`; header and modal safe-area behavior is preserved.

The HTML interface was exercised at 320×800 with a 200% root text-size simulation and at 390×844, 412×915, 844×390, 915×412, 768×1024, 1024×768, 1280×720, 1366×768, and 1920×1080. It checks no horizontal page overflow, visible panels, keyboard focus, scroll access to Results, and target bounds. The Canvas remains a two-dimensional play surface; it is not forced into document reflow.

## Accessible instructions, semantics, and focus

The title's existing desktop instructions remain. A separate touch instruction block explains movement buttons, tap-to-aim/action, hold-to-charge, and optional drag-to-adjust. The Canvas accessible description now covers keyboard and touch controls. Movement controls are labelled native buttons with momentary pressed state. Locked cosmetics remain disabled and communicate their requirements in surrounding text and their accessible names.

Phase 9 focus behavior remains unchanged: gameplay focus belongs to the Canvas after Start/Resume/Restart, active gameplay Pause remains reachable, overlays make the stage inert and contain Tab navigation, and Settings/Garage/Challenges retain focus restoration. Browser checks verify focus indicators, settings control focus, and the focused affiliate link is visible within the scrollable Results panel at the responsive matrix sizes.

## Reduced motion and visual feedback

OS `prefers-reduced-motion` and the explicit setting override remain authoritative. Existing camera, particles, trails, and chromatic feedback use their existing reduced motion multiplier. The intro skip prompt and defeat banner become static; the idle-ball prompt stops bobbing; the projectile/parried danger marker remains visible at a steady 0.82 alpha. No gameplay timing or danger information changes. Browser regression captures the static intro prompt and retained danger-marker alpha.

No rapid flash behavior was introduced. Camera trauma, VFX lifetime/resource bounds, and existing damage/Havoc feedback remain governed by their prior Phase 7 implementation. Canvas artwork has not received a formal or exhaustive contrast certification.

## Contrast review

The browser audit records computed text colors and layered backgrounds for primary/secondary buttons, HUD labels, challenge copy/rewards, locked cosmetic requirements, Settings copy/switch boundaries, the affiliate disclosure, progression copy, mobile controls, and the focus ring. Ratios use WCAG relative luminance; text is checked against 4.5:1 and UI/focus boundaries against 3:1 where applicable. The attached `phase11-contrast-measurements.json` and browser output record the measured color pairs. Gradient surfaces use their computed stop colors and translucent cards are composited over the panel or Canvas surface. This is a representative HTML review, not a claim that every state, theme, Canvas pixel, or assistive-technology combination conforms.

The measured minimum ratios from the current browser run are:

| Text or UI boundary | Foreground / tested background | Minimum ratio |
|---|---|---:|
| Primary Play | `#233620` over `#ffdf68` / `#ffb935` | 7.56:1 |
| Secondary buttons | `#fffdf1` over `#28533a` | 8.61:1 |
| HUD labels | `#d4e7cf` over composited `#0f291d` | 11.88:1 |
| Challenge copy | `#d8e7d9` over panel/card gradient endpoints | 9.32:1 |
| Challenge reward | `#ffe0a5` over panel/card gradient endpoints | 9.38:1 |
| Locked cosmetic requirement | `#d9e3d3` over disabled tile/panel endpoints | 8.67:1 |
| Settings supporting copy | `#d0dfce` over setting row/panel endpoints | 8.74:1 |
| Affiliate disclosure | `#d2dfd1` over Results gradient endpoints | 6.50:1 |
| Progression result text | `#fffbe8` over summary/panel endpoints | 12.17:1 |
| Touch movement label | `#fffdf1` over `#0d2c1d` | 14.78:1 |
| Settings switch boundary | `#bbcfad` border against `#465d49` switch | 4.33:1 |
| Focus ring | `#ffd44f` against `#28533a` reference surface | 6.19:1 |

## VideoGen affiliate clickability

The local review identified an undersized touch target at Results. `.affiliate-link` now retains a 48px minimum height. The existing semantic anchor, exact provider URL, target, relation, referrer policy, and adjacent disclosure are unchanged. Playwright retains mouse, keyboard Enter/Space, coarse-touch, center hit-test, scrolling, portrait/landscape, progression-heavy Results, and gameplay/profile isolation coverage.

Exact destination: `https://videogen.io/ai-video-generator?fp_ref=amey-ff39df`.

Disclosure: “Affiliate link — we may earn a commission at no extra cost to you.”

## Verification matrix and evidence

- Vitest covers existing Player, GameEngine, UI, progression, audio, gameplay, and lifecycle contracts.
- Desktop Chromium covers mouse aim/click/charge, A/D, arrows, Shift, Space intro skip, and Escape Pause/Resume.
- Chromium touch uses Playwright 1.63.0 explicit `{ isMobile: true, hasTouch: true, deviceScaleFactor: 2, viewport }` context settings. CDP trusted touch events cover movement holds/releases, independent simultaneous fingers, Canvas charging, cancellation, visibility, Pause/Restart, Main Menu, and Game Over.
- The final local Playwright run passed 50/50 scenarios (39 Desktop Chrome and 11 Chromium touch). All 50 browser-health records report zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- `phase11-responsive-geometry.json`, `phase11-contrast-measurements.json`, and `phase11-mobile-runtime.json` capture test evidence. Screenshots cover the touch movement layout across mobile/tablet viewports, the 320px text-size matrix, desktop Results, and pointer interaction as attached by the final Playwright run.
- Runtime snapshot: viewport 390×844 at DPR 2; Canvas backing store 1920×1080; Matter world bodies 33; particles 0/400; shards 0; projectiles 0; 3 touch-control DOM nodes; 17 counted gameplay pointer/key/lifecycle listener registrations; 60-frame interval sample median 16.7 ms, p95 33.4 ms, maximum 33.5 ms. Existing particle and shard caps are not changed.
- The final local verification was `npm test` PASS (312/312 across 34 files), `npm run build` PASS (44 modules), and `npm run test:e2e` PASS (50/50). The Playwright run attaches responsive geometry, representative HTML contrast measurements, runtime metrics, screenshots, and per-scenario browser-health records. Exact-head GitHub Actions, artifact, and Vercel Preview evidence will be recorded in the draft PR review handoff.

## Known limitations

- Chromium touch contexts and CDP provide real browser Pointer Events and multi-touch sequences, but cannot replace hands-on testing on physical iOS/Android devices, mobile Safari/Firefox, varied notches, keyboards, or screen readers.
- Playwright's emulated device has zero physical safe-area insets; the CSS `env()` placements are verified structurally and in viewport geometry, not against every device cutout.
- Root font-size doubling is an approximation of 200% user text resizing; browser zoom and platform text scaling vary.
- Contrast evidence covers representative stable HTML layers. Canvas graphics, variable destructive backgrounds, every cosmetic state, and all composited display conditions are outside automated certification.
- The short frame interval is a sanity sample, not a long-run or low-end-device benchmark. Matter body count is observational; only the existing debris and VFX caps are enforced.
- Automated axe scanning and assistive-technology user testing are not installed in this project and were not substituted with unsupported conformance claims.

## Phase boundary

This work does not start Phase 12 release hardening, make gameplay-rule or progression changes, redesign the Canvas, force orientation, reduce DPR, add Sprint controls, or perform a broad architecture/performance rewrite.
