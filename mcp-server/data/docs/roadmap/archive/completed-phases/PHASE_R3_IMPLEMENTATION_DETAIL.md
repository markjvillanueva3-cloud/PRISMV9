# PHASE R3: IMPLEMENTATION DETAIL
## TypeScript Interfaces, Chain Failure Handling, File Locations
## v14.0 Companion Document — Use alongside PHASE_R3_CAMPAIGNS.md

---

## PURPOSE

PHASE_R3_CAMPAIGNS.md defines WHAT each action does and HOW to test it.
This document defines WHERE to put the code, WHAT the TypeScript interfaces look like,
and HOW to handle failures mid-chain. A fresh session should be able to implement
any R3 action by reading both documents — zero questions required.

---

## FILE ARCHITECTURE

### New Files to Create
```
src/engines/IntelligenceEngine.ts        — Primary engine for job_plan, what_if, material_substitute
src/engines/WearPredictionEngine.ts      — Wear modeling (extends ManufacturingCalculations)
src/tools/dispatchers/intelligenceDispatcher.ts — New dispatcher for intelligence actions
src/types/intelligence.ts                — All R3 interfaces
src/__tests__/intelligence.test.ts       — Integration tests
```

### Existing Files to Modify
```
src/tools/dispatchers/dataDispatcher.ts  — Add: machine_recommend, material_substitute
src/tools/dispatchers/calcDispatcher.ts  — Add: wear_prediction, process_cost, uncertainty_chain, controller_optimize
src/registries/ToolpathStrategyRegistry.ts — Already has 182KB of strategies; wire to job_plan
src/engines/ManufacturingCalculations.ts — Add process_cost helper functions
src/engines/ToolpathCalculations.ts      — Wire strategy selection to job_plan
src/types/index.ts                       — Export new intelligence types
```

### Registry Dependencies (must be loaded from R1)
```
MaterialRegistry.ts    — material_get for properties
MachineRegistry.ts     — machine capabilities, power, torque
ToolRegistry.ts        — tool recommendations (R1-MS5 must complete first)
AlarmRegistry.ts       — controller alarm codes for controller_optimize
ToolpathStrategyRegistry.ts — strategy_for_feature (R1-MS8 wires this)
```

---

## SHARED TYPES (src/types/intelligence.ts)

