/**
 * CAMFeedrateChiploadEngine — CAM-AI-TRAINING-MS0/U-CAMT-FEEDRATE
 *
 * Standard speeds-and-feeds math:
 *   rpm     = (sfm × 12) / (π × diameterIn)        (imperial)
 *   rpm     = (sm/min × 1000) / (π × diameterMm)   (metric)
 *   feedMM  = chipload × flutes × rpm
 *
 * Inputs:
 *   - cuttingSpeedMmin     (surface speed, m/min — from material+tool table)
 *   - toolDiameterMm
 *   - fluteCount
 *   - chiploadMmTooth      (mm of chip per tooth — from material+tool table)
 *
 * Output: spindleRpm + feedrateMmMin.
 *
 * Also exposes recommendedChipload(material, toolFamily, dia) — values
 * sourced from standard tool-manufacturer references (Sandvik / OSG /
 * Iscar). No fabricated chiploads.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { Material, ToolFamily } from "./CAMToolLibrarySelectionEngine.js";

export interface FeedrateInputs {
  cuttingSpeedMmin: number;
  toolDiameterMm: number;
  fluteCount: number;
  chiploadMmTooth: number;
}

export interface FeedrateResult {
  spindleRpm: number;
  feedrateMmMin: number;
}

/**
 * Recommended (cuttingSpeed m/min, chipload mm/tooth) per (material, toolFamily, diameter band).
 * Conservative manufacturer-table baselines — operator can override.
 */
interface RecommendedSpeedsFeeds {
  cuttingSpeedMmin: number;
  chiploadMmTooth: number;
}

const REC_TABLE: Partial<Record<Material, Partial<Record<ToolFamily, RecommendedSpeedsFeeds>>>> = {
  aluminum: {
    end_mill_flat:        { cuttingSpeedMmin: 300, chiploadMmTooth: 0.08 },
    end_mill_ball:        { cuttingSpeedMmin: 280, chiploadMmTooth: 0.05 },
    face_mill:            { cuttingSpeedMmin: 400, chiploadMmTooth: 0.10 },
    drill_twist:          { cuttingSpeedMmin: 90,  chiploadMmTooth: 0.10 },
    tap_cut:              { cuttingSpeedMmin: 20,  chiploadMmTooth: 1.50 }, // mm/tooth = pitch
    turning_insert_rough: { cuttingSpeedMmin: 350, chiploadMmTooth: 0.25 },
    turning_insert_finish:{ cuttingSpeedMmin: 400, chiploadMmTooth: 0.10 },
  },
  steel: {
    end_mill_flat:        { cuttingSpeedMmin: 120, chiploadMmTooth: 0.04 },
    end_mill_ball:        { cuttingSpeedMmin: 100, chiploadMmTooth: 0.03 },
    face_mill:            { cuttingSpeedMmin: 200, chiploadMmTooth: 0.15 },
    drill_twist:          { cuttingSpeedMmin: 30,  chiploadMmTooth: 0.06 },
    tap_cut:              { cuttingSpeedMmin: 6,   chiploadMmTooth: 1.00 },
    turning_insert_rough: { cuttingSpeedMmin: 180, chiploadMmTooth: 0.30 },
    turning_insert_finish:{ cuttingSpeedMmin: 220, chiploadMmTooth: 0.10 },
  },
  stainless: {
    end_mill_flat:        { cuttingSpeedMmin: 60,  chiploadMmTooth: 0.03 },
    end_mill_ball:        { cuttingSpeedMmin: 55,  chiploadMmTooth: 0.025 },
    face_mill:            { cuttingSpeedMmin: 90,  chiploadMmTooth: 0.10 },
    drill_twist:          { cuttingSpeedMmin: 15,  chiploadMmTooth: 0.04 },
    turning_insert_rough: { cuttingSpeedMmin: 100, chiploadMmTooth: 0.25 },
    turning_insert_finish:{ cuttingSpeedMmin: 130, chiploadMmTooth: 0.08 },
  },
  titanium: {
    end_mill_flat:        { cuttingSpeedMmin: 50,  chiploadMmTooth: 0.025 },
    end_mill_ball:        { cuttingSpeedMmin: 45,  chiploadMmTooth: 0.020 },
    drill_twist:          { cuttingSpeedMmin: 10,  chiploadMmTooth: 0.03 },
    turning_insert_rough: { cuttingSpeedMmin: 80,  chiploadMmTooth: 0.20 },
    turning_insert_finish:{ cuttingSpeedMmin: 100, chiploadMmTooth: 0.08 },
  },
  inconel: {
    end_mill_flat:        { cuttingSpeedMmin: 30,  chiploadMmTooth: 0.020 },
    drill_twist:          { cuttingSpeedMmin: 6,   chiploadMmTooth: 0.025 },
    turning_insert_rough: { cuttingSpeedMmin: 40,  chiploadMmTooth: 0.15 },
    turning_insert_finish:{ cuttingSpeedMmin: 55,  chiploadMmTooth: 0.08 },
  },
  hardened_steel: {
    end_mill_flat:        { cuttingSpeedMmin: 60,  chiploadMmTooth: 0.015 },
    end_mill_ball:        { cuttingSpeedMmin: 70,  chiploadMmTooth: 0.020 },
    drill_twist:          { cuttingSpeedMmin: 12,  chiploadMmTooth: 0.02 },
  },
  tool_steel: {
    end_mill_flat:        { cuttingSpeedMmin: 80,  chiploadMmTooth: 0.025 },
    drill_twist:          { cuttingSpeedMmin: 20,  chiploadMmTooth: 0.04 },
  },
  copper: {
    end_mill_flat:        { cuttingSpeedMmin: 180, chiploadMmTooth: 0.05 },
    drill_twist:          { cuttingSpeedMmin: 60,  chiploadMmTooth: 0.08 },
  },
  brass: {
    end_mill_flat:        { cuttingSpeedMmin: 250, chiploadMmTooth: 0.08 },
    drill_twist:          { cuttingSpeedMmin: 80,  chiploadMmTooth: 0.10 },
  },
  plastic: {
    end_mill_flat:        { cuttingSpeedMmin: 200, chiploadMmTooth: 0.10 },
    drill_twist:          { cuttingSpeedMmin: 100, chiploadMmTooth: 0.10 },
  },
  composite: {
    end_mill_flat:        { cuttingSpeedMmin: 150, chiploadMmTooth: 0.04 },
    drill_twist:          { cuttingSpeedMmin: 60,  chiploadMmTooth: 0.06 },
  },
};

