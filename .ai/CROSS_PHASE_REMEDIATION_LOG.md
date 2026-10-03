# Cross-Phase Remediation Log

## Phase 14 — HUD ownership during cinematic states

- **Inherited issue:** The semantic DOM gameplay HUD remained visible over the Canvas during the ending/game-over presentation, obscuring the `BUSTED! OUT OF HEARTS` Canvas message.
- **Correction:** Move active HUD presentation into a compact DOM layout row outside the Canvas; fade and make it inert/`aria-hidden` for intro and ending states; hide it on Results. Resume restores the active HUD state.
- **Coverage:** `tests/e2e/phase14_theater_hud.e2e.js` verifies active/pause/resume accessibility state, ending fade, Results hiding, and attaches defeat/Results evidence.
- **Gameplay impact:** None. No gameplay rules, physics tuning, score, health, AI, Havoc or progression behavior changed.