```typescript
// ─── BASE TYPES ──────────────────────────────────────────────

export interface CuttingParams {
  Vc: number;              // cutting speed m/min
  fz: number;              // feed per tooth mm
  ap: number;              // axial depth mm
  ae: number;              // radial engagement mm
  n?: number;              // spindle RPM (calculated if not provided)
  Vf?: number;             // feed rate mm/min (calculated if not provided)
}

export interface ToolRecommendation {
  type: string;            // e.g., "endmill", "insert", "drill"
  diameter: number;        // mm
  teeth: number;
  material: string;        // e.g., "carbide", "HSS", "cermet"
  coating?: string;        // e.g., "TiAlN", "AlCrN"
  catalogRef?: string;     // manufacturer part number if available
}

export interface SafetyResult {
  score: number;           // S(x) value, must be ≥ 0.70
  factors: Array<{
    name: string;
    value: number;
    threshold: number;
    status: "pass" | "warning" | "fail";
  }>;
  blocked: boolean;        // true if S(x) < 0.70
  blockReason?: string;
}

export interface UncertaintyRange {
  value: number;
  low: number;             // lower bound (typically 95% CI)
  high: number;            // upper bound
  confidence: number;      // 0-1
  source: string;          // what model produced this
}

// ─── JOB PLAN ──────────────────────────────────────────────

export interface JobPlanInput {
  material: string;
  operation: "milling" | "turning" | "drilling" | "threading" | "boring" | "reaming";
  machine?: string;        // machine ID; if omitted, uses generic capabilities
  tool_diameter?: number;  // mm; if omitted, auto-selected
  total_stock?: number;    // mm stock to remove
  feature?: {
    type: "pocket" | "profile" | "slot" | "face" | "hole" | "bore" | "thread";
    width?: number;
    depth?: number;
    length?: number;
  };
  constraints?: {
    maxRPM?: number;
    maxPower?: number;     // kW
    requiredRa?: number;   // μm surface finish
    tolerance?: number;    // mm
    coolant?: string;
  };
}

export interface JobPlanOutput {
  summary: {
    material: string;
    operation: string;
    machine: string;
    totalCycleTime: number;  // minutes
  };
  tool: ToolRecommendation;
  roughing: {
    params: CuttingParams;
    MRR: number;             // cm³/min
    power: number;           // kW
    torque: number;          // Nm
    passes: number;
    cycleTime: number;       // minutes
  };
  finishing?: {
    params: CuttingParams;
    expectedRa: number;      // μm
    passes: number;
    cycleTime: number;
  };
  toolLife: UncertaintyRange;  // minutes
  toolpathStrategy: {
    name: string;
    reason: string;
    alternatives: string[];
  };
  safety: SafetyResult;
  warnings: string[];
  chainLog: ChainLogEntry[];  // for debugging chain failures
}

// ─── CHAIN FAILURE TRACKING ──────────────────────────────────

export interface ChainLogEntry {
  step: number;
  action: string;          // e.g., "material_get", "speed_feed_calc"
  status: "success" | "fallback" | "failed";
  durationMs: number;
  result?: any;
  error?: string;
  fallbackUsed?: string;   // what fallback was applied
}

export type ChainFailureStrategy = "abort" | "fallback" | "skip" | "degrade";

export interface ChainStepConfig {
  name: string;
  action: () => Promise<any>;
  required: boolean;         // if true, chain aborts on failure
  fallback?: () => Promise<any>;  // alternative if primary fails
  failureStrategy: ChainFailureStrategy;
  timeoutMs: number;
}

// ─── SETUP SHEET ──────────────────────────────────────────────

export interface SetupSheetInput {
  jobPlan: JobPlanOutput;    // from job_plan action
  format: "text" | "markdown" | "json";
  includeGCode?: boolean;
}

export interface SetupSheetOutput {
  header: {
    date: string;
    material: string;
    machine: string;
    partNumber?: string;
    operatorNotes?: string;
  };
  toolList: Array<{
    position: number;
    tool: ToolRecommendation;
    usage: string;           // "roughing" | "finishing"
  }>;
  operations: Array<{
    step: number;
    description: string;
    params: CuttingParams;
    notes: string;
  }>;
  safety: {
    clampForce?: string;
    maxRPM: number;
    coolant: string;
    warnings: string[];
  };
  formatted: string;        // ready-to-print text
}

// ─── WEAR PREDICTION ──────────────────────────────────────────

export interface WearPredictionInput {
  material: string;
  cutting_speed: number;     // m/min
  feed_per_tooth: number;    // mm
  depth_of_cut: number;      // mm
  tool_material: string;     // "carbide" | "HSS" | "cermet" | "ceramic" | "CBN"
  coating?: string;
  coolant: string;
}

export interface WearPredictionOutput {
  taylorToolLife: UncertaintyRange;  // minutes
  wearCurve: Array<{
    timeMinutes: number;
    flankWearMm: number;
    craterDepthMm: number;
  }>;
  wearMode: "flank" | "crater" | "notch" | "BUE" | "thermal_crack";
  dominantMechanism: "abrasion" | "adhesion" | "diffusion" | "oxidation";
  endOfLifeCriterion: string;  // e.g., "VBmax = 0.3mm"
  recommendation: string;
}

// ─── PROCESS COST ──────────────────────────────────────────────

export interface ProcessCostInput {
  material: string;
  operation: string;
  tool_diameter: number;
  total_stock: number;       // mm to remove
  machine?: string;
  batch_size?: number;
  labor_rate?: number;       // $/hr override
}

export interface ProcessCostOutput {
  perPart: {
    machineCost: number;
    toolCost: number;
    laborCost: number;
    materialCost?: number;
    totalCost: number;
  };
  cycleTime: number;         // minutes
  toolChanges: number;
  costPerCubicCm: number;    // $/cm³ MRR efficiency metric
  breakdown: Array<{ category: string; amount: number; pct: number }>;
}

// ─── UNCERTAINTY CHAIN ──────────────────────────────────────────

export interface UncertaintyChainInput {
  material: string;
  tool_diameter: number;
  operation: string;
  depth_of_cut?: number;
  feed?: number;
}

export interface UncertaintyChainOutput {
  parameters: {
    Vc: UncertaintyRange;
    fz: UncertaintyRange;
    ap: UncertaintyRange;
    ae: UncertaintyRange;
  };
  toolLife: UncertaintyRange;
  MRR: UncertaintyRange;
  power: UncertaintyRange;
  dominantUncertainty: string;  // which input has most effect
  recommendation: string;       // how to reduce uncertainty
}

// ─── MATERIAL SUBSTITUTE ──────────────────────────────────────────

export interface MaterialSubstituteInput {
  material: string;
  reason: "cost" | "availability" | "machinability" | "strength" | "corrosion" | "weight";
  constraints?: {
    minYieldStrength?: number;   // MPa
    maxHardness?: number;        // HRC
    maxCost?: number;            // relative
    mustBeWeldable?: boolean;
    mustBeFDAApproved?: boolean;
  };
}

export interface MaterialSubstituteOutput {
  substitutes: Array<{
    material: string;
    similarity: number;          // 0-1 overall match
    tradeoffs: {
      machinability: "better" | "similar" | "worse";
      cost: "cheaper" | "similar" | "more_expensive";
      strength: "stronger" | "similar" | "weaker";
      availability: "easier" | "similar" | "harder";
    };
    parameterChanges: {
      Vc: { factor: number; reason: string };  // e.g., 1.3 = 30% faster
      fz: { factor: number; reason: string };
    };
    warnings: string[];
  }>;
  reasoning: string;
}

// ─── MACHINE RECOMMEND ──────────────────────────────────────────

export interface MachineRecommendInput {
  material: string;
  operation: string;
  partDimensions: {
    maxX: number;               // mm
    maxY: number;
    maxZ: number;
  };
  requirements: {
    axes?: number;              // 3, 4, or 5
    minPower?: number;          // kW
    minTorque?: number;         // Nm
    minRPM?: number;
    tolerance?: number;         // mm
    surfaceFinish?: number;     // Ra μm
  };
}

export interface MachineRecommendOutput {
  recommendations: Array<{
    machine: string;            // machine ID from registry
    manufacturer: string;
    model: string;
    score: number;              // 0-1 fit score
    capabilities: {
      axes: number;
      power: number;            // kW
      torque: number;           // Nm
      maxRPM: number;
      travelX: number;
      travelY: number;
      travelZ: number;
    };
    fitAnalysis: {
      powerMargin: number;      // % headroom
      sizeMargin: number;       // % headroom
      speedCapability: string;  // "adequate" | "limited" | "ideal"
    };
    estimatedCycleTime: number; // minutes
  }>;
  eliminatedMachines: Array<{
    machine: string;
    reason: string;             // "insufficient_power" | "too_small" | "wrong_axes"
  }>;
}

// ─── CONTROLLER OPTIMIZE ──────────────────────────────────────────

export interface ControllerOptimizeInput {
  controller: string;          // "fanuc" | "siemens" | "heidenhain" | "mazak" | "haas" | etc.
  operation: string;
  params: CuttingParams;
  features?: string[];         // e.g., ["high_speed_mode", "look_ahead", "nano_smoothing"]
}

export interface ControllerOptimizeOutput {
  optimizations: Array<{
    setting: string;           // e.g., "G05.1 Q1" (Fanuc AICC)
    description: string;
    expectedBenefit: string;
    risk: "none" | "low" | "medium";
  }>;
  gCodeBlock?: string;         // controller-specific G-code snippet
  warnings: string[];
  controllerSpecificNotes: string;
}

// ─── WHAT-IF ──────────────────────────────────────────────

export interface WhatIfInput {
  baseJob: JobPlanInput;
  change: {
    parameter: string;         // "cutting_speed" | "feed" | "depth" | "tool" | "material" | "machine"
    newValue: any;
  };
}

export interface WhatIfOutput {
  baseline: JobPlanOutput;
  modified: JobPlanOutput;
  delta: {
    cycleTime: { absolute: number; pct: number };
    toolLife: { absolute: number; pct: number };
    cost: { absolute: number; pct: number };
    power: { absolute: number; pct: number };
    surfaceFinish?: { absolute: number; pct: number };
  };
  recommendation: string;     // "the change is beneficial" or "the change increases risk"
  safetyDelta: {
    before: number;
    after: number;
    acceptable: boolean;
  };
}
```

