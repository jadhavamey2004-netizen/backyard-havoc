# Phase 9 — UI/UX Overhaul

**Baseline:** `1e050247b0d135a6d2ed61c6848599258b78bd12`

**Branch:** `codex/phase-9-ui-ux-overhaul`

## Information hierarchy

Active play keeps five decision-focused values in view: score, health, combo, Havoc meter, and Kevin's named state. The former permanent high-score, peak-combo, distance, reset, and full control surfaces are gone from the gameplay HUD. Run summaries live on Results; concise controls are in the title's native disclosure, with a short move/action hint during play.

## Screen and state model

`src/ui/ui_state.js` defines the presentation views `TITLE`, `PLAYING`, `PAUSED`, `SETTINGS`, and `RESULTS`, including the settings return path and exclusive transitions. `src/ui/ui_controller.js` is the single owner of overlay visibility, background `inert` behavior, focus entry/return, HUD projection, and results formatting. The engine remains the authority for run state, pause state, scores, health, combo, Kevin, and Havoc. The UI dispatches lifecycle requests to engine methods and renders canonical engine snapshots; UI state does not award or mutate gameplay values.

`index.html` has one named modal overlay root containing the title, pause, settings, and results panels. Only one panel is visible at a time. When an overlay is open, the header and game stage are inert; gameplay canvas rendering continues, but simulation updates stop while the engine is paused.

## Title and menu

The title presents the game identity, one-line fantasy, prominent Play action, collapsed native controls help, and Settings. Start initializes audio through the existing sound engine and begins the existing intro. The Canvas receives focus for gameplay keyboard input. No progression or story system was added.

## Gameplay HUD

The HUD is overlaid on the Canvas with high-contrast dark surfaces and text labels in addition to color. Score, health, Havoc, and Kevin occupy the top line; combo sits low on the left. The pointer-events-free HUD does not capture aiming, Canvas clicks, or touch input. Controls do not become screen-reader live regions, avoiding noisy announcements.

## Pause and restart lifecycle

`GameEngine.setPaused()` is separate from `gameState` and page visibility. It pauses a visible, non-terminal `PLAYING`, `INTRO_CUTSCENE`, or `ENDING_CUTSCENE` state, gates update and gameplay input, zeros the accumulator, releases movement and pointer charging, clears pending action state and transient camera/particle feedback, and resets managed transient audio. Resume clears the pause flag and accumulator, refreshes the existing reactive music snapshot, and restarts music through the existing audio API when gameplay is active. A run remains user-paused across hide/show.

Escape opens Pause and resumes. The Pause menu provides Resume, Restart Run, Settings, and Back to Main Menu. Both Restart Run and Play Again call one UI restart callback; the engine owns reset, and the existing intro is immediately skipped for the fast restart path. Starting a new run clears transient intro speech before skipping, then uses the normal kickoff/music methods. Returning to the main menu resets the engine to `IDLE`.

## Settings

Only supported controls are shown: a single mute switch backed by `sounds.toggleMute()` and reduced motion backed by `GameEngine.setReducedMotion()` plus the existing CSS and `prefers-reduced-motion` behavior. Reduced motion follows the OS preference until the player explicitly sets an override; the override is stored in local storage. Independent music, SFX, and voice levels are deferred because the audio layer has no safe public per-channel controls. The Phase 8 audio graph and voice ownership were not reworked.

## Results and affiliate placement

Results display the engine's final score, high score, survival time, peak combo, and distance. Play Again is the primary action; Share Score uses the browser Share API when available and clipboard otherwise. The VideoGen link remains the existing centralized results-only integration with its exact URL, disclosure, `_blank`, `sponsored noopener noreferrer`, and `no-referrer` attributes. It is mounted after the game-over callback, requires a user click, and has no gameplay callback or analytics.

## Responsive strategy

The existing 16:9 Canvas remains centered and scales to viewport width/height. The compact HUD changes to a two-column layout on small screens; secondary gameplay hint text is hidden on narrow widths. Menus scroll internally when required, use safe-area padding, retain 44–54 px primary touch targets, and avoid horizontal scrolling. Mobile gameplay input itself was not redesigned.

Automated visual/layout coverage uses the required five viewports:

| Viewport | Covered screens |
| --- | --- |
| 1280×720 | Title, gameplay, pause, settings, results |
| 1366×768 | Title, gameplay, pause, settings, results |
| 1920×1080 | Title, gameplay, pause, settings, results |
| 390×844 | Title, gameplay, pause, settings, results |
| 768×1024 | Title, gameplay, pause, settings, results |

## Accessibility and reduced motion

The page no longer disables zoom. Actions use semantic buttons; controls have visible `:focus-visible` rings, keyboard and touch-sized targets, and concise accessible names. The active overlay is a named modal dialog, receives focus, traps Tab within its visible controls, makes the page behind it inert, and returns focus to the prior control or gameplay pause button. Escape works for pause/settings; Enter/Space activate native buttons. Health and Kevin have text labels, and Havoc retains progressbar semantics. Both the OS reduced-motion preference and the explicit setting reduce camera/particle feedback and CSS transitions.

## DOM, event, and reset ownership

`index.html` owns static semantic structure; `src/ui/ui_controller.js` caches stable DOM references and writes only changed text/width values. `src/ui/ui_formatters.js` creates pure HUD/results view models. `src/main.js` owns browser input, visibility, RAF, engine construction, and wiring; it no longer performs per-frame direct DOM updates. The engine emits game-over stats to the controller. `GameEngine.resetEnvironment()` remains canonical; the UI has one restart callback for both restart buttons. Page visibility remains a separate engine condition from user pause.

## Verification and screenshots

Local verification on the final implementation:

- `npm test`: 33 files, 293/293 passed.
- `npm run build`: passed, 39 modules transformed.
- `npm run test:e2e`: 25/25 Chromium scenarios passed.
- Browser health across 25 scenario records: zero page errors, console errors, console warnings, failed requests, and same-origin failures.
- Phase 9 Playwright attaches 27 screenshots: title/gameplay/pause/settings/results for each of the five required viewport sizes, plus keyboard-focus-resume and reduced-motion settings evidence. The existing quality workflow archives `playwright-report/` and `test-results/`.
- The restart scenario verifies an active charge voice is released by pause, repeated restarts do not create additional AudioContexts, keyboard Play Again works, and the UI returns to one visible screen.
- Existing Phase 8 audio/referral coverage still passes, including reset/visibility and user-activated referral navigation.
- No package dependency or lockfile change.

## Known limitations and deferred work

- The world remains a fixed 16:9 Canvas; portrait viewports therefore leave vertical space around the playfield. This phase does not crop the world or alter its gameplay framing.
- Mobile gameplay controls are unchanged.
- Separate music/SFX/voice sliders are not exposed without public AudioDirector setters.
- No automated screen-reader/axe scanner was added; the E2E suite checks keyboard flow, names, modal exclusivity, focus, and layout.
- The HUD is intentionally not a high-frequency live region.
- Garage, challenges, unlocks, economies, further gameplay/character/destruction/audio work, and all Phase 10+ systems remain deferred.

## Release status

Phase 9 changes presentation and adds the safe user pause API only. No gameplay balance, collision, score, AI, animation, destruction, VFX trigger, or audio ownership behavior was changed. GitHub Quality Gate and Vercel Preview must be verified against the final draft-PR HEAD before this phase is handed to external review. No merge or production deployment is part of this work.
