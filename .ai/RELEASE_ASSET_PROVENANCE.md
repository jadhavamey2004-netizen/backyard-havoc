# Release Asset Provenance

## Shipped non-code assets

The Phase 12 baseline had no referenced images or audio files under `public/`. The game draws its playfield and characters through Canvas code. Bebas Neue and Outfit are requested from Google Fonts at runtime; their binaries are not committed or copied to `dist/`.

| Path | Purpose | Runtime referenced? | Source | Author/creator | License/right to use | Release action |
| --- | --- | --- | --- | --- | --- | --- |
| `public/backyard_environment.jpg` | Historical environment reference image; no production code or HTML reference found | No | Unknown. Present in repository history before Phase 12; origin could not be established from repository contents | UNKNOWN | UNKNOWN | Removed from `public/` and production output. Baseline size 372,383 bytes; SHA-256 `b2754afe515a8856d59c54fab6d59eec7f5bb4944f06d6a60f642e6b065e37b8`. |
| `public/backyard_vibe_map.jpg` | Historical visual reference; no production code or HTML reference found | No | Unknown. Present in repository history before Phase 12; origin could not be established from repository contents | UNKNOWN | UNKNOWN | Removed from `public/` and production output. Baseline size 1,004,962 bytes; SHA-256 `9824cd0d9c87f1ca531c1cb95ea32263fdfece6d5a6b53e503f45c969adc4e8`. |
| Google Fonts: Bebas Neue | Display typography requested by `index.html` | Yes, external stylesheet/font requests | Google Fonts CSS and font delivery service; upstream project references are in `THIRD_PARTY_NOTICES.md` | Ryoichi Tsunekawa / Bebas Neue Project Authors | SIL Open Font License 1.1 according to Google Fonts metadata | Remains remote and outside the repository's shipped static bundle. |
| Google Fonts: Outfit | Interface typography requested by `index.html` | Yes, external stylesheet/font requests | Google Fonts CSS and font delivery service; upstream project references are in `THIRD_PARTY_NOTICES.md` | Smartsheet Inc., Rodrigo Fuenzalida / The Outfit Project Authors | SIL Open Font License 1.1 according to Google Fonts metadata | Remains remote and outside the repository's shipped static bundle. |

## Non-release test assets

| Path | Purpose | Included in production? | Provenance | Release action |
| --- | --- | --- | --- | --- |
| `tests/e2e/fixtures/phase-3-baseline-gameplay.png` | Frozen visual fixture used by automated browser tests | No; `tests/` is not copied to Vite `dist/` | Repository-owned test fixture; original capture history is retained in Git | Keep under tests only. |

## Release size effect

The two unreferenced JPEGs totaled 1,377,345 bytes in the baseline production `dist/`. Removing them should lower deployed static output by exactly their uncompressed sum; final measured bundle totals are in `.ai/PHASE12_FINAL_RELEASE_HARDENING.md` and the production-bundle JSON evidence. No origin or redistribution permission is asserted for the removed reference images.
