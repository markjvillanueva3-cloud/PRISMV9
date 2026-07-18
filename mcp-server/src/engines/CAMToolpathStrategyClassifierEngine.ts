/**
 * CAMToolpathStrategyClassifierEngine — CAM-AI-TRAINING-MS0/U-CAMT-STRATEGY
 *
 * Picks the right toolpath STRATEGY (the high-level path-planning kind)
 * for a (FeatureClass, axisCount, roughOrFinish) tuple. This sits ONE
 * layer ABOVE CamOperation — Strategy = "how the path is computed",
 * CamOperation = "the labeled procedure".
 *
 * 18 canonical strategies covering every CAM software's offering:
 *   - adaptive_clear / vortex (high-engagement roughing)
 *   - parallel (zig-zag finishing)
 *   - parallel_spiral (concentric spiral)
 *   - radial (origin-out radial lines)
 *   - morphed_spiral (NURBS-conformal)
 *   - contour (waterline / Z-level finishing)
 *   - scallop (constant-scallop)
 *   - pencil_trace (cusp / valley follow-up)
 *   - steep_shallow (3D-split: steep walls + shallow floors)
 *   - swarf (5-axis tangent-plane finishing)
 *   - rest_machining (residual rough)
 *   - flow_line (surface-flow)
 *   - 3plus2 (3+2 positional)
 *   - drill_canned (G81/G83 canned)
 *   - thread_mill (helical thread)
 *   - chamfer_pass (single chamfer pass)
 *   - profile (2D side milling)
 *   - pocket_zigzag (legacy 2D pocket)
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";

export type ToolpathStrategy =
  | "adaptive_clear"
  | "parallel"
  | "parallel_spiral"
  | "radial"
  | "morphed_spiral"
  | "contour"
  | "scallop"
  | "pencil_trace"
  | "steep_shallow"
  | "swarf"
  | "rest_machining"
  | "flow_line"
  | "3plus2"
  | "drill_canned"
  | "thread_mill"
  | "chamfer_pass"
  | "profile"
  | "pocket_zigzag";

export type RoughOrFinish = "rough" | "semi_finish" | "finish" | "rest";

export interface StrategyInputs {
  featureClass: FeatureClass;
  axisCount: "2" | "2.5" | "3" | "3+2" | "4" | "5";
  roughOrFinish: RoughOrFinish;
}

export interface StrategyResult {
  strategy: ToolpathStrategy;
  /** Alternative strategies, in descending preference. */
  alternatives: ReadonlyArray<ToolpathStrategy>;
  rationale: string;
}

/** Per-feature 2.5D / 3D strategy table. */
const STRATEGY_TABLE: Partial<Record<FeatureClass, Partial<Record<RoughOrFinish, { primary: ToolpathStrategy; alts: ReadonlyArray<ToolpathStrategy>; rationale: string }>>>> = {
  face: {
    rough: { primary: "adaptive_clear", alts: ["pocket_zigzag", "parallel"], rationale: "face roughing — adaptive engagement minimizes face-mill load" },
    finish: { primary: "parallel", alts: ["parallel_spiral"], rationale: "face finishing — straight parallel passes for flat reference surface" },
  },
  pocket_2d: {
    rough: { primary: "adaptive_clear", alts: ["pocket_zigzag"], rationale: "2D pocket roughing — adaptive clearing for chip evacuation + constant engagement" },
    finish: { primary: "contour", alts: ["profile"], rationale: "2D pocket finish — contour walls + floor" },
  },
  contour_2d: {
    rough: { primary: "adaptive_clear", alts: ["pocket_zigzag"], rationale: "2D contour roughing — adaptive clearing" },
    finish: { primary: "profile", alts: ["contour"], rationale: "2D contour finish — single-pass profile" },
  },
  slot: {
    rough: { primary: "adaptive_clear", alts: ["pocket_zigzag"], rationale: "slot roughing — adaptive for trochoidal-style engagement" },
    finish: { primary: "profile", alts: ["contour"], rationale: "slot finish — side-wall profile" },
  },
  chamfer: {
    finish: { primary: "chamfer_pass", alts: ["profile"], rationale: "chamfer — single-pass dedicated tool" },
  },
  thru_hole: {
    rough: { primary: "drill_canned", alts: ["adaptive_clear"], rationale: "thru hole — G83 peck or G81 canned" },
    finish: { primary: "drill_canned", alts: [], rationale: "thru hole finish — ream / bore" },
  },
  blind_hole: {
    rough: { primary: "drill_canned", alts: [], rationale: "blind hole — G81/G83 canned" },
    finish: { primary: "drill_canned", alts: [], rationale: "blind hole finish — ream" },
  },
  deep_hole: {
    rough: { primary: "drill_canned", alts: [], rationale: "deep hole — G83 peck drilling for chip evacuation" },
  },
  counterbore: {
    rough: { primary: "adaptive_clear", alts: ["pocket_zigzag"], rationale: "counterbore — small adaptive pocket" },
    finish: { primary: "contour", alts: [], rationale: "counterbore finish — bottom + side contour" },
  },
  thread: {
    finish: { primary: "thread_mill", alts: ["drill_canned"], rationale: "thread — thread mill (or tap canned)" },
  },
  external_profile: {
    rough: { primary: "profile", alts: ["adaptive_clear"], rationale: "turning rough — profile turning pass" },
    finish: { primary: "profile", alts: [], rationale: "turning finish — profile finish pass" },
  },
  ruled_surface: {
    rough: { primary: "adaptive_clear", alts: ["steep_shallow"], rationale: "ruled-surface 3D rough — adaptive clearing" },
    finish: { primary: "scallop", alts: ["parallel", "swarf"], rationale: "ruled surface finish — constant scallop for surface quality" },
  },
  impeller_blade: {
    rough: { primary: "adaptive_clear", alts: [], rationale: "impeller blade rough — 5-axis adaptive" },
    finish: { primary: "swarf", alts: ["flow_line", "scallop"], rationale: "impeller blade finish — 5-axis swarf tangent-plane" },
  },
};

export class CAMToolpathStrategyClassifierEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMToolpathStrategyClassifierEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Classifies toolpath strategy (adaptive/parallel/scallop/swarf/...) for a feature + axis + rough/finish triple.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "classify",   description: "Pick strategy for inputs",        actions: ["cam_strategy_classify"] },
      { name: "strategies", description: "List ToolpathStrategy enum",      actions: ["cam_strategy_strategies"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMToolpathStrategyClassifierEngine", note: "use typed methods" };
  }

  /** Classify the recommended strategy. */
  classify(inputs: StrategyInputs): StrategyResult {
    const featureTable = STRATEGY_TABLE[inputs.featureClass];
    const entry = featureTable?.[inputs.roughOrFinish];
    // 5-axis override: ruled / impeller features rough → still adaptive, finish → swarf.
    if (inputs.axisCount === "5" && (inputs.featureClass === "ruled_surface" || inputs.featureClass === "impeller_blade") && inputs.roughOrFinish === "finish") {
      return {
        strategy: "swarf",
        alternatives: ["scallop", "flow_line"],
        rationale: "5-axis ruled / impeller finish — swarf tangent-plane",
      };
    }
    // 3+2 positional override: anything with axis="3+2" → 3plus2 wrapper around the base strategy.
    if (inputs.axisCount === "3+2" && entry) {
      return {
        strategy: "3plus2",
        alternatives: [entry.primary, ...entry.alts],
        rationale: `3+2 positional — wrap base strategy ${entry.primary} in 3+2`,
      };
    }
    if (entry) {
      return {
        strategy: entry.primary,
        alternatives: entry.alts,
        rationale: entry.rationale,
      };
    }
    // Fallback: 2/2.5 → profile, 3 → parallel rough or scallop finish.
    if (inputs.axisCount === "2" || inputs.axisCount === "2.5") {
      return { strategy: "profile", alternatives: ["contour"], rationale: "2D fallback — profile / contour" };
    }
    if (inputs.roughOrFinish === "rough") {
      return { strategy: "adaptive_clear", alternatives: ["pocket_zigzag"], rationale: "3D fallback rough — adaptive clearing" };
    }
    return { strategy: "scallop", alternatives: ["parallel", "contour"], rationale: "3D fallback finish — scallop" };
  }

  /** All 18 ToolpathStrategy values. */
  strategies(): ReadonlyArray<ToolpathStrategy> {
    return [
      "adaptive_clear", "parallel", "parallel_spiral", "radial", "morphed_spiral",
      "contour", "scallop", "pencil_trace", "steep_shallow", "swarf",
      "rest_machining", "flow_line", "3plus2",
      "drill_canned", "thread_mill", "chamfer_pass", "profile", "pocket_zigzag",
    ];
  }
}

export const camToolpathStrategyClassifierEngine = new CAMToolpathStrategyClassifierEngine();