---

## CHAIN FAILURE HANDLING PROTOCOL

### The Problem
`job_plan` chains 8 internal calls. If call #3 (tool_select) fails because the tool registry
has no matching tool, the entire chain should NOT abort. Instead:

### Chain Architecture
```typescript
// src/engines/IntelligenceEngine.ts

class IntelligenceEngine {
  
  private async executeChain(steps: ChainStepConfig[]): Promise<{
    results: Map<string, any>;
    log: ChainLogEntry[];
    degraded: boolean;
  }> {
    const results = new Map<string, any>();
    const log: ChainLogEntry[] = [];
    let degraded = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startTime = Date.now();
      
      try {
        // Attempt primary action with timeout
        const result = await Promise.race([
          step.action(),
          this.timeout(step.timeoutMs)
        ]);
        
        log.push({
          step: i,
          action: step.name,
          status: "success",
          durationMs: Date.now() - startTime,
          result
        });
        results.set(step.name, result);
        
      } catch (error) {
        // Primary failed — try fallback or handle
        if (step.required && step.failureStrategy === "abort") {
          log.push({
            step: i,
            action: step.name,
            status: "failed",
            durationMs: Date.now() - startTime,
            error: error.message
          });
          throw new ChainAbortError(step.name, error, log);
        }
        
        if (step.fallback) {
          try {
            const fallbackResult = await step.fallback();
            log.push({
              step: i,
              action: step.name,
              status: "fallback",
              durationMs: Date.now() - startTime,
              result: fallbackResult,
              fallbackUsed: "yes"
            });
            results.set(step.name, fallbackResult);
            degraded = true;
          } catch (fallbackError) {
            // Both primary and fallback failed
            if (step.required) {
              throw new ChainAbortError(step.name, fallbackError, log);
            }
            log.push({
              step: i,
              action: step.name,
              status: "failed",
              durationMs: Date.now() - startTime,
              error: `Primary: ${error.message}, Fallback: ${fallbackError.message}`
            });
            degraded = true;
          }
        } else {
          // No fallback, skip or degrade
          log.push({
            step: i,
            action: step.name,
            status: "failed",
            durationMs: Date.now() - startTime,
            error: error.message
          });
          degraded = true;
        }
      }
    }

    return { results, log, degraded };
  }
}
```

