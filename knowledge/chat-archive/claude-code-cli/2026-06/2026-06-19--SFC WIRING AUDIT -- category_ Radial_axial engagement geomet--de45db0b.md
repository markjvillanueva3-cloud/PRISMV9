---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Radial/axial engagement geometry / adaptive / inst"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.832Z"
last_ts: "2026-06-19T15:11:58.477Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 30
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a35f08f4d8c7418a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Radial/axial engagement geometry / adaptive / inst

> **claude-code-cli** | 2026-06-19 | 64 msgs (30 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a35f08f4d8c7418a1.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.832Z

SFC WIRING AUDIT -- category: Radial/axial engagement geometry / adaptive / instantaneous / CWE / effective-diameter.
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

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "Engagement|CWE|RadialDepth|EffectiveDiameter|InstantaneousEngagement|ArcOfContact" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site (WIRED) or the recommended wire target (UNWIRED-BU
... [+273 chars truncated]

### Assistant | 2026-06-19T15:06:24.081Z

I'll systematically search for all assets matching the engagement/CWE/radial geometry category, then classify each one.

### Assistant | 2026-06-19T15:06:25.674Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:26.662Z

[tool_use: Bash]

### User | 2026-06-19T15:06:47.126Z

[tool_result] mcp-server/src/algorithms/AdaptiveControllerModel.ts
mcp-server/src/algorithms/CWEZBuffer.ts
mcp-server/src/algorithms/ChipBreakingModel.ts
mcp-server/src/algorithms/ChipThinningCompensation.ts
mcp-server/src/algorithms/EffectiveDiameterCompensator.test.ts
mcp-server/src/algorithms/EffectiveDiameterCompensator.ts
mcp-server/src/algorithms/FRFStabilityLobe.ts
mcp-server/src/algorithms/FiveAxisTiltL
... [+11866 chars truncated]

### User | 2026-06-19T15:06:47.143Z

[tool_result] mcp-server/src/algorithms/AdaptiveControllerModel.ts
mcp-server/src/algorithms/CWEZBuffer.ts
mcp-server/src/algorithms/ChipThinningCompensation.ts
mcp-server/src/algorithms/ChipVolumeRate.ts
mcp-server/src/algorithms/CoolantSequenceGenerator.ts
mcp-server/src/algorithms/EffectiveDiameterCompensator.test.ts
mcp-server/src/algorithms/EffectiveDiameterCompensator.ts
mcp-server/src/algorithms/FiveAxis
... [+22828 chars truncated]

### Assistant | 2026-06-19T15:06:51.173Z

Now let me focus on the most directly relevant assets — the dedicated engagement/CWE geometry engines/algorithms — and check their actual wiring in the 3 orchestrators:

### Assistant | 2026-06-19T15:06:55.061Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:56.351Z

[tool_use: Bash]

### User | 2026-06-19T15:07:04.199Z

[tool_result] engines/SpeedFeedOrchestratorEngine.ts:17: *   - EngagementAdaptiveFeedEngine (adaptive chip load)

### User | 2026-06-19T15:07:05.261Z

[tool_result] 3017:            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
3028:            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
3040:            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
3049:            const { engagementGeometryEngine } = await i
... [+1075 chars truncated]

### Assistant | 2026-06-19T15:07:08.678Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:09.922Z

[tool_use: Bash]

### User | 2026-06-19T15:07:22.760Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:07:24.542Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:07:27.205Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:28.883Z

[tool_use: Bash]

### User | 2026-06-19T15:07:37.274Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:07:38.606Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:07:42.351Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:43.187Z

[tool_use: Bash]

### User | 2026-06-19T15:07:52.847Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:07:53.333Z

[tool_result] engines/SpeedFeedOrchestratorEngine.ts:17: *   - EngagementAdaptiveFeedEngine (adaptive chip load)

### Assistant | 2026-06-19T15:07:55.908Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:56.768Z

[tool_use: Bash]

### User | 2026-06-19T15:08:04.952Z

[tool_result] 17: *   - EngagementAdaptiveFeedEngine (adaptive chip load)

### User | 2026-06-19T15:08:05.985Z

[tool_result] 17: *   - EngagementAdaptiveFeedEngine (adaptive chip load)

### Assistant | 2026-06-19T15:08:10.381Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:11.081Z

[tool_use: Bash]

### User | 2026-06-19T15:08:29.644Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:08:29.861Z

[tool_result] engines/SpeedFeedOrchestratorEngine.ts:3925
engines/UltimateSpeedFeedEngine.ts:3498
engines/SpeedFeedNineAxisOrchestratorEngine.ts:1519

### Assistant | 2026-06-19T15:08:37.010Z

[tool_use: Bash]

### User | 2026-06-19T15:08:53.875Z

[tool_result] 76:// the engine should swap from the SDOF lobe estimate to a multi-mode receptance
77:// chain. That swap is U-SFPSN-04-FRF-WIRE-style follow-up.
127:  axial_depth_mm?: number;
128:  radial_depth_mm?: number;
129:  radial_depth_pct?: number;
260:  axial_depth: OptimizedValue;           // ap (mm)
261:  radial_depth: OptimizedValue;          // ae (mm)
722:// Vc in m/min, fz in mm/tooth (base for 
... [+6756 chars truncated]

### Assistant | 2026-06-19T15:08:58.758Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:59.725Z

[tool_use: Bash]

### User | 2026-06-19T15:09:12.757Z

[tool_result] 953:  kc1_1: number, mc: number, ap_mm: number, hex_mm: number,
957:  const h = Math.max(0.001, hex_mm);
975:    chip_width_mm: ap_mm,
1594:  edgeRadius_mm: number, ap_mm: number, kc1_1: number, hex_mm: number,
1601:  const Fc_approx = kc1_1 * ap_mm * Math.max(0.01, hex_mm);
1740:  Fc_N: number, chipThickness_mm: number, chipWidth_mm: number,
1743:  const area = Math.max(0.001, contactLength * chi
... [+1193 chars truncated]

### User | 2026-06-19T15:09:13.979Z

[tool_result] 193:  axial_depth_mm?: number;         // ap
194:  radial_depth_mm?: number;        // ae
195:  radial_depth_pct?: number;       // ae/D ratio
261:  axial_depth_mm: number;
262:  radial_depth_mm: number;
815:      axial_depth_mm: tp.axial_depth_mm,
816:      radial_depth_mm: tp.radial_depth_mm,
817:      radial_depth_pct: tp.radial_depth_pct,
866:    let ap = sfc.axial_depth.value;
867:    let ae 
... [+920 chars truncated]

### Assistant | 2026-06-19T15:09:19.471Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:20.158Z

[tool_use: Bash]

### User | 2026-06-19T15:09:31.530Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:09:31.713Z

[tool_result] /**
 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
 *
 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
 * of inputs and infers all missing parameters using physics-based models,
 * material databases, and empirical lookup tables.
 *
 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
 *   - Partial input inference
... [+3059 chars truncated]

### Assistant | 2026-06-19T15:09:35.691Z

[tool_use: Read]

### Assistant | 2026-06-19T15:09:36.620Z

[tool_use: Bash]

### User | 2026-06-19T15:09:40.252Z

[tool_result] 55	import { getMultipliers as getCoolantVcMultipliers } from "../algorithms/CoolantVcModifier.js";
56	import { GilbertMRRModel } from "../algorithms/GilbertMRRModel.js";
57	import { JaegerTempField } from "../algorithms/JaegerTempField.js";
58	import {
59	  stabilityEstimateCompat,
60	  StabilityLobeDiagram,
61	  type StabilityCompatResult,
62	} from "../algorithms/StabilityLobeDiagram.js";
63	imp
... [+2722 chars truncated]

### User | 2026-06-19T15:09:50.186Z

[tool_result] 26:import { z } from "zod";
27:import { log } from "../utils/Logger.js";
28:import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
29:import { monteCarloEngine } from "./MonteCarloEngine.js";
30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
31:import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
32:import type { RuleCategory } fro
... [+848 chars truncated]

### Assistant | 2026-06-19T15:09:53.849Z

Now I have the import picture. Let me check the remaining key assets and their call sites:

### Assistant | 2026-06-19T15:09:55.402Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:56.495Z

[tool_use: Bash]

### User | 2026-06-19T15:10:04.943Z

[tool_result] 28: * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
42:import {
53:// Canonical Kienzle exponent (mc) per ISO group -- imported, NEVER inlined. The
57:import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
63:import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";
69:import { speedFeedOutcomeFeedbackBridgeEngine } from ".
... [+42 chars truncated]

### User | 2026-06-19T15:10:07.358Z

[tool_result] 3017:            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
3019:            result = engagementGeometryEngine.internalCornerSpike(
3028:            const { engagementGeometryEngine } = await import("../../engines/EngagementGeometryEngine.js");
3030:            result = engagementGeometryEngine.cornerFeedAdjustment(
3040:            const { enga
... [+533 chars truncated]

### Assistant | 2026-06-19T15:10:11.008Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:11.896Z

[tool_use: Bash]

### User | 2026-06-19T15:10:22.208Z

[tool_result] 1548:            const { calculateChipThinning } = await import("../../engines/ToolpathCalculations.js");
1549:            result = calculateChipThinning(params.tool_diameter, params.radial_depth, params.feed_per_tooth, params.number_of_teeth || 4, params.cutting_speed || 150);
3008:              empirical_factor: advancedChipThicknessEngine.chipThinningFactorLookup(ae, Dc),
3009:              the
... [+1058 chars truncated]

### User | 2026-06-19T15:10:22.735Z

[tool_result] 10631:            const { compute } = await import("../../algorithms/EffectiveDiameterCompensator.js");

### Assistant | 2026-06-19T15:10:27.613Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:28.076Z

[tool_use: Bash]

### User | 2026-06-19T15:10:46.352Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:10:47.399Z

[tool_result] engines/AlgorithmWiringEngine.ts:516:    name: "CWEZBuffer",
engines/AlgorithmWiringEngine.ts:517:    file: "CWEZBuffer.ts",
engines/InstantaneousEngagementEngine.ts:543:   * Uses CWEZBuffer algorithm for actual engagement geometry instead of
engines/InstantaneousEngagementEngine.ts:583:      const { CWEZBuffer } = require("../algorithms/CWEZBuffer.js");
engines/InstantaneousEngagementEngine.ts:58
... [+37 chars truncated]

### Assistant | 2026-06-19T15:10:50.232Z

I have enough data now. Let me do the final targeted lookups to complete the classification, then output the table.

### Assistant | 2026-06-19T15:10:51.387Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:54.195Z

[tool_use: Bash]

### User | 2026-06-19T15:11:07.667Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:11:10.925Z

[tool_result] tools/dispatchers/calcDispatcher.ts:5619:            const { ballEndMillEngine } = await import("../../engines/BallEndMillEngine.js");
tools/dispatchers/calcDispatcher.ts:5620:            result = ballEndMillEngine.calculate(params as ValidatedParams);
tools/dispatchers/calcDispatcher.ts:10719:            const { detect } = await import("../../algorithms/GlideCutDetector.js");
tools/dispatchers/ca
... [+124 chars truncated]

### Assistant | 2026-06-19T15:11:58.477Z

I have sufficient data to produce the complete classification. Here is the result:

---

## SFC Wiring Audit — Radial/Axial Engagement Geometry / Adaptive / Instantaneous / CWE / Effective-Diameter

**Scope enumerated:** 17 distinct assets matched (13 engines + 4 algorithms). Test files excluded.

| Asset | Type | Classification | Evidence (file:line) | 1-line note |
|---|---|---|---|---|
| `EngagementGeometryEngine` | Engine | **WIRED** | `calcDispatcher.ts:3017,3019,3028,3030,3040,3041,3049,3050,3059,3060,3069,3070,3079,3080,3086,3088` — 8 dispatcher actions via lazy import + call | Wired to `prism_calc` via 8 sfc_* actions (corner spike, corner feed adj, curved boundary, trochoidal, island approach etc.); NOT imported by any orchestrator directly — dispatcher-only path |
| `AdaptiveEngagementEngine` | Engine | **WIRED** | `calcDispatcher.ts:9101-9102` — `adaptiveEngagementEngine.compute()` called | Wired to `prism_calc` via dispatcher action; NOT consumed by the 3 orchestrators |
| `ChipThinningCompensationEngine` | Engine | **WIRED** | `calcDispatcher.ts:9175-9176` — `chipThinningCompensationEngine.calculate()` called | Wired to `prism_calc` dispatcher; UltimateSpeedFeedEngine also computes chip thinning inline via immersionRatio at `UltimateSpeedFeedEngine.ts:2303-2305` (self-contained inline, not delegated) |
| `EngagementDynamicsEngine` | Engine | **WIRED** | `calcDispatcher.ts:9180-9181` — `engagementDynamicsEngine.calculateSegmentProfile()` called | Wired to `prism_calc` dispatcher; NOT consumed by the 3 orchestrators |
| `EngagementOptimizerAdapter` | Engine | **WIRED** | `calcDispatcher.ts:9189-9191` — `engagementOptimizerAdapter.selectEngagementOrchestrated()` called | Wired to `prism_calc` dispatcher; NOT consumed by the 3 orchestrators |
| `EngagementAdaptiveFeedEngine` | Engine | **UNWIRED-BUT-APPLICABLE** | `SpeedFeedOrchestratorEngine.ts:17` — comment only, no import/call in any orchestrator or dispatcher grep | Listed in orchestrator file-header co
... [+5792 chars truncated]
