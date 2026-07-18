/**
 * CAMToolLibrarySelectionEngine — CAM-AI-TRAINING-MS0/U-CAMT-TOOL-LIB
 *
 * Given (CamOperation, featureClass?, material?), select the right cutter
 * family (end_mill / face_mill / drill / tap / reamer / boring_bar /
 * turning_insert / threading_insert / chamfer_mill / ball_mill / etc.) +
 * recommended diameter band + flute count + coating + helix.
 *
 * Pure logic — operator passes the shop tool inventory inline; engine
 * picks the best match from inventory (or proposes an ideal cutter if
 * inventory is empty / no match).
 *
 * No fabricated insert geometry — diameter / flute / coating tables are
 * the standard ISO catalog ranges (Sandvik / Iscar / Kennametal / OSG /
 * Guhring / Mitsubishi Tools) reduced to a documented short-list.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";

export type ToolFamily =
  | "end_mill_flat"
  | "end_mill_ball"
  | "end_mill_bull_nose"
  | "face_mill"
  | "chamfer_mill"
  | "thread_mill"
  | "drill_twist"
  | "drill_spot"
  | "drill_center"
  | "tap_cut"
  | "tap_form"
  | "reamer"
  | "boring_bar"
  | "turning_insert_rough"
  | "turning_insert_finish"
  | "threading_insert"
  | "grooving_insert"
  | "parting_insert"
  | "wire_edm_electrode"
  | "sinker_edm_electrode";

export type Coating =
  | "uncoated"
  | "tin"          // titanium nitride — basic
  | "tialn"        // ti-aluminum nitride — heat-resistant
  | "altin"        // al-ti nitride — hardened steel
  | "ticn"         // ti-carbo-nitride — abrasive
  | "altin_nano"   // nano-multilayer for hardened
  | "diamond";     // pcd / cvd diamond — non-ferrous

export type Material =
  | "aluminum"
  | "steel"
  | "stainless"
  | "tool_steel"
  | "hardened_steel" // > 45 HRC
  | "titanium"
  | "inconel"
  | "copper"
  | "brass"
  | "plastic"
  | "composite";

export interface ToolSpec {
  family: ToolFamily;
  diameterRange: { minMm: number; maxMm: number };
  fluteCountRange: { min: number; max: number };
  preferredCoating: ReadonlyArray<Coating>;
  helixAngleDeg?: { min: number; max: number };
  reach: "short" | "standard" | "long" | "extra_long";
}

export interface ShopToolEntry {
  id: string;
  family: ToolFamily;
  diameterMm: number;
  fluteCount?: number;
  coating?: Coating;
  helixAngleDeg?: number;
  reach?: "short" | "standard" | "long" | "extra_long";
  worn?: boolean;
}

export interface ToolSelection {
  bestToolId: string | null;
  /** When best is null, recommendedSpec is the cutter to procure. */
  recommendedSpec: ToolSpec | null;
  candidates: Array<{
    toolId: string;
    score: number;
    reason: string;
  }>;
}

/** Map CamOperationTaxonomy family → primary cutter families. */
const FAMILY_TO_TOOL: Record<string, ReadonlyArray<ToolFamily>> = {
  milling_2d:    ["end_mill_flat", "face_mill", "chamfer_mill"],
  milling_3d:    ["end_mill_flat", "end_mill_ball", "end_mill_bull_nose"],
  milling_5axis: ["end_mill_ball", "end_mill_bull_nose", "end_mill_flat"],
  drilling:      ["drill_twist", "drill_spot", "drill_center", "tap_cut", "tap_form", "reamer", "boring_bar"],
  turning:       ["turning_insert_rough", "turning_insert_finish", "threading_insert", "grooving_insert", "parting_insert"],
  mill_turn:     ["end_mill_flat", "turning_insert_rough", "turning_insert_finish"],
  probing:       [],
  finishing:     ["end_mill_ball", "end_mill_bull_nose"],
  edm:           ["wire_edm_electrode", "sinker_edm_electrode"],
  laser:         [],
  waterjet:      [],
  additive:      [],
};