### job_plan Chain Definition (8 steps)

```typescript
const jobPlanChain: ChainStepConfig[] = [
  {
    name: "material_get",
    action: () => this.materialRegistry.getMaterial(input.material),
    required: true,                    // Can't proceed without material
    failureStrategy: "abort",
    timeoutMs: 5000
  },
  {
    name: "machine_capabilities",
    action: () => this.machineRegistry.getMachine(input.machine),
    required: false,                   // Can use generic if machine unknown
    fallback: () => this.getGenericMachineCapabilities(input.operation),
    failureStrategy: "fallback",
    timeoutMs: 5000
  },
  {
    name: "tool_select",
    action: () => this.toolRegistry.recommendTool(input),
    required: false,                   // Can use generic tool recommendation
    fallback: () => this.getGenericToolRecommendation(input.operation, input.tool_diameter),
    failureStrategy: "fallback",
    timeoutMs: 5000
  },
  {
    name: "speed_feed_calc",
    action: () => this.calcEngine.speedFeed(materialData, toolData, machineData),
    required: true,                    // Core calculation — must succeed
    failureStrategy: "abort",
    timeoutMs: 10000
  },
  {
    name: "force_calc",
    action: () => this.calcEngine.cuttingForce(materialData, params),
    required: true,                    // Safety-critical
    failureStrategy: "abort",
    timeoutMs: 10000
  },
  {
    name: "tool_life_calc",
    action: () => this.calcEngine.toolLife(materialData, params),
    required: false,                   // Can estimate if model unavailable
    fallback: () => this.estimateToolLifeConservative(materialData, params),
    failureStrategy: "fallback",
    timeoutMs: 10000
  },
  {
    name: "strategy_select",
    action: () => this.toolpathEngine.strategyForFeature(input.feature, materialData),
    required: false,                   // Can default to conventional if unavailable
    fallback: () => ({ name: "conventional", reason: "default — strategy engine unavailable" }),
    failureStrategy: "fallback",
    timeoutMs: 5000
  },
  {
    name: "safety_validate",
    action: () => this.validateSafety(allResults),
    required: true,                    // NEVER skip safety
    failureStrategy: "abort",
    timeoutMs: 5000
  }
];
```

### Chain Failure Outcomes

