# PRISM v11 Standalone .cps — Feature Assessment + Two-Tier Plan (slot:echo, 2026-05-29)

**Source file:** `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps` (19,264 lines, 795 KB; mirror at `mcp-server/data/posts/prism-enhanced/`). Sibling: `HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps` (865 KB).

**Operator ask:** build TWO post tiers — a **cheap standalone `.cps`** (no add-in, manual tool-pocket entry, packed with as much PRISM intelligence as fits, auto speed/feed from cut params) and a premium tier. Consolidate the multiple overlapping feed multipliers into **ONE "PRISM Paths" adaptive feed**. Everything enable/disable-able. This doc = the assessment + what to add.

---

## 0. What this file IS (key framing)
It is **already the cheap tier**: a self-contained Fusion/HSMWorks post — pure embedded JavaScript, **zero external/add-in calls, zero MCP**. It runs entirely inside Fusion's post engine. The user enters machine + material + 24 tool pockets by hand; the post does the physics. So Tier-1 is not green-field — it's *consolidate + extend this file*.

## 1. Feature inventory — 608 properties across 24 groups, 72 enable/disable toggles

| Group | #props | What it covers |
|-------|-------|----------------|
| `prismMachine` | 16 | **~150-machine auto-fill** (RPM, power-HP, torque, taper/interface, gear range, rigidity class, age/condition, coolant pressure+volume). Custom-entry fallback. |
| `prismMaterial` | 9 | Material/stock, prove-out (first-article), show-material-calcs. |
| `prismPocket01..24` | **24 × 20 = 480** | **Manual tool-pocket entry** — per T1..T24: type, dia, flutes, material, coating, stickout/body-length, indexable-insert flag, etc. THIS is the "tool pockets where the user puts in their info." |
| `prismOptimization` | 16 | Chip-thin formula (auto), **Variable RPM** (mode + max ↑20%/↓30%), **Apply-PRISM-Calculations** (smart), **Enable-PRISM-Intelligence** master switch, unit + 5 display-format enums. |
| `preferences` | 50 | Output/behavior toggles — safe-start, warm-up, min-Z retract, parametric feed, smoothing, UltiMotion, tribal-citation comments, CI95 comments, chip conveyor, washdown, force-feed, **usePrismEnhancedFeed**, **adaptiveDepthFeedAdjust**, **useDynamicDepthFeed**. |
| `prismLightsOut` | 8 | Sister-tool support, tool-break detection, Z-retract protection (M90/M91). |
| `formats` | 12 | ISNC/BNC, write-machine/tools, notes, est-time, op-strategy, feed-comments, optimization-notes. |
| `multiAxis` | 5 | Tilt pref, ABC pre-position, DPM feeds. |
| `homePositions` | 7 | Tool-change XY, M140, min-Z retract. |
| `prismDrilling` | 2 | **Exclude-drilling-from-multipliers** + scope. |
| `probing` | 2 | G54.4, single results file. |

**Hurco-specific embedded:** G05.3 smoothing (rough P35 / finish P10), UltiMotion G64 per-op tolerance, M16 auto-buffering, M98 air-thru-spindle subprogram, M140 Z-retract, chip conveyor M59/M61, washdown M68/M69.

**Embedded "beat-a-calculator" intelligence already present:** stickout/deflection (L/D from body length — v11 Bug-21 fix), chip-thinning comp, ae/LOC max-safe-engagement derate, axial-depth factor, 3D-adaptive factor, hardness→speed factor, G-force corner limit, arc-feed correction, feed ramping, 8-level aggressiveness, variable-RPM, speed-up suggestions + warnings as G-code comments, est cycle time, tribal-tip citations, CI95 confidence intervals.

## 2. The feed-multiplier redundancy (→ consolidate to ONE "PRISM Paths")

**Today there are TWO overlapping orchestrators + 6 standalone factor fns** — the operator's "multiple multipliers that all do relatively the same thing":

- **Orchestrator A — `calculateOptimizedFeed()` (L15850)** = geometry chain: `stickoutFactor × chipThinningFactor × axialDepthFactor × adaptive3DFactor`, gated by `prismEnableIntelligence`, with `calculateMaxSafeAe()` ae/LOC safety derate, and an "adaptive ops: only apply INCREASES" rule.
- **Orchestrator B — `applyPrismEnhancedFeed()` (L15152)** = motion chain (toggle `usePrismEnhancedFeed`): arc-feed + feed-ramping + G-force corner + aggressiveness.
- **Standalone factor fns:** `calcHardnessSpeedFactor` (L13645), `getPrismGForceLimitedFeed` (L14173), `calculateArcFeedFactor` (L15019), `applyFeedRamping` (L15103), `getPrismAggressivenessLevelFactor` (L14996), `calculateChipThinningFactor` (L15388), `calculateDynamicDepthFeed` (L15736), `calculate3DAdaptiveFactor` (L15795), generic `applyFeedMultiplier` (L14935), clamp `applyFeedLimits` (L14963).

