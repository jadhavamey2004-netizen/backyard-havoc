# Phase 6 — Destruction & Environment

Phase 6 adds material-specific destruction to the existing Matter.js world and Canvas renderer. The existing four-yard procedural architecture and collision-driven scoring path remain in place.

## Material profiles

`src/destruction_materials.js` defines the primary families `GLASS`, `WOOD`, `CERAMIC`, `METAL`, `PLASTIC`, `FABRIC`, and `SOIL`. Profiles are immutable and validated. They contain only physical and presentation tuning: fragment count and shape family, density, restitution, friction, air resistance, simulation-time lifetime, scatter, spin, particle count, visual style, and residue type. Score, combo, Havoc, and Kevin rage remain owned by gameplay systems.

| Material | Fragments | Shape / response | Residue |
| --- | ---: | --- | --- |
| GLASS | 9 | small triangles, quick scatter, reflective and bouncy | frame and glints |
| WOOD | 6 | long splinters, directional scatter, low bounce | splinter pile |
| CERAMIC | 6 | small polygon chips, heavier and lower bounce | pottery chips |
| METAL | 4 | heavy scrap, restrained scatter, tumbling | scrap and scorch |
| PLASTIC | 5 | light molded pieces, bright color, moderate bounce | colored scraps |
| FABRIC | 3 | thin strips, strong air resistance, low bounce | collapsed cloth |
| SOIL | 6 | circular clods, high friction, very low bounce | disturbed dirt |

`src/destruction_system.js` generates bounded Matter primitives and visual residue metadata. Fracture uses a seeded PRNG derived from stable prop identity, material, position, source dimensions, impact velocity, and occurrence. It does not use wall-clock time, network data, or global random state. Fragment dimensions are finite and clamped from source dimensions and profile.

## Identity, persistence, and debris

Procedural props receive a stable `propKey` in the form `chunkIndex:theme:localName`. Matter body IDs remain transient event/debug identifiers. Ordinary destructibles declare a material; Kevin's window character stays on its separate NPC hit path.

`ProceduralWorld.destroyedPropKeys` and `clearedChunkKeys` persist for one run. Reloading a chunk skips destroyed props, restores intact props, reconstructs a small residue descriptor from that prop's deterministic definition, and does not replay gameplay events. A cleared yard is counted once per run. Full run reset clears both sets, counters, fragments, and active residue; a clean initial world is then rebuilt.

Residue is non-physical Canvas drawing stored only on active chunk records. Unloading a chunk drops its rendered residue records; loading it again derives them from the destroyed key and prop definition. This avoids a second unbounded render-object collection while retaining the required run-level destruction keys.

The active physical fragment budget is `MAX_ACTIVE_FRAGMENTS = 96`. When a fracture would exceed it, the oldest active fragments are removed from both Matter and the tracking list before new pieces are added. Fragment bodies have finite profile lifetimes and age only by visible simulation `dt`. Their collision category is `SHARDS`, with a mask limited to `STATIC`; they can settle against static scenery but cannot contact the ball or destructible props. They are not part of projectile, player-damage, score, combo, Havoc, or Kevin event paths.

## Yard changes

- **GREENHOUSE:** retains the conservatory and existing glass, ceramic planter, and gnome props; adds a timber crate, plastic watering can, and loose-soil target.
- **PATIO_BBQ:** retains windows, grill, metal trash can, and terracotta planter; adds a fabric cushion and plastic cooler. Existing brick house and grill art stay in place.
- **SHED_TRAMPOLINE:** retains the timber loft, windows, trampoline, bicycle, and gnome; adds a wood crate, plastic bucket, and folded work towel.
- **DOG_PARK:** retains the Craftsman home, ceramic birdbath/planter, and kennel; adds a plastic toy, fabric cushion, and wooden chew stick.

The renderer uses Canvas shapes, highlights, grain, seams, clods, and modest aftermath marks. No external art pack or new render/physics engine is used. Existing background silhouettes and foreground gameplay readability remain authoritative.

## Gameplay compatibility

Existing object score values and all ordinary `OBJECT_DESTROYED` Phase 5 gains remain unchanged: Havoc `+8`, Kevin rage `+12` near Kevin and `+4` far away. Each object has one canonical destruction event carrying material, theme, prop key, object name, score, combo, and Kevin distance/proximity. Fragments and residue emit no gameplay events.

Special paths remain label/flag driven: glass hit-stop and shatter sound; grill explosion, fire, vignette, trauma, and `GRILL_BLAST`; gnome sound, trauma, and `GNOME_BONK`; window, greenhouse, and flowerpot trick events. The grill remains a single-object blast with no chain explosions. Kevin remains an NPC, not a material destructible.

Existing prop score values are unchanged. Added small targets use values from 100–250. Ball kick/header/Power Shot/parry rules, velocity caps, fixed physics timestep, Havoc/rage policy, and Phase 5 escalation behavior are not redesigned.

## VideoGen affiliate link

`src/affiliate_links.js` is the only VideoGen configuration source. Its single `enabled` flag controls rendering. The link is mounted only after game over in the secondary results section, with the exact disclosure: “Affiliate link — we may earn a commission at no extra cost to you.”

The user must click the semantic external anchor. It uses `_blank`, `sponsored noopener noreferrer`, and `no-referrer`. There is no click counter, analytics, iframe, gameplay event, remote request before click, reward, API, SDK, or automatic navigation. The CI browser test intercepts an explicit click with a local stub and does not depend on VideoGen's availability.

## Vercel release process

`vercel.json` remains configured for `npm run build`, output directory `dist`, and the Vite framework. The intended Git integration is `jadhavamey2004-netizen/backyard-havoc`, production branch `main`, at `https://backyard-havoc.vercel.app`. The GitHub Vercel Preview check passed for this draft PR and reported “Deployment has completed.” This environment has no Vercel CLI, `.vercel` project link, or Vercel token for dashboard-level verification; that remains `VERCEL DASHBOARD VERIFICATION REQUIRES EXTERNAL REVIEW`.

Phase 6 ends at a green draft PR for external review. No production deployment is performed from the feature branch. After approval and human merge, the reviewer verifies the exact merged `main` SHA, Vercel's production deployment provenance/status, and a live gameplay smoke test before establishing a later-phase baseline.
