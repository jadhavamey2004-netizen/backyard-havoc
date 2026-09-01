# Backyard Havoc - Technical Context & Mathematical Formulations

## Technology Stack

| Layer | Technology | Role & Purpose |
| :--- | :--- | :--- |
| **Physics Engine** | `matter-js` (v0.20.0+) | 2D rigid-body simulation, constraint solver, collision detection, and composite management. |
| **Rendering** | HTML5 Canvas 2D Context | High-performance 2D rendering pass, sprite batching, particle systems, and transform matrix manipulation. |
| **State & Logic** | Modern Vanilla JavaScript (ES2024 / Node 20+) | Modular game architecture, clean OOP/functional separation, zero heavy framework overhead. |
| **Testing & CI** | `vitest` or `jest` | Unit and integration testing for physics math, tunneling prevention, trauma decay, and game loops. |
| **AI Subsystem** | WebSocket / Fetch API + Mock Streamer | Async real-time telemetry dispatch and structured JSON schema validation for NPC dialogue. |

---

## Complete Mathematical Specifications

### 1. Impulse & Trajectory Dynamics (Formula 1.1)
- Input coordinates: $\vec{p}_{input} = (x_{in}, y_{in})$
- Ball centroid: $\vec{p}_{ball} = (x_{ball}, y_{ball})$
- Displacement vector:
  $$\vec{d} = \vec{p}_{input} - \vec{p}_{ball}$$
- Distance with minimum radius clamping ($r_{min} = 15\text{px}$):
  $$d_{mag} = \|\vec{d}\| = \sqrt{d_x^2 + d_y^2}$$
  $$\hat{d} = \frac{\vec{d}}{\max(d_{mag}, r_{min})}$$
- Linear Impulse Vector $\vec{J}$:
  $$\vec{J} = -J_0 \cdot \hat{d} \cdot \left[1 + \alpha \cdot (C - 1)\right]$$
  *(Where $J_0$ is baseline impulse magnitude, $\alpha = 0.35$ is combo sensitivity scalar, and $C \ge 1$ is active combo multiplier)*
- Velocity Change:
  $$\Delta \vec{v} = \frac{\vec{J}}{m}$$

### 2. Rotational Dynamics & Moment of Inertia
- Contact offset: $\vec{r}_{contact} = \vec{p}_{contact} - \vec{p}_{ball}$
- Applied torque:
  $$\tau = r_x \cdot F_y - r_y \cdot F_x$$
- Moment of inertia for uniform circular disk:
  $$I = \frac{1}{2} m r^2$$
- Angular velocity integration:
  $$\Delta \omega = \frac{\tau \cdot \Delta t}{I}$$

### 3. Restitution & Kinetic Energy Dissipation
- Coefficient of Restitution $e$:
  $$e = -\frac{\vec{v}_{rel, post} \cdot \hat{n}}{\vec{v}_{rel, pre} \cdot \hat{n}}$$
- Kinetic Energy Loss per Impact:
  $$\Delta E_k = \frac{1}{2} m v_{pre}^2 (1 - e^2)$$

### 4. Non-Linear Camera Trauma & 1D Perlin Noise Shake
- System Trauma $T \in [0, 1]$
- Kinetic Energy Transfer to Trauma:
  $$\Delta T = \min(1.0, \beta \cdot E_k) \quad (\beta \approx 0.002)$$
- Continuous Trauma Decay (decay rate $\lambda \approx 1.2\text{ s}^{-1}$):
  $$T(t + \Delta t) = \max(0, T(t) - \lambda \cdot \Delta t)$$
- Viewport Offsets using Quadratic Shake Exponent ($T^2$):
  $$\text{shake} = T^2$$
  $$dx = \text{max\_offset}_x \cdot T^2 \cdot \text{noise1D}(f \cdot t)$$
  $$dy = \text{max\_offset}_y \cdot T^2 \cdot \text{noise1D}(f \cdot t + 100)$$
  $$d\theta = \text{max\_angle} \cdot T^2 \cdot \text{noise1D}(f \cdot t + 200)$$
  *(Parameters: $\text{max\_offset} = 25\text{px}$, $\text{max\_angle} = 0.08\text{ rad}$, frequency $f = 25\text{Hz}$)*

---

## Ball Variant Physical Profiles

| Ball Variant | Mass Density ($\text{kg/m}^3$) | Restitution ($e$) | Friction ($\mu$) | Drag ($C_d$) | State Flags | Mechanical Properties |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard Leather** | $1.0$ | $0.75$ | $0.30$ | $0.47$ | `COLLIDE_DEFAULT` | Predictable parabolic arc; baseline juggle feel. |
| **Superball** | $1.2$ | $0.95$ | $0.10$ | $0.20$ | `BOUNCE_BOOST` | Retains $\approx 90\%$ kinetic energy; chaotic indoor multi-ricochet. |
| **Wet Sponge** | $1.5$ | $0.25$ | $0.80$ | $0.80$ | `SPLATTER_MUD` | Absorbs energy; creates mud splatters on impact. |
| **Flaming Ball** | $0.9$ | $0.65$ | $0.40$ | $0.50$ | `IGNITE_SURFACE` | Ignites flammable props (`ON_FIRE`), triggers sprinklers. |

---

## Technical Constraints & Standards
1. **Frame Rate & Stability**: Solid 60 FPS under $\ge 50$ dynamic physics bodies on screen.
2. **Sub-Stepping**: $N_{sub} = 4$ sub-steps per frame (effective 240Hz physics evaluation).
3. **Touch Input Precision**: Touch hitboxes must NOT shift when the camera shakes.
4. **Testability**: All math, physics vectors, trauma decays, and state transitions must be cleanly decoupled into pure testable modules.