**Overlap/conflict risk:** `calculateDynamicDepthFeed` vs `calculateAxialDepthFactor` vs `adaptiveDepthFeedAdjust`/`useDynamicDepthFeed` toggles all touch axial-depth feed; A and B can both touch the same base feed depending on toggles → order-dependent, hard to reason about, double-counting possible.

### Proposed: `prismPaths(baseFeed, ctx) → {feed, factors[], notes[]}`
One deterministic ordered pipeline, each stage a named factor with its OWN enable toggle, one master `prismPathsEnable`:
```
1. material/hardness base      (calcHardnessSpeedFactor)
2. chip-thinning               (calculateChipThinningFactor)        [geometry]
3. axial-depth / LOC engagement(calculateAxialDepthFactor)          [geometry]
4. 3D-adaptive light-cut boost (calculate3DAdaptiveFactor)          [geometry]
5. stickout/deflection clamp   (calculateStickoutFactor)            [safety, ≤1]
6. ae/LOC max-safe derate      (calculateMaxSafeAe)                 [safety, ≤1]
7. arc-feed correction         (calculateArcFeedFactor)             [motion]
8. corner G-force limit        (getPrismGForceLimitedFeed)          [motion, ≤1]
9. direction-change ramp       (applyFeedRamping)                   [motion]
10. aggressiveness scalar      (getPrismAggressivenessLevelFactor)  [global]
11. machine power/torque clamp (NEW — see §3.1)                     [safety, ≤1, hard]
12. absolute feed limits       (applyFeedLimits)                    [clamp]
```
Rules: geometry/global stages may raise OR lower; safety stages can only LOWER (factor ≤ 1) and are never skippable in non-prove-out; one `combinedFactor` = product; one notes[] stream. Single source of truth, every multiplier independently enable/disable, no dual-orchestrator double-count. **This is "PRISM Paths."** Behavior-preserving refactor (same factor math, one ordered home).

## 3. What to ADD / fit in (candidates — DECIDE)
A standalone .cps can't call MCP, so the leverage is **more embedded physics** (machine specs are already entered → we can do real force/power, which a generic calculator never does):

1. **§3.1 Kienzle power/torque guard (HIGH VALUE)** — compute cutting force + spindle power/torque from kc1.1 (canonical ISO P1800/M2100/K1100/N700/S2800/H3200) × MRR, clamp feed so the op never exceeds the entered HP/torque. *This is the single biggest "beats a calculator" win* — a calculator ignores YOUR machine's power. ~150 lines.
2. **Taylor tool-life advisory** — flag ops exceeding target tool life at the chosen SFM; suggest SFM for a target life. ~80 lines.
3. **Full embedded material table** — ISO P/M/K/N/S/H starting SFM + chipload-by-diameter so auto-gen works from cut params alone even with sparse pocket entry. ~table data.
4. **Drill-cycle speed/feed + peck strategy** — peck depth/retract from depth:dia; the drilling group exists but is thin.
5. **Coolant strategy by op/depth** — TSC pressure recommendation from hole depth (machine coolant specs already entered).
6. **Setup-sheet header block** — per-tool pocket summary + stock + WCS as top-of-file comment (parts of this exist via est-time/strategy comments).

**Constraint — "fit in":** Fusion parses the whole .cps each post; 19 K lines / 795 KB is already large. Every add costs parse time + bytes. So §3 is a *budget* — pick the highest-ROI adds. My ranking: **§3.1 power/torque guard ≫ §3.3 material table > §3.2 Taylor > §3.4 drill > §3.5 coolant > §3.6 setup sheet.**

## 4. Two-tier strategy
- **Tier 1 — CHEAP (this file, consolidated):** standalone .cps, manual machine + 24 pockets + material, ONE `prismPaths` adaptive feed, full enable/disable, embedded Kienzle power guard. No add-in, no licensing dependency. Beats a calculator because it knows machine specs + material + geometry + does real physics, per-op.
- **Tier 2 — PREMIUM (add-in / live PRISM):** the .cps becomes a thin client to `cam_speedfeed_compute` + `PostProcessorPipelineEngine` (7-phase physics+safety) + live 41,495-tool DB (auto-fills pockets instead of manual) + closed-loop reward harness (`scripts/post-gen-reward.mjs`) + tribal injection + real-time optimization. Same toggle names so a shop can upgrade Tier-1→Tier-2 without relearning.

