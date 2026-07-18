/**
 * MultiProcessCAMRouterEngine — Unified Multi-Process CAM Router (CK-MS3)
 *
 * Accepts any manufacturing process request and routes to the correct assembler
 * engine, orchestrating multi-process jobs (e.g., turning + grinding + EDM).
 *
 * Responsibilities:
 *   1. Accept a multi-process part description with features + tolerances
 *   2. Auto-detect which processes are needed from feature geometry
 *   3. Sequence processes per manufacturing engineering rules
 *   4. Route each sub-operation to the correct assembler
 *   5. Merge all programs into a unified job package
 *   6. Compute total cycle time, cost, and MC uncertainty across all processes
 *
 * Process routing intelligence:
 *   - Tolerance-driven process selection (IT grade → process capability)
 *   - Surface finish driven selection (Ra target → process selection)
 *   - Material condition tracking (annealed → hardened → ground)
 *   - Multi-setup datum transfer strategy
 *   - Monte Carlo CI95 across all process steps
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/MultiProcessCAMRouterEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// ATOMIC VALUE WRAPPER
// ============================================================================

/** Generic atomic value with units, optional formula provenance, and confidence. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number; // 0–1
}

// ============================================================================
// INPUT INTERFACES
// ============================================================================

/** Raw stock type for the part. */
export type RawStockType = "bar" | "plate" | "forging" | "casting";

/** Feature type taxonomy. */
export type FeatureType =
  | "od_cylinder"
  | "id_bore"
  | "face"
  | "pocket"
  | "slot"
  | "thread_external"
  | "thread_internal"
  | "profile_2d"
  | "cavity_3d"
  | "surface_finish_zone"
  | "freeform_surface"
  | "chamfer"
  | "radius_fillet"
  | "keyway"
  | "spline"
  | "gear_tooth"
  | "hole_pattern"
  | "counterbore"
  | "countersink"
  | "undercut"
  | "taper"
  | "groove"
  | "knurl"
  | "cross_hole";

/** A geometric feature on the part to be manufactured. */
export interface ProcessFeature {
  id: string;
  type: FeatureType | string;
  dimensions: Record<string, number>; // e.g. { diameter_mm: 25, length_mm: 50 }
  notes?: string;
}