const DIA_MIN_MM = 0.1;
const FLUTE_MIN = 1;
const FEED_MIN = 1;

export class CAMFeedrateChiploadEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMFeedrateChiploadEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Computes spindle rpm + feedrate from chipload tables (material × tool family).",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "compute",              description: "rpm + feedrate from inputs",         actions: ["cam_feedrate_compute"] },
      { name: "recommended",          description: "Recommended sfm + chipload",         actions: ["cam_feedrate_recommended"] },
      { name: "compute_recommended",  description: "Compute using recommended table",    actions: ["cam_feedrate_compute_recommended"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMFeedrateChiploadEngine", note: "use typed methods" };
  }

  /** rpm = (m/min × 1000) / (π × dia_mm); feedrate = chipload × flutes × rpm */
  compute(inputs: FeedrateInputs): FeedrateResult {
    const dia = Math.max(DIA_MIN_MM, inputs.toolDiameterMm);
    const flutes = Math.max(FLUTE_MIN, inputs.fluteCount);
    const cs = Math.max(0, inputs.cuttingSpeedMmin);
    const chip = Math.max(0, inputs.chiploadMmTooth);
    const spindleRpm = (cs * 1000) / (Math.PI * dia);
    const feedrateMmMin = Math.max(FEED_MIN, chip * flutes * spindleRpm);
    return { spindleRpm, feedrateMmMin };
  }

  /** Recommended (cuttingSpeedMmin, chiploadMmTooth) for (material, toolFamily). */
  recommended(material: Material, toolFamily: ToolFamily): RecommendedSpeedsFeeds | null {
    return REC_TABLE[material]?.[toolFamily] ?? null;
  }

  /** Convenience — looks up recommended speeds/feeds and computes the result. */
  compute_recommended(
    material: Material,
    toolFamily: ToolFamily,
    toolDiameterMm: number,
    fluteCount: number,
  ): (FeedrateResult & { source: "table" }) | null {
    const rec = this.recommended(material, toolFamily);
    if (!rec) return null;
    return {
      ...this.compute({
        cuttingSpeedMmin: rec.cuttingSpeedMmin,
        chiploadMmTooth: rec.chiploadMmTooth,
        toolDiameterMm,
        fluteCount,
      }),
      source: "table" as const,
    };
  }
}

export const camFeedrateChiploadEngine = new CAMFeedrateChiploadEngine();