| Failure Point | Required? | Fallback Available? | Outcome |
|--------------|-----------|---------------------|---------|
| material_get fails | YES | NO | **ABORT** — "Material not found in registry" |
| machine_capabilities fails | NO | YES | **DEGRADE** — Use generic machine, warn user |
| tool_select fails | NO | YES | **DEGRADE** — Generic tool recommendation, warn user |
| speed_feed_calc fails | YES | NO | **ABORT** — "Cannot calculate parameters" |
| force_calc fails | YES | NO | **ABORT** — "Cannot validate cutting forces" |
| tool_life_calc fails | NO | YES | **DEGRADE** — Conservative estimate, confidence=low |
| strategy_select fails | NO | YES | **DEGRADE** — Default to conventional strategy |
| safety_validate fails | YES | NO | **ABORT** — "Safety validation failed: S(x) < 0.70" |

### Degraded Output Marking
When chain runs with fallbacks, the output MUST include:
```typescript
{
  ...normalOutput,
  degraded: true,
  degradedSteps: ["tool_select", "tool_life_calc"],
  confidenceReduction: 0.15,  // reduced from normal confidence
  warnings: [
    "Tool recommendation is generic — tool registry not fully loaded. Load tools via R1-MS5.",
    "Tool life is estimated conservatively — advanced wear model unavailable."
  ]
}
```

---

## ACTION IMPLEMENTATION TEMPLATES

### Template: Adding an Action to calcDispatcher

```typescript
// In src/tools/dispatchers/calcDispatcher.ts

// 1. Import the engine
import { WearPredictionEngine } from "../../engines/WearPredictionEngine.js";

// 2. Add to action handler switch
case "wear_prediction": {
  const engine = new WearPredictionEngine(this.materialRegistry);
  const input = this.validateInput<WearPredictionInput>(args, WearPredictionSchema);
  
  // Pre-calc hooks fire here (automatic via CalcHookMiddleware)
  const result = await engine.predict(input);
  
  // Safety check
  if (result.safety && result.safety.score < 0.70) {
    return this.safetyBlock(result, "wear_prediction");
  }
  
  // Post-calc hooks fire here
  return {
    success: true,
    action: "wear_prediction",
    data: result,
    _meta: {
      engineVersion: engine.version,
      calculationTime: Date.now() - startTime,
      safetyScore: result.safety?.score
    }
  };
}

// 3. Add input validation schema
const WearPredictionSchema = {
  required: ["material", "cutting_speed", "feed_per_tooth", "depth_of_cut", "tool_material"],
  properties: {
    material: { type: "string" },
    cutting_speed: { type: "number", minimum: 0.1 },
    feed_per_tooth: { type: "number", minimum: 0.001 },
    depth_of_cut: { type: "number", minimum: 0.01 },
    tool_material: { type: "string", enum: ["carbide", "HSS", "cermet", "ceramic", "CBN", "PCD"] },
    coating: { type: "string" },
    coolant: { type: "string", default: "flood" }
  }
};
```

### Template: Adding an Action to dataDispatcher

```typescript
// In src/tools/dispatchers/dataDispatcher.ts

case "material_substitute": {
  const engine = new IntelligenceEngine(this.registries);
  const input = this.validateInput<MaterialSubstituteInput>(args, MaterialSubstituteSchema);
  
  // 1. Get source material properties
  const sourceMaterial = await this.materialRegistry.getMaterial(input.material);
  if (!sourceMaterial) {
    return this.error(`Material '${input.material}' not found in registry`);
  }
  
  // 2. Find substitutes based on reason
  const substitutes = await engine.findSubstitutes(sourceMaterial, input.reason, input.constraints);
  
  // 3. For each substitute, calculate parameter adjustments
  for (const sub of substitutes) {
    sub.parameterChanges = await engine.calculateParameterAdjustment(
      sourceMaterial, 
      sub.material
    );
  }
  
  return {
    success: true,
    action: "material_substitute",
    data: { substitutes, reasoning: engine.getReasoningChain() }
  };
}
```

---

## CONTROLLER-SPECIFIC IMPLEMENTATION (controller_optimize)

