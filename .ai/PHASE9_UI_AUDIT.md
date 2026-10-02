# Phase 9 UI Audit

**Audit baseline:** `1e050247b0d135a6d2ed61c6848599258b78bd12`

**Branch:** `codex/phase-9-ui-ux-overhaul`
**Baseline verification:** `npm ci` completed; 284/284 Vitest tests passed; production build passed; 21/21 Chromium scenarios passed. Every emitted browser-health record had zero page errors, console errors, warnings, failed requests, and same-origin failures. `package-lock.json` remained unchanged. npm reported that the local esbuild install script was blocked by the configured install-script policy.

## Current screens and states

| View/state | Current implementation | Information and actions |
| --- | --- | --- |
| Title | `#title-screen` overlays the Canvas in `index.html`; engine is `IDLE` until start | Brand, long control card, fantasy subtitle, Start |
| Intro | Engine `INTRO_CUTSCENE`; title is hidden | Canvas cutscene; Space or Canvas pointer skips; no separate DOM status surface |
| Active play | Engine `PLAYING`; HUD is DOM over Canvas | Header health, score, peak combo, high score, yards, Reset; floating combo and combo meter; Kevin state, Havoc meter/mode; persistent bottom control hints |
| Ending | Engine `ENDING_CUTSCENE` | Canvas cutscene before results; no dedicated DOM transition status |
| Results/game over | `#gameover-modal` displayed after `onGameOverCallback` | Final score, high score, time, peak combo, distance, Share, Play Again, optional affiliate placement |
| Pause | Not present | No engine pause API or pause surface |
| Settings | Not present | No UI for the supported mute/reduced-motion settings |

There is no garage/challenge/progression UI. Phase 9 should keep it that way.

## Information hierarchy and duplication

- The active surface has five metrics in the persistent header, three additional status cards over the playfield, a full-width control strip, and a permanent Reset action.
- Control guidance is shown in both the title card and the active-play footer. The title lists five rows, including hold timing, before the player starts.
- Peak combo and high score are visible in the header and repeated in results. Yards/distance is in the header and results. Score and health are persistent run values; detailed run records belong in results.
- Kevin state and Havoc each have separate visual treatment but are already derived from canonical engine-owned state. Preserve text/value cues as well as color.
- The header Reset label is misleading: its handler calls `resetEnvironment()` and `startIntroCutscene()`, so it resets the run and begins another intro rather than resetting only backyard props.

## Layout and visual hierarchy

- `index.html` has a persistent glass-style header, centered stats pill, floating HUD cards, bottom control bar, title overlay, and results modal. Most of the interface uses similar boxed surfaces, which weakens hierarchy and competes with the game scene.
- There are two top-level `h1` elements, one in the persistent header and one in the title overlay.
- A small viewport should not carry high score, peak combo, yards, complete controls, and a reset affordance over ordinary play. Keep the center/lower-middle Canvas area clear.
- Results uses several inline-styled stat tiles and inline action sizing; the current structure does not establish a reusable token system.

## Responsive and touch observations

- The Canvas scales as a 16:9 surface. At portrait phone widths it becomes short while the title content remains vertically centered inside it; the Canvas container clips overflow. The existing title/help content can exceed that short area.
- At `max-width: 768px`, the header stacks and the stats pill wraps; at `max-width: 480px`, dividers disappear and typography/buttons shrink. There is no automated viewport matrix.
- Results has an 85vh maximum height and internal scrolling, but the affiliate block adds more content to that scroll surface.
- Pointer and touch listeners are attached to the Canvas; no deliberate responsive HUD obstruction or touch-target verification exists yet. This audit does not establish a touch-input defect.

## Accessibility and keyboard observations

- `index.html` sets `maximum-scale=1.0, user-scalable=no`, disabling user zoom.
- Global CSS applies `user-select: none` to all descendants, including instructional and results text.
- The Canvas has no accessible name or fallback description.
- Title and results are ordinary `div` overlays. Opening results does not move focus; closed overlays use opacity and pointer-events but leave descendants in the tab order. There is no explicit modal naming, focus restoration, focus trapping, or Escape-to-close behavior.
- No shared visible `:focus-visible` treatment is declared for buttons. The affiliate link is the only control with an explicit focus-visible selector; browser-native outlines may still appear elsewhere.
- Health and score values are ordinary text elements. The Havoc meter already exposes progressbar semantics and is updated from the engine. High-frequency score/combo values should not become assertive live regions.
- The global keyboard listener handles gameplay keys, M mute, and Enter/Space restart while results are open. Escape is not currently a UI action.
- The page has native buttons for main actions, which should be retained. Icon/emoji decorations should not be the only accessible name for controls.

