---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Tool/part/boring-bar deflection + overlay. The SFC"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.831Z"
last_ts: "2026-06-19T15:12:15.250Z"
cwd: "H:\\prism"
messages: 80
user_msgs: 34
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-ac59cf6d33cdb437c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Tool/part/boring-bar deflection + overlay. The SFC

> **claude-code-cli** | 2026-06-19 | 80 msgs (34 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-ac59cf6d33cdb437c.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.831Z

SFC WIRING AUDIT -- category: Tool/part/boring-bar deflection + overlay.
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

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "Deflection|Deflect" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site (WIRED) or the recommended wire target (UNWIRED-BUT-APPLICABLE).

Output a markdown table: | asset | type | classification | evidence (file:line) | 1-line not
... [+165 chars truncated]

### Assistant | 2026-06-19T15:06:23.733Z

I'll systematically grep for deflection-related assets, then read the actual call sites to classify each one.

### Assistant | 2026-06-19T15:06:24.946Z

[tool_use: Bash]

### User | 2026-06-19T15:06:47.829Z

[tool_result] <persisted-output>
Output too large (31.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\b76hygoml.txt

Preview (first 2KB):
H:/prism/mcp-server/src/algorithms/CWEZBuffer.ts
H:/prism/mcp-server/src/algorithms/ChipThinningCompensation.ts
H:/prism/mcp-server/src/algorithms/FEASolver2D.ts
H:/prism/mcp-server/src/algorithms/FiveAxis
... [+1771 chars truncated]

### Assistant | 2026-06-19T15:06:50.501Z

Let me read the full file list and then check each asset systematically.

### Assistant | 2026-06-19T15:06:53.175Z

[tool_use: Bash]

### User | 2026-06-19T15:07:02.429Z

[tool_result] <persisted-output>
Output too large (31.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bgnbz62iw.txt

Preview (first 2KB):
H:/prism/mcp-server/src/algorithms/CWEZBuffer.ts
H:/prism/mcp-server/src/algorithms/ChipThinningCompensation.ts
H:/prism/mcp-server/src/algorithms/FEASolver2D.ts
H:/prism/mcp-server/src/algorithms/FiveAxis
... [+1788 chars truncated]

### Assistant | 2026-06-19T15:07:05.553Z

Let me get the precise engine/algorithm/physics file list using grep directly on names, then read the SFC orchestrators to find actual call sites.

### Assistant | 2026-06-19T15:07:07.518Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:08.273Z

[tool_use: Bash]

### User | 2026-06-19T15:07:22.303Z

[tool_result] 519

### User | 2026-06-19T15:07:23.199Z

[tool_result] <persisted-output>
Output too large (31KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bqwd2numf.txt

Preview (first 2KB):
H:/prism/mcp-server/src/algorithms/CWEZBuffer.ts
H:/prism/mcp-server/src/algorithms/ChipThinningCompensation.ts
H:/prism/mcp-server/src/algorithms/FEASolver2D.ts
H:/prism/mcp-server/src/algorithms/FiveAxisTi
... [+1786 chars truncated]

### Assistant | 2026-06-19T15:07:27.238Z

519 files is way too broad — the grep matched files containing "deflect" anywhere in their content (comments, docs, etc). I need to narrow to files where deflection is the actual subject, then separately check exact call sites in the 3 orchestrators.

### Assistant | 2026-06-19T15:07:29.558Z

[tool_use: Bash]

### User | 2026-06-19T15:07:40.297Z

[tool_result] H:/prism/mcp-server/src/algorithms/ToolDeflectionModel.ts
H:/prism/mcp-server/src/engines/AIDeepKnowledgeIntegrationEngine.ts
H:/prism/mcp-server/src/engines/AIPhysicsOptimizationEngine.ts
H:/prism/mcp-server/src/engines/AISystemSynchronizerEngine.ts
H:/prism/mcp-server/src/engines/AdaptiveToolpathRouterEngine.ts
H:/prism/mcp-server/src/engines/AdvancedCalculations.ts
H:/prism/mcp-server/src/engin
... [+5917 chars truncated]

### Assistant | 2026-06-19T15:07:44.058Z

Good. Now I have the real candidate list. Let me extract just the unique TS assets (engines, algorithms, physics), then check all 3 orchestrators for actual imports+call sites in parallel.

### Assistant | 2026-06-19T15:07:47.213Z

[tool_use: Bash]

### User | 2026-06-19T15:07:59.031Z

[tool_result] H:/prism/mcp-server/src/algorithms/ToolDeflectionModel.ts
H:/prism/mcp-server/src/engines/AIDeepKnowledgeIntegrationEngine.ts
H:/prism/mcp-server/src/engines/AIPhysicsOptimizationEngine.ts
H:/prism/mcp-server/src/engines/AISystemSynchronizerEngine.ts
H:/prism/mcp-server/src/engines/AdaptiveToolpathRouterEngine.ts
H:/prism/mcp-server/src/engines/AdvancedCalculations.ts
H:/prism/mcp-server/src/engin
... [+5489 chars truncated]

### Assistant | 2026-06-19T15:08:02.897Z

Good — 90 candidate assets. Now I need to check which ones are actually imported+called in the 3 SFC orchestrators. Let me grep all 3 orchestrators for deflection-related imports and call sites in parallel, then check the dispatcher and a few key asset internals.

### Assistant | 2026-06-19T15:08:05.619Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:07.261Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:08.380Z

[tool_use: Bash]

### User | 2026-06-19T15:08:21.826Z

[tool_result] 31:import { log } from "../utils/Logger.js";
32:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
33:import {
44:import { getMaterialSpecificToolSpeedFactor } from "../physics/tool-material-speed-override.js";
49:import { KienzleForceModel } from "../algorithms/KienzleForceModel.js";
50:import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
55:import { getMultiplie
... [+1778 chars truncated]

### User | 2026-06-19T15:08:24.424Z

[tool_result] 28: * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
42:import {
53:// Canonical Kienzle exponent (mc) per ISO group -- imported, NEVER inlined. The
57:import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
63:import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";
69:import { speedFeedOutcomeFeedbackBridgeEngine } from ".
... [+244 chars truncated]

### User | 2026-06-19T15:08:26.907Z

[tool_result] 26:import { z } from "zod";
27:import { log } from "../utils/Logger.js";
28:import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
29:import { monteCarloEngine } from "./MonteCarloEngine.js";
30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
31:import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
32:import type { RuleCategory } fro
... [+2502 chars truncated]

### Assistant | 2026-06-19T15:08:31.993Z

Key finding: all 3 orchestrators implement deflection as **inline beam-model math** (δ = FL³/3EI) — none import any of the dedicated deflection engines. Now I need to verify each candidate asset's classification. Let me check the primary deflection-specific engines and the dispatcher.

### Assistant | 2026-06-19T15:08:34.378Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:34.713Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:35.192Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:35.862Z

[tool_use: Bash]

### User | 2026-06-19T15:08:50.512Z

[tool_result] 4: * Calculates boring bar deflection and recommends bars:
5: * - Static deflection from cutting force and overhang
7: * - Surface finish impact from deflection
22: * Actions: boring_bar_deflection_calc
27:export interface AtomicValue {
34:export interface BoringBarDeflectionInput {
47:export interface BoringBarDeflectionResult {
50:  static_deflection: AtomicValue;
51:  deflection_at_surface: Ato
... [+1073 chars truncated]

### User | 2026-06-19T15:08:50.720Z

[tool_result] 4: * Calculates workpiece deflection under cutting loads:
5: * - Thin wall deflection (cantilever/simply-supported)
6: * - Floor deflection for pocket bottoms
13: * δ = F·L³/(48·E·I). Floor deflection modeled as clamped
18: *            Machinery's Handbook deflection tables
20: * Actions: part_deflection_calc
25:export interface AtomicValue {
32:export interface PartDeflectionInput {
45:export in
... [+1088 chars truncated]

### User | 2026-06-19T15:08:53.225Z

[tool_result] 5: * and clamping conditions through cantilever beam deflection models to produce
6: * deflection distributions and surface error confidence bounds.
10: * - Tool diameter tolerance (h6/h5 class → ±µm)
32: * Actions: stochastic_deflection (calcDispatcher)
37:export interface UncertainVal {
43:export interface StochasticDeflectionInput {
58:  /** Target deflection limit (µm) */
59:  deflection_limit
... [+1032 chars truncated]

### User | 2026-06-19T15:08:53.289Z

[tool_result] 30: * Actions: timoshenko_deflection_calc (calcDispatcher)
42:export interface AtomicValue {
51:export interface TimoshenkoParams {
71:export interface BeamSection {
93:export interface MultiSectionParams {
103:export interface DeflectionComparison {
104:  /** Euler-Bernoulli deflection (bending only) [mm] */
106:  /** Euler-Bernoulli deflection [um] */
108:  /** Timoshenko total deflection [mm] *
... [+1048 chars truncated]

### Assistant | 2026-06-19T15:08:57.126Z

Now check the remaining primary deflection engines plus the dispatcher and ToolDeflectionModel algorithm:

### Assistant | 2026-06-19T15:08:58.302Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:59.117Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:00.254Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:00.644Z

[tool_use: Bash]

### User | 2026-06-19T15:09:10.097Z

[tool_result] 5: * PHASE-7 Intelligent Vericut: Real-time tool and part deflection visualization
7: * Mastercam X8). Consumes the `deflection` sub-object of the PhysicsOverlay
9: * render-ready frames showing current deflection magnitude and tolerance-zone
13: *   nominal    → green   — deflection well within tolerance budget
22: *                                      ▼ PhysicsOverlay.deflection
49:export const
... [+1401 chars truncated]

### User | 2026-06-19T15:09:13.351Z

[tool_result] 2: * ToolAssemblyDeflectionEngine — Combined tool assembly deflection analysis.
4: * Models the complete tool assembly: spindle → holder → collet/chuck → tool shank → cutting edge.
5: * Each segment has its own diameter, length, material (E modulus), and contributes to total deflection.
29:export interface AssemblySection {
37:export interface AssemblyInput {
53:export interface SectionDeflection 
... [+1510 chars truncated]

### User | 2026-06-19T15:09:14.176Z

[tool_result] 2: * ToolDeflectionPredictionEngine — Euler-Bernoulli cantilever beam deflection
7: * Safety: Critical for precision machining — deflection causes dimensional error
12:export type ToolMaterialType =
22:export type CutDirection = "radial" | "axial" | "resultant";
26:export interface ToolDeflectionInput {
41:export interface AtomicValue {
51:export interface ToolDeflectionResult {
52:  static_deflec
... [+1064 chars truncated]

### User | 2026-06-19T15:09:16.771Z

[tool_result] 4: * Computes workpiece deflection δ(z) along the length of cantilevered bar stock
5: * under side milling loads (live tooling on CNC lathes). Outputs a compensation
29:export interface DeflectionCompensationInput {
62:export interface DeflectionPoint {
66:  deflection_mm: number;
67:  /** Compensation offset to apply (mm) — negative of deflection */
68:  compensation_mm: number;
71:export interfa
... [+1385 chars truncated]

### Assistant | 2026-06-19T15:09:21.196Z

Now check the dispatcher for deflection actions, the ToolDeflectionModel algorithm, the plugin, and the hypermill deflection engine. Also check which deflection engines ARE wired to calcDispatcher:

### Assistant | 2026-06-19T15:09:23.502Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:24.685Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:25.447Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:26.446Z

[tool_use: Bash]

### User | 2026-06-19T15:09:36.231Z

[tool_result] 58:    case "deflection":
59:      return { deflection_mm: result.static_deflection, safe: (result.safety_factor ?? 0) >= 2.0 };
73:      return { deflection_um: result.roughing_deflection_um?.value, spring_depth_mm: result.spring_pass_depth_mm?.value, finish_feed: result.finishing_feed_mm_rev?.value, predicted_Ra_um: result.predicted_Ra_um?.value, passes: result.number_of_passes?.value, safe: res
... [+6192 chars truncated]

### User | 2026-06-19T15:09:42.490Z

[tool_result] 4: * Level 4. Euler-Bernoulli cantilever deflection:
7: * FDT loop participant: force drives deflection, deflection feeds back to
13: * @see ToolDeflectionPredictionEngine — underlying deflection computation
43:  id: "tool_deflection",
50:  outputs: ["deflection_um", "dimensional_error_um", "stiffness_N_per_um"],
52:  description: "Cantilever tool deflection with flute correction and stepped shaft
... [+822 chars truncated]

### User | 2026-06-19T15:09:42.611Z

[tool_result] 4: * Predicts tool deflection using Euler-Bernoulli cantilever beam theory:
14: * SAFETY-CRITICAL: Tool deflection directly affects dimensional accuracy,
37:export interface ToolDeflectionInput {
56:export interface ToolDeflectionOutput extends WithWarnings {
57:  /** Static deflection at tool tip [mm]. */
58:  static_deflection: number;
59:  /** Dynamic deflection (with amplification) [mm]. */
60
... [+1453 chars truncated]

### User | 2026-06-19T15:09:44.160Z

[tool_result] 4: * U-HKC42: Maps hyperMILL CAM parameters to their downstream deflection and thermal
14: * Material sensitivity classification:
25:export interface DeflectionThermalMapping {
33:  mappingType: "deflection_limit" | "thermal_limit" | "wear_rate" | "temperature_check";
38:  /** Material sensitivity classification */
46:// Organized by CAM domain. Each domain contributes deflection and/or thermal
63
... [+773 chars truncated]

### Assistant | 2026-06-19T15:09:49.492Z

Excellent. Now I have full dispatcher evidence. Let me check the remaining key assets: where `ToolDeflectionPlugin` is called, whether `WEDMWireDeflectionEngine` is SFC-applicable, `ThinWallMachiningEngine`, `FixtureDesignEngine`, and confirm the `calcDispatcher` wiring for `workpiece_deflection_compensate` and `fixture_deflection_calc`:

### Assistant | 2026-06-19T15:09:51.680Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:52.516Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:53.644Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:54.577Z

[tool_use: Bash]

### User | 2026-06-19T15:10:01.571Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:10:02.422Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:10:03.773Z

[tool_result] 2: * WEDMWireDeflectionEngine — Wire Deflection Prediction and Compensation
3: * WEDM-P2P-PRODUCTION-MS0 U-PROD-05
5: * Calculates wire deflection during cutting for:
13: * - For tensioned wire: δ ≈ F × L / (2 × T) at midspan
14: * - Where T = wire tension, F = discharge force, L = workpiece thickness
16: * Flush-pressure deflection (Dauw & Albert 1992):
18: * - Where p = flush pressure, d = wire 
... [+536 chars truncated]

### User | 2026-06-19T15:10:07.949Z

[tool_result] H:/prism/mcp-server/src/engines/PhysicsFusionOrchestratorEngine.ts:64:import { toolDeflectionPlugin } from "./plugins/ToolDeflectionPlugin.js";
H:/prism/mcp-server/src/engines/plugins/ToolDeflectionPlugin.ts:2: * ToolDeflectionPlugin — PhysicsPlugin wrapper for ToolDeflectionPredictionEngine
H:/prism/mcp-server/src/engines/plugins/ToolDeflectionPlugin.ts:12: * @module engines/plugins/ToolDeflectio
... [+268 chars truncated]

### Assistant | 2026-06-19T15:10:12.704Z

Now check `PhysicsFusionOrchestratorEngine` relationship to SFC path, then verify the remaining non-obvious engines (ThinWallMachiningEngine, FixtureDesignEngine, WearForceCompensationEngine thermal_deflection, and `ToolDeflectionModel` algorithm usage in SFC):

### Assistant | 2026-06-19T15:10:14.434Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:15.577Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:17.129Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:17.881Z

[tool_use: Bash]

### User | 2026-06-19T15:10:27.131Z

[tool_result] 12: * After this engine, a call to SpeedFeedOrchestrator with fusion_tier >= 2 gets
37:import type { ISOGroup } from "../physics/constants.js";
38:import type {
52:import {
56:import { PhysicsPluginRegistry } from "./PhysicsPluginRegistry.js";
57:import {
62:import { kienzleForcePlugin } from "./plugins/KienzleForcePlugin.js";
63:import { cuttingTemperaturePlugin } from "./plugins/CuttingTemperatu
... [+409 chars truncated]

### User | 2026-06-19T15:10:27.326Z

[tool_result] 3: * Physics-based parameter optimization for thin wall and thin floor CNC machining.
4: * Prevents deflection, chatter, and distortion by computing safe cutting parameters
8: * - Wall deflection: δ = F·H³/(3·E·I), I = t³·w/12 (cantilever thin wall)
13: * Reference: CTE thin wall machining guides, Sandvik thin part strategies,
14: *            hotean.com CNC milling thin wall vibration analysis
16
... [+775 chars truncated]

### User | 2026-06-19T15:10:33.091Z

[tool_result] 2: * WearForceCompensationEngine — Advanced Compensation Models
23: * Actions: archard_wear, wear_force_correction, thermal_deflection
30:export type AbrasiveMaterial = "cast_iron" | "composite" | "hardened_steel" | "ceramic_insert" | "cbn_insert" | "pcd_insert" | "general";
32:export interface ArchardWearInput {
43:export interface ArchardWearResult {
52:export interface WearForceInput {
59:expor
... [+317 chars truncated]

### User | 2026-06-19T15:10:37.992Z

[tool_result] H:/prism/mcp-server/src/algorithms/ToolDeflectionModel.ts:22: * @module algorithms/ToolDeflectionModel
H:/prism/mcp-server/src/algorithms/ToolDeflectionModel.ts:101:export class ToolDeflectionModel implements Algorithm<ToolDeflectionInput, ToolDeflectionOutput> {
H:/prism/mcp-server/src/engines/AlgorithmWiringEngine.ts:328:    name: "ToolDeflectionModel",
H:/prism/mcp-server/src/engines/AlgorithmW
... [+54 chars truncated]

### Assistant | 2026-06-19T15:10:41.988Z

Now I have enough data. Let me do the final batch: confirm the `DeflectionOverlayEngine` dispatcher action, check `FixtureDesignEngine` deflection action wiring, and verify the remaining non-primary engines are truly DEAD/NA:

### Assistant | 2026-06-19T15:10:43.955Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:45.226Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:46.673Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:48.030Z

[tool_use: Bash]

### User | 2026-06-19T15:11:00.006Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:11:02.517Z

[tool_result] 662:  "fixture_design_recommend", "fixture_design_validate", "fixture_clamp_force", "fixture_clamp_contact_stress", "fixture_deflection_calc",
4029:            const { fixtureDesignEngine } = await import("../../engines/FixtureDesignEngine.js");
4030:            result = fixtureDesignEngine.recommend(
4037:            const { fixtureDesignEngine: fde2 } = await import("../../engines/FixtureDesignE
... [+278 chars truncated]

### User | 2026-06-19T15:11:03.273Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts:8351:            const { physicsFusionOrchestratorEngine } = await import("../../engines/PhysicsFusionOrchestratorEngine.js");
H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts:8352:            result = physicsFusionOrchestratorEngine.compute(params as ValidatedParams);

### User | 2026-06-19T15:11:04.274Z

[tool_result] 9087:          // ── COG-BRIDGE-FOLLOWUP/U-WIRE-CALC-DEFL: wire WorkpieceDeflectionCompensationEngine.
9091:            const { workpieceDeflectionCompensationEngine } = await import("../../engines/WorkpieceDeflectionCompensationEngine.js");
9092:            result = workpieceDeflectionCompensationEngine.calculate(action, params as ValidatedParams);

### Assistant | 2026-06-19T15:12:15.250Z

I have sufficient data to produce the complete audit. I have verified all primary deflection assets against the 3 SFC orchestrators and the calcDispatcher. Here is the result:

---

## SFC Wiring Audit — Tool/Part/Boring-Bar Deflection + Overlay

### Key Finding (before the table)

All 3 SFC orchestrators implement deflection as **inline beam math** (δ = FL³/3EI) — none import any dedicated deflection engine class. The dedicated engines are wired exclusively through `calcDispatcher.ts` as named actions, reachable via `prism_calc` but NOT called inside the SFC `calculate()`/`run()`/`orchestrate()` loop. `PhysicsFusionOrchestratorEngine` is a separate `physics_fusion` dispatcher action (line 8351-8352) — it is NOT called by any SFC orchestrator.

---

| Asset | Type | Classification | Evidence (file:line) | 1-line note |
|---|---|---|---|---|
| `ToolDeflectionModel` | algorithm | UNWIRED-BUT-APPLICABLE | `AlgorithmWiringEngine.ts:328` (registry only, no SFC import) | Euler-Bernoulli cantilever algorithm; SFC orchestrators re-implement same formula inline instead of calling this |
| `BoringBarDeflectionEngine` | engine | UNWIRED-BUT-APPLICABLE | `calcDispatcher.ts:5196` (`boring_bar_deflection` action); no import in SFC orchestrators | Static δ + taper + dampening for boring bars; directly SFC-applicable when boring op selected, but SFC never routes there |
| `PartDeflectionEngine` | engine | UNWIRED-BUT-APPLICABLE | `calcDispatcher.ts:5522` (`part_deflection_calc` action); no import in SFC orchestrators | Thin-wall/floor part deflection with spring-pass count; SFC outputs no `part_deflection` sub-result |
| `StochasticDeflectionEngine` | engine | UNWIRED-BUT-APPLICABLE | `calcDispatcher.ts:8428` (`stochastic_deflection` action); no import in SFC orchestrators | Monte-Carlo cantilever δ with tolerance P(exceed); SFC has no stochastic deflection band in its output |
| `TimoshenkoDeflectionEngine` | engine | UNWIRED-BUT-APPLICABLE | `calcDispatcher.ts:8974-8992` (`timosh
... [+8633 chars truncated]
