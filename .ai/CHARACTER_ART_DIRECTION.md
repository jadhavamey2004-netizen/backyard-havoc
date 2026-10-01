# Backyard Havoc Character Art Direction — Phase 3

> **Phase 4 compatibility note:** Phase 3's approved character appearance, palette, proportions, and silhouette remain authoritative. Motion descriptions and implementation notes below record the Phase 3-era design/audit state; current movement is defined by [`.ai/CHARACTER_ANIMATION.md`](./CHARACTER_ANIMATION.md).

**Status:** `IMPLEMENTED` for the Canvas character redesign and its automated structural checks. **HUMAN ART REVIEW REQUIRED** for aesthetic approval.
**Baseline:** `b196fb485f6268e6423280428f7cc7643cd6f66d`
**Scope:** Player and Kevin character presentation only. Runtime/gameplay truth remains in the existing model classes.

## Current rendering audit

At the Phase 3 baseline, both characters were drawn procedurally by methods inside their runtime classes. The player renderer occupied most of `Player`'s latter half; Kevin's drawing, window, rage meter and dialogue bubble were methods at the end of `NeighborKevinNPC`.

| Area | Baseline implementation and coupling |
| --- | --- |
| Player proportions | `Player.x/y` is the character drawing origin. The body occupies roughly 105–120 local pixels vertically; the head is a 15 px radius circle centered around `(0, -70)`, the jersey spans `y=-62..-34`, shorts span `y=-34..-16`, and cleats extend to about `y=+20`. The existing kick-contact point is `(x + facing*32, y - 22)` and the header point is `(x + facing*10, y - 70)`. |
| Player drawing order | Ground shadow; rear arm; legs/shorts; jersey; head/hair/headband/face; front arm. State-dependent pose code read movement velocity, facing, run cycle, kick progress, charge, hurt and invulnerability values. |
| Player face and costume | One large outlined eye, dark spiky hair, red headband, skin circle, yellow jersey with number text and blue collar, dark shorts with a gold stripe, and red cleats. Facial details and limbs used several unrelated outline widths and raw colors. |
| Kevin proportions | `NeighborKevinNPC.x/y` is centered on his second-story window, not on a world body or ground point. The baseline window is 56×52 px; the visible head radius is 14 px and the upper body is about 32×24 px. Kevin has no Matter body. |
| Kevin drawing order | Rage meter; window frame/shutters; window-facing body; head/hair/face; arms; dizzy stars; speech bubble. Drawn before props and world projectiles by `GameEngine.render()`. |
| Kevin face/costume | Bald head with small spots and gray sideburn circles, oversized brows, round glasses, red nose, wide mouth, blue/red torso, and several state branches sharing one default angry face. His production states were `PEEKING_INSIDE`, `LEANING_OUT_RAGE`, `THROWING_PROJECTILE`, `DIZZY_BONK`, and `REPAIRING`. |
| State and motion assumptions | Player drawing reads `IDLE`, `RUNNING`, `KICKING`, `HEADING`, `HURT`, plus charge and invulnerability. Kevin drawing reads the five states above, `rageMeter`, `facing`, existing pose angles, stars, and dialogue presentation. Some idle/face details used `Date.now()` directly. |
| Gameplay/render boundary | Player contacts are computed by `getKickPosition()` and `getHeaderPosition()`; they are not derived from body art. Player has no collision body. Kevin's window is artwork and is not a hitbox. Renderer extraction must not move either origin or change those methods. |
| Shared drawing | Both characters independently repeated save/restore, path, fill, and outline setup. Game-level projectiles, environment, HUD and effects are separate and remain outside this redesign. |
| Rendering quality | `#game-canvas` used `image-rendering: pixelated` and `crisp-edges` despite vector Canvas artwork, causing an inappropriate pixel-art scaling hint. Character drawing order in `GameEngine.render()` is preserved. |

Baseline visual evidence came from the Playwright artifact `11134911638` attached to the post-merge Quality Gate for the exact baseline SHA. It showed the original yellow-kit player in the lower yard and Kevin leaning from an upper-story window.

## Design direction

