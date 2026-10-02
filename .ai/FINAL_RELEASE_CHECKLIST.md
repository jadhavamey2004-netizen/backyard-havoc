# Final Release Checklist

This checklist separates Phase 12 review evidence from the post-merge production gate. A checked item means there is current evidence on the exact reviewed head; otherwise it stays open.

## Source provenance

- [x] Phase 12 began from the verified `a9fc5204e51f6aa3af4f44d2a4139c9064002e3a` baseline on the existing `codex/phase-12-final-release-hardening` branch.
- [x] Latest PR check, artifact, and Preview records match the observed branch head; verify again after every push.

## Gameplay

- [x] No gameplay tuning constants or gameplay rules changed in Phase 12.
- [x] Existing gameplay regression suite passes locally: Vitest 319/319; no gameplay tuning or rule constants changed.

## Input

- [x] Desktop keyboard and pointer regressions pass in the full local Chromium suite.
- [x] Pause/resume and visibility cancellation regressions pass in the full local Chromium suite.

## Mobile

- [x] Chromium touch regressions pass 11/11, including cancellation, simultaneous movement/action pointers, and responsive control visibility.
- [x] Physical-device limitations are documented; browser automation is not a physical-device test.

## Audio

- [x] Existing lifecycle, mute, visibility, and transient cleanup checks pass.
- [x] No per-run duplicate music scheduling was observed; repeated-run instrumentation observed one AudioContext.

## VFX

- [x] All authored bounded presentation buffers remain within their production caps and clear on reset.

## Physics

- [x] Active Matter bodies remain bounded across 240 accelerated chunk boundaries.
- [x] No duplicate or unloaded chunk bodies remain.

## Destruction

- [x] Physical debris bodies leave the Matter world after their lifetime.
- [x] Reset clears debris and run-scoped destroyed/cleared history.

## Kevin/Havoc

- [x] Existing escalation, projectile, parry, Havoc, and dialogue regressions pass.
- [x] Old-session cosmetic dialogue cannot cross a run reset.

## Progression

- [x] Nine event-backed challenges remain idempotent and persistent.
- [x] Restart/main-menu feedback and inactive-run progress regressions pass.

## Persistence

- [x] All five storage keys are exercised together and unrelated legacy values survive malformed profile recovery.
- [x] Storage unavailable/read/write failure coverage passes.
- [x] Repeated runs and reload preserve valid progression.

## UI

- [x] Results, Settings, Garage, Challenges, Restart, and Play Again regressions pass.
- [x] Focus returns to the Canvas on active gameplay paths.

## Accessibility

- [x] Existing keyboard focus, focus visibility, semantic controls, reduced-motion, reflow, and affiliate-target regressions pass.
- [x] No WCAG certification claim is made.

## Affiliate

- [x] Exact VideoGen URL, disclosure, native activation, secure attributes, and 48px minimum touch target remain verified.
- [x] Affiliate remains Results-only and has no progression/gameplay effect.

## Cross-browser

- [x] Full desktop Chromium suite passes 41/41 locally.
- [x] Chromium touch suite passes 11/11 locally.
- [x] Firefox release smoke passes 2/2 in the latest observed exact-head CI; the local pinned executable is unavailable.
- [x] WebKit release smoke passes 2/2 in the latest observed exact-head CI; the local pinned executable is unavailable.
- [x] Cross-browser CI artifact is tied to the latest observed PR head; verify current metadata after every push.

## Performance

- [x] Long-run accelerated resource evidence is attached.
- [x] Browser frame timing is labeled a gross regression sanity check, not a device benchmark.

## Security/dependencies

- [x] `npm ls`, `npm audit --omit=dev`, and `npm audit` are recorded.
- [x] Production and dev-toolchain findings are separately classified.
- [x] High-confidence credential scan found no matching credentials or private user data patterns.

## Assets/licensing

- [x] Unreferenced, unknown-rights JPEGs are removed from production output and their hashes/provenance limitation documented.
- [x] Repository MIT LICENSE exists and README link resolves.
- [x] Matter.js and Google Fonts license notices are recorded from authoritative metadata/package files.

## Documentation

- [x] README and current Phase 11/12 project status match shipped runtime truth.
- [x] Historical audit/prototype documents remain distinguishable from current runtime.
- [x] Phase 12 audit, hardening report, asset provenance, and this checklist record local verification.

## CI

- [x] Unit tests and production build pass on the latest observed PR SHA; verify current status after every push.
- [x] Chromium/touch quality job passes on the latest observed PR SHA; verify current status after every push.
- [x] Firefox/WebKit release job passes on the latest observed PR SHA; verify current status after every push.
- [x] Final Playwright artifacts include browser-health and required stress evidence tied to the latest observed PR SHA.

## Vercel

- [x] Latest observed PR head has a READY Preview whose Git SHA/ref equals the PR head; verify after every push.
- [x] Preview URL and deployment identity are recorded in the final handoff.
- [x] No production deployment was initiated from this branch.

## Final production verification

- [ ] **Pending the external post-merge Final Release Gate.** Phase 12 does not mark production verification complete.