### Source Assets per Controller
| Controller | Skill File | Size | Key Patterns |
|-----------|------------|------|--------------|
| Fanuc | prism-fanuc-programming | 54.6KB | G05.1 AICC, G08 look-ahead, nano smoothing |
| Siemens | prism-siemens-programming | 51.5KB | CYCLE832, TRAORI, compressor |
| Heidenhain | prism-heidenhain-programming | 53KB | M128 TCPM, FUNCTION TCPM, tolerance |
| Mazak | (embedded in controller DB) | — | SPS, MAZATROL conversational |
| Haas | (embedded in controller DB) | — | G187 smoothness, G154 work offsets |
| All | prism-gcode-reference | 62KB | Universal G/M codes |

### Implementation Approach
```typescript
// src/engines/ControllerOptimizeEngine.ts

class ControllerOptimizeEngine {
  private optimizations: Record<string, ControllerProfile> = {
    fanuc: {
      highSpeedMode: {
        setting: "G05.1 Q1",
        description: "AI Contour Control — smooths toolpath at high feeds",
        applicableWhen: (params) => params.Vf > 5000, // mm/min
        risk: "low",
        benefit: "Reduces cycle time 10-25% on 3D contours"
      },
      lookAhead: {
        setting: "G08 P1",
        description: "Look-ahead on — pre-reads blocks for smooth deceleration",
        applicableWhen: () => true, // always beneficial
        risk: "none",
        benefit: "Prevents jerky motion at direction changes"
      },
      nanoSmoothing: {
        setting: "G5.1 Q1 (with nano CNC option)",
        description: "Nano interpolation for ultra-smooth surfaces",
        applicableWhen: (params) => params.operation === "finishing",
        risk: "low",
        benefit: "Mirror finish quality on contoured surfaces"
      }
      // ... more optimizations from prism-fanuc-programming skill
    },
    siemens: {
      cycle832: {
        setting: "CYCLE832(tolerance, mode)",
        description: "High-speed settings — sets compressor, look-ahead, jerk limits",
        applicableWhen: (params) => params.operation === "milling",
        risk: "low",
        benefit: "One-call setup for all HSM parameters"
      },
      traori: {
        setting: "TRAORI / TRAFOOF",
        description: "5-axis transformation — RTCP/TCPM equivalent",
        applicableWhen: (params) => params.axes >= 5,
        risk: "medium",
        benefit: "Required for 5-axis simultaneous machining"
      }
    },
    heidenhain: {
      tcpm: {
        setting: "M128 or FUNCTION TCPM",
        description: "Tool Center Point Management",
        applicableWhen: (params) => params.axes >= 5,
        risk: "medium",
        benefit: "Maintains tool contact during rotary moves"
      },
      tolerance: {
        setting: "TOLERANCE / CYCL DEF 32",
        description: "Contour tolerance for path smoothing",
        applicableWhen: () => true,
        risk: "low",
        benefit: "Balances accuracy vs speed"
      }
    }
    // haas, mazak, okuma, brother, doosan, DMG, etc.
  };
}
```

---

## DATA CAMPAIGN IMPLEMENTATION (MS4)

### Batch Execution Pattern
```typescript
// Campaign state management for data validation campaigns

interface CampaignState {
  campaign_id: string;
  total_batches: number;
  completed_batch_ids: string[];  // DC-3: array not count
  current_batch: string | null;
  error_count: number;
  quarantined_materials: string[];
  last_update: string;           // ISO timestamp
}

// Batch execution with rate limiting (SL-1: 10 materials per batch)
async function executeBatch(materials: string[], batchId: string): Promise<BatchResult> {
  const BATCH_SIZE = 10;         // SL-1 correction
  const CONCURRENCY = 3;         // p-queue concurrency
  const OPS_PER_MATERIAL = 5;    // turning, milling, drilling, threading, boring
  
  const queue = new PQueue({ concurrency: CONCURRENCY, intervalCap: 10, interval: 60000 });
  const results: CalcResult[] = [];
  const errors: CalcError[] = [];
  
  for (const material of materials.slice(0, BATCH_SIZE)) {
    for (const operation of ["turning", "milling", "drilling", "threading", "boring"]) {
      queue.add(async () => {
        try {
          const result = await this.calcEngine.speedFeed({ material, operation });
          results.push({ material, operation, ...result });
        } catch (error) {
          errors.push({ material, operation, error: error.message });
        }
      });
    }
  }
  
  await queue.onIdle();
  
  // Quarantine materials with >2 failures
  const failCounts = new Map<string, number>();
  for (const err of errors) {
    failCounts.set(err.material, (failCounts.get(err.material) || 0) + 1);
  }
  const quarantined = [...failCounts.entries()]
    .filter(([_, count]) => count > 2)
    .map(([material]) => material);
  
  return { batchId, results, errors, quarantined };
}
```