**ART DIRECTION — HUMAN REVIEW REQUIRED:** Backyard Havoc uses a bold, clean suburban sports-comedy illustration style. The player is the **Yard Rocket**: compact, forward-driven and agile, with a memorable swept hair/headband silhouette. Kevin is the **self-appointed yard commissioner**: broad, boxy and stubborn, framed by his window with a homewear cardigan, strong glasses/brow/moustache read, and rigid gestures. Their silhouettes differ even when filled black: narrow tapered runner versus wide square window-dweller.

The drawings use original Canvas vector shapes. They do not depict or quote a known athlete, team, cartoon, game character, or other protected design. Details are deliberately limited so the silhouette and face survive gameplay scale.

## Player contract

**Design role:** Skilled backyard footballer; confident and energetic without asserting a specific age. Movement and football are the character's identity.

**Canonical scale and origin (`IMPLEMENTED`):** about 120 px from hair crest to cleat sole at unit draw scale. The renderer origin remains `(player.x, player.y)`; the existing visible foot line is approximately `player.y + 18`. The original gameplay kick/header points and all Player world coordinates remain untouched. The design is compact, head-forward and narrow through the waist, with a slightly exaggerated forward striking leg. Approximate head diameter is 32 px; torso is 36×34 px; shoulder span is about 34 px; arm reach is about 30 px; thigh/calf segments are about 16–19 px each; cleats are about 20×9 px.

**Pose anchors (`IMPLEMENTED`):** renderer-owned local anchors are pelvis `(0,-35)`, torso center `(0,-51)`, neck `(0,-68)`, head center `(0,-77)`, shoulders `(-13,-60)/(13,-60)`, elbows `(-18,-43)/(18,-43)`, wrists `(-15,-28)/(15,-28)`, hips `(-7,-35)/(7,-35)`, knees `(-7,-17)/(7,-17)`, and ankles `(-7,1)/(7,1)`. Pose offsets are calculated from existing runtime values; these anchors do not feed gameplay/contact geometry.

**Shape/posture:** tapered jersey, clean round head against a swept three-lock hair silhouette, compact shorts, readable bent arms, and sturdy high-top street cleats. A short mint sweatband tail breaks symmetry. Running leans forward; kick extension points toward the existing strike side; header tucks and drives the head; hurt folds the shoulders.

**Costume:** coral street-football jersey with warm-cream chest slash and mint piping; ink-navy shorts; off-white socks; mint-and-coral cleats; a mint sweatband. No club logo, number, weapon, armor, or tiny decorative lettering.

**Palette tokens (`IMPLEMENTED`):**

| Token | Value | Use |
| --- | --- | --- |
| `jersey` | `#E85F5C` | Primary coral jersey |
| `jerseyShade` | `#B83D49` | One restrained jersey shadow |
| `cream` | `#FFF1D5` | Chest slash, collar and socks |
| `mint` | `#62D8B7` | Sweatband, piping and cleat accent |
| `shorts` | `#26344B` | Ink-navy shorts |
| `skin` | `#C98258` | Warm medium skin |
| `skinShade` | `#A95E45` | Face/limb shadow |
| `hair` | `#292536` | Deep plum-black hair |
| `outline` | `#202334` | Outer silhouette and internal line |
| `shadow` | `rgba(20, 28, 42, 0.30)` | Grounding ellipse |
| `charge` | `#F7B844` | Small charging accent, secondary to Phase 2 effects |
| `comboGlow` | `#FACC15` | Existing combo feedback color |
| `comboGlowPeak` | `#EF4444` | Existing peak combo feedback color |

Coral and mint separate the player from grass, blue sky, wood and the purple/olive Kevin palette. The costume remains subordinate to the existing gold/orange power-shot effect.

**Expressions (`IMPLEMENTED`):** neutral/focused at idle; effort for run, kick and header; confident for a short recovery/idle grin; charging for a lowered focused brow and compact grin; hurt for a pinched brow, compressed mouth and visibly folded pose. Expression is selected from current state/charge values; no runtime state is added.

## Kevin contract

**Design role:** Neighbor whose self-serious belief in backyard jurisdiction creates the comedy. His posture and face carry irritation; no new AI or escalation behavior is introduced.

