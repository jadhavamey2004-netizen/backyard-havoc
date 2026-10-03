# Backyard Havoc Visual Art Bible

**Authority:** Phases 14–20 remaster work.
**Logical gameplay frame:** 960 × 540.
**Status:** Phase 13 foundation; numerical thresholds are reviewable production targets, not gameplay tuning.

## Visual hierarchy

At normal play, contrast and silhouette priority is:

1. Ball and an immediate projectile threat.
2. Player.
3. Kevin or the active gameplay target.
4. Destructible and interactive props.
5. House and other architecture.
6. Fence and vegetation.
7. Far ridge, sky, and atmospheric detail.

A legitimate climax (Perfect Parry, high-value destruction, or Havoc activation) may temporarily raise its effect to the top tier. It must settle within 0.7 seconds and may not cover the ball or an incoming projectile for more than 0.12 seconds.

## Light and grounding

- Key light comes from the upper-left of the logical frame.
- Lit planes and bright edge accents face upper-left; cast shadows travel lower-right.
- Ground contact shadows sit directly under grounded feet, props, and debris. Their width is 0.85–1.2× the object's visible ground-contact width; opaque-core opacity is 0.12–0.24 and the soft edge fades to zero within 8 logical pixels.
- Shadow displacement is 3–8 logical pixels down/right for a 40–100 px object. A higher object may have a larger, softer shadow, but its center remains below/right of the caster.
- Ambient fill is cool-neutral in daylight, warmer at sunset, and blue-violet at night. Time-of-day tint changes the environment and shadow fill; it must not erase character/ball material colors.
- Keep a readable highlight plane and a darker opposite/lower-right plane on rounded hero objects. Avoid lighting cues that imply a different light direction in the same depth layer.

## Outline hierarchy

Outline widths are authored at 960 × 540 and scale with the logical scene, not the device pixel ratio:

| Class | Outer outline target | Relative dominance |
|---|---:|---:|
| Ball | 2.5–3.0 px | 1.00 |
| Player/Kevin | 2.5–3.2 px | 0.90–1.00 |
| Interactive/destructible prop | 1.8–2.6 px | 0.70–0.85 |
| Near architecture | 1.1–1.8 px | 0.45–0.65 |
| Background architecture / fence | 0.6–1.2 px | 0.25–0.45 |
| Far scenery | none to 0.7 px | 0.00–0.25 |
| Particles | normally none; 0.8–1.4 px only when needed for separation | 0.15–0.45 |

No background contour may be as dark and thick as the ball/character contour across a broad repeated area.

## Value and saturation

- Interactive content owns the strongest local value edges. Background median local contrast should be at most 70% of foreground gameplay-object contrast in the same screenshot region.
- Background median chroma/saturation should be at most 75% of foreground gameplay-object chroma, except the sky may retain a broad low-detail color field.
- Reserve near-white highlights and near-black outlines for small focal edges. Avoid assigning peak saturation to every prop, tree, fence, and VFX family at once.
- The ball must have a luminance boundary against both sky and ground. An outline, value edge, or restrained trail remains visible when particles are reduced or absent.

## Prop readability and scale

- Every major prop is identifiable from its outer silhouette at a 960 × 540 frame and at the smallest supported responsive rendering size (the 390 × 844 viewport with the existing 16:9 playfield).
- Hero prop silhouette occupies at least 32 × 28 logical pixels; its identifying opening/handle/wheel/roof feature is at least 3 logical pixels thick after scaling.
- Decorative marks below 2 px at logical size are omitted or grouped into larger readable accents.
- Distinguish grounded, floating, attached, and breakable states through silhouette, shadow, and material response, not color alone.
- Artwork must be compared against the live Matter collision shape. Do not alter collision geometry solely to make the illustration easier to draw.

## Environment depth and staging

Use these ordered bands, from back to front:

1. Far atmosphere and broad sky light.
2. Far skyline/ridges and low-contrast cloud forms.
3. House masses and upper-story windows.
4. Midground vegetation and fence.
5. Ground plane and broad patio/lawn zones.
6. Props, Kevin/window interaction, and the gameplay action plane.
7. Player, ball, projectiles, and contact-specific effects according to the existing gameplay draw order.
8. Foreground accents kept below 8% of frame area and clear of contact points.
9. Existing HTML HUD and modal UI above the game surface.

Each layer should separate through at least one of value, color temperature, edge softness, overlap, scale, or parallax. Repeating chunks must hide hard joins using continuous ground/fence geometry and cross-boundary variation. Do not use saturation alone to express depth.

## Animation silhouette targets

Measure silhouette change at logical size against the character's idle mask. These are minimum visual targets for later art/animation phases, not permission to change current gameplay timing:

| Action | Minimum distinguishable change |
|---|---|
| Run | Alternating front-foot/ankle position changes by ≥8 px; knee/arm swing changes by ≥10 px; torso lean is visible at 960 × 540. |
| Start/stop | Visible anticipation or settling in 0.08–0.16 s; planted foot does not slide more than 2 px per frame at 60 Hz when stationary. |
| Reversal | Facing changes once; shoulder/hip counter-rotation reaches ≥5° or an equivalent silhouette shift. |
| Kick | Striking foot travels ≥24 px from chamber to extension; torso/arms counterbalance and extension persists through contact. |
| Power Shot | At least 1.15× the ordinary kick silhouette displacement/pose accent, with a clear charge/release read; no change to the existing power rule. |
| Header | Head/neck drive ≥8 px toward the contact direction with a separate readable recoil. |
| Hurt | Torso/head lean ≥8° or ≥8 px, plus a distinct defensive arm/face silhouette. |
| Kevin throw | Windup, release, and follow-through are separable; throwing hand travels ≥24 px and chest/shoulder line changes. |
| Kevin bonk | Head/body recoil and recovery are visible; any stars remain above his silhouette and outside the ball's read zone. |

## Feedback hierarchy (provisional)

| Class | Use | Motion/lifetime | Screen budget |
|---|---|---|---|
| S | Rare climax: Havoc activation, exceptional parry, major run-ending event | 0.25–0.7 s peak; settle within 1.2 s | One focal effect; never obscure immediate danger. |
| A | Contact success, prop destruction, Kevin hit | 0.18–0.45 s | One clear label or burst; avoid stacking duplicate text. |
| B | Combo/score confirmation, secondary impact | 0.12–0.30 s | Small, local to event, below ball/character contrast. |
| C | Ambient dust, grass, low-value motion | 0.10–0.35 s | Low-alpha, low-frequency, suppressed/reduced by existing reduced-motion behavior. |

Text priority is S > A > B > C. If several events occur together, prefer one message and keep the ball/projectile hazard unobscured. Reduced motion lowers camera/decorative motion and alpha; it does not hide danger state or essential contact success.

## Phase boundary

Phase 13 establishes and measures these rules. It does not redesign all yard themes, replace every prop, author the full character animation set, or change gameplay/physics. Later phases must retain semantic DOM controls, the existing 960 × 540 gameplay coordinate system, and Matter as the gameplay authority.
