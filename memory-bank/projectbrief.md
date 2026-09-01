# Backyard Havoc - Project Brief

## Project Overview
**Backyard Havoc** is a high-octane 2D physics-arcade game that bridges accessible vertical keepy-uppy timing mechanics with chaotic horizontal destruction cascades and real-time reactive NPC commentary.

Built using **HTML5 Canvas** and **Matter.js**, the game transitions traditional juggling survival into strategic directional deflection: players juggle a ball to escalate combo multipliers, then bank it sideways into destructible backyard environments (windows, greenhouses, furniture, barbecues, and neighbor props) triggering domino-effect physical and thermal chain reactions.

---

## Core Vision & Pillars

1. **Keepy-Uppy Meets Environmental Destruction**:
   - Transforming one-touch vertical juggling into multi-axis directional kinetic gameplay.
   - Sustaining long juggling streaks builds a high combo multiplier ($C \ge 1$), which dynamically scales impulse force, visual FX trails, audio pitch, and damage output upon horizontal impact.

2. **Juicy Physics Cascades & Fracture Mechanics**:
   - Rigid-body physics powered by Matter.js with custom sub-stepping ($N_{sub}$) and Swept-AABB anti-tunneling protection.
   - Structural yield thresholds ($E_{break}$): impacts above threshold shatter static bodies into dynamic physical polygon shards.
   - Chain reactions with environmental state propagation (`ON_FIRE`, `WET`, `BOUNCE_BOOST`, `SPLATTER_MUD`).

3. **Game Feel & Non-Linear Camera Trauma**:
   - Screen shake driven by kinetic energy transfer into trauma $T \in [0, 1]$.
   - Trauma squared ($T^2$) 1D Perlin noise camera matrix translation and rotation applied strictly during rendering, leaving physics coordinates untouched for 100% accurate tap hit-testing.

4. **Edge AI Live Telemetry & Dynamic NPCs**:
   - Real-time physics telemetry serialized to Edge LLM / local mock service (<200ms target).
   - Dynamic speech bubbles with character personas (e.g., Grumpy Neighbor Kevin) reacting with emotion-infused context-specific dialogue.
   - AI Layout Director adapting prop density, gap corridors, and break thresholds based on player telemetry vector $\vec{S}$.

5. **Ethical Metagame Progression**:
   - Street Cred currency earned through high-multiplier destruction.
   - Unlockable ball variants with distinct physical profiles (Standard, Superball, Wet Sponge, Flaming Ball).
   - Daily deterministic seeded challenges ("The Neighborhood Hitlist").

---

## Project Goals
- **Platform**: Web (HTML5 Canvas, Mobile & Desktop Responsive).
- **Core Engine**: Matter.js (2D Rigid Body Physics) + Vanilla Canvas 2D Rendering Pipeline.
- **Verification & Automation**: Vitest / Node automated testing suite designed for the Antigravity Ralph Loop (`antigravity_for_loop`).