/** Feature-class → preferred tool family overrides. */
const FEATURE_TO_TOOL: Partial<Record<FeatureClass, ToolFamily>> = {
  face: "face_mill",
  pocket_2d: "end_mill_flat",
  contour_2d: "end_mill_flat",
  slot: "end_mill_flat",
  chamfer: "chamfer_mill",
  ruled_surface: "end_mill_ball",
  impeller_blade: "end_mill_ball",
  thru_hole: "drill_twist",
  blind_hole: "drill_twist",
  deep_hole: "drill_twist",
  counterbore: "end_mill_flat",
  thread: "tap_cut",
  external_profile: "turning_insert_rough",
};

/** Material → preferred coatings. */
const MATERIAL_TO_COATING: Record<Material, ReadonlyArray<Coating>> = {
  aluminum:        ["uncoated", "tialn", "diamond"],
  steel:           ["tialn", "altin", "tin"],
  stainless:       ["tialn", "altin"],
  tool_steel:      ["altin", "tialn"],
  hardened_steel:  ["altin_nano", "altin"],
  titanium:        ["altin", "tialn"],
  inconel:         ["altin", "altin_nano"],
  copper:          ["uncoated", "diamond"],
  brass:           ["uncoated", "tin"],
  plastic:         ["uncoated"],
  composite:       ["diamond", "uncoated"],
};

export class CAMToolLibrarySelectionEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMToolLibrarySelectionEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Selects the right cutter (family + diameter + coating) for a CamOperation.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "select",       description: "Pick a tool from shop inventory",     actions: ["cam_tool_select"] },
      { name: "recommend",    description: "Recommend ideal cutter spec",         actions: ["cam_tool_recommend"] },
      { name: "families",     description: "List ToolFamily enum",                actions: ["cam_tool_families"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMToolLibrarySelectionEngine", note: "use typed methods" };
  }

  /** Recommend the IDEAL cutter spec for an (op, featureClass, material) — no inventory consulted. */
  recommend(
    op: CamOperation,
    featureClass?: FeatureClass,
    material?: Material,
  ): ToolSpec | null {
    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return null;
    const featureTool = featureClass ? FEATURE_TO_TOOL[featureClass] : undefined;
    const familyTools = FAMILY_TO_TOOL[spec.family] ?? [];
    const family: ToolFamily | undefined = featureTool ?? familyTools[0];
    if (!family) return null;
    const preferredCoating = material ? MATERIAL_TO_COATING[material] : (["tialn", "altin"] as Coating[]);
    return this.specFor(family, preferredCoating);
  }

  /** Pick the best tool from a shop inventory; falls back to recommend() when no match. */
  select(
    op: CamOperation,
    inventory: ReadonlyArray<ShopToolEntry>,
    opts?: { featureClass?: FeatureClass; material?: Material; preferredDiameterMm?: number },
  ): ToolSelection {
    const ideal = this.recommend(op, opts?.featureClass, opts?.material);
    if (!ideal) return { bestToolId: null, recommendedSpec: null, candidates: [] };
    const candidates = inventory
      .filter((t) => !t.worn)
      .map((t) => {
        let score = 0;
        const reasons: string[] = [];
        if (t.family === ideal.family) {
          score += 10;
          reasons.push("family-match");
        }
        if (t.diameterMm >= ideal.diameterRange.minMm && t.diameterMm <= ideal.diameterRange.maxMm) {
          score += 5;
          reasons.push("diameter-band");
        }
        if (opts?.preferredDiameterMm != null) {
          const delta = Math.abs(t.diameterMm - opts.preferredDiameterMm);
          score -= delta * 0.5;
          if (delta <= 0.1) {
            score += 3;
            reasons.push("diameter-exact");
          }
        }
        if (t.coating && ideal.preferredCoating.includes(t.coating)) {
          score += 3;
          reasons.push("coating-match");
        }
        if (t.fluteCount != null && t.fluteCount >= ideal.fluteCountRange.min && t.fluteCount <= ideal.fluteCountRange.max) {
          score += 2;
          reasons.push("flute-match");
        }
        return { toolId: t.id, score, reason: reasons.length > 0 ? reasons.join(",") : "no-match" };
      })
      .sort((a, b) => b.score - a.score);
    const best = candidates.find((c) => c.reason.includes("family-match")) ?? null;
    return {
      bestToolId: best?.toolId ?? null,
      recommendedSpec: best ? null : ideal,
      candidates,
    };
  }

  /** All 20 documented ToolFamily values. */
  families(): ReadonlyArray<ToolFamily> {
    return [
      "end_mill_flat", "end_mill_ball", "end_mill_bull_nose", "face_mill",
      "chamfer_mill", "thread_mill", "drill_twist", "drill_spot", "drill_center",
      "tap_cut", "tap_form", "reamer", "boring_bar",
      "turning_insert_rough", "turning_insert_finish", "threading_insert",
      "grooving_insert", "parting_insert",
      "wire_edm_electrode", "sinker_edm_electrode",
    ];
  }

  /** Canonical spec for a tool family — documented short-list, not a fabricated catalog. */
  private specFor(family: ToolFamily, preferredCoating: ReadonlyArray<Coating>): ToolSpec {
    switch (family) {
      case "end_mill_flat":
        return { family, diameterRange: { minMm: 1, maxMm: 25 }, fluteCountRange: { min: 2, max: 4 }, preferredCoating, helixAngleDeg: { min: 30, max: 45 }, reach: "standard" };
      case "end_mill_ball":
        return { family, diameterRange: { minMm: 0.5, maxMm: 20 }, fluteCountRange: { min: 2, max: 4 }, preferredCoating, helixAngleDeg: { min: 30, max: 45 }, reach: "standard" };
      case "end_mill_bull_nose":
        return { family, diameterRange: { minMm: 3, maxMm: 25 }, fluteCountRange: { min: 2, max: 4 }, preferredCoating, helixAngleDeg: { min: 30, max: 45 }, reach: "standard" };
      case "face_mill":
        return { family, diameterRange: { minMm: 25, maxMm: 200 }, fluteCountRange: { min: 4, max: 12 }, preferredCoating, reach: "standard" };
      case "chamfer_mill":
        return { family, diameterRange: { minMm: 3, maxMm: 16 }, fluteCountRange: { min: 2, max: 4 }, preferredCoating, reach: "short" };
      case "thread_mill":
        return { family, diameterRange: { minMm: 2, maxMm: 20 }, fluteCountRange: { min: 1, max: 3 }, preferredCoating, reach: "standard" };
      case "drill_twist":
        return { family, diameterRange: { minMm: 1, maxMm: 25 }, fluteCountRange: { min: 2, max: 2 }, preferredCoating, helixAngleDeg: { min: 20, max: 35 }, reach: "standard" };
      case "drill_spot":
        return { family, diameterRange: { minMm: 3, maxMm: 12 }, fluteCountRange: { min: 2, max: 2 }, preferredCoating, reach: "short" };
      case "drill_center":
        return { family, diameterRange: { minMm: 1, maxMm: 6 }, fluteCountRange: { min: 2, max: 2 }, preferredCoating: ["tin", "tialn"], reach: "short" };
      case "tap_cut":
      case "tap_form":
        return { family, diameterRange: { minMm: 2, maxMm: 30 }, fluteCountRange: { min: 2, max: 4 }, preferredCoating: ["tin", "tialn"], reach: "standard" };
      case "reamer":
        return { family, diameterRange: { minMm: 2, maxMm: 30 }, fluteCountRange: { min: 4, max: 8 }, preferredCoating, reach: "standard" };
      case "boring_bar":
        return { family, diameterRange: { minMm: 5, maxMm: 100 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating, reach: "long" };
      case "turning_insert_rough":
        return { family, diameterRange: { minMm: 12, maxMm: 32 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["tialn", "altin"], reach: "standard" };
      case "turning_insert_finish":
        return { family, diameterRange: { minMm: 8, maxMm: 16 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["tialn", "tin"], reach: "standard" };
      case "threading_insert":
        return { family, diameterRange: { minMm: 8, maxMm: 16 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["tialn"], reach: "standard" };
      case "grooving_insert":
      case "parting_insert":
        return { family, diameterRange: { minMm: 12, maxMm: 25 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["tialn", "altin"], reach: "standard" };
      case "wire_edm_electrode":
        return { family, diameterRange: { minMm: 0.05, maxMm: 0.3 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["uncoated"], reach: "standard" };
      case "sinker_edm_electrode":
        return { family, diameterRange: { minMm: 1, maxMm: 100 }, fluteCountRange: { min: 1, max: 1 }, preferredCoating: ["uncoated"], reach: "standard" };
    }
  }
}

export const camToolLibrarySelectionEngine = new CAMToolLibrarySelectionEngine();