## 5. Open decisions (operator)
- **D1:** Consolidate the 10+ feed fns into one `prismPaths` pipeline (§2)? (behavior-preserving de-dup + per-factor toggles)
- **D2:** Which §3 adds to fit into Tier-1? (recommend at least §3.1 power/torque guard + §3.3 material table)
- **D3:** Confirm the Tier-1 (this .cps) / Tier-2 (add-in) split (§4) — and is Tier-1 Hurco-only first, or genericize the 150-machine auto-fill so one .cps serves any 3-axis mill?

## 6. Build plan + status (operator decisions locked 2026-05-29: D1=consolidate, D2=all-4-adds, D3=Hurco-first)
Built as a tested pure-node core FIRST (zero risk to the 795 KB production .cps); the .cps inline is gated on an NC-diff equivalence check.

- **Unit 1 — SHIPPED** ✅ `scripts/prism-paths-feed.mjs` + `.test.mjs` (15 node:tests). The unified `prismPaths(baseFeed, ctx, opts)` ordered pipeline (12 stages, per-stage enable toggles, safety-only-lowers invariant, prove-out skip rule) + the **Kienzle power/torque guard** (the #1 add): canonical kc1.1/mc parsed from `constants.ts` (drift-test-caught), exact sublinear-feed clamp `factor=(avail/Pc)^(1/(1-mc))` since `Pc ∝ feed^(1-mc)`. The 9 pre-existing geometry/motion factors are registered as PORT-PENDING stages.
- **Unit 2a — SHIPPED** ✅ (commit 3cad76b9b3) Ported 4 factors with EXACT v11 math + equivalence tests (20 total): `chipThinningFactor` (L15388, cap 1.5), `hardnessSpeedFactor` (L13645, HRC derate table), `aggressivenessFactor` (L14996, L1→0.5/L8→1.0), `stickoutDeflectionFactor` (L15332, safety ≤1). Faithful to .cps property defaults (maxChipThinningMultiplier 1.5, maxStickoutRatio 4.0, finishingStickoutTolerance 6.0).
- **Unit 2b — SHIPPED** ✅ (commit 04a5c019f8) Ported the 3 remaining **op-level** factors with exact math: `axialDepthFactor` (L15552, DOC-vs-D + LOC-engagement safety override, faithful adaptive-only-override quirk), `adaptive3DFactor` (L15795, raise-only on light radial engagement), `aeMaxSafeFactor` (L15478, ae/LOC feed-derate K=0.35/n=1.5). **Per-op `prismPaths` pipeline is now COMPLETE — 8 live stages, 0 port-pending.** 7 equivalence tests (25 total).
  - **Architectural correction (R12):** the other 3 (`getPrismGForceLimitedFeed`, `calculateArcFeedFactor`, `applyFeedRamping`) are **per-MOVE**, not per-op — they need per-segment data (arc radius, corner angle, prev feed, segment length) only available at NC-emit time. They were SPLIT OUT into `PRISM_PATHS_MOTION_FACTORS` → a separate `prismPathsMotion(feed, moveCtx)` (Unit 2c). This is the *correct* consolidation: the v11 .cps conflated per-op (`calculateOptimizedFeed`) with per-move (`applyPrismEnhancedFeed`); PRISM Paths separates them into two honest layers.
- **Unit 2c — NEXT** ⏳ Build `prismPathsMotion(feed, moveCtx)` — port `calculateArcFeedFactor` (L15019, clean), `applyFeedRamping` (L15103, clean), and the corner G-force model behind `getPrismGForceLimitedFeed` (needs the `PRISM_GFORCE` object — getMaxFeedForSegment/needsDeceleration/getCornerFactor — a larger extraction). Per-move, applied at onLinear/onCircular.
- **Unit 3** ⏳ §3.3 full ISO P/M/K/N/S/H material table + §3.2 Taylor tool-life advisory (taylor_C/taylor_n already in constants.ts MATERIAL table) + §3.4 drill cycles/coolant — as pipeline stages/data.
- **Unit 4** ⏳ INLINE the validated core into a Hurco Tier-1 .cps: generate the embedded `prismPaths` JS from this module + a one-time NC-diff vs `HURCO_VM30i_PRISM_v11.cps` on real toolpaths to prove behavior-preserving before replacing. Wire the enable/disable toggles to the existing `properties` keys. **Never edit the production .cps blind.**
- **Unit 5** ⏳ Fork the controller-agnostic generic 3-axis base (D3 phase 2) once Hurco Tier-1 is proven; Hurco becomes a profile.
- **Tier-2** ⏳ add-in imports `prism-paths-feed.mjs` directly + composes the live PRISM pipeline (cam_speedfeed_compute, 41,495-tool auto-fill, reward harness).

— slot:echo claude-223d9a61, 2026-05-29. Source: structural parse of HURCO_VM30i_PRISM_v11.cps (properties block L471, feed orchestrators L15152/L15850).
