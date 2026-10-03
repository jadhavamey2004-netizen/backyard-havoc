# Context Efficiency Preflight

**Status:** complete for external review; tooling and documentation only

**Baseline:** `404fef0b1dbb1a68fd6031e7a149a1d850932957`

**Branch:** `codex/context-efficiency-preflight`

**Phase 14:** not started

## Scope and environment

This preflight changed no gameplay, rendering, audio, progression, affiliate, or other runtime behavior. It was run in the persistent local Codex desktop environment on Windows, in `D:\Backyard Havock`. The Codex CLI was `0.159.0-alpha.12.1`; desktop app build was `26.930.21537`. Node was `v24.21.0`, npm `12.0.2`, Python `3.11.9`, uv `0.12.20`, Git `2.56.0`, and GitHub CLI `2.101.0`.

User-level Codex configuration at `%USERPROFILE%\.codex` was present, writable, and TOML/JSON validated after configuration. User MCP setup is persistent. `serena setup codex` configured Serena with `codex_hooks=true`: SessionStart activation, a Bash-use reminder, reset after Serena tool use, and SessionEnd cleanup. Serena's six read-only tools were exposed to this task. The memory server is configured with five enabled tools and starts its local package directly through Node. Global npm and uv installations are on external `D:\BionicWorkspace\tools` and do not alter this repository's dependency graph. The installed commands are not on this shell's `PATH`; use explicit paths or set `BACKYARD_TOOLS_HOME`. The Codex app may need a restart before newly written hook/config changes are available in a future session.

No Ruflo MCP or ToolSearch capability was exposed to this task, so the AGENTS.md request to discover Ruflo tools could not be applied. A Ruflo package version `3.10.42` was already present in the global npm root before this preflight; this task did not install, initialize, configure, or use Ruflo. Save-The-Token `0.1.0` was installed from its official repository at commit `c9d439471fa893c3e52f5f2696a7f4d4cc889699`. There were no compaction events during the measured benchmark.

## Tool decisions

| Tool | Keep? | Evidence and context benefit | Cost or risk |
|---|---|---|---|
| Serena 1.7.0 | Yes, for substantial code navigation | Indexed 106 JS/TS files; health check passed; exact symbols/references found the render, coordinate, Kevin, and test ownership paths without opening whole files. Targeted retrieval returned 13,989 characters for five tasks. | 19 semantic retrieval calls plus activation versus five direct search calls. Save-The-Token did not obtain a successful Serena runtime probe. Serena is unnecessary for tiny docs edits. |
| Atlas 0.2.1-alpha | Yes, on demand | An initial 1,500-budget map rendered 1,492 Atlas-estimated tokens / 5,977 characters. A focused 1,400-budget map rendered 5,474 characters and helped orient the source tree. | Maps rank/omit files. The focused map missed important HTML/CSS/test paths. Installed CLI rejects `atlas doctor` and `--for-agent`; use supported `--budget` and `--focus`. Never treat it as source of truth. |
| `coding-agent-memory-mcp` 1.0.2 | Yes, retrieve only 3–5 entries | Ten short Markdown memories average 76.3 words. Five task queries returned relevant durable decisions (7,092 characters total across the benchmark). | Memory added five calls and 7,092 characters to the one-pass benchmark; it did not improve code-path discovery in that run. Its value is avoiding repeated rediscovery across sessions. Keep Markdown authoritative; do not load the full set. |
| Save-The-Token 0.1.0 | Yes, occasional audits | Read-only scan and instruction evaluation ran. Schema digest evidence measured 255 estimated tokens saved for `node_repl` and 359 for `backyard_memory`. | Its task-routed report was **insufficient**: the Serena runtime probe timed out and compression dropped required AGENTS facts. Estimates include another configured client and are not Codex token usage. Do not claim savings from this report. |
| Repomix 1.18.1 | Yes, on demand | An explicit changed-file include list packaged only the capsule, current handoff, changed files, memories, and governance. The optional package run is stored outside the repo. | Tree-sitter compression applies where parsers support the file type; inspect exact included paths and security findings. Never produce/commit a whole-repository dump. |
| Playwright CLI 0.1.22 + CLI skill | Yes, on demand | Present in the persistent environment for later browser inspection, traces, and screenshots. | Not needed for a docs/tooling-only preflight. It remains outside the project dependencies. |
| Ruflo | No by default | No concrete orchestration problem was found; inline work is sufficient. | Large skill/tool surface and orchestration overhead. Pre-existing global package was not used. |
| Obsidian | Optional human UI | Markdown can be browsed there if desired. | Not required; no paid Sync/Publish service or app dependency. |

### MCP/tool-surface policy

Keep Serena and repository/GitHub access available for implementation and review work. Retrieve Markdown memory only when relevant. Load Playwright/browser tools for visual or browser verification, Vercel for deployment/provenance checks, and Pixi/Spector tools only for isolated WebGL feasibility work. Superpowers systematic debugging and Game Studio playtest remain task-triggered. Avoid duplicating equivalent search surfaces. This environment exposed no general ToolSearch or Ruflo MCP; no user tools were automatically removed.

