# Backyard Havoc - System Patterns & Architecture

## High-Level Architecture Overview

Backyard Havoc decouples physics simulation, game state management, input handling, and rendering to ensure high determinism, seamless frame rates (60+ FPS), and pixel-accurate touch detection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SYSTEM ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼────────────────────────────────┐
     ▼                                 ▼                                ▼
┌──────────────┐             ┌───────────────────┐             ┌────────────────┐
│ Input System │             │ Physics Engine    │             │ Rendering      │
│ (Touch/Mouse)│             │ (Matter.js Core)  │             │ Pipeline       │
└──────┬───────┘             └─────────┬─────────┘             └───────┬────────┘
       │                               │                               ▲
       │ Screen Input Coords           │ Sub-stepping (N_sub=4)        │ Viewport Shake
       ▼                               │ Swept-AABB Anti-Tunneling     │ Matrix Offset
┌──────────────┐                       │ Collision & Fractures         │ (T^2 Perlin)
│ Trajectory & │────────Impulse───────▶│ Body Transforms               │
│ Impulse Math │                       ▼                               │
└──────────────┘             ┌───────────────────┐                     │
                             │ Game State &      │─────────────────────┘
                             │ Score Engine      │
                             └─────────┬─────────┘
                                       │ Impact Telemetry (<200ms)
                                       ▼
                             ┌───────────────────┐
                             │ Edge AI / Mock    │
                             │ Dialogue Pipeline │
                             └───────────────────┘
```

---

## 1. Physics Engine Integration & Sub-Stepping Architecture

### Matter.js World Configuration
- **Simulation Frequency**: Fixed 60Hz timestep ($\Delta t = 1/60\text{ s} \approx 16.66\text{ ms}$).
- **Solver Iterations**: Position Iterations = 6, Velocity Iterations = 4, Constraint Iterations = 2.
- **Gravity**: $\vec{g} = (0, 9.81)\text{ m/s}^2$ (scaled to Canvas units, e.g. $\text{gravity.y} = 1.0$).

### Anti-Tunneling: Sub-Stepping + Swept-AABB Raycasting
To prevent fast-moving projectiles ($v > 2r/\Delta t$) from penetrating thin environmental colliders (e.g. single-pane glass, fences):
1. **Sub-Stepping**: Divide frame timestep $\Delta t$ into $N_{sub} = 4$ equal increments ($\Delta t_{sub} = \Delta t / N_{sub}$), evaluating physics updates at 240Hz.
2. **Swept-AABB Raycast**:
   - Prior to integrating positions in each sub-step, compute ray along velocity vector $\vec{v} \cdot \Delta t_{sub}$.
   - If ray intersects a static or destructible body, clamp projectile position to contact point $P_{contact}$ and trigger collision response ahead of time.

---

## 2. Threshold-Based Force Propagation & Fracturing

### Destruction Pipeline (`collisionStart` Event Handler)
1. Detect contact pair between `projectile` and `target` body.
2. Calculate relative velocity: $\vec{v}_{rel} = \vec{v}_{ball} - \vec{v}_{target}$ and relative speed squared: $v_{rel}^2$.
3. Compute impact kinetic energy:
   $$E_k = \frac{1}{2} m_{ball} v_{rel}^2$$
4. Compare against object yield threshold:
   - If $E_k > E_{break}$ and `target.isDestructible`:
     - **Remove Static Body**: Detach original composite from the physics world.
     - **Spawn Dynamic Fragments**: Instantiate 4–8 convex polygonal shards matching the bounding geometry.
     - **Impart Velocities**: Shards inherit initial velocity scaled from impact normal and tangential vectors + randomized angular velocities.
     - **Propagate State Flags**: Propagate `ON_FIRE` or `WET` to adjacent objects within proximity radius $R_{prop}$.
     - **Add Camera Trauma**: $\Delta T = \min(1, \beta \cdot E_k)$.
     - **Award Points**: $\text{Score} += \text{Points}_{base} \times C$.
     - **Emit Telemetry**: Dispatch event payload to Edge AI service.

---

## 3. Render Pipeline & Decoupled Camera Trauma Model

### Coordinate Isolation Principle
- **Physics World**: Coordinates remain continuous, deterministic, and unperturbed.
- **Input System**: Touch hit-testing operates directly on un-offset canvas coordinates.
- **Render Camera**: Screen shake is applied purely via canvas context 2D transform matrix during the frame draw pass:

```javascript
function renderFrame(ctx, world, cameraTrauma, currentTime) {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Calculate camera offset from trauma T
    const shake = cameraTrauma.getTransform(currentTime);
    
    ctx.save();
    // 2. Apply trauma translation and rotation to viewport
    ctx.translate(shake.x, shake.y);
    ctx.rotate(shake.angle);
    
    // 3. Draw background, destructibles, ball, fragments, effects
    drawWorldBodies(ctx, world);
    drawVisualTrails(ctx);
    drawParticleEmitters(ctx);
    drawSpeechBubbles(ctx);
    
    ctx.restore();
    
    // 4. Draw static UI overlays (HUD, combo multiplier, score) without shake
    drawHUD(ctx);
}
```

---

## 4. Edge AI & Telemetry Pipeline

### Telemetry Payload Contract
Dispatched via WebSocket / asynchronous worker on destruction events:

```json
{
  "timestamp": 1711984200120,
  "npc_id": "grumpy_neighbor_kevin",
  "npc_persona": "Grumpy suburban gardener obsessive about prize-winning hydrangeas",
  "trigger_event": "DESTRUCTION",
  "impact_object": "Prize Hydrangea Garden & Birdbath",
  "combo_multiplier": 7,
  "ball_type": "Flaming Ball",
  "ball_velocity": 42.8,
  "environmental_tags": ["ON_FIRE", "GARDEN_RUINED"]
}
```

### Client-Side Interpreter & Fallback
- Target response deadline: $<200\text{ ms}$.
- If edge payload arrives within deadline: Display stylized speech bubble with animated typewriter effect above NPC's world position.
- If network delay occurs: Play local pre-cached audio grunt / exclamation and queue visual bubble without blocking rendering.

### AI Layout Director Telemetry Vector
$$\vec{S} = [P_{juggle}, P_{trick}, \bar{C}, R_{destruction}]$$
- $P_{juggle}$: Juggling timing precision / tap accuracy.
- $P_{trick}$: Angular bank shot success rate.
- $\bar{C}$: Average combo multiplier attained.
- $R_{destruction}$: Destruction efficiency per minute.
- Dynamically adjusts prop spacing, target gap tolerances, and break thresholds $E_{break}$.