**Canonical scale and origin (`IMPLEMENTED`):** about 104 px from scalp to lower torso at unit draw scale, with a wide 92 px shoulder/arm silhouette. `npc.x/y` remains the center of the existing second-story window. The window art is behind Kevin; the visible character sits at and just outside its sill. No world body, projectile logic, or hitbox is added.

**Proportions/anchors (`IMPLEMENTED`):** broad torso about 68×42 px; head about 42×40 px; short arm reach about 29 px; arms and elbows stay close to the window. The renderer defines named head, neck, shoulder, elbow, wrist and sill anchors around the window-center origin. Rage/throw/bonk presentation offsets only those drawing anchors.

**Silhouette and costume:** rounded-square sweater body, high forward brow, broad moustache and rectangular spectacles create a stable face read. A soft bald dome with two swept silver temple tufts contrasts with the player's swept sports hair. Kevin wears a muted plum cardigan over a warm cream shirt with olive cuffs and one large ochre pocket patch. His design reads as homewear, not uniform or armor.

**Palette tokens (`IMPLEMENTED`):**

| Token | Value | Use |
| --- | --- | --- |
| `cardigan` | `#55465F` | Muted plum main garment |
| `cardiganShade` | `#3F3548` | Garment shadow |
| `shirt` | `#F1E5C8` | Warm cream shirt |
| `olive` | `#87935C` | Cuff/pocket accent |
| `ochre` | `#D9A34D` | Pocket detail and warm trim |
| `skin` | `#D29A70` | Warm, distinct skin tone |
| `flush` | `#D96A63` | Restrained angry/bonked cheek warmth |
| `hair` | `#D8D4C6` | Silver-gray temple hair and moustache |
| `glasses` | `#362C35` | Dark plum rectangular glasses |
| `outline` | `#242433` | Outer silhouette and facial line |
| `interior` | `#27283A` | Open window interior |
| `windowGlass` | `rgba(82, 155, 179, 0.76)` | Closed-window glass |
| `curtain` | `#D7A84F` | Side curtain panels |
| `windowWood` | `#A9612C` | Sill |
| `shutter` | `#C57A3A` | Shutters |
| `shutterHighlight` | `#E0A157` | Shutter slats |
| `windowLight` | `#F5D77A` | Warm closed-window light |
| `bonkedSkin` | `#DFAD88` | Bonked expression face tint |
| `mouth` | `#552F36` | Open/surprised mouth |
| `shadow` | `rgba(25, 28, 39, 0.36)` | Interior window shadow |
| `white` | `#FFFDF8` | Eye and mouth highlights |
| `black` | `#242433` | Pupil fill |
| `rage` | `#E6655C` | Existing rage meter |
| `panic` | `#F4B94F` | Existing panic meter |
| `hurt` | `#6CB7D8` | Existing hurt meter |
| `smug` | `#78825D` | Existing smug meter |

**Expressions (`IMPLEMENTED`):** `PEEKING_INSIDE → watchful`; `LEANING_OUT_RAGE → irritated/angry` according to existing rage intensity, with current dialogue emotion able to select smug/sarcastic, surprised/panic, or hurt/crying; `THROWING_PROJECTILE → shouting`; `DIZZY_BONK → bonked`; `REPAIRING → neutral`. The set also defines explicit neutral and suspicious treatment for QA/state composition. Existing `facing` supplies a lightweight gaze direction; gaze never changes gameplay.

## Shared Canvas rules

**Style and line classes (`IMPLEMENTED`):** 3.2 px outer silhouette; 2.0 px structural/clothing lines; 1.5 px facial details. Prefer one clean dark outline over nested outlines. Shapes are rounded at joints, sharper at the player's action direction and squarer on Kevin. Each character uses one local ground/window shadow, one restrained light-side highlight, and no per-part glow stack. No gradient is required for body readability.

**Scale and finish (`IMPLEMENTED`):** geometry is defined at the 960×540 game-world coordinate scale and tested in the 1280×720, one-worker Chromium viewport. Canvas remains vector-smoothed when CSS scales it. Anti-aliasing is expected; pixel-art rendering is not. Paths use bounded, direct Canvas operations and allocate no large per-frame collections.

**Layer order (`IMPLEMENTED`):**