## State ownership and DOM ownership

- `GameEngine.gameState` owns canonical run state: `IDLE`, `INTRO_CUTSCENE`, `PLAYING`, `ENDING_CUTSCENE`, `GAME_OVER`. The engine also owns score, health, combo, Kevin/Havoc values, lifecycle transitions, and reset behavior.
- `src/main.js` owns DOM listener registration, the results callback, title/restart/reset behavior, input wiring, reduced-motion preference forwarding, and the perpetual RAF loop that updates the HUD.
- `src/audio.js` owns audio state. It exposes a real mute toggle and reduced motion is already forwarded to `GameEngine.setReducedMotion()`. There is no public independent music/SFX/voice level API; direct UI writes to internal AudioNodes would bypass audio ownership.
- `index.html` owns the static DOM. No focused UI presentation module or explicit overlay state model currently exists.
- `setPageVisibility()` handles browser visibility and must remain independent from a user-requested pause state.

## Test dependencies and compatibility contracts

- Existing UI selectors include `#game-canvas`, `#title-screen`, `#btn-start-game`, `#player-health-display`, `#score-display`, `#peak-combo-display`, `#high-score-display`, `#yards-display`, `#btn-reset-yard`, `#combo-display`, `#havoc-card`, `#kevin-state-display`, `#havoc-value-display`, `#havoc-bar-fill`, `#havoc-mode-display`, `#gameover-modal`, `#go-score`, `#go-high-score`, `#go-time`, `#go-combo`, `#go-yards`, `#btn-share-score`, `#btn-restart-run`, and `#affiliate-placement`.
- Playwright is Chromium-only, one worker, fixed at 1280×720. `tests/e2e/browser-health.js` records and fails on page errors, console errors/warnings, failed requests, and same-origin HTTP/request failures. The workflow uploads the HTML report and test output.
- Existing smoke coverage checks title/Canvas boot, controls copy, idle stability, starting, basic keyboard/pointer input, charge, and reload. Phase 5–8 suites exercise Kevin/Havoc, destruction, VFX, audio diagnostics, and affiliate behavior. There are no title/pause/settings/results keyboard-accessibility or responsive viewport scenarios.
- Vitest has no DOM emulator or accessibility scanner dependency. Playwright is available for production DOM/UI integration tests. Do not add a UI framework or test dependency just to reproduce logic already testable through production modules and Chromium.

## Recommended restructuring

1. Add a small vanilla-JS UI controller and presentation-state reducer. The controller may own which presentation overlay is visible; it must render from engine/audio state and never become a second source of gameplay truth.
2. Use one exclusive overlay root with `hidden`/inert background handling, named dialog semantics, managed focus entry/return, and keyboard Escape behavior. Preserve useful stable selectors or update their tests alongside the markup.
3. Add an explicit engine pause flag/API that gates simulation updates and clears held movement/pointer charge. Keep it separate from `gameState` and `pageVisible`; keep rendering alive so the pause surface remains visible.
4. Reuse the engine’s existing restart/reset methods through one canonical UI restart command. Move Restart Run out of the persistent HUD; distinguish returning to title (reset to `IDLE`) from immediate Play Again.
5. Expose only real settings: the existing audio mute behavior and reduced-motion behavior. Defer separate channel-volume controls until audio exposes safe public setters.
6. Reduce active HUD to score, health, combo, Havoc, and Kevin state. Move high score, peak combo, distance and other run details to results; reveal long controls through concise help disclosure.
7. Preserve the results-only affiliate component and its exact destination, disclosure, target/rel attributes, referrer policy, and centralized enable switch. Extend regression coverage if results markup moves.
8. Add focused reducer/formatter tests, Chromium tests for keyboard/focus, actual pause, settings, results/restart, affiliate, and the required five viewport sizes. Capture title, play, pause, settings, and results screenshots with browser-health records.