---

## R1-MS6 MERGE PROTOCOL (Material Enrichment)

### The Problem
R1-MS6 says "merge tribology/composition from materials_complete/ into canonical materials/"
but doesn't specify the merge mechanics.

### Merge Specification

**Source files**:
- `C:\PRISM\extracted\materials_complete\P_STEELS_complete.js` (5MB)
- `C:\PRISM\extracted\materials_complete\M_STAINLESS_complete.js` (2.1MB)
- `C:\PRISM\extracted\materials_enhanced\` (14 files, 4.2MB)

**Target**: MaterialRegistry.ts data loading pipeline

**Merge key**: Material name/designation (e.g., "4140", "316SS", "Inconel_718")
Match algorithm: Exact match → normalized match (strip spaces, case-insensitive) → fuzzy match (Levenshtein distance ≤ 2)

**Field priority** (on conflict):
1. materials_complete/ has highest priority (most comprehensive data)
2. materials_enhanced/ has second priority (enrichment data)
3. Existing registry data has lowest priority (original extraction)

**Fields to merge**:
```typescript
interface MaterialEnrichment {
  // From materials_enhanced/ tribology files
  frictionCoefficient?: Record<string, number>;  // keyed by counter-material
  wearRate?: Record<string, number>;
  adhesionTendency?: string;
  
  // From materials_enhanced/ composition files
  composition?: Record<string, number>;  // element → percentage
  
  // From materials_complete/ comprehensive files
  thermalConductivity?: number;           // W/(m·K)
  thermalDiffusivity?: number;            // mm²/s
  specificHeat?: number;                  // J/(kg·K)
  meltingPoint?: number;                  // °C
  thermalExpansionCoeff?: number;         // μm/(m·°C)
  
  // Johnson-Cook params (from PRISM_JOHNSON_COOK_DATABASE.js)
  johnsonCook?: {
    A: number; B: number; n: number; C: number; m: number; T_melt: number;
  };
}
```

**Merge validation**:
1. Before merge: Count fields per material in target registry → baseline
2. After merge: Count fields per material → must be ≥ baseline (never lose data)
3. Spot check: 5 random materials, verify merged fields against source
4. Schema validation: All merged materials still pass 127-parameter schema

**Conflict resolution log**:
```
C:\PRISM\mcp-server\data\docs\R1_MERGE_CONFLICTS.md
Format: | Material | Field | Old Value | New Value | Source | Action |
```

**Rollback**: Git snapshot before merge. If validation fails → `git checkout -- src/registries/MaterialRegistry.ts`

---

## CROSS-REFERENCE: R3 ACTION → SOURCE ASSET → ENGINE

| R3 Action | Primary Engine | Key Source Assets | New Lines |
|-----------|---------------|-------------------|-----------|
| job_plan | IntelligenceEngine.ts | ManufacturingCalc + ToolpathCalc + all registries | ~350 |
| setup_sheet | IntelligenceEngine.ts | job_plan output → formatting | ~100 |
| wear_prediction | WearPredictionEngine.ts | PRISM_TOOL_WEAR_MODELS.js (21KB) | ~200 |
| process_cost | ManufacturingCalculations.ts | PRISM_COST_DATABASE.js (288KB) | ~150 |
| uncertainty_chain | ManufacturingCalculations.ts | prism-uncertainty-propagation skill | ~200 |
| material_substitute | IntelligenceEngine.ts | MaterialRegistry + property comparison | ~200 |
| machine_recommend | IntelligenceEngine.ts | MachineRegistry + capability filtering | ~150 |
| controller_optimize | ControllerOptimizeEngine.ts | 3 controller skills (159KB total) | ~250 |
| what_if | IntelligenceEngine.ts | job_plan × 2 + delta calculation | ~150 |
| novel_strategies | ToolpathCalculations.ts | ToolpathStrategyRegistry (182KB) | ~100 |
| unified_search | KnowledgeQueryEngine.ts | All registries + cross-search | ~100 |

**Total new code: ~1,950 lines**

---

*This implementation detail document ensures any session can implement R3 actions without asking questions about architecture, types, file locations, or failure handling.*