The local Serena configuration enables only six read-only retrieval tools: project activation, symbol overview, symbol lookup, reference lookup, declaration lookup, and pattern search. The memory server's Codex allowlist enables five operations: search, get, create, update, and list. The latest task-routed Save-The-Token report estimated 5,153 total/selected context tokens across Codex and Claude configuration evidence (0 skipped), and 445 original / 303 compressed instruction tokens. It marked the result **insufficient**, with two missing facts. Its digest measured nine full memory-server schemas at 1,029 estimated tokens / 670 digest, and four `node_repl` schemas at 561 / 306. Serena's runtime probe was not included in the digest after timing out. These are tool-produced estimates, not prompt/token usage measurements; the cross-client total is not Codex-only.

## Benchmark

Five fixed repository questions were evaluated: (A) production Canvas render entry/ownership; (B) pointer coordinates through logical 960×540 mapping to gameplay action; (C) Kevin state, animation, rendering, and projectile ownership; (D) files for desktop theater/HUD safe areas without gameplay changes; and (E) inherited tests Phase 14 must preserve or extend.

Modes: **A** direct Codex-style `rg` navigation; **B** Atlas plus the same searches; **C** Serena semantic retrieval; **D** Atlas plus Serena; **E** Atlas, Serena, and five memory searches. The measured unit is returned characters/tool calls, not model tokens. Search commands did not open files; all modes had zero whole-file reads, so this benchmark cannot demonstrate a whole-file-read reduction.

| Task | A — direct search | B — Atlas + search | C — Serena | D — Atlas + Serena | E — Atlas + Serena + memory |
|---|---|---|---|---|---|
| A: Canvas ownership | Correct: `GameEngine.renderCanvas()` in `src/game.js`, with `render_frame.js`, `renderer_adapter.js`, `main.js`, and Kevin/render paths; 6,697 chars, 8 matched file hits | Correct after normal searches; same search output plus shared 5,474-char map | Correct; 1,849 chars after exact render symbol follow-up | Correct; Serena output plus shared map | Same code findings; plus 1,524 memory-result chars |
| B: pointer to gameplay | Correct: pointer handlers in `src/main.js` → `mapClientToLogicalCoordinates()` in `src/rendering/coordinate_mapper.js` → `GameEngine` input in `src/game.js`; 2,278 chars, 3 matched files | Correct after normal searches; same search output plus shared map | Correct; 3,711 chars including coordinate mapper body | Correct; Serena output plus shared map | Same code findings; plus 1,546 memory-result chars |
| C: Kevin ownership | Correct: `NeighborKevinNPC`/`executeThrow()` and `thrownProjectiles` in `src/npc.js`, plus `src/kevin_animation.js`, `src/kevin_renderer.js`, and game render/state paths; 5,469 chars, 7 matched file hits | Correct after normal searches; same search output plus shared map | Correct; 3,258 chars including throw/projectile follow-ups | Correct; Serena output plus shared map | Same code findings; plus 1,526 memory-result chars |
| D: theater/HUD files | Correct: `index.html`, `src/ui/ui_controller.js`, `style.css`; 4,296 chars, 3 matched file hits | Correct after normal searches; same search output plus shared map | Correct; 1,316 chars | Correct; Serena output plus shared map; map alone omitted some relevant paths | Same code findings; plus 906 memory-result chars |
| E: inherited tests | Correct: Phase 11 accessibility; Phase 12 release smoke/runtime stress; Phase 13 cross-browser, renderer smoke, and visual evidence; 1,972 chars, 6 matched test files | Correct after normal searches; same search output plus shared map | Correct test families found after targeted searches; 3,855 chars | Correct targeted results plus shared map; map alone omitted `phase12_release_smoke` | Same test findings; plus 1,590 memory-result chars |

| Mode | Calls | Returned characters | Whole-file reads | Result |
|---|---:|---:|---:|---|
| A | 5 searches | 20,712 | 0 | Correct files and test families; fewest calls in this run. |
| B | 6 (five searches + map) | 26,186 | 0 | Correct only when ordinary searches filled map omissions. The shared map itself was 5,474 characters. |
| C | 20 including activation (19 semantic retrievals) | 13,989 | 0 | Correct symbol ownership with about 32% fewer returned characters than A, but four times as many navigation calls. |
| D | 20 (19 semantic retrievals + shared map) | 19,463 | 0 | Same semantic precision as C plus map orientation; no call reduction. |
| E | 25 (mode D + five memory searches) | 26,555 | 0 | Preserved code findings and added durable decisions, but raised one-pass context cost. |

These are single-cycle local navigation measurements, not independent agent timing or Codex token statistics. Per-task call counts and stable elapsed time were not captured. Direct search returned more characters for A, C, and D; Serena returned more for B and E. Atlas' shared overhead was not apportioned across tasks. The combined Atlas modes preserved correctness only because exact searches/Serena retrieval followed the map. Mode C shows a useful precision/context tradeoff for code ownership, not universal savings. Topical memory is most useful across separate sessions, not as extra context for every task.

