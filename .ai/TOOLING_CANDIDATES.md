# Tooling Candidates for Later Phases

Research snapshot: 2026-09-30. Candidates are not installed or cloned by this Phase 0 audit.

| Candidate | License | Fit / capability | Complexity and context cost | Existing overlap | Recommendation |
|---|---|---|---|---|---|
| [Microsoft Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | Browser automation, input, Chromium/Firefox/WebKit, console/network observation, traces, screenshots and built-in screenshot comparisons. Fits Vite/Canvas/Matter.js at the browser surface; Canvas internals require visible contracts or test hooks. | Medium initial setup/browser binaries; low ongoing context if tests stay focused. | Current Vitest has no browser automation. Manual browser smoke is available in Codex but is not repeatable CI evidence. | **USE** for a small browser E2E baseline when Phase 1 begins; add only required browser(s). |
| [Agentic Gamedev Skills](https://github.com/abagames/agentic-gamedev-skills) | MIT (repository page) | Optional selective workflows for browser-game smoke testing, gameplay probes, implementation coverage, visuals and measurement. Web-game skills can transfer; Godot/Crisp-specific skills do not fit this stack. | Low if a few text skills are referenced; high context cost and noise if whole collection/plugin bundles are imported. | Overlaps project AGENTS guidance and generic coding skills; no runtime capability by itself. | **INVESTIGATE** specific web smoke/probe skills after external audit; do not clone/install the whole collection. |
| [axe-core npm integrations / `@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) | MPL-2.0 (package metadata) | Automated checks for accessible DOM controls and text around the game; works alongside Playwright on Vite. It cannot interpret Canvas-drawn gameplay or replace manual keyboard/screen-reader review. | Low-to-medium; one focused accessibility scan in E2E. | No automated accessibility checks currently. | **INVESTIGATE** after semantic UI/accessibility scope is defined; limited value until canvas alternatives exist. |

### Fit notes

- Playwright is the strongest direct complement to the current Vitest suite and supports browser input and visual evidence without changing the game engine.
- For screenshots, keep browser version, OS, viewport, fonts and game state stable; this game uses random/time-driven visuals, so capture an explicitly controlled scene before enforcing pixel baselines.
- Agent-skill repositories are instructions, not QA executables. Select only relevant workflows and review their exact requirements before adoption.
- No engine migration, new rendering framework, game-specific test platform, or custom QA infrastructure is justified by the Phase 0 evidence.