/** Complete multi-process part description. */
export interface MultiProcessPart {
  part_name: string;
  material: string;              // e.g. "4340 Steel", "Ti-6Al-4V", "Aluminum 6061"
  hardness_hrc?: number;         // if pre-hardened
  raw_stock: {
    type: RawStockType;
    dimensions: Record<string, number>;
  };
  features: ProcessFeature[];
  tolerances?: {
    feature_id: string;
    tolerance_grade: string;     // e.g. "IT6", "IT7"
    value_mm: number;
  }[];
  surface_finishes?: {
    feature_id: string;
    Ra_um: number;               // Ra in micrometres
  }[];
  batch_size?: number;
  priority?: "cost" | "speed" | "quality";
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

/** Supported manufacturing processes. */
export type ManufacturingProcess =
  | "turning"
  | "milling"
  | "grinding_surface"
  | "grinding_cylindrical"
  | "grinding_centerless"
  | "grinding_internal"
  | "wire_edm"
  | "sinker_edm"
  | "laser_cut"
  | "laser_mark"
  | "waterjet"
  | "heat_treatment"
  | "surface_treatment"
  | "drilling"
  | "boring"
  | "honing"
  | "lapping";

/** A single step in the process route. */
export interface ProcessStep {
  sequence: number;
  process: ManufacturingProcess;
  features_addressed: string[];
  machine_type: string;
  estimated_cycle_time_s: AtomicValue<number>;
  setup_time_s: AtomicValue<number>;
  tooling_cost: AtomicValue<number>;
  machine_rate_per_hr: AtomicValue<number>;
  work_holding: string;
  notes: string;
  tolerance_achievable?: { IT_grade: string; Ra_um_min: number; Ra_um_max: number };
  process_phase: "rough" | "semi_finish" | "finish" | "super_finish" | "non_material_removal";
}

/** Cost breakdown for the entire route. */
export interface CostBreakdown {
  machining_cost: AtomicValue<number>;
  tooling_cost: AtomicValue<number>;
  setup_cost: AtomicValue<number>;
  total_cost_per_part: AtomicValue<number>;
  total_cost_batch: AtomicValue<number>;
  cost_by_process: Record<string, number>;
}

/** Uncertainty metrics across all processes. */
export interface MultiProcessUncertainty {
  cycle_time_CI95_s: { lower: number; upper: number };
  total_cost_CI95: { lower: number; upper: number };
  critical_path_process: string;
  dominant_cost_driver: string;
  dimension_uncertainty_um: Record<string, number>; // feature_id → ±µm
  overall_confidence: number; // 0–1
  mc_samples: number;
}

/** Complete process route for a multi-process part. */
export interface ProcessRoute {
  steps: ProcessStep[];
  total_cycle_time_s: AtomicValue<number>;
  total_cost: CostBreakdown;
  uncertainty: MultiProcessUncertainty;
  setup_count: number;
  datum_strategy: string;
  material_condition_tracking: { step: number; condition: string }[];
}

/** Feature analysis result — what processes are capable and recommended. */
export interface FeatureAnalysis {
  feature_id: string;
  feature_type: string;
  detected_processes: ManufacturingProcess[];
  recommended_process: ManufacturingProcess;
  required_IT_grade: string;
  required_Ra_um: number;
  tolerance_driven: boolean;
  finish_driven: boolean;
  hardness_driven: boolean;
  priority_notes: string;
}

/** Batch cost analysis for varying quantities. */
export interface BatchCostAnalysis {
  batch_size: number;
  cost_per_part: AtomicValue<number>;
  total_batch_cost: AtomicValue<number>;
  setup_amortized_per_part: AtomicValue<number>;
  breakeven_batch: number;
  recommended_lot_size: number;
}

/** Process alternatives for a given feature. */
export interface ProcessAlternative {
  process: ManufacturingProcess;
  achievable_IT: string;
  achievable_Ra_um: number;
  cycle_time_s: number;
  cost_per_feature: number;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

/** Suggestion to consolidate or eliminate process steps. */
export interface ConsolidationSuggestion {
  type: "eliminate_step" | "combine_steps" | "resequence" | "process_substitution";
  affected_steps: number[];
  description: string;
  estimated_savings_pct: number;
  feasibility: "high" | "medium" | "low";
}

// ============================================================================
// INTERNAL CONSTANTS
// ============================================================================

/** Machine hourly rates (USD) — min/nominal/max */
const MACHINE_RATES: Record<ManufacturingProcess, { min: number; nominal: number; max: number }> = {
  turning:               { min: 65,  nominal: 75,  max: 85  },
  milling:               { min: 75,  nominal: 95,  max: 120 },
  grinding_surface:      { min: 90,  nominal: 115, max: 150 },
  grinding_cylindrical:  { min: 90,  nominal: 120, max: 150 },
  grinding_centerless:   { min: 80,  nominal: 105, max: 140 },
  grinding_internal:     { min: 95,  nominal: 125, max: 155 },
  wire_edm:              { min: 60,  nominal: 80,  max: 100 },
  sinker_edm:            { min: 55,  nominal: 72,  max: 90  },
  laser_cut:             { min: 80,  nominal: 105, max: 130 },
  laser_mark:            { min: 50,  nominal: 65,  max: 80  },
  waterjet:              { min: 50,  nominal: 65,  max: 80  },
  heat_treatment:        { min: 30,  nominal: 45,  max: 60  },
  surface_treatment:     { min: 40,  nominal: 55,  max: 75  },
  drilling:              { min: 55,  nominal: 70,  max: 90  },
  boring:                { min: 70,  nominal: 90,  max: 110 },
  honing:                { min: 85,  nominal: 105, max: 130 },
  lapping:               { min: 75,  nominal: 95,  max: 120 },
};

/** Setup time per process in seconds (min/nominal/max) */
const SETUP_TIMES_S: Record<ManufacturingProcess, { min: number; nominal: number; max: number }> = {
  turning:               { min: 1800, nominal: 2700,  max: 3600  },
  milling:               { min: 2700, nominal: 3600,  max: 5400  },
  grinding_surface:      { min: 3600, nominal: 4500,  max: 7200  },
  grinding_cylindrical:  { min: 3600, nominal: 4800,  max: 7200  },
  grinding_centerless:   { min: 2700, nominal: 3600,  max: 5400  },
  grinding_internal:     { min: 3600, nominal: 5400,  max: 7200  },
  wire_edm:              { min: 2700, nominal: 4500,  max: 7200  },
  sinker_edm:            { min: 3600, nominal: 5400,  max: 9000  },
  laser_cut:             { min: 1800, nominal: 2700,  max: 3600  },
  laser_mark:            { min: 900,  nominal: 1800,  max: 2700  },
  waterjet:              { min: 1800, nominal: 2700,  max: 3600  },
  heat_treatment:        { min: 1800, nominal: 2700,  max: 3600  },
  surface_treatment:     { min: 1800, nominal: 3600,  max: 5400  },
  drilling:              { min: 1800, nominal: 2700,  max: 3600  },
  boring:                { min: 2700, nominal: 3600,  max: 5400  },
  honing:                { min: 2700, nominal: 3600,  max: 5400  },
  lapping:               { min: 3600, nominal: 5400,  max: 7200  },
};

/** Process capability: IT grade range and Ra range (µm). */
interface ProcessCapability {
  IT_min: number;  // numerically lower = tighter (IT4 < IT6 < IT9)
  IT_max: number;
  Ra_min: number;  // µm
  Ra_max: number;
}

const PROCESS_CAPABILITY: Record<ManufacturingProcess, ProcessCapability> = {
  turning:               { IT_min: 7, IT_max: 9,  Ra_min: 0.8,  Ra_max: 3.2  },
  milling:               { IT_min: 7, IT_max: 10, Ra_min: 0.8,  Ra_max: 6.3  },
  grinding_surface:      { IT_min: 5, IT_max: 7,  Ra_min: 0.1,  Ra_max: 0.8  },
  grinding_cylindrical:  { IT_min: 4, IT_max: 6,  Ra_min: 0.1,  Ra_max: 0.8  },
  grinding_centerless:   { IT_min: 5, IT_max: 7,  Ra_min: 0.2,  Ra_max: 0.8  },
  grinding_internal:     { IT_min: 5, IT_max: 7,  Ra_min: 0.1,  Ra_max: 0.8  },
  wire_edm:              { IT_min: 5, IT_max: 7,  Ra_min: 0.3,  Ra_max: 1.6  },
  sinker_edm:            { IT_min: 6, IT_max: 8,  Ra_min: 0.4,  Ra_max: 3.2  },
  laser_cut:             { IT_min: 9, IT_max: 12, Ra_min: 3.2,  Ra_max: 12.5 },
  laser_mark:            { IT_min: 99, IT_max: 99, Ra_min: 1.6, Ra_max: 6.3  },
  waterjet:              { IT_min: 8, IT_max: 11, Ra_min: 1.6,  Ra_max: 6.3  },
  heat_treatment:        { IT_min: 99, IT_max: 99, Ra_min: 99,  Ra_max: 99   },
  surface_treatment:     { IT_min: 99, IT_max: 99, Ra_min: 99,  Ra_max: 99   },
  drilling:              { IT_min: 9, IT_max: 11, Ra_min: 1.6,  Ra_max: 6.3  },
  boring:                { IT_min: 6, IT_max: 8,  Ra_min: 0.4,  Ra_max: 1.6  },
  honing:                { IT_min: 4, IT_max: 6,  Ra_min: 0.05, Ra_max: 0.4  },
  lapping:               { IT_min: 3, IT_max: 5,  Ra_min: 0.01, Ra_max: 0.1  },
};

/** IT grade tolerance values for Ø25mm (µm), per ISO 286. Scale proportionally. */
const IT_TOLERANCE_UM: Record<number, number> = {
  3: 4, 4: 6, 5: 9, 6: 13, 7: 21, 8: 33, 9: 52,
  10: 84, 11: 130, 12: 210, 13: 330,
};

/** Material hardness limits for process restrictions (HRC). */
const HARD_TURNING_LIMIT_HRC = 45;
const GRINDING_PREFERRED_HRC = 55;

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Parse IT grade string "IT6" → 6. Returns 9 if unparseable. */
function parseITGrade(grade: string): number {
  const m = grade.match(/IT(\d+)/i);
  return m ? parseInt(m[1], 10) : 9;
}

/** Get IT grade tolerance in µm for a reference diameter (ISO 286 linear interpolation). */
function itTolerance_um(itNum: number, diam_mm: number): number {
  const base = IT_TOLERANCE_UM[itNum] ?? 52;
  // ISO 286: tolerance factor scales with D^(1/3) normalised at 25mm
  const scale = Math.pow(diam_mm / 25, 1 / 3);
  return base * scale;
}

/** Box-Muller normal sample: N(mean, sigma). */
function normalSample(mean: number, sigma: number, rng: () => number): number {
  let u1: number, u2: number;
  do { u1 = rng(); } while (u1 <= 0);
  u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

/** Simple LCG pseudo-random (deterministic for reproducibility). */
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Determine process phase label from sequence context. */
function phaseLabel(
  process: ManufacturingProcess,
  isFirst: boolean
): ProcessStep["process_phase"] {
  if (process === "heat_treatment" || process === "surface_treatment") return "non_material_removal";
  if (process === "lapping" || process === "honing") return "super_finish";
  const cap = PROCESS_CAPABILITY[process];
  if (cap.IT_min <= 5) return isFirst ? "finish" : "super_finish";
  if (cap.IT_min <= 7) return isFirst ? "semi_finish" : "finish";
  return "rough";
}

/** Determine work-holding recommendation for a process. */
function workHoldingFor(process: ManufacturingProcess, part: MultiProcessPart): string {
  switch (process) {
    case "turning":
    case "grinding_cylindrical":
    case "grinding_centerless":
      return part.raw_stock.type === "bar"
        ? "3-jaw chuck + tailstock (L/D>3: steady rest)"
        : "Face plate + centers";
    case "grinding_internal":
      return "Magnetic chuck or collet chuck";
    case "milling":
    case "drilling":
    case "boring":
      return "Precision vise or fixture plate (3-2-1 datum)";
    case "grinding_surface":
      return "Magnetic chuck (ferrous) / vacuum fixture (non-ferrous)";
    case "wire_edm":
      return "Wire EDM fixture plate, submerged in dielectric";
    case "sinker_edm":
      return "Die-sinking fixture, dielectric bath";
    case "laser_cut":
    case "laser_mark":
      return "Flat slat table or rotary axis";
    case "waterjet":
      return "Slat table, sacrificial backing";
    case "heat_treatment":
      return "Heat treatment basket / rack";
    case "surface_treatment":
      return "Plating rack / anodise basket";
    case "honing":
      return "Honing fixture / free-floating holder";
    case "lapping":
      return "Lapping fixture / free-lapping plate";
    default:
      return "Standard vise";
  }
}

/** Machine type string for a process. */
function machineTypeFor(process: ManufacturingProcess): string {
  const map: Record<ManufacturingProcess, string> = {
    turning: "CNC Turning Center",
    milling: "CNC Machining Center (VMC/HMC)",
    grinding_surface: "Surface Grinder (CNC)",
    grinding_cylindrical: "Cylindrical Grinder (OD/ID)",
    grinding_centerless: "Centerless Grinder",
    grinding_internal: "Internal Grinder",
    wire_edm: "Wire EDM Machine",
    sinker_edm: "Sinker/Ram EDM Machine",
    laser_cut: "Fiber Laser Cutting System",
    laser_mark: "Laser Marking Station",
    waterjet: "Abrasive Waterjet Cutter",
    heat_treatment: "Vacuum/Atmosphere Furnace",
    surface_treatment: "Plating/Anodise/Coating Line",
    drilling: "CNC Drill Press / Machining Center",
    boring: "CNC Boring Mill / Machining Center",
    honing: "Honing Machine",
    lapping: "Lapping Machine / Hand Lapping",
  };
  return map[process] ?? "CNC Machine";
}

/** Estimate base cycle time (seconds) for a process step based on feature dimensions. */
function estimateCycleTime_s(
  process: ManufacturingProcess,
  feature: ProcessFeature
): number {
  const d = feature.dimensions;
  const vol_mm3 =
    (d["volume_mm3"] as number | undefined) ??
    (d["diameter_mm"] != null && d["length_mm"] != null
      ? Math.PI * (d["diameter_mm"] / 2) ** 2 * d["length_mm"]
      : d["width_mm"] != null && d["length_mm"] != null && d["depth_mm"] != null
      ? d["width_mm"] * d["length_mm"] * d["depth_mm"]
      : 1000); // fallback 1000 mm³

  // MRR reference values (mm³/s) per process
  const mrrMap: Record<ManufacturingProcess, number> = {
    turning: 2000,
    milling: 1500,
    grinding_surface: 200,
    grinding_cylindrical: 150,
    grinding_centerless: 300,
    grinding_internal: 100,
    wire_edm: 15,
    sinker_edm: 8,
    laser_cut: 800,
    laser_mark: 0,      // non-material-removal
    waterjet: 600,
    heat_treatment: 0,  // time-based, not MRR
    surface_treatment: 0,
    drilling: 400,
    boring: 250,
    honing: 50,
    lapping: 10,
  };

  const mrr = mrrMap[process] ?? 500;

  if (mrr === 0) {
    // Time-based processes
    if (process === "heat_treatment") return 7200; // 2hr cycle
    if (process === "surface_treatment") return 3600;
    if (process === "laser_mark") return 60;
    return 1800;
  }

  // t = V / MRR; add 20% air-cut overhead
  return Math.max(30, (vol_mm3 / mrr) * 1.2);
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

/**
 * MultiProcessCAMRouterEngine
 *
 * Unified router for CK-MS3 — accepts any manufacturing process request and
 * orchestrates multi-process jobs across turning, milling, grinding, EDM, laser,
 * and waterjet processes.
 */
export class MultiProcessCAMRouterEngine {
  private readonly engineName = "MultiProcessCAMRouterEngine";
  private readonly version = "1.0.0";

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Main entry point: route a multi-process part through all required processes.
   *
   * @param input  Complete part description with features, tolerances, finishes.
   * @returns      Full ProcessRoute with sequenced steps, cost, and uncertainty.
   */
  routePart(input: MultiProcessPart): ProcessRoute {
    log.debug(`[${this.engineName}] routePart: ${input.part_name}`);

    const batchSize = input.batch_size ?? 1;
    const priority = input.priority ?? "cost";

    // Step 1: Analyse every feature
    const analyses = this.analyzeFeatures(
      input.features,
      input,
    );

    // Step 2: Sequence processes
    const steps = this.sequenceProcesses(analyses, input);

    // Step 3: Build partial route for cost + uncertainty
    const partialRoute: ProcessRoute = {
      steps,
      total_cycle_time_s: { value: 0, unit: "s" },
      total_cost: this._zeroCost(),
      uncertainty: this._zeroUncertainty(),
      setup_count: 0,
      datum_strategy: "",
      material_condition_tracking: [],
    };

    // Step 4: Compute cost
    const costBreakdown = this.estimateCost(partialRoute, batchSize);

    // Step 5: Compute uncertainty (MC)
    const uncertainty = this.computeUncertainty(partialRoute);

    // Step 6: Assemble final totals
    const totalCycleTime_s = steps.reduce(
      (acc, s) => acc + s.estimated_cycle_time_s.value + s.setup_time_s.value / batchSize,
      0,
    );

    // Datum strategy
    const datumStrategy = this._decideDatumStrategy(input, steps);

    // Material condition tracking
    const materialTracking = this._trackMaterialCondition(steps, input);

    // Setup count (each unique process family = 1 setup)
    const setupCount = this._countSetups(steps);

    const route: ProcessRoute = {
      steps,
      total_cycle_time_s: {
        value: totalCycleTime_s,
        unit: "s",
        formula: "Σ(cycle_time_i + setup_time_i / batch_size)",
        confidence: uncertainty.overall_confidence,
      },
      total_cost: costBreakdown,
      uncertainty,
      setup_count: setupCount,
      datum_strategy: datumStrategy,
      material_condition_tracking: materialTracking,
    };

    log.debug(
      `[${this.engineName}] Route complete: ${steps.length} steps, ` +
        `${setupCount} setups, total ${Math.round(totalCycleTime_s)}s`,
    );

    return route;
  }

  /**
   * Analyse features to determine required processes, IT grade, and Ra targets.
   *
   * @param features   Raw feature list from MultiProcessPart.
   * @param part       Full part context (for hardness, tolerances, surface finishes).
   * @returns          Array of FeatureAnalysis — one per feature.
   */
  analyzeFeatures(
    features: ProcessFeature[],
    part?: MultiProcessPart,
  ): FeatureAnalysis[] {
    return features.map((f) => this._analyzeFeature(f, part));
  }

  /**
   * Sequence processes using manufacturing engineering rules.
   *
   * Rules applied (in priority order):
   *   1. Blanking/profile operations first (laser, waterjet)
   *   2. Rough material removal before semi-finish
   *   3. Turning before milling (for shaft-like parts)
   *   4. Milling before EDM (rough envelope first)
   *   5. Insert heat treatment between semi-finish and finish
   *   6. Grinding and EDM after heat treatment
   *   7. Honing/lapping last for super-finish bores
   *   8. Surface treatment absolutely last
   *
   * @param analyses  Feature analyses from analyzeFeatures().
   * @param part      Full part context.
   * @returns         Ordered ProcessStep array.
   */
  sequenceProcesses(
    analyses: FeatureAnalysis[],
    part?: MultiProcessPart,
  ): ProcessStep[] {
    const needsHeatTreatment =
      (part?.hardness_hrc ?? 0) > HARD_TURNING_LIMIT_HRC ||
      analyses.some((a) => a.hardness_driven);

    // Collect unique processes, preserving reason
    const processSet = new Map<ManufacturingProcess, string[]>(); // process → feature_ids
    for (const a of analyses) {
      const existing = processSet.get(a.recommended_process) ?? [];
      existing.push(a.feature_id);
      processSet.set(a.recommended_process, existing);
    }

    // Resolve process ordering
    const orderedProcesses = this._applySequencingRules(
      Array.from(processSet.keys()),
      needsHeatTreatment,
      part,
    );

    // Build steps
    const steps: ProcessStep[] = [];
    let seq = 1;

    for (const proc of orderedProcesses) {
      const featureIds = processSet.get(proc) ?? [];
      const repFeature = (part?.features ?? []).find((f) => featureIds.includes(f.id)) ?? {
        id: "generic",
        type: proc,
        dimensions: { volume_mm3: 1000 },
      };

      const cycleTime_s = featureIds.reduce((acc, fid) => {
        const feat = (part?.features ?? []).find((f) => f.id === fid) ?? repFeature;
        return acc + estimateCycleTime_s(proc, feat);
      }, 0);

      const setupInfo = SETUP_TIMES_S[proc] ?? { min: 1800, nominal: 3600, max: 5400 };
      const rateInfo = MACHINE_RATES[proc] ?? { min: 65, nominal: 90, max: 120 };
      const cap = PROCESS_CAPABILITY[proc];

      const toolingCost = this._estimateToolingCost(proc, featureIds.length);

      const isFirst = steps.filter((s) => s.process === proc).length === 0;

      steps.push({
        sequence: seq++,
        process: proc,
        features_addressed: featureIds,
        machine_type: machineTypeFor(proc),
        estimated_cycle_time_s: {
          value: cycleTime_s,
          unit: "s",
          formula: "Σ(V_i / MRR_process) × 1.2",
          confidence: 0.75,
        },
        setup_time_s: {
          value: setupInfo.nominal,
          unit: "s",
          confidence: 0.85,
        },
        tooling_cost: {
          value: toolingCost,
          unit: "USD",
          confidence: 0.8,
        },
        machine_rate_per_hr: {
          value: rateInfo.nominal,
          unit: "USD/hr",
          formula: "shop_floor_rate[process]",
          confidence: 0.9,
        },
        work_holding: workHoldingFor(proc, part ?? this._defaultPart()),
        notes: this._stepNotes(proc, featureIds, part),
        tolerance_achievable:
          cap.IT_min < 99
            ? {
                IT_grade: `IT${cap.IT_min}–IT${cap.IT_max}`,
                Ra_um_min: cap.Ra_min,
                Ra_um_max: cap.Ra_max,
              }
            : undefined,
        process_phase: phaseLabel(proc, isFirst),
      });
    }

    return steps;
  }

  /**
   * Estimate cost for a given process route at a specified batch size.
   *
   * @param route       ProcessRoute with steps populated.
   * @param batch_size  Number of parts per run.
   * @returns           CostBreakdown (also mutates route.total_cost in-place).
   */
  estimateCost(route: ProcessRoute, batch_size: number): CostBreakdown {
    const bs = Math.max(1, batch_size);
    let totalMachiningCost = 0;
    let totalToolingCost = 0;
    let totalSetupCost = 0;
    const costByProcess: Record<string, number> = {};

    for (const step of route.steps) {
      const hr = step.machine_rate_per_hr.value;
      const machineCost = (step.estimated_cycle_time_s.value / 3600) * hr;
      const setupCostAmortized = (step.setup_time_s.value / 3600) * hr / bs;
      const toolingCostPerPart = step.tooling_cost.value / bs;

      totalMachiningCost += machineCost;
      totalToolingCost += toolingCostPerPart;
      totalSetupCost += setupCostAmortized;

      costByProcess[step.process] =
        (costByProcess[step.process] ?? 0) +
        machineCost +
        setupCostAmortized +
        toolingCostPerPart;
    }

    const costPerPart = totalMachiningCost + totalToolingCost + totalSetupCost;

    // Populate route.total_cost in-place and return it
    route.total_cost = {
      machining_cost: { value: totalMachiningCost, unit: "USD/part" },
      tooling_cost: { value: totalToolingCost, unit: "USD/part" },
      setup_cost: { value: totalSetupCost, unit: "USD/part (amortized)" },
      total_cost_per_part: {
        value: costPerPart,
        unit: "USD/part",
        formula: "machining + tooling_amortized + setup_amortized",
      },
      total_cost_batch: {
        value: costPerPart * bs,
        unit: "USD",
      },
      cost_by_process: costByProcess,
    };

    return route.total_cost;
  }

  /**
   * Compute batch cost analysis — per-part economics at a given lot size.
   *
   * Call after estimateCost() so route.total_cost is populated.
   *
   * @param route       ProcessRoute with total_cost already computed.
   * @param batch_size  Number of parts per run.
   * @returns           BatchCostAnalysis with breakeven and lot size recommendation.
   */
  batchAnalysis(route: ProcessRoute, batch_size: number): BatchCostAnalysis {
    const bs = Math.max(1, batch_size);
    const costPerPart = route.total_cost.total_cost_per_part.value;
    const setupCost = route.total_cost.setup_cost.value;
    const breakeven = Math.ceil(setupCost / (costPerPart * 0.1 + 0.01));

    return {
      batch_size: bs,
      cost_per_part: { value: costPerPart, unit: "USD/part" },
      total_batch_cost: { value: costPerPart * bs, unit: "USD" },
      setup_amortized_per_part: { value: setupCost, unit: "USD/part" },
      breakeven_batch: breakeven,
      recommended_lot_size: Math.max(1, Math.ceil(breakeven * 0.5)),
    };
  }

  /**
   * Compare process alternatives for a single feature.
   *
   * Returns all capable processes ranked by the priority criterion inferred from
   * feature tolerances and finish requirements.
   *
   * @param feature  The feature to compare alternatives for.
   * @param part     Optional part context for tolerance/finish lookup.
   * @returns        Ranked list of ProcessAlternative.
   */
  compareProcessAlternatives(
    feature: ProcessFeature,
    part?: MultiProcessPart,
  ): ProcessAlternative[] {
    const requiredIT = this._resolveRequiredIT(feature, part);
    const requiredRa = this._resolveRequiredRa(feature, part);

    const candidates: ProcessAlternative[] = [];

    for (const [proc, cap] of Object.entries(PROCESS_CAPABILITY) as [
      ManufacturingProcess,
      ProcessCapability,
    ][]) {
      if (cap.IT_min > requiredIT) continue; // cannot achieve required tolerance
      if (cap.Ra_min > requiredRa) continue;  // cannot achieve required finish

      const rateInfo = MACHINE_RATES[proc];
      const cycleTime = estimateCycleTime_s(proc, feature);
      const costPerFeature =
        (cycleTime / 3600) * rateInfo.nominal + this._estimateToolingCost(proc, 1) / 10;

      const pros: string[] = [];
      const cons: string[] = [];

      if (cap.IT_min <= 5) pros.push("Excellent dimensional accuracy");
      if (cap.Ra_min <= 0.4) pros.push("Fine surface finish achievable");
      if (proc === "turning" || proc === "milling") pros.push("Fast material removal rate");
      if (proc === "wire_edm") pros.push("No cutting force — ideal for fragile features");
      if (proc === "grinding_cylindrical") pros.push("Best for hardened steel OD/ID");

      if (cap.IT_max >= 10) cons.push("Limited tolerance capability");
      if (cap.Ra_max >= 6.3) cons.push("Rough surface requires follow-on finishing");
      if (rateInfo.nominal >= 100) cons.push("High machine hourly rate");
      if (cycleTime > 600) cons.push("Long cycle time per feature");

      candidates.push({
        process: proc,
        achievable_IT: `IT${cap.IT_min}–IT${cap.IT_max}`,
        achievable_Ra_um: cap.Ra_min,
        cycle_time_s: cycleTime,
        cost_per_feature: costPerFeature,
        pros,
        cons,
        recommended: false,
      });
    }

    // Sort by cost (cost priority default)
    candidates.sort((a, b) => a.cost_per_feature - b.cost_per_feature);

    if (candidates.length > 0) {
      candidates[0].recommended = true;
    }

    return candidates;
  }

  /**
   * Suggest consolidation opportunities in a process route.
   *
   * Identifies: redundant steps, combinable setups, cheaper process substitutions,
   * and resequencing to reduce setups.
   *
   * @param route  Completed ProcessRoute.
   * @returns      List of ConsolidationSuggestion ranked by savings.
   */
  suggestConsolidation(route: ProcessRoute): ConsolidationSuggestion[] {
    const suggestions: ConsolidationSuggestion[] = [];
    const steps = route.steps;

    // Check for consecutive same-family grinding steps that could be combined
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i];
      const b = steps[i + 1];
      if (
        a.process.startsWith("grinding") &&
        b.process.startsWith("grinding") &&
        a.machine_type === b.machine_type
      ) {
        suggestions.push({
          type: "combine_steps",
          affected_steps: [a.sequence, b.sequence],
          description: `Combine ${a.process} (seq ${a.sequence}) and ${b.process} (seq ${b.sequence}) on same machine in one setup`,
          estimated_savings_pct: 15,
          feasibility: "high",
        });
      }
    }

    // Check if a grinding step could be replaced by hard turning (IT7 acceptable)
    for (const step of steps) {
      if (step.process === "grinding_cylindrical") {
        const maxIT = step.tolerance_achievable
          ? parseITGrade(step.tolerance_achievable.IT_grade.split("–")[1] ?? "IT6")
          : 6;
        if (maxIT >= 7) {
          suggestions.push({
            type: "process_substitution",
            affected_steps: [step.sequence],
            description: `Replace cylindrical grinding (seq ${step.sequence}) with CBN hard turning — achievable IT7, Ra 0.4µm at 30% lower cost if HRC ≤ 65`,
            estimated_savings_pct: 28,
            feasibility: "medium",
          });
        }
      }
    }

    // Check if Wire EDM step for a 2D profile could be laser-cut instead (tolerance allowing)
    for (const step of steps) {
      if (step.process === "wire_edm") {
        suggestions.push({
          type: "process_substitution",
          affected_steps: [step.sequence],
          description: `Evaluate fiber laser cutting vs Wire EDM (seq ${step.sequence}) for 2D profiles — laser is 40% faster if Ra ≥ 1.6µm and tolerance ≥ IT9`,
          estimated_savings_pct: 35,
          feasibility: "low",
        });
      }
    }

    // Suggest resequencing if heat treatment is near the end — check for missed opportunity
    const htStep = steps.find((s) => s.process === "heat_treatment");
    if (htStep) {
      const finishStepsBefore = steps.filter(
        (s) => s.sequence < htStep.sequence && s.process_phase === "finish",
      );
      if (finishStepsBefore.length > 0) {
        suggestions.push({
          type: "resequence",
          affected_steps: finishStepsBefore.map((s) => s.sequence),
          description: `Finish operations (seq ${finishStepsBefore.map((s) => s.sequence).join(",")}) occur before heat treatment — move to post-HT to avoid distortion rework`,
          estimated_savings_pct: 10,
          feasibility: "high",
        });
      }
    }

    // If no EDM but tight internal corner features exist → suggest adding wire EDM
    const hasEdm = steps.some((s) => s.process === "wire_edm" || s.process === "sinker_edm");
    if (!hasEdm) {
      suggestions.push({
        type: "eliminate_step",
        affected_steps: [],
        description: "No EDM steps detected — verify sharp internal corner requirements (r < 0.5mm). If present, wire EDM should be added.",
        estimated_savings_pct: 0,
        feasibility: "medium",
      });
    }

    return suggestions.sort((a, b) => b.estimated_savings_pct - a.estimated_savings_pct);
  }

  /**
   * Compute Monte Carlo uncertainty across all process steps.
   *
   * Aggregates:
   *   - Cycle time CI95 (sum of per-step normal distributions)
   *   - Cost CI95 (sum of per-step log-normal distributions)
   *   - Dimensional uncertainty per feature (IT-grade based ±µm)
   *   - Critical path identification (highest CoV step)
   *
   * @param route  ProcessRoute with steps.
   * @returns      MultiProcessUncertainty with CI95 bounds and confidence.
   */
  computeUncertainty(route: ProcessRoute): MultiProcessUncertainty {
    const N = 500;
    const rng = makeLCG(0xdeadbeef);

    // Per-step coefficient of variation (σ/µ) for time and cost
    const stepCVTime = route.steps.map((s) => {
      // Less mature processes have higher uncertainty
      const baseCv: Record<ManufacturingProcess, number> = {
        turning: 0.08,
        milling: 0.10,
        grinding_surface: 0.12,
        grinding_cylindrical: 0.12,
        grinding_centerless: 0.10,
        grinding_internal: 0.14,
        wire_edm: 0.18,
        sinker_edm: 0.22,
        laser_cut: 0.09,
        laser_mark: 0.05,
        waterjet: 0.10,
        heat_treatment: 0.20,
        surface_treatment: 0.15,
        drilling: 0.08,
        boring: 0.10,
        honing: 0.15,
        lapping: 0.20,
      };
      return baseCv[s.process] ?? 0.12;
    });

    // Monte Carlo: sum cycle times
    const totalTimeSamples: number[] = [];
    const totalCostSamples: number[] = [];

    for (let i = 0; i < N; i++) {
      let totalTime = 0;
      let totalCost = 0;
      for (let j = 0; j < route.steps.length; j++) {
        const step = route.steps[j];
        const cv = stepCVTime[j];
        const mu_t = step.estimated_cycle_time_s.value;
        const sigma_t = mu_t * cv;
        const t_sample = Math.max(1, normalSample(mu_t, sigma_t, rng));

        const mu_c = (mu_t / 3600) * step.machine_rate_per_hr.value + step.tooling_cost.value;
        const sigma_c = mu_c * (cv * 1.1); // cost slightly more uncertain
        const c_sample = Math.max(0, normalSample(mu_c, sigma_c, rng));

        totalTime += t_sample;
        totalCost += c_sample;
      }
      totalTimeSamples.push(totalTime);
      totalCostSamples.push(totalCost);
    }

    totalTimeSamples.sort((a, b) => a - b);
    totalCostSamples.sort((a, b) => a - b);

    const ci95Lower = (arr: number[]) => arr[Math.floor(N * 0.025)];
    const ci95Upper = (arr: number[]) => arr[Math.floor(N * 0.975)];

    // Identify critical path process (highest relative uncertainty contribution)
    let criticalProcess = route.steps[0]?.process ?? "turning";
    let maxAbsUnc = 0;
    for (let j = 0; j < route.steps.length; j++) {
      const s = route.steps[j];
      const unc = s.estimated_cycle_time_s.value * stepCVTime[j];
      if (unc > maxAbsUnc) {
        maxAbsUnc = unc;
        criticalProcess = s.process;
      }
    }

    // Dimensional uncertainty per feature (based on IT grade + process)
    const dimUncertainty: Record<string, number> = {};
    for (const step of route.steps) {
      const cap = PROCESS_CAPABILITY[step.process];
      const itMid = cap.IT_min < 99 ? (cap.IT_min + cap.IT_max) / 2 : 9;
      const unc_um = itTolerance_um(Math.round(itMid), 25) / 2; // ±half tolerance
      for (const fid of step.features_addressed) {
        // If this is a finish step, it overrides earlier rough step uncertainty
        if (
          !dimUncertainty[fid] ||
          unc_um < dimUncertainty[fid]
        ) {
          dimUncertainty[fid] = unc_um;
        }
      }
    }

    // Dominant cost driver
    const costByProc = route.total_cost.cost_by_process ?? {};
    const dominantCost = Object.entries(costByProc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "milling";

    // Overall confidence: harmonic mean of step confidences
    const stepConfs = route.steps.map((s) => s.estimated_cycle_time_s.confidence ?? 0.75);
    const overallConf =
      stepConfs.length > 0
        ? stepConfs.length / stepConfs.reduce((acc, c) => acc + 1 / Math.max(c, 0.01), 0)
        : 0.75;

    const uncertainty: MultiProcessUncertainty = {
      cycle_time_CI95_s: {
        lower: ci95Lower(totalTimeSamples),
        upper: ci95Upper(totalTimeSamples),
      },
      total_cost_CI95: {
        lower: ci95Lower(totalCostSamples),
        upper: ci95Upper(totalCostSamples),
      },
      critical_path_process: criticalProcess,
      dominant_cost_driver: dominantCost,
      dimension_uncertainty_um: dimUncertainty,
      overall_confidence: Math.round(overallConf * 100) / 100,
      mc_samples: N,
    };

    route.uncertainty = uncertainty;
    return uncertainty;
  }

  /** Return engine metadata. */
  stats(): { methods: string[]; engineName: string } {
    return {
      methods: [
        "routePart",
        "analyzeFeatures",
        "sequenceProcesses",
        "estimateCost",
        "compareProcessAlternatives",
        "suggestConsolidation",
        "computeUncertainty",
        "stats",
      ],
      engineName: this.engineName,
    };
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  /** Analyse a single feature, resolving required process(es). */
  private _analyzeFeature(
    feature: ProcessFeature,
    part?: MultiProcessPart,
  ): FeatureAnalysis {
    const hrc = part?.hardness_hrc ?? 0;
    const requiredIT = this._resolveRequiredIT(feature, part);
    const requiredRa = this._resolveRequiredRa(feature, part);
    const toleranceDriven = requiredIT <= 7;
    const finishDriven = requiredRa <= 0.8;
    const hardnessDriven = hrc >= HARD_TURNING_LIMIT_HRC;

    const detected: ManufacturingProcess[] = [];
    let recommended: ManufacturingProcess = "milling";
    let notes = "";

    const dims = feature.dimensions;
    const ftype = feature.type as string;

    // ── Rule-based detection ────────────────────────────────────────────────

    if (ftype === "od_cylinder" || ftype === "taper" || ftype === "groove") {
      detected.push("turning");
      if (hrc >= HARD_TURNING_LIMIT_HRC && requiredIT <= 6) {
        detected.push("grinding_cylindrical");
        recommended = "grinding_cylindrical";
        notes = `HRC ${hrc} — cylindrical grinding required for IT${requiredIT}`;
      } else if (hrc >= GRINDING_PREFERRED_HRC) {
        detected.push("grinding_cylindrical");
        recommended = "grinding_cylindrical";
        notes = `HRC ${hrc} ≥ 55 — grinding preferred over turning`;
      } else {
        recommended = "turning";
        notes = "OD cylinder: CNC turning";
      }
    } else if (ftype === "id_bore" || ftype === "counterbore") {
      detected.push("drilling", "boring");
      if (requiredIT <= 6 || requiredRa <= 0.4) {
        detected.push("grinding_internal", "honing");
        recommended = requiredRa <= 0.1 ? "honing" : "grinding_internal";
        notes = `Precision bore IT${requiredIT} Ra ${requiredRa}µm — internal grinding or honing`;
      } else if (requiredIT <= 8) {
        recommended = "boring";
        notes = `Bore IT${requiredIT} — fine boring`;
      } else {
        recommended = "drilling";
        notes = "Standard bore — drill + ream";
      }
    } else if (ftype === "pocket" || ftype === "slot" || ftype === "cavity_3d" || ftype === "freeform_surface") {
      detected.push("milling");
      if (ftype === "cavity_3d" && hrc >= HARD_TURNING_LIMIT_HRC) {
        detected.push("sinker_edm");
        recommended = "sinker_edm";
        notes = `Hardened cavity (HRC ${hrc}) — sinker EDM for complex die form`;
      } else {
        recommended = "milling";
        notes = `${ftype}: 3-axis or 5-axis milling`;
      }
    } else if (ftype === "profile_2d") {
      const thk = dims["thickness_mm"] ?? dims["depth_mm"] ?? 10;
      const mat = (part?.material ?? "").toLowerCase();
      detected.push("milling", "wire_edm");
      if (thk <= 6 && (mat.includes("alum") || mat.includes("steel"))) {
        detected.push("laser_cut", "waterjet");
        recommended = requiredIT <= 8 ? "wire_edm" : "laser_cut";
        notes = `Thin 2D profile ${thk}mm — laser/waterjet for blanking, EDM for toleranced`;
      } else {
        recommended = requiredIT <= 7 ? "wire_edm" : "milling";
        notes = `2D profile — wire EDM for IT${requiredIT} precision`;
      }
    } else if (ftype === "thread_external") {
      detected.push("turning");
      recommended = "turning";
      notes = "External thread — single-point turning";
    } else if (ftype === "thread_internal") {
      detected.push("milling", "drilling");
      recommended = "milling";
      notes = "Internal thread — thread milling or tapping";
    } else if (ftype === "surface_finish_zone") {
      const ra = dims["Ra_um"] ?? requiredRa;
      if (ra <= 0.1) {
        detected.push("lapping");
        recommended = "lapping";
        notes = `Ultra-fine Ra ${ra}µm — lapping`;
      } else if (ra <= 0.4) {
        detected.push("grinding_surface", "honing");
        recommended = "honing";
        notes = `Fine Ra ${ra}µm — honing or surface grinding`;
      } else {
        detected.push("grinding_surface");
        recommended = "grinding_surface";
        notes = `Ra ${ra}µm — surface grinding`;
      }
    } else if (ftype === "hole_pattern" || ftype === "countersink" || ftype === "cross_hole") {
      detected.push("drilling", "milling");
      recommended = "drilling";
      notes = "Hole pattern — CNC drilling cycle";
    } else if (ftype === "gear_tooth" || ftype === "spline") {
      detected.push("milling");
      if (hrc >= HARD_TURNING_LIMIT_HRC) {
        detected.push("grinding_surface");
        recommended = "grinding_surface";
        notes = `Hardened gear/spline — form grinding`;
      } else {
        recommended = "milling";
        notes = "Gear/spline — CNC hobbing or milling";
      }
    } else if (ftype === "undercut") {
      detected.push("turning", "wire_edm");
      recommended = "wire_edm";
      notes = "Undercut feature — wire EDM or special form tool turning";
    } else if (ftype === "keyway") {
      detected.push("milling");
      recommended = "milling";
      notes = "Keyway — end milling";
    } else if (ftype === "radius_fillet" || ftype === "chamfer") {
      detected.push("milling", "turning");
      recommended = (part?.raw_stock.type === "bar") ? "turning" : "milling";
      notes = "Fillet/chamfer — finish pass";
    } else if (ftype === "knurl") {
      detected.push("turning");
      recommended = "turning";
      notes = "Knurl — roll knurling on lathe";
    } else {
      // Generic fallback
      detected.push("milling");
      recommended = "milling";
      notes = `Generic feature '${ftype}' — defaulted to milling`;
    }

    // Override for sheet-metal-like features
    if (
      part?.raw_stock.type === "plate" &&
      (ftype === "profile_2d" || ftype === "pocket") &&
      !hardnessDriven
    ) {
      if (!detected.includes("waterjet")) detected.push("waterjet");
      if (!detected.includes("laser_cut")) detected.push("laser_cut");
    }

    return {
      feature_id: feature.id,
      feature_type: ftype,
      detected_processes: detected,
      recommended_process: recommended,
      required_IT_grade: `IT${requiredIT}`,
      required_Ra_um: requiredRa,
      tolerance_driven: toleranceDriven,
      finish_driven: finishDriven,
      hardness_driven: hardnessDriven,
      priority_notes: notes,
    };
  }

  /** Resolve required IT grade number for a feature (from tolerances or defaults). */
  private _resolveRequiredIT(feature: ProcessFeature, part?: MultiProcessPart): number {
    const tol = part?.tolerances?.find((t) => t.feature_id === feature.id);
    if (tol) return parseITGrade(tol.tolerance_grade);

    // Default IT by feature type
    const defaults: Partial<Record<string, number>> = {
      id_bore: 7, od_cylinder: 8, pocket: 9, profile_2d: 10,
      surface_finish_zone: 99, gear_tooth: 6, spline: 7, thread_external: 8,
    };
    return defaults[feature.type as string] ?? 9;
  }

  /** Resolve required Ra (µm) for a feature. */
  private _resolveRequiredRa(feature: ProcessFeature, part?: MultiProcessPart): number {
    const sf = part?.surface_finishes?.find((s) => s.feature_id === feature.id);
    if (sf) return sf.Ra_um;

    const defaults: Partial<Record<string, number>> = {
      id_bore: 0.8, od_cylinder: 1.6, pocket: 3.2, profile_2d: 6.3,
      surface_finish_zone: 0.2, gear_tooth: 0.4, cavity_3d: 1.6,
    };
    return defaults[feature.type as string] ?? 3.2;
  }

  /**
   * Apply manufacturing engineering sequencing rules.
   *
   * Returns a topologically-ordered list of processes.
   */
  private _applySequencingRules(
    processes: ManufacturingProcess[],
    needsHeatTreatment: boolean,
    part?: MultiProcessPart,
  ): ManufacturingProcess[] {
    const result: ManufacturingProcess[] = [];
    const set = new Set(processes);

    // Phase 0: Blanking (sheet operations first)
    if (set.has("laser_cut")) result.push("laser_cut");
    if (set.has("waterjet")) result.push("waterjet");

    // Phase 1: Rough turning (cylindrical parts)
    if (set.has("turning")) result.push("turning");

    // Phase 2: Rough milling
    if (set.has("milling")) result.push("milling");

    // Phase 3: Drilling (before boring for pilot holes)
    if (set.has("drilling")) result.push("drilling");

    // Phase 4: Semi-finish boring
    if (set.has("boring")) result.push("boring");

    // Phase 5: Sinker EDM (rough die work before HT)
    if (set.has("sinker_edm")) result.push("sinker_edm");

    // Phase 6: Heat treatment (if needed, between semi-finish and finish)
    if (needsHeatTreatment) result.push("heat_treatment");

    // Phase 7: Post-HT finish grinding
    if (set.has("grinding_cylindrical")) result.push("grinding_cylindrical");
    if (set.has("grinding_centerless")) result.push("grinding_centerless");
    if (set.has("grinding_surface")) result.push("grinding_surface");
    if (set.has("grinding_internal")) result.push("grinding_internal");

    // Phase 8: Wire EDM (post-HT, after envelope grinding)
    if (set.has("wire_edm")) result.push("wire_edm");

    // Phase 9: Super-finish processes
    if (set.has("honing")) result.push("honing");
    if (set.has("lapping")) result.push("lapping");

    // Phase 10: Laser mark (non-destructive, near end)
    if (set.has("laser_mark")) result.push("laser_mark");

    // Phase 11: Surface treatment absolutely last
    if (set.has("surface_treatment")) result.push("surface_treatment");

    // Append any remaining processes not handled above
    for (const proc of processes) {
      if (!result.includes(proc)) result.push(proc);
    }

    return result;
  }

  /** Estimate tooling/consumable cost for a process step. */
  private _estimateToolingCost(process: ManufacturingProcess, featureCount: number): number {
    const baseCosts: Record<ManufacturingProcess, number> = {
      turning: 15,           // insert replacement
      milling: 25,           // endmill wear share
      grinding_surface: 8,   // wheel dressing + abrasive
      grinding_cylindrical: 10,
      grinding_centerless: 6,
      grinding_internal: 12,
      wire_edm: 5,           // wire consumption (brass wire ~$4/kg)
      sinker_edm: 30,        // electrode cost + wear
      laser_cut: 3,          // nozzle wear, assist gas
      laser_mark: 1,
      waterjet: 8,           // abrasive garnet
      heat_treatment: 20,    // energy + consumables
      surface_treatment: 35, // chemicals, plating bath
      drilling: 10,
      boring: 18,
      honing: 12,
      lapping: 15,
    };
    return (baseCosts[process] ?? 20) * Math.max(1, featureCount * 0.5);
  }

  /** Build descriptive notes for a process step. */
  private _stepNotes(
    process: ManufacturingProcess,
    featureIds: string[],
    part?: MultiProcessPart,
  ): string {
    const mat = part?.material ?? "unknown material";
    const hrc = part?.hardness_hrc;
    const hrcStr = hrc ? ` (HRC ${hrc})` : "";
    const fStr = featureIds.length > 0 ? `Features: ${featureIds.join(", ")}. ` : "";

    const processNotes: Record<ManufacturingProcess, string> = {
      turning:
        `${fStr}CNC turning of ${mat}${hrcStr}. Single-point cutting, constant surface speed recommended.`,
      milling:
        `${fStr}CNC milling of ${mat}${hrcStr}. Climb milling preferred for finish passes.`,
      grinding_surface:
        `${fStr}Surface grinding of ${mat}${hrcStr}. Dress wheel before finish passes.`,
      grinding_cylindrical:
        `${fStr}Cylindrical OD/ID grinding of ${mat}${hrcStr}. Pre-grind stock 0.2mm oversize.`,
      grinding_centerless:
        `${fStr}Centerless grinding for production volume. Through-feed or in-feed mode.`,
      grinding_internal:
        `${fStr}Internal grinding of ${mat}${hrcStr} bore. Pre-lap or hone after for <0.4Ra.`,
      wire_edm:
        `${fStr}Wire EDM of ${mat}${hrcStr}. Brass wire 0.25mm; de-ionised water dielectric.`,
      sinker_edm:
        `${fStr}Sinker EDM of ${mat}${hrcStr}. Copper/graphite electrode. Hydrocarbon oil dielectric.`,
      laser_cut:
        `${fStr}Fiber laser cutting of ${mat}. Assist gas: N₂ (stainless) or O₂ (mild steel).`,
      laser_mark:
        `${fStr}Laser marking/engraving. No dimensional change. Focal length verify.`,
      waterjet:
        `${fStr}Abrasive waterjet cutting of ${mat}. Garnet 80 mesh. 400 MPa nozzle pressure.`,
      heat_treatment:
        `Vacuum hardening/tempering of ${mat}. Target HRC per drawing. Controlled quench rate.`,
      surface_treatment:
        `Surface treatment of ${mat}. Specify: anodise / electroless Ni / PVD / chrome / zinc.`,
      drilling:
        `${fStr}CNC drilling of ${mat}${hrcStr}. Peck cycle for L/D > 5. Coolant through-spindle.`,
      boring:
        `${fStr}Fine boring of ${mat}${hrcStr}. Single-blade boring bar; 0.02mm depth of cut.`,
      honing:
        `${fStr}Honing of ${mat}${hrcStr} bore. CBN stones. Target Ra 0.2–0.4µm.`,
      lapping:
        `${fStr}Lapping of ${mat}${hrcStr} surfaces. Diamond compound 3µm → 1µm → 0.5µm sequence.`,
    };

    return processNotes[process] ?? `${fStr}Process: ${process} on ${mat}${hrcStr}.`;
  }

  /** Determine datum transfer strategy for multi-process route. */
  private _decideDatumStrategy(part: MultiProcessPart, steps: ProcessStep[]): string {
    const procCount = new Set(steps.map((s) => s.process)).size;
    if (procCount <= 1) return "Single-setup — no datum transfer required";

    const hasGrinding = steps.some((s) => s.process.startsWith("grinding"));
    const hasTurning = steps.some((s) => s.process === "turning");
    const hasMilling = steps.some((s) => s.process === "milling");

    if (hasTurning && hasGrinding) {
      return "Common centre-bore datums (A-type centre holes both ends) for turning→grinding transfer. Pre-check runout ≤0.005mm.";
    }
    if (hasMilling && hasGrinding) {
      return "3-2-1 datum face + 2 precision tooling holes (H7) for milling→grinding transfer. Grind datum faces first.";
    }
    if (hasTurning && hasMilling) {
      return "Primary datum: turned OD (h6) or face. Secondary: keyway or cross-hole for angular location in milling fixture.";
    }
    return `${procCount}-process job: establish common reference datums (face + 2 holes) at first operation, maintain throughout.`;
  }

  /** Track material condition through the process sequence. */
  private _trackMaterialCondition(
    steps: ProcessStep[],
    part: MultiProcessPart,
  ): { step: number; condition: string }[] {
    const tracking: { step: number; condition: string }[] = [];
    const baseHardness = part.hardness_hrc ?? 0;
    let currentCondition = baseHardness > 0
      ? `Pre-hardened HRC ${baseHardness}`
      : `Annealed / as-received — ${part.material}`;

    tracking.push({ step: 0, condition: `Initial: ${currentCondition}` });

    for (const step of steps) {
      if (step.process === "heat_treatment") {
        currentCondition = `Hardened (vacuum HT) — target hardness per drawing`;
        tracking.push({ step: step.sequence, condition: currentCondition });
      } else if (step.process === "surface_treatment") {
        currentCondition = `Surface treated — dimensional allowance for coating consumed`;
        tracking.push({ step: step.sequence, condition: currentCondition });
      } else if (step.process_phase === "rough") {
        tracking.push({ step: step.sequence, condition: `Rough machined — ~0.5mm stock remaining` });
      } else if (step.process_phase === "finish" || step.process_phase === "super_finish") {
        tracking.push({ step: step.sequence, condition: `Finish/super-finish — final dimensions` });
      }
    }

    return tracking;
  }

  /** Count distinct setups (fixture changes between incompatible processes). */
  private _countSetups(steps: ProcessStep[]): number {
    if (steps.length === 0) return 0;
    // Each distinct machine_type change = new setup
    let setupCount = 1;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].machine_type !== steps[i - 1].machine_type) {
        setupCount++;
      }
    }
    return setupCount;
  }

  /** Return a zeroed CostBreakdown placeholder. */
  private _zeroCost(): CostBreakdown {
    return {
      machining_cost: { value: 0, unit: "USD/part" },
      tooling_cost: { value: 0, unit: "USD/part" },
      setup_cost: { value: 0, unit: "USD/part" },
      total_cost_per_part: { value: 0, unit: "USD/part" },
      total_cost_batch: { value: 0, unit: "USD" },
      cost_by_process: {},
    };
  }

  /** Return a zeroed MultiProcessUncertainty placeholder. */
  private _zeroUncertainty(): MultiProcessUncertainty {
    return {
      cycle_time_CI95_s: { lower: 0, upper: 0 },
      total_cost_CI95: { lower: 0, upper: 0 },
      critical_path_process: "unknown",
      dominant_cost_driver: "unknown",
      dimension_uncertainty_um: {},
      overall_confidence: 0.75,
      mc_samples: 0,
    };
  }

  /** Return a minimal default part for work-holding fallback. */
  private _defaultPart(): MultiProcessPart {
    return {
      part_name: "unknown",
      material: "Steel",
      raw_stock: { type: "bar", dimensions: {} },
      features: [],
    };
  }
}
