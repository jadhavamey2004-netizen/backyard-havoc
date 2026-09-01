# ⚽ Backyard Havoc

[![Live Demo](https://img.shields.io/badge/Play_Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://backyard-havoc.vercel.app)
[![Tests Passing](https://img.shields.io/badge/Vitest-60%2F60_Passing-brightgreen?style=for-the-badge&logo=vitest)](https://github.com/jadhavamey2004-netizen/backyard-havoc)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> A high-octane 2D physics-arcade soccer juggler, destruction sandbox, and comedic combat game. Keep your street football aloft, build explosive combo multipliers, shatter your grumpy neighbor Kevin's conservatory and barbecue, and parry his retaliatory flowerpot volleys right back into his second-story window!

🎮 **Playable Live Web Game (One-Click)**: [https://backyard-havoc.vercel.app](https://backyard-havoc.vercel.app)  
📦 **GitHub Repository**: [https://github.com/jadhavamey2004-netizen/backyard-havoc](https://github.com/jadhavamey2004-netizen/backyard-havoc)

---

## 🕹️ Gameplay Mechanics & Controls

| Input | Action | Description |
| :--- | :--- | :--- |
| **A / D** or **← / →** | **Run & Re-position** | Sprint across the yard to get under descending football volleys. |
| **Left Click / Space** | **Kick / Volley** | Strike the football into the air. Timed near incoming flowerpots to **Parry**! |
| **Click & Hold (Charge)** | **Power Shot** | Charge an aerodynamic high-velocity flaming strike with laser trajectory guide. |
| **W / ↑ (Airborne)** | **Bullet-Time Header** | Slows time down to 0.35x for precision surgical trick shots into high targets. |
| **Mouse Cursor** | **Aim Guide & Protractor** | Real-time parabolic physics aim trajectory with dynamic launch angle badge. |
| **M** | **Toggle Sound / Music** | Mute or unmute all audio and procedural background grooves. |

---

## 🔄 Core Game Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│                               CORE LOOP                                │
│                                                                        │
│   1. JUGGLE & COMBO  ──►  2. AIM & SMASH  ──►  3. RETALIATION / PARRY  │
│   Keep ball airborne     Release power shot     Neighbor Kevin throws  │
│   to build score &       at windows, gnomes     pots; time your kick   │
│   multiplier (1x-12x)    and conservatory       to parry return hits   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Juggle & Build Combo (1x – 12x Multiplier)**:
   - Keeping the ball airborne increases your score multiplier, accelerates the procedural funk soundtrack tempo, and ignites the football into flaming/plasma visual trails.
2. **Aim & Destroy Backyard Targets**:
   - Aim high into Neighbor Kevin's 2nd-story window, shatter garden gnomes, pop patio lights, and detonate barbecue propane grills with chain-reaction physics.
3. **Parry Retaliatory Counterattacks**:
   - As Kevin's rage builds, he hurls flowerpots, old boots, and steel wrenches. Time your kick as the projectile approaches to execute a **Golden Parry Reflection**, blasting the pot back into Kevin's window for massive bonus scores!

---

## 🏗️ Architecture & Technology Stack

- **Physics Engine (`src/physics.js`)**: Custom continuous Verlet integration with circular-arc restitution, air drag, and velocity clamping.
- **Adaptive NPC Behavioral State Machine (`src/ai.js`, `src/npc.js`)**: 6-state dynamic behavior controller tracking player accuracy, distance, and combo level in real time.
- **Audio & Generative Procedural Music (`src/audio.js`, `src/audio_assets.js`)**:
  - Web Audio API master compressor & dynamic presence EQ filter.
  - Multi-clause emotional inflection engine with phonetic normalization (zero robotic speech artifacts).
  - Procedural generative funk bassline scaling tempo dynamically from 88 BPM to 150 BPM with combo tiers.
- **Visual Effects & Camera Juice (`src/particles.js`, `src/camera.js`)**:
  - Non-linear camera trauma decay formula (`offset = trauma^2 * maxShake`).
  - Concentric impact shockwaves, chromatic hit-freeze frames, speed lines, and anime wind slashes.
- **Automated Test Suite (`tests/`)**: 18 test files (60 automated unit and integration tests) running on Vitest.

---

# 📝 Game Design Document & Pitch (Question #1 Submission)

### 1. The Pitch
- **What it is**: *Backyard Havoc* is a fast-paced physics-arcade soccer juggler and comedic destruction game where you juggle a street football to charge high-velocity trick shots, smash your grumpy neighbor Kevin’s windows and backyard ornaments, and parry his retaliatory flowerpot counterattacks back at him.
- **Who it’s for**: Casual and mid-core arcade gamers who love physics trick-shot games (*Angry Birds*, *Brawl Stars*), combo-chaining arcade titles (*Tony Hawk*, *OlliOlli*), and slapstick neighbor-prank games (*Untitled Goose Game*, *Neighbors from Hell*).
- **Why someone plays it**: Instant kinetic satisfaction. The tactile kick physics, slow-motion bullet-time headers, escalating destruction chains, and the comedic satisfaction of provoking a grumpy neighbor into an over-the-top rage tantrum create an immediate dopamine loop.

---

### 2. Core Loop & First Session
- **First 3 Minutes**:
  1. The player starts juggling the football, discovering that keeping it aloft builds combo multipliers and dynamic musical energy.
  2. Aiming upward unleashes high-trajectory shots that shatter garden gnomes, conservatory glass, and barbecue grills with explosive physics.
  3. Neighbor Kevin slams open his 2nd-story window in fury, throwing flowerpots and boots. The player learns to **time a volley kick to parry projectiles back into Kevin's window** for massive point bursts.
- **The Day-1 Hook (Why they return tomorrow)**:
  - **"One More Run" High-Score Chase**: Quick 90-second run cycles with high skill ceilings (combos, trick chains, parry streaks) paired with daily challenge modifiers (e.g. *"Heavy Bowling Ball Physics"*, *"Triple Flowerpot Volley Day"*).
  - **D1 Unlocks**: Hitting target destruction scores unlocks alternative backyard biomes and cosmetic ball trails.

---

### 3. Progression & Metagame
- **Short-Term (Day 1 – Day 7)**:
  - **Backyard Biome Mastery**: Progress through 5 distinct neighborhood properties (The Conservative Greenhouse $\rightarrow$ The Luxury Poolside Villa $\rightarrow$ The Mad Scientist’s Rooftop).
  - **Trick Shot Achievements**: Unlock special trick categories (Rainbow Flicks, Headshot Snipes, Triple Deflection Volleys).
- **Long-Term (Months 1 – 6)**:
  - **Roguelite Yard Modifier Cards**: Between backyard stages, draft arcade modifiers (*"Bouncy Lawn Gnomes"*, *"Double Parried Projectiles"*, *"Multi-Ball Overdrive"*).
  - **Seasonal Havoc Ladder**: Weekly competitive leaderboards where players compete in seeded runs with identical backyard layouts.
  - **Customization Locker**: Collectible trick balls (Bouncy Retro Ball, Glitch Plasma Ball), custom player kits, and unique kick trails.

---

### 4. Monetization Strategy (Player-First, Zero Pay-to-Win)
- **Cosmetics & Prestige Only**:
  - **Lawn Havoc Battle Pass**: Free & Premium reward tracks offering themed character jerseys, goal celebration animations, and custom kick particle trails (Flame, Lightning, Rainbow).
  - **Ball & Sound FX Vault**: Custom ball trails, soccer ball skins (8-Bit Voxel Ball, Golden World Cup Ball), and comedic neighbor sound skins.
- **Rewarded Engagement (Opt-In Only)**:
  - Watch a 5-second rewarded clip to retry a failed high-score streak once per day. No intrusive popups or unskippable mid-game ads.

---

### 5. AI Integration (Development & In-Game)
- **In-Game Adaptive AI**:
  - **Kevin’s Dynamic Behavioral State Machine**: Uses real-time situational tracking (`src/ai.js`, `src/npc.js`) to analyze player juggle angle, distance, combo level, and accuracy.
  - As Kevin’s rage builds from 0 to 100%, his behavior dynamically shifts across 6 states: `PEEKING_INSIDE` $\rightarrow$ `LEANING_OUT_RAGE` $\rightarrow$ `SHAKING_FIST` $\rightarrow$ `THROWING_PROJECTILE` $\rightarrow$ `HEADSHOT_STUNNED` $\rightarrow$ `REPAIRING_WINDOW`.
  - **Emotion-Gated Dialogue Engine**: Dialogue selection adapts to specific environmental destruction events with custom phonetic normalization for natural speech cadence.
- **In-Development AI**:
  - Used for rapid iterative game physics balancing, procedural audio synthesis architectures, canvas rendering pipelines, and automated test-suite generation (60 automated unit/integration tests).

---

### 6. Shipping & KPI Soft-Launch Strategy
- **What to Test First**:
  - Core kick and parry timing window feel (ensuring the input window feels responsive on both mouse and touch).
  - Score pacing and combo drop-off curve.
- **Metrics to Watch at Soft Launch**:
  - **Day 1 Retention**: Target $\ge 45\%$.
  - **Day 7 Retention**: Target $\ge 18\%$.
  - **Session Length**: Target $5.5 - 7.0\text{ minutes}$ across $4+$ sessions per day.
  - **Parry Engagement Rate**: $\%$ of players who execute at least one successful projectile parry in Run 1 (validates combat clarity).
- **Kill / Pivot Signals**:
  - If D1 Retention falls below $28\%$ and median session length is $<2.5\text{ minutes}$, simplify the juggling controls to a single-tap flick mechanic and increase destructible density.

---

### 7. Reference Games
- **[Angry Birds / Crush the Castle]**: Borrowed the visceral joy of structural physics collapse; replaced stationary slingshots with active player-driven soccer juggling.
- **[Tony Hawk / OlliOlli]**: Borrowed the exponential combo multiplier and risk-reward trick chain mechanics; applied it to an airborne football.
- **[Neighbors from Hell / Untitled Goose Game]**: Borrowed the comedy of provoking an eccentric neighbor with escalating antics; transformed it into real-time arcade combat with interactive projectile parrying.

---

## 🛠️ Local Development & Testing

```bash
# 1. Clone repository
git clone https://github.com/jadhavamey2004-netizen/backyard-havoc.git
cd backyard-havoc

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Run automated test suite (60 tests)
npx vitest run

# 5. Build optimized production bundle
npm run build
```

---

## 📄 License
MIT License. Created with ❤️ for Game Development & AI Innovation.