**Token reduction:** `TOKEN COUNT NOT AVAILABLE`. The application did not expose actual context/token statistics. Character counts, Atlas' budget, Save-The-Token estimates, and Repomix tokenizer estimates are distinct proxies and must not be presented as Codex token savings.

## AGENTS.md audit

| Classification | Content |
|---|---|
| Always required | Do not rewrite/force-move `main`; preserve Matter.js authority and semantic DOM UI; avoid unapproved gameplay/monetization tuning; keep reduced motion, touch, and accessibility intact. |
| Phase-specific | Pixi skills/feasibility, AssetPack/raw assets, development-only tools, collision-to-art debug evidence, and controlled screenshot evidence apply when those phases touch them. They remain in root guidance because they are safety/quality gates for visual changes. |
| Historical | The verified v1 production SHA remains explicitly labeled as v1. Current parent/phase SHA belongs in the capsule and exact phase handoff. |
| Duplicated or stale | The old wording could be read as preferring Pixi for production. It was corrected to preserve the Phase 13 decision: Canvas2D remains production; Pixi is feasibility-only unless a reviewed phase changes that decision. |

Before: 1,823 bytes / 360 approximate `o200k_base` tokens. After: 2,296 bytes / 462 tokens by the same Repomix file-only count. The increase is 102 estimated tokens for the corrected Canvas2D production decision and concise retrieval rules. The root file retains its durable architecture and visual-change gates; no critical rule was removed. Save-The-Token's separate task evaluation is insufficient and is not an AGENTS-only measurement.

## Persistent artifacts and startup contract

- `.ai/CURRENT_PHASE_CAPSULE.md`: 2,968 bytes, 415 words, and 627 Repomix `o200k_base` estimated tokens. It records the current locked parent, current branch/phase, renderer decision, gameplay/architecture/accessibility invariants, referral URL, future verification flow, and stop condition. The estimate is under the requested 1,000–1,500-token target; it is not an actual Codex token count.
- `.ai/PHASE_HANDOFF_TEMPLATE.md`: compact external-review fields; 865 bytes at creation.
- Ten Markdown memories under `.memory/memories/`, averaging 76.3 words: production renderer, physics authority, DOM boundary, phase workflow, release verification, browser health, CI WebGL isolation, art-bible summary, current baseline, cross-phase remediation rule. `.memory/index.json` is generated and ignored.
- `.ai/CONTEXT_EFFICIENCY_PREFLIGHT.md`: evidence and decisions for this one-time preflight.
- `scripts/context-preflight.ps1`: read-only tool checks and report generation; optionally probes MCP schemas and creates a file-scoped Repomix review package. Generated maps, reports, and bundles stay outside the repository. It installs nothing and does not write Codex config.
- Generated focused Atlas map: `D:\BionicWorkspace\tools\context-preflight\backyard-havoc-focused-map.md`, 1,400 Atlas-token budget and 5,773 bytes including a navigation-only note. The benchmark's pre-note map was 5,474 characters. It omits some important files, including CSS/HTML and the inherited Phase 12 release smoke test; query exact source/test paths separately.
- A changed-file review bundle was generated outside the repo at `D:\BionicWorkspace\tools\context-preflight\backyard-havoc-review-package.md`. Final file/token/character counts are reported in the task handoff because the bundle includes this document and therefore changes when this document changes. It contains the capsule/template/current report, governance, memories, and changed files; it is not committed.

Future phase start: read root `AGENTS.md`, capsule, exact active prompt, one 1,000–1,500 Atlas-budget focused navigation map, and only the top 3–5 relevant memories. Fetch source symbols/callers/tests on demand; search CSS/HTML and test inventories directly. Future completion: update capsule, add only durable memory, regenerate the focused map, create a changed-file-only Repomix bundle, and provide exact-head CI/artifact/Preview provenance required by that phase.

## Verification and limits

- `npm ci`: passed; installed 349 packages. npm reported 9 dependency audit findings (3 moderate, 5 high, 1 critical), which this tooling-only task does not change.
- `npm test`: passed, 36 files / 324 tests.
- `npm run build`: passed; remaster-asset prebuild and Vite production build completed.
- E2E: not required/run because this branch changes only docs, ignore patterns, and a local preflight script; no runtime or build configuration changed.
- Production/runtime files changed: **No**.
- Phase 14 implementation started: **No**.
- External tool installs/configuration are user-local and are not committed. Serena/MCP configuration has been validated but Codex may need a restart to load new hooks or memory tools.
- The Save-The-Token routed report was insufficient; use its findings as measurement evidence only, not proof of savings. No actual Codex context-token reduction was measurable in this environment.
- The source-navigation benchmark shows about 32% fewer returned characters with Serena overall, but it used more retrieval calls, and every mode avoided whole-file reads. This does not establish substantial end-to-end Codex context savings; verify against future phase work rather than promising a reduction now.
