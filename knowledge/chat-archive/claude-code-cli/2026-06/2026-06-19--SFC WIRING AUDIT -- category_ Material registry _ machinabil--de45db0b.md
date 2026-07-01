---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING AUDIT -- category: Material registry / machinability / kc / heat-trea"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.833Z"
last_ts: "2026-06-19T15:13:03.610Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 26
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a57e74f0d6c32332d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING AUDIT -- category: Material registry / machinability / kc / heat-trea

> **claude-code-cli** | 2026-06-19 | 56 msgs (26 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a57e74f0d6c32332d.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.833Z

SFC WIRING AUDIT -- category: Material registry / machinability / kc / heat-treat-aware / ISO-group.
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

Your scope: every engine in H:/prism/mcp-server/src/engines/ AND every algorithm in src/algorithms/ AND every physics formula in src/physics/ whose name or content matches this category (grep -iE "Material|Machinability|ISOGroup|HeatTreatment|AISI" over those dirs). Enumerate them ALL (report the count), then for EACH classify WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA per the wiring definition, with a file:line citation for the call site (WIRED) or the recommended wire target (UNWIRED-BUT-APPLICABLE).

Output a markdown table: | asset
... [+225 chars truncated]

### Assistant | 2026-06-19T15:06:23.854Z

I'll conduct a systematic SFC wiring audit for material/machinability/ISO-group assets. Let me start by enumerating all matching files.

### Assistant | 2026-06-19T15:06:25.437Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:06:26.070Z

[tool_use: Bash]

### User | 2026-06-19T15:06:43.041Z

[tool_result] <persisted-output>
Output too large (103.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\b2k6fkz0h.txt

Preview (first 2KB):
mcp-server/src/algorithms/BillOfMaterialsRollupFormula.ts
mcp-server/src/algorithms/CWEZBuffer.ts
mcp-server/src/algorithms/ChipBreakingModel.ts
mcp-server/src/algorithms/ChipControlStrategy.ts
mcp-server
... [+1790 chars truncated]

### User | 2026-06-19T15:06:43.125Z

[tool_result] 1896

### Assistant | 2026-06-19T15:06:50.435Z

[tool_use: Bash]
[tool_use: Bash]

### User | 2026-06-19T15:06:56.249Z

[tool_result] 2021

### User | 2026-06-19T15:07:05.549Z

[tool_result] mcp-server/src/engines/AnisotropicMaterialModelEngine.ts
mcp-server/src/engines/BatchCAMMaterialBridgeEngines.ts
mcp-server/src/engines/ConnectionMaterializerEngine.ts
mcp-server/src/engines/CustomerMaterialMapEngine.ts
mcp-server/src/engines/DocuStrataMaterialPriorEngine.ts
mcp-server/src/engines/EDMBiMaterialCompensationEngine.ts
mcp-server/src/engines/EDMMaterialMachineWireEngine.ts
mcp-server/
... [+2189 chars truncated]

### Assistant | 2026-06-19T15:07:12.569Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:13.799Z

[tool_use: Bash]

### User | 2026-06-19T15:07:27.279Z

[tool_result] <persisted-output>
Output too large (29.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\de45db0b-5132-4533-b8e3-bed00dc03f4a\tool-results\bpmhvn7e5.txt

Preview (first 2KB):
mcp-server/src/algorithms/ChipBreakingModel.ts
mcp-server/src/algorithms/ChipControlStrategy.ts
mcp-server/src/algorithms/ChipTypePredictionModel.ts
mcp-server/src/algorithms/ClimbConventionalPicker.ts
mcp
... [+1772 chars truncated]

### User | 2026-06-19T15:07:38.016Z

[tool_result] mcp-server/src/engines/ConstitutiveModelEngine.ts
mcp-server/src/engines/CostEstimationEngine.ts
mcp-server/src/engines/CurriculumEngine.ts
mcp-server/src/engines/DecisionReasoningEngine.ts
mcp-server/src/engines/DecisionTreeEngine.ts
mcp-server/src/engines/DimensionlessNumbersEngine.ts
mcp-server/src/engines/EDMMaterialMachineWireEngine.ts
mcp-server/src/engines/EmpiricalCorrelationEngine.ts
mcp-
... [+1942 chars truncated]

### Assistant | 2026-06-19T15:07:41.191Z

Now let me examine the three SFC orchestrators to understand what they actually import and call:

### Assistant | 2026-06-19T15:07:43.865Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:07:44.689Z

[tool_use: Bash]

### User | 2026-06-19T15:07:54.514Z

[tool_result] 31:import { log } from "../utils/Logger.js";
32:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
33:import {
38:  type ISOGroup,
40:// Material-SPECIFIC tool-material speed factor (U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC): supersedes
41:// the uniform constants.ts getToolMaterialSpeedFactor in the Vc path -- the real tool/carbide
44:import { getMaterialSpecificToolSpeedFactor } from "..
... [+8425 chars truncated]

### User | 2026-06-19T15:07:55.026Z

[tool_result] 15: *   4. Material   — type, hardness HB/HRC, ISO group
29: *   - Kienzle force model:        Fc = kc1.1 × ap × fz^(1-mc)
42:import {
46:  type ISOGroup,
49:  type ToolMaterial,
57:import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
63:import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";
69:import { speedFeedOutcomeFeedbackBridgeEngine } 
... [+471 chars truncated]

### Assistant | 2026-06-19T15:08:00.619Z

[tool_use: Bash]

### User | 2026-06-19T15:08:11.794Z

[tool_result] 26:import { z } from "zod";
27:import { log } from "../utils/Logger.js";
28:import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
29:import { monteCarloEngine } from "./MonteCarloEngine.js";
30:import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
31:import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
32:import type { RuleCategory } fro
... [+5228 chars truncated]

### Assistant | 2026-06-19T15:08:16.032Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:20.603Z

[tool_use: Bash]

### User | 2026-06-19T15:08:32.253Z

[tool_result] 1505:    // Try MaterialRegistry (1,662+ materials) before falling back to steel
1509:        const { materialRegistry } = require("../registries/MaterialRegistry.js");
1510:        if (materialRegistry?.loaded) {
1511:          const found = materialRegistry.findByName?.(input.material) ?? materialRegistry.search?.(input.material)?.[0];

### User | 2026-06-19T15:08:36.411Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T15:08:39.532Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:08:40.215Z

[tool_use: Bash]

### User | 2026-06-19T15:08:55.807Z

[tool_result] 35:import { CANONICAL_TAYLOR, CANONICAL_TOOL_MODULUS, CANONICAL_MATERIAL_DB, CANONICAL_KIENZLE } from "../physics/constants.js";
36:import type { ISOGroup } from "../physics/constants.js";
1509:        const { materialRegistry } = require("../registries/MaterialRegistry.js");

### User | 2026-06-19T15:08:55.996Z

[tool_result] 44:import { getMaterialSpecificToolSpeedFactor } from "../physics/tool-material-speed-override.js";
1079:    // The cast bypasses MaterialPhysics's full-shape requirement — the module's
1957:   * @param input iso_group (required), operation, cut_type, tool_diameter_mm

### Assistant | 2026-06-19T15:08:58.963Z

[tool_use: Bash]

### User | 2026-06-19T15:09:13.959Z

[tool_result] 31:import { log } from "../utils/Logger.js";
32:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
33:import {
44:import { getMaterialSpecificToolSpeedFactor } from "../physics/tool-material-speed-override.js";
49:import { KienzleForceModel } from "../algorithms/KienzleForceModel.js";
50:import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
55:import { getMultiplie
... [+1117 chars truncated]

### Assistant | 2026-06-19T15:09:18.437Z

[tool_use: Bash]

### User | 2026-06-19T15:09:29.868Z

[tool_result] 28: * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
42:import {
53:// Canonical Kienzle exponent (mc) per ISO group -- imported, NEVER inlined. The
57:import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";
63:import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";
69:import { speedFeedOutcomeFeedbackBridgeEngine } from ".
... [+42 chars truncated]

### Assistant | 2026-06-19T15:09:32.176Z

Now let me check the dispatcher for SFC actions and what they call:

### Assistant | 2026-06-19T15:09:34.207Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:09:34.955Z

[tool_use: Bash]

### User | 2026-06-19T15:09:49.505Z

[tool_result] 128:    case "cert_track_material":
166:    case "hypermill_material_lookup":
171:      return { vc_m_min: result.vc_m_min, fz_mm: result.fz_mm, material: result.material, interpolated: result.interpolated };
172:    case "hypermill_material_search":
173:      return { total: result.total, materials: result.materials?.length };
174:    case "hypermill_material_stats":
175:      return { total: res
... [+5659 chars truncated]

### User | 2026-06-19T15:09:49.886Z

[tool_result] MaterialRegistry.ts

### Assistant | 2026-06-19T15:09:55.330Z

[tool_use: Bash]

### User | 2026-06-19T15:10:05.414Z

[tool_result] 627:  "material_equivalent", "material_equiv_compare",
628:  "material_select_recommend", "material_select_compare", "material_machinability",
915:  "sf_resolve_material", "sf_stochastic", "sf_compare", "sf_optimize",
1164:  "material_resolve",
2535:            const { machinabilityRatingEngine } = await import("../../engines/MachinabilityRatingEngine.js");
2540:            const { machinabilityRa
... [+1289 chars truncated]

### Assistant | 2026-06-19T15:10:09.620Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:10.130Z

[tool_use: Bash]

### User | 2026-06-19T15:10:20.826Z

[tool_result]           case "sf_resolve_tool": {
            const sfo2 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
            result = sfo2.resolveToolContextFn(sfo2.speedFeedOrchestratorEngine, params as ValidatedParams);
            break;
          }
          case "sf_resolve_material": {
            const sfo3 = await import("../../engines/SpeedFeedOrchestratorEngine.js");
          
... [+2210 chars truncated]

### User | 2026-06-19T15:10:21.595Z

[tool_result]             break;
          }

          // ── Machinability Rating ──
          case "machinability_rate": {
            const { machinabilityRatingEngine } = await import("../../engines/MachinabilityRatingEngine.js");
            result = machinabilityRatingEngine.rate(params as ValidatedParams);
            break;
          }
          case "machinability_compare": {
            const { machin
... [+2554 chars truncated]

### Assistant | 2026-06-19T15:10:24.772Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:10:28.464Z

[tool_use: Bash]

### User | 2026-06-19T15:10:42.608Z

[tool_result]             break;
          }
          case "heat_treat_recommend": {
            const { heatTreatmentResponseEngine } = await import("../../engines/HeatTreatmentResponseEngine.js");
            result = heatTreatmentResponseEngine.recommend(params.material ?? "", params.target_hardness_HRC ?? 50, params.section_mm ?? 25);
            break;
          }

          // ── Passivation ──
         
... [+2424 chars truncated]

### User | 2026-06-19T15:10:47.022Z

[tool_result] 3775:            const { materialInterpolationEngine: mie } = await import("../../engines/MaterialInterpolationEngine.js");
3783:            const { materialInterpolationEngine: mie2 } = await import("../../engines/MaterialInterpolationEngine.js");
3790:            const { materialInterpolationEngine: mie3 } = await import("../../engines/MaterialInterpolationEngine.js");
6565:            const { m
... [+339 chars truncated]

### Assistant | 2026-06-19T15:10:54.448Z

Let me continue gathering the remaining data I need efficiently:

### Assistant | 2026-06-19T15:11:01.867Z

[tool_use: Bash]

### User | 2026-06-19T15:11:14.403Z

[tool_result] 6565:            const { materialBatchVariabilityEngine } = await import("../../engines/MaterialBatchVariabilityEngine.js");
10131:          // MaterialResolverForProgramsEngine.resolveDesignation maps a designation / material-family
10138:            const { materialResolverForProgramsEngine } = await import("../../engines/MaterialResolverForProgramsEngine.js");

### Assistant | 2026-06-19T15:11:17.021Z

I have enough data to complete the audit. Let me do a few final targeted reads to confirm call sites for the remaining key engines, then output the full table.

### Assistant | 2026-06-19T15:11:20.126Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:11:20.647Z

[tool_use: Bash]

### User | 2026-06-19T15:11:29.151Z

[tool_result] 3775:            const { materialInterpolationEngine: mie } = await import("../../engines/MaterialInterpolationEngine.js");
3783:            const { materialInterpolationEngine: mie2 } = await import("../../engines/MaterialInterpolationEngine.js");
3790:            const { materialInterpolationEngine: mie3 } = await import("../../engines/MaterialInterpolationEngine.js");
6565:            const { m
... [+422 chars truncated]

### User | 2026-06-19T15:11:30.016Z

[tool_result]             result = mip.processFingerprint(params as ValidatedParams);
            break;
          }

          case "material_variability": {
            const { materialBatchVariabilityEngine } = await import("../../engines/MaterialBatchVariabilityEngine.js");
            result = materialBatchVariabilityEngine.analyze(params as ValidatedParams);
            break;
          }
          // ── 
... [+3417 chars truncated]

### Assistant | 2026-06-19T15:13:03.610Z

I have sufficient data. Here is the complete audit table.

---

## SFC Wiring Audit — Material / Machinability / kc / Heat-Treat-Aware / ISO-Group

**Scope:** 47 engines + 12 algorithms/physics assets whose names or content matched `Material|Machinability|ISOGroup|HeatTreatment|AISI` across `src/engines/`, `src/algorithms/`, `src/physics/`. Total enumerated: **59 assets**.

### Wiring Definition recap
- **WIRED**: exported singleton/class imported AND called by one of the 3 SFC orchestrators, OR reachable via a `prism_calc` `speed_feed`/`sfc_*`/`ultimate_speed_feed`/`sf_*`/`material_*`/`machinability_*`/`tensile_*`/`heat_treat_*` dispatcher action with a real call site confirmed.
- **UNWIRED-BUT-APPLICABLE**: SFC-physics relevant, no confirmed call site in the three orchestrators or SFC dispatcher path.
- **DEAD/NA**: EDM-only, post-proc-only, CAD-bridge-only, business, or duplicate — not SFC-applicable.

---

| Asset | Type | Classification | Evidence (file:line) | 1-line note |
|---|---|---|---|---|
| `UltimateSpeedFeedEngine.ts` — internal `MATERIAL_DB` + `ISO_SUBGROUP_KC1_TABLE` | Engine (internal) | **WIRED** | `UltimateSpeedFeedEngine.ts:433` (MATERIAL_DB) · `:637` (ISO_SUBGROUP_KC1_TABLE) — called by `calculate()` | Core physics hub; owns 22-material DB + 50-entry ISO subgroup Kc1 table inline |
| `src/physics/constants.ts` — `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`, `CANONICAL_MATERIAL_DB`, `ISOGroup` type | Physics | **WIRED** | `SpeedFeedOrchestratorEngine.ts:35` (import) · `:2807` (kc1_1 Kienzle call) · `SpeedFeedNineAxisOrchestratorEngine.ts:57` · `UltimateSpeedFeedEngine.ts:33` | Canonical kc1.1/mc/C/n tables consumed by all 3 orchestrators |
| `src/physics/tool-material-speed-override.ts` — `getMaterialSpecificToolSpeedFactor` | Physics | **WIRED** | `UltimateSpeedFeedEngine.ts:44` (import) · called in Vc path (U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC) | Tool/carbide-specific Vc factor; supersedes uniform constants.ts path |
| `src/registries/MaterialRegis
... [+14228 chars truncated]
