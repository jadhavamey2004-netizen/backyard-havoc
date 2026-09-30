# Review Protocol for Future Changes

Use one GitHub PR per focused change. A reviewer should be able to check the claimed behavior directly from the source diff and linked artifacts.

## Required PR evidence

1. **Scope and baseline:** state the user-visible behavior changed, baseline commit, and relevant old/new behavior.
2. **Source diff:** keep the PR focused; call out any migration, config, or asset changes.
3. **Automated checks:** list exact commands and results for Vitest, build, and any new browser test. Include failed/skipped counts and warnings; do not summarize warnings as passes.
4. **Browser evidence:** for gameplay/input/UI changes, attach or link a short Playwright report/trace and browser console/network result. Reproduce the path from a clean run.
5. **Screenshots:** include before/after captures at a named viewport and state (title, representative gameplay, result/game-over as applicable). For visual comparisons, pin browser/runtime and control random seed/state; review changed goldens in the PR.
6. **Gameplay recording:** where timing, animation, destruction, camera, voice or feel changes, attach a short compressed recording showing input and outcome. Do not commit large raw recordings to the repo; use GitHub-supported PR artifacts or a linked review artifact.
7. **Performance:** for physics, rendering, particle or resource-lifecycle changes, report representative device/browser, frame-time/FPS sampling, body/particle counts and session duration. Compare to the same baseline setup.
8. **Limitations:** list browsers/devices/scenarios not verified and any known remaining issues.

## Review sequence

- Confirm the PR branch starts from the expected current `main` and contains no unrelated files.
- Compare claims to production call paths; documentation alone is not proof of runtime behavior.
- Check tests exercise production code and meaningful browser input, not only copied formulas.
- Inspect console errors, failed network requests, screenshot differences and the recorded sequence.
- Review warnings and flaky evidence, then request focused changes before merge.
- Keep baseline artifacts and test conditions reusable for later before/after comparisons.

## External review access

Keep the branch and artifacts attached to the GitHub PR, with repository-relative evidence and stable links. Do not make the reviewer depend on a local workspace, private desktop state, or manual file upload by the human.
