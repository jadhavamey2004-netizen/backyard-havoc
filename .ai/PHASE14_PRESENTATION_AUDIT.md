# Phase 14 Presentation Audit

## Baseline and method

The before-state was captured from the detached production baseline `c9a4e779499c6d5bddd595f8da274a91dd41276c` before implementation. Chromium rendered the five desktop/tablet viewport cases at DPR 1 or 2 as listed; the six touch cases used DPR 2 with touch input enabled. The baseline screenshots are committed under [`tests/e2e/fixtures/phase14-baseline/`](../tests/e2e/fixtures/phase14-baseline/).

The after-state was measured by the Phase 14 Playwright suite in normal Chromium and the dedicated Chromium touch project. Exact bounding boxes, CSS Canvas sizes, backing sizes, DPR, viewport overflow, HUD/header/control rectangles, aspect ratios, and unused margins are preserved in:

- [`baseline-measurements.json`](evidence/phase14/baseline-measurements.json)
- [`after-desktop-measurements.json`](evidence/phase14/after-desktop-measurements.json)
- [`after-touch-measurements.json`](evidence/phase14/after-touch-measurements.json)

Coordinates below are CSS pixels. Rectangles use `width × height @ x,y`. “Unused” gives left/right and top/bottom Canvas margins. The exact 11 viewport sizes are recorded in the JSON files; the screenshots capture active gameplay except the named defeat and restart cases.

## Desktop and general viewport comparison

| Viewport | Before frame / Canvas | Before HUD | After frame / Canvas | After HUD / header | DPR; Canvas backing | After unused margins L/R; T/B | Aspect; scroll |
|---|---|---|---|---|---|---|---|
| 1280 × 720 | 1152×648 @64,36 / 1148×644 @66,38 | 1124×609 @78,62 | 1106×622 @87,92 / 1106×622 @87,92 | HUD 1256×38 @12,54; header 1256×48 @12,6 | 1; 960×540 | 87/87; 92/6 | 1.7778; 1280×720 |
| 1366 × 768 | 1229×691 @69,38 / 1225×687 @71,40 | 1201×652 @83,64 | 1191×670 @87,92 / 1191×670 @87,92 | HUD 1342×38 @12,54; header 1342×48 @12,6 | 1; 960×540 | 87/87; 92/6 | 1.7778; 1366×768 |
| 1440 × 900 | 1280×720 @80,90 / 1276×716 @82,92 | 1252×681 @94,116 | 1416×796 @12,95 / 1416×796 @12,95 | HUD 1416×38 @12,54; header 1416×48 @12,6 | 1; 960×540 | 12/12; 95/9 | 1.7778; 1440×900 |
| 1920 × 1080 | 1280×720 @320,180 / 1276×716 @322,182 | 1252×681 @334,206 | 1746×982 @87,92 / 1746×982 @87,92 | HUD 1896×38 @12,54; header 1896×48 @12,6 | 1; 960×540 | 87/87; 92/6 | 1.7778; 1920×1080 |
| 2560 × 1440 | 1280×720 @640,360 / 1276×716 @642,362 | 1252×681 @654,386 | 2386×1342 @87,92 / 2386×1342 @87,92 | HUD 2536×38 @12,54; header 2536×48 @12,6 | 1; 960×540 | 87/87; 92/6 | 1.7778; 2560×1440 |

## Mobile and touch viewport comparison

| Viewport | Before frame / Canvas | Before HUD | After frame / Canvas | After HUD / header | Controls before → after | DPR; Canvas backing | Aspect; scroll |
|---|---|---|---|---|---|---|---|
| 390 × 844 portrait | 390×219 @0,312 / 386×215 @2,314 | 374×203 @8,320 | 366×206 @12,375 / 366×206 @12,375 | HUD 366×63 @12,54; header 366×48 @21,6 | 364×76 @13,755 → 364×76 @13,755 | 2; 1920×1080 | 1.7778; 390×844 |
| 412 × 915 portrait | 412×232 @0,342 / 408×228 @2,344 | 396×216 @8,350 | 388×218 @12,404 / 388×218 @12,404 | HUD 388×63 @12,54; header 388×48 @21,6 | 386×76 @13,826 → 386×76 @13,826 | 2; 1920×1080 | 1.7778; 412×915 |
| 844 × 390 landscape | 624×351 @110,34 / 620×347 @112,36 | 596×312 @124,60 | 523×294 @161,89 / 523×294 @161,89 | HUD 820×34 @12,51; header 820×48 @12,9 | 830×364 @7,13 → 830×364 @7,13 | 2; 1920×1080 | 1.7778; 844×390 |
| 915 × 412 landscape | 659×371 @128,25 / 655×367 @130,27 | 631×332 @142,51 | 562×316 @177,89 / 562×316 @177,89 | HUD 891×34 @12,51; header 891×48 @12,9 | 901×386 @7,13 → 901×386 @7,13 | 2; 1920×1080 | 1.7778; 915×412 |
| 768 × 1024 tablet | 768×432 @0,296 / 764×428 @2,298 | 740×393 @14,322 | 744×418 @12,346 / 744×418 @12,346 | HUD 744×38 @12,54; header 744×48 @12,6 | 742×76 @13,935 → 742×76 @13,935 | 2; 1920×1080 | 1.7778; 768×1024 |
| 1024 × 768 tablet | 1024×576 @0,96 / 1020×572 @2,98 | 996×537 @14,122 | 1000×562 @12,146 / 1000×562 @12,146 | HUD 1000×38 @12,54; header 1000×48 @12,6 | 998×76 @13,679 → 998×76 @13,679 | 2; 1920×1080 | 1.7778; 1024×768 |

The 844 × 390 and 915 × 412 portrait-to-landscape transitions had a 420 px document height in the baseline and now fit their exact viewport heights. All after cases have no horizontal or vertical document overflow. Mobile movement buttons remain 68–84 px wide and 68–76 px tall, inside measured safe insets.

## Baseline observations

- The Canvas frame stopped at 1280 px on 1920 × 1080 and 2560 × 1440, leaving 320 px or 640 px horizontal margins on each side and large unused vertical bands.
- The DOM HUD occupied a tall region laid over the Canvas. At 1920 × 1080 it measured 1252 × 681 px and intersected the upper gameplay area containing Kevin and his window; the baseline defeat capture also shows the HUD covering defeat copy.
- Portrait used a 2 × 2 card layout over the Canvas. In landscape, the page’s 420 px minimum height exceeded the 390/412 px viewport and cut into controls/content.
- Before screenshots: `desktop-1920x1080.png`, `desktop-2560x1440.png`, `mobile-390x844.png`, `tablet-844x390.png`, `defeat-1920x1080.png`, and `restart-kickoff-1920x1080.png`.

## After-state notes

- The Canvas keeps the 960 × 540 logical frame. At DPR 1 its backing remains 960 × 540; at DPR 2 it is 1920 × 1080. The high-DPR sanity case measured a 1746 × 982 CSS Canvas at DPR 3 with a bounded 2400 × 1350 backing (effective DPR 2.5).
- The DOM header and compact HUD occupy separate layout rows above the Canvas; HUD bounds no longer overlap the world targets measured by the E2E test.
- Baseline and after screenshots for desktop, touch, defeat and restart are attached by the Phase 14 Playwright tests for direct same-state comparison.
