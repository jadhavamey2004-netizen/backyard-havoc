# Backyard Havoc

[![Live Demo](https://img.shields.io/badge/Play_Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://backyard-havoc.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

Backyard Havoc is a 2D Canvas and Matter.js arcade game. Keep the ball in play, break Kevin's backyard, defend against his throws, and chase a high score. The live demo is at <https://backyard-havoc.vercel.app>.

## Play

| Input | Action |
| --- | --- |
| A / D or Left / Right | Move |
| Shift | Sprint |
| Mouse / pointer | Aim; click/tap to act |
| Hold click/tap, optionally drag | Charge a Power Shot and adjust aim |
| Space | Skip the intro |
| Escape | Pause or resume |
| M | Toggle game audio |

On touch devices, the two on-screen buttons move left and right. Tap the playfield to aim and act; hold to charge and drag while held to adjust aim. Touch movement and playfield action can use separate fingers. Cancelled or interrupted input is released when the page is hidden, blurred, or paused.

Primary action is contextual: a forecasted incoming Kevin projectile gets defense priority; otherwise a kick or header can affect the ball only during its valid contact window. A charged shot still requires real ball contact. Runs end when the player's three health points are lost. There is no standard-run countdown. Combo continues across airborne ball bounces and drops after the ball remains grounded beyond its grace period.

## Progression and settings

The title screen provides Garage, Challenges, and Settings. The game has nine cumulative, event-backed challenges with direct cosmetic rewards. Ball, trail, and impact cosmetics change presentation only; they do not change physics, scoring, movement, defense timing, or Kevin's behavior. Progress, high score, and best combo are stored locally in the browser. There are no accounts, cloud saves, currencies, purchases, online leaderboards, or analytics.

Settings control game audio and reduced motion. Audio uses the browser's Web Audio API; optional Kevin speech depends on browser support. The exact VideoGen referral link is shown only on Results, has an adjacent affiliate disclosure, and opens only after the player activates the link. It has no progression or gameplay effect.

## Runtime architecture

- `src/game.js` coordinates the run, Matter.js world, collisions, and gameplay events.
- `src/player.js`, `src/gameplay_rules.js`, and `src/gameplay_feel.js` own player actions and their approved rule/tuning sources.
- `src/procedural_world.js` streams yards and retains destruction history for the current run; active world bodies are unloaded as the player moves.
- `src/destruction_system.js` creates bounded, temporary physical fragments. `src/particles.js`, `src/camera.js`, and `src/vfx_director.js` own bounded presentation effects.
- `src/npc.js` and `src/kevin_director.js` implement Kevin's in-game escalation and projectile behavior. `src/ai.js` is a local, rule-based cosmetic dialogue and telemetry simulation; it has no network client and is not gameplay AI.
- `src/audio.js`, `src/audio_director.js`, and `src/audio_mix.js` manage browser audio. `src/ui/` owns screen transitions, focus, overlays, and menu presentation. `src/meta/` owns local progression records.

The production app requests Bebas Neue and Outfit from Google Fonts. The VideoGen referral is the only user-initiated external destination from the game. There is no analytics, LLM API, authentication service, remote telemetry, cloud save, or ad network.

## Development and verification

Requires Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Run the unit/integration suite, production build, and full Playwright matrix with:

```bash
npm test
npm run build
npm run test:e2e
```

The Playwright matrix includes the full desktop Chromium suite, Chromium touch coverage, and a focused release smoke in Chromium, Firefox, and WebKit. The cross-browser smoke does not claim WebKit multi-touch coverage. Browser binaries can be installed with `npx playwright install chromium firefox webkit`.

Earlier design notes and prototype plans are historical records, not a specification of current runtime behavior. The current truth documents are `.ai/GAMEPLAY_TRUTH.md`, `.ai/FEATURE_TRUTH.md`, `.ai/PHASE10_PROGRESSION_META.md`, and `.ai/PHASE11_MOBILE_ACCESSIBILITY.md`.

## License

The repository is distributed under the MIT License; see [LICENSE](LICENSE). Third-party component and font notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
