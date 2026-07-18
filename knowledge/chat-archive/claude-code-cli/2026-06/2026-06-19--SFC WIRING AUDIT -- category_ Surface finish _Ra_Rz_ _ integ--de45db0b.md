---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Surface finish (Ra/Rz) / integrity / residual stre"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.832Z"
last_ts: "2026-06-19T15:12:39.743Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 26
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-abf406c072660db7c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Surface finish (Ra/Rz) / integrity / residual stre

> **claude-code-cli** | 2026-06-19 | 56 msgs (26 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-abf406c072660db7c.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.832Z

SFC WIRING AUDIT -- category: Surface finish (Ra/Rz) / integrity / residual stress.
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

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "SurfaceFinish|SurfaceIntegrity|ResidualStress|Roughness" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site (WIRED) or the recommended wire target (UNWIRED-BUT-APPLICABLE).

Output a markdown table: | asset | type | cl
... [+213 chars truncated]

### Assistant | 2026-06-19T15:06:24.246Z

I'll systematically enumerate every engine/algorithm/formula whose name or content matches the surface finish / integrity / residual stress category, then classify each one by reading actual call sites.

### Assistant | 2026-06-19T15:06:25.242Z

[tool_use: Bash]

### User | 2026-06-19T15:06:42.817Z

[tool_result] mcp-server/src/algorithms/LBFGSBOptimizer.ts
mcp-server/src/algorithms/NeuralInference.ts
mcp-server/src/algorithms/RegressionEngine.ts
mcp-server/src/algorithms/SurfaceFinishPredictor.ts
mcp-server/src/algorithms/index.ts
mcp-server/src/engines/AIDecisionExplanationEngine.ts
mcp-server/src/engines/AIIntelligenceMaximizerEngine.ts
mcp-server/src/engines/AIResourceLearningEngine.ts
mcp-server/src/e
... [+17610 chars truncated]

### Assistant | 2026-06-19T15:06:50.777Z

[tool_use: Bash]
[tool_use: Bash]
[tool_use: Bash]

### User | 2026-06-19T15:06:58.284Z

[tool_result] 325

### User | 2026-06-19T15:07:07.671Z

[tool_result] ./LBFGSBOptimizer.ts
./NeuralInference.ts
./RegressionEngine.ts
./SurfaceFinishPredictor.ts
./index.ts

### User | 2026-06-19T15:07:18.226Z

[tool_result] ./constants.ts

### Assistant | 2026-06-19T15:07:21.851Z

325 files is the wide grep (all content matches). I need to narrow to assets that are *specifically about* surface finish/integrity/residual stress — not just engines that mention it in passing. Let me identify the core-applicable set by name, then spot-check the content of borderline ones.

### Assistant | 2026-06-19T15:07:25.352Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:25.988Z

[tool_use: Bash]

### User | 2026-06-19T15:07:35.819Z

[tool_result] Exit code 2
EDMMonitorSurfaceIntegrityEngine.ts
EDMSurfaceIntegrityEngine.ts
GrindingSurfaceFinishEngine.ts
HyperMillSurfaceIntegrityBridge.ts
MastercamSurfaceIntegrityBridge.ts
MonolithSurfaceFinishDatabaseEngine.ts
StochasticSurfaceFinishEngine.ts
SurfaceFinishCnnEngine.ts
SurfaceFinishDatabaseEngine.ts
SurfaceFinishEngine.ts
SurfaceFinishPredictorEngine.ts
SurfaceIntegrityEngine.ts
SurfaceInteg
... [+22 chars truncated]

### User | 2026-06-19T15:07:36.014Z

[tool_result] BoreFinishingEngine.ts
BurnishingPolishingEngine.ts
ContactMechanicsSurfaceEngine.ts
GrindingSurfaceFinishEngine.ts
HoningProcessEngine.ts
MonolithSurfaceFinishDatabaseEngine.ts
ResidualStressPredictionEngine.ts
RoughnessConversionEngine.ts
ShotPeeningEngine.ts
StochasticSurfaceFinishEngine.ts
SurfaceFinishCnnEngine.ts
SurfaceFinishDatabaseEngine.ts
SurfaceFinishEngine.ts
SurfaceFinishPredictorEng
... [+166 chars truncated]

### Assistant | 2026-06-19T15:07:43.793Z

Let me now check what's exported from each engine and grep the 3 SFC orchestrators for actual call sites.

### Assistant | 2026-06-19T15:07:45.355Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:45.584Z

[tool_use: Bash]

### User | 2026-06-19T15:07:55.547Z

[tool_result] Exit code 2
hypermill/HyperMillSurfaceQualityMappingEngine.ts
plugins/SurfaceFinishPlugin.ts

### User | 2026-06-19T15:07:56.551Z

[tool_result] SurfaceFinishPredictor.ts

### Assistant | 2026-06-19T15:08:01.684Z

[tool_use: Bash]

### User | 2026-06-19T15:08:13.792Z

[tool_result] UltimateSpeedFeedEngine.ts:191:export interface SurfaceFinishPrediction {
UltimateSpeedFeedEngine.ts:273:  surface_finish: SurfaceFinishPrediction;
SpeedFeedOrchestratorEngine.ts:57:function roundSurfaceFinishRa(value: number) {
SpeedFeedOrchestratorEngine.ts:3408:      surface_finish_Ra_um: roundSurfaceFinishRa(finalRa),
SpeedFeedOrchestratorEngine.ts:3887:      ra_um: roundSurfaceFinishRa(-sol.f
... [+7 chars truncated]

### Assistant | 2026-06-19T15:08:17.969Z

[tool_use: Bash]

### User | 2026-06-19T15:08:34.082Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:08:37.079Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:37.807Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:38.231Z

[tool_use: Bash]

### User | 2026-06-19T15:08:53.473Z

[tool_result] import { log } from "../utils/Logger.js";
import { captureSFC } from "../middleware/sfcOutcomeWire.js";
import {
import { getMaterialSpecificToolSpeedFactor } from "../physics/tool-material-speed-override.js";
import { KienzleForceModel } from "../algorithms/KienzleForceModel.js";
import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
import { getMultipliers as getCoolantVcMul
... [+642 chars truncated]

### User | 2026-06-19T15:08:54.528Z

[tool_result] import { z } from "zod";
import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { monteCarloEngine } from "./MonteCarloEngine.js";
import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import type { RuleCategory } from "./MachiningPlayboo
... [+727 chars truncated]

### User | 2026-06-19T15:08:55.158Z

[tool_result] import {
import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";

### Assistant | 2026-06-19T15:09:00.466Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:01.268Z

[tool_use: Bash]

### User | 2026-06-19T15:09:15.933Z

[tool_result] 158:  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
273:  surface_finish: SurfaceFinishPrediction;
359:    surface_finish: { ci_95_low: number; ci_95_high: number; cv_pct: number };
1518:  if (optimize_for === "surface_finish") return "finishing";
2130:      : input.optimize_for === "surface_finish" ? 0
2858:      surface_finish: {
3008:        surface_finish: raUnce
... [+118 chars truncated]

### User | 2026-06-19T15:09:17.795Z

[tool_result] 518:   * Klocke surface roughness model:
954:export function predictedRa(fz: number, r: number): number {

### Assistant | 2026-06-19T15:09:20.939Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:21.652Z

[tool_use: Bash]

### User | 2026-06-19T15:09:32.753Z

[tool_result]   return (Fc * D) / 2000;
}

/** Brammertz: Ra[um] = fz^2 / (32*r) * 1000 */
export function predictedRa(fz: number, r: number): number {
  if (r <= 0) return 0;
  return ((fz * fz) / (32 * r)) * 1000;
}

/** ISO 3002-1: n = 1000 * Vc / (pi * D) */
export function rpmFromVc(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return (1000 * Vc) / (Math.PI * D);
}

/** MRR[mm^3/min] = ap * ae
... [+418 chars truncated]

### User | 2026-06-19T15:09:33.710Z

[tool_result] 28: * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
34: *   - Brammertz surface finish:   Ra ~= fz^2/(32r) [nose cusp; canonical predictedRa() in constants.ts].
57:import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
861:    // from src/physics/constants.ts.
1052:    // fz^2/(32r) (Boothroyd & Knight; Sandvik 2024), inverted via the canonical predictedR
... [+253 chars truncated]

### Assistant | 2026-06-19T15:09:37.320Z

[tool_use: Bash]

### User | 2026-06-19T15:09:50.478Z

[tool_result] 57:function roundSurfaceFinishRa(value: number) {
219:  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced" | "cost";
265:  surface_finish_Ra_um: number;
2004:        const bue_factor = 1 + Math.max(0, 0.1 * boxMuller()); // BUE adds roughness
2125:      dominant_uncertainty_source = "surface_finish_nose_radius";
3372:          surface_finish_Ra: finalRa,
3408:      surface
... [+582 chars truncated]

### Assistant | 2026-06-19T15:09:56.821Z

Good. Now I have confirmed the 3 orchestrators use `predictedRa` from `constants.ts` inline — NOT importing any of the named engine classes. Now let me check each named engine's exports and whether they appear in the orchestrators or dispatcher.

### Assistant | 2026-06-19T15:09:59.828Z

[tool_use: Bash]

### User | 2026-06-19T15:10:10.331Z

[tool_result] 1068:  // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SFCMultiHypothesisRankerEngine carried a FALSE // WIRE-EXEMPT
2624:            const { shotPeeningEngine } = await import("../../engines/ShotPeeningEngine.js");
3429:            const { shotPeeningEngine } = await import("../../engines/ShotPeeningEngine.js");
5192:            const { surfaceRoughnessEngine } = await import("../../engines/Surf
... [+3644 chars truncated]

### Assistant | 2026-06-19T15:10:16.713Z

[tool_use: Bash]

### User | 2026-06-19T15:10:28.456Z

[tool_result] 6604:            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
6605:            result = grindingSurfaceFinishEngine.calculate(params as ValidatedParams);
8142:            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
8143:            result = grindingSurfaceFinishEngine.assessBurnRisk(p
... [+287 chars truncated]

### Assistant | 2026-06-19T15:10:32.253Z

[tool_use: Bash]

### User | 2026-06-19T15:10:50.810Z

[tool_result] 6604:            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
6605:            result = grindingSurfaceFinishEngine.calculate(params as ValidatedParams);
8142:            const { grindingSurfaceFinishEngine } = await import("../../engines/GrindingSurfaceFinishEngine.js");
8143:            result = grindingSurfaceFinishEngine.assessBurnRisk(p
... [+287 chars truncated]

### Assistant | 2026-06-19T15:10:53.810Z

Let me check the remaining engines and then compile the full table.

### Assistant | 2026-06-19T15:10:58.542Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:11:00.629Z

[tool_use: Bash]

### User | 2026-06-19T15:11:12.449Z

[tool_result] tools/dispatchers/calcDispatcher.ts:6605:            result = grindingSurfaceFinishEngine.calculate(params as ValidatedParams);
tools/dispatchers/calcDispatcher.ts:8143:            result = grindingSurfaceFinishEngine.assessBurnRisk(params as ValidatedParams);
tools/dispatchers/calcDispatcher.ts:9164:            const av = stochasticSurfaceFinishEngine.compute(params as Parameters<typeof stochasti
... [+34 chars truncated]

### User | 2026-06-19T15:11:14.284Z

[tool_result] SurfaceFinishEngine.ts:92:export class SurfaceFinishEngine {
SurfaceFinishEngine.ts:264:export const surfaceFinishEngine = new SurfaceFinishEngine();
SurfaceIntegrityEngine.ts:73:export class SurfaceIntegrityEngine {
SurfaceIntegrityEngine.ts:244:export const surfaceIntegrityEngine = new SurfaceIntegrityEngine();
MonolithSurfaceFinishDatabaseEngine.ts:101:export const RZ_TO_RA_FACTOR = 4;
Monolith
... [+1482 chars truncated]

### Assistant | 2026-06-19T15:11:18.630Z

I have enough data to compile the full table. Let me do the final two targeted checks then output results.

### Assistant | 2026-06-19T15:11:24.400Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:11:26.543Z

[tool_use: Bash]

### User | 2026-06-19T15:11:35.198Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T15:11:37.574Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:12:39.743Z

I have all the data needed. Here is the complete wiring audit table.

---

## SFC Wiring Audit — Surface Finish / Integrity / Residual Stress

**Scope confirmed:** 3 SFC orchestrators (`UltimateSpeedFeedEngine.ts`, `SpeedFeedNineAxisOrchestratorEngine.ts`, `SpeedFeedOrchestratorEngine.ts`) + `calcDispatcher.ts` (`speed_feed` / `sfc_*` / `ultimate_speed_feed` actions) + `routes/sfc.ts`.

**Total assets in scope: 29** (20 engines + 5 sub-domain bridges/plugins + 3 algorithms + 1 physics formula)

---

### Algorithms

| Asset | Type | Classification | Evidence (file:line) | Note |
|---|---|---|---|---|
| `SurfaceFinishPredictor.ts` (`SurfaceFinishPredictor` class) | Algorithm | UNWIRED-BUT-APPLICABLE | No import in any SFC orchestrator or calcDispatcher; wire target: `UltimateSpeedFeedEngine.ts` `SurfaceFinishPrediction` block | ML predictor for Ra; duplicates the inline Brammertz `predictedRa` but adds confidence intervals — should feed `surface_finish.practical_ra_um.ci_*` |
| `LBFGSBOptimizer.ts` | Algorithm | DEAD/NA | Content match is optimization math referenced by surface finish parameter fitting, but no surface-finish API exposed | General optimizer; not SFC-specific |
| `NeuralInference.ts` | Algorithm | DEAD/NA | Match is a generic `roughness` field in a neural feature vector; no SFC surface-finish contract | General neural inference; not SFC path |
| `RegressionEngine.ts` | Algorithm | DEAD/NA | Match is a regression example using Ra as a sample variable; no SFC call path | Generic regression utility |

### Physics

| Asset | Type | Classification | Evidence (file:line) | Note |
|---|---|---|---|---|
| `physics/constants.ts` → `predictedRa()` | Physics formula | WIRED | `SpeedFeedNineAxisOrchestratorEngine.ts:57` `import { CANONICAL_KIENZLE, predictedRa }` + call at `:1069`; `SpeedFeedOrchestratorEngine.ts:57` `roundSurfaceFinishRa` wraps inline Ra math | Brammertz Ra = fz²/(32r)×1000; the canonical SFC Ra formula; consumed directly by both orchestrators |


... [+9483 chars truncated]
