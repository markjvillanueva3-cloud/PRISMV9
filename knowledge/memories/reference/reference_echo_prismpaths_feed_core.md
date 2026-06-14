---
name: reference_echo_prismpaths_feed_core
description: "Two-tier post strategy + unified PRISM Paths feed pipeline. scripts/prism-paths-feed.mjs (Unit 1, commit 43b0687eb5) = framework + Kienzle power/torque guard. Consolidates the v11 .cps's 2 overlapping feed orchestrators. Assessment: V11-CPS-FEATURE-ASSESSMENT-2026-05-29-echo.md."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.098Z
aliases: reference_echo_prismpaths_feed_core
---


Operator (2026-05-29) wants TWO post tiers: a **cheap standalone .cps** (no add-in, manual 24 tool-pocket entry, max embedded PRISM physics, auto speed/feed from cut params) + a premium add-in tier. The v11 file `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps` (19,264 lines / 795 KB) **IS already the cheap tier** — pure embedded JS, zero MCP/add-in calls.

**Assessment (`state/shared/specs/V11-CPS-FEATURE-ASSESSMENT-2026-05-29-echo.md`):** 608 properties / 24 groups / 72 enable-disable toggles. Structure: 24 tool pockets (`prismPocket01..24` × 20 fields = 480 props, the manual-entry surface) + machine(16, ~150-machine auto-fill) + material(9) + optimization(16) + preferences(50) + lightsOut(8) + drilling(2) + multiAxis(5) + homePositions(7) + probing(2) + formats(12).

**The redundancy the operator spotted:** TWO overlapping feed orchestrators — `calculateOptimizedFeed()` (L15850, geometry: stickout×chipThin×axial×3Dadaptive) + `applyPrismEnhancedFeed()` (L15152, motion: arc+ramp+gforce+aggressiveness) — plus 6 standalone factor fns. Order-dependent, double-count-prone.

**Operator DECISIONS (locked):** D1 = consolidate into ONE `prismPaths` pipeline. D2 = fit ALL FOUR adds (Kienzle power/torque guard, full ISO P/M/K/N/S/H material table, Taylor tool-life advisory, drill cycles+coolant). D3 = finish Hurco v11 first as baseline, then fork a generic 3-axis base.

**Unit 1 SHIPPED (commit `43b0687eb5`):** `scripts/prism-paths-feed.mjs` + `.test.mjs` (15 node:tests). Built as a tested pure-node core FIRST — **production .cps untouched** (the inline is Unit 4, gated on an NC-diff equivalence check; never edit the 795 KB production file blind). Contents: `prismPaths(baseFeed, ctx, opts)` ordered 12-stage pipeline (per-stage enable toggles; SAFETY stages can only LOWER feed + are non-skippable outside prove-out; combinedFactor = product) + the **Kienzle power/torque guard** (`kienzlePowerTorqueGuard`) — the #1 "beats-a-calculator" add: clamps feed to the entered spindle HP/torque. **Key physics:** Pc ∝ feed^(1-mc) (SUBLINEAR — chip-thinning feedback), so the exact clamp is `factor=(avail/Pc)^(1/(1-mc))`, NOT naive avail/Pc (which under-clamps). kc1.1/mc parsed from `mcp-server/src/physics/constants.ts` CANONICAL_KIENZLE at load (never inlined; drift test-caught). The 9 existing factors are PORT-PENDING stages.

**Unit 2a+2b SHIPPED (commits 3cad76b9b3 + 04a5c019f8):** all 8 OP-LEVEL factors ported from the v11 .cps with EXACT math + equivalence tests (25 total node:tests pass). Live stages: hardnessSpeed (HRC derate table), chipThinning (cap 1.5), axialDepth (DOC + LOC-engagement safety override, faithful adaptive-only quirk), adaptive3D (raise-only light engagement), stickoutDeflection (safety ≤1), aeMaxSafe (ae/LOC derate K=0.35/n=1.5), aggressiveness (L1→0.5/L8→1.0), powerTorqueGuard (Kienzle). **0 port-pending.**

**ARCHITECTURAL SPLIT (R12 honesty):** the 3 motion factors (`getPrismGForceLimitedFeed`, `calculateArcFeedFactor`, `applyFeedRamping`) are **per-MOVE** (need per-segment arc radius / corner angle / prev feed / segment length, only at NC-emit time) — NOT op-level. SPLIT OUT into `PRISM_PATHS_MOTION_FACTORS` → a separate `prismPathsMotion(feed, moveCtx)` layer (Unit 2c). The v11 .cps conflated per-op (calculateOptimizedFeed) with per-move (applyPrismEnhancedFeed); PRISM Paths = two honest layers.

**TWO BASE POSTS (operator: "get the 2 base posts going"):** home `mcp-server/data/posts/prism-base/`.
- **U-BASE-1 SHIPPED (395c0d9bd0):** shared no-drift feed core `prism-paths-feed.cps` — ES5 Fusion-includable mirror of the .mjs; `scripts/prism-paths-cps-equivalence.test.mjs` (6 tests) proves `.cps`===`.mjs` numerically + baked-kc===constants.ts. The keystone BOTH posts `include()`.
- **U-BASE-2 SHIPPED (eaa59315a4):** Tier-1 CHEAP standalone `PRISM-Base-Hurco-3Axis.cps` — real Fusion post; include()s the core; computes per-op prismPaths multiplier in onSection (needs `operation:tool_feedCutting` for the power guard — fixed a feed=0 bug where the guard silently never fired); applies to F in onLinear. Headless harness `scripts/prism-base-hurco.test.mjs` (7 tests, node:vm Fusion-API stub) → lint-clean Hurco NC + safety/material variability.
- **38 tests green** across the 3 echo suites (25 core + 6 equiv + 7 base post).
- **NEXT U-BASE-3 (Tier-2 full add-in):** Fusion 360 Python add-in (`prism-base/addin/`: manifest + entry + prism_client.py HTTP→:3100 bridge) auto-filling tool/material/feed-speed from live PRISM into a paired add-in-fed .cps variant. **OPEN Q:** confirm Fusion (vs hyperMILL/Mastercam). Then U-BASE-4 generic base, Unit 2c motion layer, Unit 3 material-table/Taylor. See [[reference_echo_post_data_corpus_paths]].
