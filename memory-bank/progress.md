# Progress — Backyard Havoc Web Edition (Vite + Canvas + Matter.js + Web Audio API)

> **Historical progress log.** The entries below preserve prior project notes and may describe behavior that has since changed or was never authoritative. Current runtime status is in `.ai/FEATURE_TRUTH.md`; current gameplay rules are in `.ai/GAMEPLAY_TRUTH.md`.

## Status: 100% POLISHED, ARCHITECTURALLY GROUNDED & PRODUCTION READY

### 1. Engine, Controls & Animation
- [x] Fixed-timestep physics accumulator (`FIXED_STEP = 1/60`, 4 sub-steps, max 3 ticks/frame) for identical physics across all monitor refresh rates.
- [x] Zero-allocation active debris shards tracking (`this.activeShards = []`) eliminating per-frame GC stalls.
- [x] Dedicated movement & mouse controls:
  - `A` / `D` keys (and `Shift` sprint) exclusively control player movement (mouse clicking no longer moves player).
  - Wired `mouseup`, `touchend`, and bounding-rect scaled pointer listeners in `src/main.js`.
  - Mouse Move: Real-time dynamic aiming angle with protractor arc, live floating degree badge (`📐 48°`), target reticle, and 12-dot parabolic trajectory.
  - Left Mouse Click (quick tap): Direct kick along aim line & projectile parry without charging.
  - Hold Left Mouse Button (>0.20s): Charges Power Shot; release fires explosive shot with full kicking animation.
- [x] Stabilized continuous ball aerodynamics: smooth elongation clamped to `[0.72, 1.42]` with clean matrix transformations.

### 2. Architecturally Grounded Destructibles & Anti-Cheat Ejection (`src/procedural_world.js`, `src/game.js`)
- [x] Eliminated floating fence props; grounded all yard props naturally on the lawn/patio (`y: 450 - 465`):
  - **Lawn / Patio Ground Props**: Buster's Doghouse, Weber BBQ Grill, Metal Trash Can, Glass Patio Table, Birdbath Fountain, Lawn Gnomes, Terracotta Planters.
  - **House Facade & Roof Targets**: 2nd-story windows, 1st-story French doors/windows, conservatory roof glass panes & peak skylights.
  - **Ground Trampoline (`y: 470`)**: Grounded on lawn for mega-bounce trickshots into 2nd-story windows.
- [x] **Anti-Juggle / Anti-Exploit Headshot Fix on Neighbor Kevin**:
  - Added 1.2s scoring cooldown timer (`kevinBonkTimer`) to eliminate repeated score spam.
  - Ball now forcefully ejects out of the window frame in an outward arc back into the yard (`launchVx = -7.5 to -10.0, launchVy = -4.0 to -6.0`).
  - Active safety check in `update()` automatically repels low-speed balls from hovering on the window sill.

### 3. Hand-Crafted 2D Illustration Assets & Character Art (`src/player.js`, `src/npc.js`, `src/map_renderer.js`)
- [x] **Street Footballer Player**: Layered spiky anime hair with highlights, dynamic crimson headband with velocity-driven fluttering ribbon tails, gold-crested #10 jersey with waist taper, contoured athletic limbs, red soccer cleats with laces and speed stripe, and sweeping dual-color aerodynamic wind slash blade (`#38bdf8` / `#facc15`).
- [x] **Neighbor Kevin NPC**: Suburban caricature with balding cranium, wispy sideburns, wrinkled scowl, round tortoiseshell bifocals with specular lens glints, bulbous red nose, knit navy sweater vest with ribbed V-neck, 3-stage overhand pitching animation, furious fist-shaking with knobby knuckles, and swollen throbbing bump with bandage during dizzy bonk.
- [x] **Destructible Props**: Hand-crafted Buster's Doghouse (bone nameplate & bowl), Weber BBQ Grill (enamel gloss, temperature dial, glowing ember seam, wheels, smoke), Ceramic Gnomes, Blooming Flowerpots & Window Boxes (dark loam soil, petunias/marigolds), Scalloped Birdbath Fountain, Galvanized Ribbed Trash Can, Vintage Cruiser Bicycle, and Trampoline.
- [x] **Backdrop & Nature**: Victorian glass conservatory, 2-story brick Craftsman house with chimney smoke, cedar privacy fence with wood grain planks and iron nails, shaded lawn with grass tufts, flagstone patio with mortar grout lines, and solar flare sun.