- Player: grounding shadow; rear arm and rear leg; shorts; torso/jersey panels; front leg/cleat; neck/head; hair/headband; facial features; front arm; small state accent. Player remains at the existing world render slot after particles and before the ball/aim presentation.
- Kevin: window/opening/shutters; body and rear arm; head/hair; facial features/accessory; foreground arm/hand; bonk stars or small state mark; rage meter and speech bubble. The existing `GameEngine` scene order remains unchanged.

**Effect boundaries:** existing power meter, football trail, camera feedback, perfect-strike colors, destruction, particles, HUD and audio remain owned by their existing systems. Charge/hurt states may make small character-local adaptations only. No character effect changes a gameplay value.

## Production state and expression map

| Existing runtime value | Player visual treatment | Kevin visual treatment |
| --- | --- | --- |
| `IDLE` | Focused stance / neutral face | — |
| `RUNNING` | Forward lean, stride and effort face | — |
| `KICKING` | Anticipation/strike/recovery leg pose, effort face | — |
| `HEADING` | Head-forward compact pose, effort face | — |
| `HURT` | Folded posture, hurt face; existing invulnerability blink retained | — |
| `powerCharging` | Focused charging face and restrained warm trim | — |
| `invulnerabilityTimer > 0` | Existing timed visibility blink | — |
| `PEEKING_INSIDE` | — | Watchful window pose, gaze toward existing `facing` |
| `LEANING_OUT_RAGE` | — | Irritated/angry pose from current rage/dialogue presentation |
| `THROWING_PROJECTILE` | — | Shouting pose with current `pitchArmAngle` |
| `DIZZY_BONK` | — | Bonked pose from current dizzy/stars values |
| `REPAIRING` | — | Neutral/tending pose |

Renderer entry points map every production state explicitly. Drawing consumes model state but never mutates it. There is no new state machine or animation framework.

## Gameplay compatibility and regression requirements

**`IMPLEMENTED`:** Player and Kevin keep their current model coordinates, Player contact positions/radii, kick timing, movement, charge, damage, invulnerability duration, Kevin state transitions, rage values, throw timing/projectiles, scoring, combo, camera, hit-stop and run lifecycle. Tests cover contact-anchor invariance, all production state mappings, finite pose anchors/geometry, renderer state immutability, and balanced Canvas save/restore.

**`IMPLEMENTED`:** Playwright evidence shows the normal game plus an isolated test-build-only sheet using the same Player/Kevin renderer entry points for representative player poses and Kevin expressions. Browser health remains hard-failing under the existing policy.

**`ART DIRECTION — HUMAN REVIEW REQUIRED`:** Automated tests establish deterministic structure and runtime safety; they do not judge whether the characters look good, memorable, original enough, or appropriately balanced in the scene.

## Phase 3-era visual limitations

At Phase 3 completion this was a Canvas-vector design with compact procedural pose offsets; authored motion was deferred to Phase 4. Phase 4 now adds the focused simulation-time pose controllers documented in `.ai/CHARACTER_ANIMATION.md`, while retaining the same Canvas character construction. Kevin remains positioned in a window; this design does not add lower-body staging. Human review must judge the art at actual gameplay scale and against a range of real backgrounds/effects.

## HUMAN CHARACTER REVIEW CHECKLIST — REQUIRES HUMAN REVIEW

**Player**

- Is the silhouette instantly readable and athletic?
- Does the character feel specific to Backyard Havoc?
- Does the design remain readable while moving and under camera motion?
- Do kick, header and charge poses preserve identity and align visually with the action?
- Is the face readable without visual noise?
- Does the palette separate from the yard and existing gold/orange effects?

**Kevin**

- Is Kevin immediately recognizable and clearly different from the player?
- Does his silhouette feel comedic rather than generic?
- Is irritation readable through face and posture?
- Does he remain readable inside the current window framing?
- Do watchful, angry, shouting, sarcastic, surprised and bonked expressions differ clearly?
- Can this design support future escalation without changing the current Phase 3 behavior?

**Shared**

- Do both characters feel like they belong in the same game?
- Are line weights, highlights and proportions consistent across states?
- Does any detail disappear or become noise at normal gameplay scale?
- Does any shape feel like placeholder art or resemble a recognizable copyrighted character?

Automated checks do not mark this checklist approved. A human art review is still required.
