---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Tool wear + tool life: Taylor / Archard / Bayesian"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.831Z"
last_ts: "2026-06-19T15:12:19.611Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 30
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a5d1c37a4dc552615.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Tool wear + tool life: Taylor / Archard / Bayesian

> **claude-code-cli** | 2026-06-19 | 66 msgs (30 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a5d1c37a4dc552615.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.831Z

SFC WIRING AUDIT -- category: Tool wear + tool life: Taylor / Archard / Bayesian / stochastic / Weibull.
The SFC calc path = these 3 orchestrators (all H:/prism/mcp-server/src/engines/):
  - UltimateSpeedFeedEngine.ts (core calculate(); 31 models; the physics hub)
  - SpeedFeedNineAxisOrchestratorEngine.ts (9-axis run(); clamps; ROI popup)
  - SpeedFeedOrchestratorEngine.ts (central hub ~2851 LOC, 67 integration points)
plus the dispatcher (src/tools/dispatchers/calcDispatcher.ts speed_feed / sfc_* / ultimate_speed_feed actions) and REST (src/routes createSfcRouter -> /api/v1/sfc) + web (web/src/types/sfc.ts).

WIRING DEFINITION: an engine/algorithm is WIRED into the SFC iff its exported singleton/class is imported AND CALLED by one of the 3 orchestrators above (grep its export name in those files and confirm a call site, not just an import), OR it is reachable via a prism_calc speed_feed/sfc_*/ultimate_speed_feed dispatcher action. CLASSIFY each asset:
  - WIRED: consumed in the SFC calc path (cite the call site file:line).
  - UNWIRED-BUT-APPLICABLE: physically relevant to a speed/feed recommendation but NOT consumed by any SFC orchestrator or SFC dispatcher action -> a functional gap; say WHERE it should wire.
  - DEAD/NA: not SFC-applicable (lathe-toolpath-only, post-processor-only, EDM, business) OR a stub/duplicate -> exclude with one-line reason.
Be exact with file:line. Mechanical grep + classify; flag judgment calls for synthesis.

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "Wear|ToolLife|Taylor|Archard|Weibull|Bayesian.*Life|StochasticTool|FederatedTool|AdvancedWear" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site (WIRED) or the recommended wire target (UNWIRED-BUT
... [+272 chars truncated]

### Assistant | 2026-06-19T15:06:25.631Z

I'll perform a systematic grep to find all matching assets, then read the actual call sites to classify each one.

### Assistant | 2026-06-19T15:06:27.245Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:28.127Z

[tool_use: Bash]

### User | 2026-06-19T15:06:47.009Z

[tool_result] <persisted-output>
Output too large (44.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bso2817r9.txt

Preview (first 2KB):
mcp-server/src/algorithms/AdaptiveControllerModel.ts
mcp-server/src/algorithms/BayesianWearModel.ts
mcp-server/src/algorithms/ChipTypePredictionModel.ts
mcp-server/src/algorithms/ClimbConventionalPicker.ts
... [+1799 chars truncated]

### User | 2026-06-19T15:06:47.820Z

[tool_result] 860

### Assistant | 2026-06-19T15:06:51.120Z

The file count is very large (860 matches due to broad name matching). Let me narrow to files that are actually SFC-category relevant by name/content, then read the three orchestrators.

### Assistant | 2026-06-19T15:06:54.258Z

[tool_use: Bash]

### User | 2026-06-19T15:07:04.430Z

[tool_result] <persisted-output>
Output too large (49.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bsopoeum0.txt

Preview (first 2KB):
mcp-server/src/algorithms/AdaptiveControllerModel.ts
mcp-server/src/algorithms/BayesianWearModel.ts
mcp-server/src/algorithms/ChipBreakingModel.ts
mcp-server/src/algorithms/ChipThinningCompensation.ts
mcp-
... [+1788 chars truncated]

### Assistant | 2026-06-19T15:07:08.753Z

[tool_use: Bash]

### User | 2026-06-19T15:07:25.143Z

[tool_result] mcp-server/src/algorithms/BayesianWearModel.ts
mcp-server/src/algorithms/CoolantVcModifier.ts
mcp-server/src/algorithms/ExtendedTaylorModel.ts
mcp-server/src/algorithms/HardnessToVcInverter.ts
mcp-server/src/algorithms/JointSpeedFeedOptimizer.ts
mcp-server/src/algorithms/ToolLifeEconomicReplacementFormula.ts
mcp-server/src/algorithms/ToolWearPrediction.ts
mcp-server/src/algorithms/UsuiWearModel.ts
... [+6050 chars truncated]

### Assistant | 2026-06-19T15:07:28.293Z

Good, now I have the definitive list. Let me read the three orchestrators to find all actual imports and call sites.

### Assistant | 2026-06-19T15:07:31.035Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:32.173Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:32.963Z

[tool_use: Bash]

### User | 2026-06-19T15:07:42.081Z

[tool_result] 50:import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
65:import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";

### User | 2026-06-19T15:07:43.530Z

[tool_result] 30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
35:import { CANONICAL_TAYLOR, CANONICAL_TOOL_MODULUS, CANONICAL_MATERIAL_DB, CANONICAL_KIENZLE } from "../physics/constants.js";

### User | 2026-06-19T15:07:44.237Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:07:47.758Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:47.858Z

[tool_use: Bash]

### User | 2026-06-19T15:07:58.628Z

[tool_result] 50:import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
65:import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";
1048: * Delegates to `ExtendedTaylorModel.calculate({ inline_compat: true })` for the
1083:    const out = ExtendedTaylorModel.calculate({
1118: * Exposes ExtendedTaylorModel's full extended form (inline_compat:false) — coating
1163:  const out
... [+318 chars truncated]

### User | 2026-06-19T15:07:58.941Z

[tool_result] 30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
50:  return stochasticToolLifeEngine as any;

### Assistant | 2026-06-19T15:08:01.753Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:02.491Z

[tool_use: Bash]

### User | 2026-06-19T15:08:13.418Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:08:14.144Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:08:16.646Z

[tool_use: Bash]

### User | 2026-06-19T15:08:32.792Z

[tool_result] 30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
49:function getStochasticToolLifeEngine(): any {
50:  return stochasticToolLifeEngine as any;
1892:   * @reference StochasticCuttingForceEngine, StochasticToolLifeEngine, StochasticChatterEngine
2059:    // ── Try StochasticToolLifeEngine for Weibull MLE, fall back to method-of-moments ──
2065:    const stlEngine = getSto
... [+212 chars truncated]

### Assistant | 2026-06-19T15:08:36.263Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:37.210Z

[tool_use: Bash]

### User | 2026-06-19T15:08:52.081Z

[tool_result]     const raMean = ras.reduce((s, v) => s + v, 0) / n_trials;
    const ci2_5 = Math.floor(n_trials * 0.025);
    const ci97_5 = Math.floor(n_trials * 0.975);

    // ── Try StochasticToolLifeEngine for Weibull MLE, fall back to method-of-moments ──
    let weibullBeta = 0;
    let weibullEta = 0;
    let pSurvive30 = 0;
    let usedSTLEngine = false;

    const stlEngine = getStochasticToolLifeEn
... [+1241 chars truncated]

### User | 2026-06-19T15:08:53.885Z

[tool_result] 26:import { z } from "zod";
27:import { log } from "../utils/Logger.js";
28:import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
29:import { monteCarloEngine } from "./MonteCarloEngine.js";
30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
31:import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
32:import type { RuleCategory } fro
... [+2042 chars truncated]

### Assistant | 2026-06-19T15:08:56.053Z

Now let me check the algorithms index and other key assets:

### Assistant | 2026-06-19T15:08:59.456Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:00.539Z

[tool_use: Bash]

### User | 2026-06-19T15:09:13.944Z

[tool_result] 23:export { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
24:export type { TaylorInput, TaylorOutput } from "./ExtendedTaylorModel.js";
49:import { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
76:  taylor: ExtendedTaylorModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

### User | 2026-06-19T15:09:17.792Z

[tool_result] /**
 * Bayesian Wear Prediction Model
 *
 * Uses conjugate normal-normal Bayesian update to refine tool wear
 * predictions from observed data:
 *   posterior_precision = prior_precision + n / sigma_like^2
 *   posterior_mean = (prior_prec x mu_0 + like_prec x x_bar) / post_prec
 *
 * This progressively narrows uncertainty as more wear observations arrive,
 * enabling predictive maintenance and ad
... [+2904 chars truncated]

### Assistant | 2026-06-19T15:09:22.010Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:24.861Z

[tool_use: Bash]

### User | 2026-06-19T15:09:34.421Z

[tool_result] /**
 * ToolLifeEconomicReplacementFormula — total-cost-of-ownership (TCO)
 * break-even for cutting tools (hotel iter15, 2026-05-24,
 * U-TOOL-LIFE-ECON-REPLACE).
 *
 * Closes G10 from the ERP-comparison audit. Sibling formula to Gilbert 1950
 * (minimum-cost cutting velocity, already shipped at
 * `gilbert-econ-speed-wire`); this one is the *per-tool* economic-life
 * decision — given a tool's pu
... [+2491 chars truncated]

### User | 2026-06-19T15:09:42.087Z

[tool_result] mcp-server/src/engines/UltimateSpeedFeedEngine.ts:52:// algorithm 8.5) into the main SFC engine. tango built CoolantVcModifier (6 ISO × 5 coolant
mcp-server/src/engines/UltimateSpeedFeedEngine.ts:55:import { getMultipliers as getCoolantVcMultipliers } from "../algorithms/CoolantVcModifier.js";
mcp-server/src/engines/UltimateSpeedFeedEngine.ts:2103:    // coolant: reuses CoolantVcModifier (algo 8.5
... [+45 chars truncated]

### Assistant | 2026-06-19T15:09:46.231Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:47.506Z

[tool_use: Bash]

### User | 2026-06-19T15:09:57.466Z

[tool_result] 52:// algorithm 8.5) into the main SFC engine. tango built CoolantVcModifier (6 ISO × 5 coolant
55:import { getMultipliers as getCoolantVcMultipliers } from "../algorithms/CoolantVcModifier.js";
2103:    // coolant: reuses CoolantVcModifier (algo 8.5); explicit-only (base Vc already assumes the

### User | 2026-06-19T15:09:59.055Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:10:03.077Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:04.476Z

[tool_use: Bash]

### User | 2026-06-19T15:10:14.558Z

[tool_result] 52:// algorithm 8.5) into the main SFC engine. tango built CoolantVcModifier (6 ISO × 5 coolant
55:import { getMultipliers as getCoolantVcMultipliers } from "../algorithms/CoolantVcModifier.js";
2103:    // coolant: reuses CoolantVcModifier (algo 8.5); explicit-only (base Vc already assumes the
2113:      coolantFactor = getCoolantVcMultipliers({ iso_group: effectiveIso, coolant: algoCoolant }).vc
... [+18 chars truncated]

### User | 2026-06-19T15:10:16.472Z

[tool_result] 36:  CANONICAL_TAYLOR,
158:  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
274:  tool_life: ToolLifePrediction;
357:    tool_life: { ci_95_low: number; ci_95_high: number; cv_pct: number };
371:    tool_life: number;
424:  taylor_n_carbide: number;
425:  taylor_C_carbide: number;
440:    machinability_factor: 0.65, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
450: 
... [+1550 chars truncated]

### Assistant | 2026-06-19T15:10:21.183Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:22.677Z

[tool_use: Bash]

### User | 2026-06-19T15:10:34.284Z

[tool_result] 274:  tool_life: ToolLifePrediction;
371:    tool_life: number;
1887:  label: string; mrr: number; tool_life: number; ra: number; score: number;
1904:    label: p.label, mrr: p.mrr, tool_life: p.life, ra: p.ra,
3006:        tool_life: tlUncertainty,
3139:        tool_life: r.tool_life.life_minutes.value,

### User | 2026-06-19T15:10:35.698Z

[tool_result] 198:  life_minutes: OptimizedValue;
1091:    T_min = out.tool_life_min.value;
1186:    T_min: out.tool_life_min.value,
2425:    const taylorLifeFactor = Math.max(0.01, 1 / taylorN - 1); // (1/n − 1)
2426:    const lifeProdOpt = Math.max(0.1, taylorLifeFactor * toolChangeMin);
2427:    const lifeCostOpt = Math.max(0.1, taylorLifeFactor * (toolChangeMin + toolCostPerEdgeUsd / machineRateUsdPerMin));
... [+907 chars truncated]

### Assistant | 2026-06-19T15:10:39.198Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:39.806Z

[tool_use: Bash]

### User | 2026-06-19T15:10:56.849Z

[tool_result]         thermal_damage_risk: thermalRisk,
      },

      surface_finish: {
        theoretical_ra_um: ov(roundSig(Ra_theoretical, 3), "µm", 0.85, "calculated", `Ra = f² / (32 × r)`),
        practical_ra_um: ov(roundSig(Ra_practical, 2), "µm", 0.55, "calculated", `Ra_practical ≈ ${practicalFactor}× theoretical`),
        ...(scallop ? { scallop_height_um: scallop } : {}),
      },

      tool_lif
... [+572 chars truncated]

### User | 2026-06-19T15:10:56.964Z

[tool_result]       ? Math.max(5, 300 / thermalOverloadRatio)
      : thermalRisk === "high"
        ? 300
        : thermalRisk === "moderate"
          ? 450
          : Number.POSITIVE_INFINITY;
    // STEP 14N (computed early): runout/TIR derates tool life so ALL consumers
    // (cost/part @14D, three-zone wear @14O, Monte-Carlo, headline life_minutes) see
    // ONE self-consistent runout-derated life. TI
... [+608 chars truncated]

### Assistant | 2026-06-19T15:10:59.896Z

I have enough data from the orchestrator reads. Let me do the remaining targeted lookups for the engine assets, then compile the final table.

### Assistant | 2026-06-19T15:11:05.289Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:11:07.278Z

[tool_use: Bash]

### User | 2026-06-19T15:11:16.430Z

[tool_result] mcp-server/src/engines/UltimateSpeedFeedEngine.ts:26: *   ToolWearRate (Taylor), AdvancedChipThickness, EngagementGeometry
mcp-server/src/engines/UltimateSpeedFeedEngine.ts:31:import { log } from "../utils/Logger.js";
mcp-server/src/engines/UltimateSpeedFeedEngine.ts:32:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
mcp-server/src/engines/UltimateSpeedFeedEngine.ts:33:import {
mcp-s
... [+4595 chars truncated]

### User | 2026-06-19T15:11:18.204Z

[tool_result] ==> mcp-server/src/engines/ArchardAdhesiveWearEngine.ts <==
/**
 * ArchardAdhesiveWearEngine — Archard (1953) Adhesive Wear Law Implementation
 *
 * Implements the Archard wear equation for predicting tool wear volume and flank
 * wear (VB) based on normal load, sliding distance, and material hardness.

==> mcp-server/src/engines/TribologyEngine.ts <==
/**
 * TribologyEngine — Tribological analys
... [+1712 chars truncated]

### Assistant | 2026-06-19T15:11:20.722Z

I have enough data to compile the final table. Let me do one final targeted check then produce the output.

### Assistant | 2026-06-19T15:11:26.223Z

[tool_use: Bash]

### User | 2026-06-19T15:11:36.710Z

[tool_result] mcp-server/src/engines/UltimateSpeedFeedEngine.ts:26: *   ToolWearRate (Taylor), AdvancedChipThickness, EngagementGeometry
mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts:3509:          sink: "SpeedFeedDeepLearningEngine.recordFeedback → SFCOutcomeCaptureWireEngine (U-SFPSN-09)",

### Assistant | 2026-06-19T15:12:19.611Z

I have sufficient data. Here is the complete classification table.

---

## SFC Wiring Audit — Tool Wear + Tool Life (Taylor / Archard / Bayesian / Stochastic / Weibull)

**Total assets found: 26** (10 algorithms + 16 engines; physics/constants wired inline)

| asset | type | classification | evidence (file:line) | 1-line note |
|---|---|---|---|---|
| `ExtendedTaylorModel` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:50` import; `:1083` `ExtendedTaylorModel.calculate(...)` (inline_compat); `:1163` extended-form call | Core Taylor T=(C/Vc^(1/n)·f^a·ap^b) used for both tool-life output and sensitivity; two call sites |
| `ToolWearPrediction` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:65` import; `:1223` `ToolWearPrediction.predictFlankWearVBCompat(...)` | ISO 3685 three-zone flank wear; called from dedicated wrapper method inside Ultimate |
| `CoolantVcModifier` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:55` import; `:2113` `getCoolantVcMultipliers({iso_group,coolant}).vc_multiplier.value` | Coolant Vc correction (6 ISO × 5 coolant modes) feeds life via Taylor C adjustment |
| `StochasticToolLifeEngine` | engine | **WIRED** | `SpeedFeedOrchestratorEngine.ts:30` import; `:2065` `stlEngine.compute({...method:"weibull"})` with Weibull β/η output | Weibull MLE fit for P(survive 30 min); Monte Carlo fallback when engine unavailable |
| `CANONICAL_TAYLOR` | physics constant | **WIRED** | `SpeedFeedOrchestratorEngine.ts:35`; `UltimateSpeedFeedEngine.ts:36,621-625` | Canonical per-ISO-group (C, n) injected into both orchestrators; inlining is forbidden — correctly imported |
| `BayesianWearModel` | algorithm | **UNWIRED-BUT-APPLICABLE** | Not imported in any of the 3 orchestrators | Conjugate normal-normal Bayesian update of wear predictions; should wire into `SpeedFeedOrchestratorEngine` Monte Carlo loop (≈line 2059) as a prior-update stage after `StochasticToolLifeEngine` |
| `UsuiWearModel` | algorithm | **UNWIRED-BUT-APPLICABLE** | Not impo
... [+5736 chars truncated]