### 4. Cinematic Intro & Ending Cutscenes (`src/game.js`, `src/audio.js`)
- [x] **Intro Cutscene ("Suburban Showdown")**:
  - Sliding widescreen cinematic black letterbox bars with gold trim.
  - Camera glides from Neighbor Kevin's 2nd-story window (shouting warning) to Player sliding into frame with ball trap and fluttering ribbons.
  - Referee kickoff whistle (`playWhistle()`) and energetic comic title popup **"READY... GO!"**.
  - Space / click instant skip option.
- [x] **Defeat Ending Cutscene ("Busted!")**:
  - Time slows down on 3rd life loss with sad trombone defeat cue (`playDefeatHorn()`).
  - Player collapses dazed on lawn with spinning stars and cartoon `X_X` eyes.
  - Kevin triumphantly celebrates and laughs out his window: *"HA! That'll teach you! Get off my lawn!"*.
  - Smooth transition into the final Game Over Scoreboard card.

### 5. Audio, NPC Voice & Emotional Speech Synthesis Overhaul (`src/audio.js`, `src/ai.js`, `src/npc.js`)
- [x] **Phonetic Normalization (`normalizePhonetics`)**:
  - Prevents TTS engines from spelling non-dictionary letters (e.g. `OWWW` $\rightarrow$ `Ow! Ouch!`, `ARRRGH` $\rightarrow$ `Argh!`, `NOOO` $\rightarrow$ `No! No!`).
  - Strips parenthetical stage directions `(screams)`, `(sobs)`, `(gasp)`, `(sigh)` from spoken text.
- [x] **Dynamic Multi-Clause Emotional Inflection**:
  - Splits compound lines into emotional clauses (opening shock screech `pitch: 1.45`, `rate: 1.25`, dropping into grumpy low growl `pitch: 0.74`, `rate: 1.12`).
  - High panic escalation (`pitch: 1.38`, `rate: 1.30`) and slow crying waver (`pitch: 1.18`, `rate: 0.84`).
- [x] **Zero-Backlog Voice Queue & Priority Preemption**:
  - Replaced stale multi-utterance queue with a strict 1-slot TTL ($1.8\text{s}$) buffer that discards outdated voice lines immediately.
  - Priority 0 Headshots/Parries immediately cancel any playing speech (`window.speechSynthesis.cancel()`) and play fresh reaction lines without delay.
- [x] Master `DynamicsCompressorNode` protecting master output from digital audio clipping.
- [x] Sound effects: `playWhistle()`, `playDefeatHorn()`, `playKevinHit()`, `playGlassShatter()`, and `localStorage` audio persistence.

### 6. Codebase Stabilization, Edge Cases & Test Suite Expansion
- [x] Resolved 15 edge cases across math, physics, canvas, AI, voice, and input states.
- [x] Fixed screen shake loop on game over / death with `CameraTrauma.reset()`.
- [x] Fixed 90-degree vertical aim line artifact and trajectory dot stacking.
- [x] Out-of-bounds ball rescue with `positionPrev` reset for clean Verlet integration.
- [x] High-DPI canvas backing store scaling with `devicePixelRatio` and decoupled logical coordinate mapping.
- [x] Reset input keys and pointer state on game over, restart, and cutscene transitions.
- [x] Fixed keyboard Space/Enter restart from Game Over modal to trigger intro cutscene.
- [x] Expanded test suite to **18 test files (60 unit tests)**, all passing 100%.
- [x] Verified clean production build (`npm run build` completed in 587ms).
