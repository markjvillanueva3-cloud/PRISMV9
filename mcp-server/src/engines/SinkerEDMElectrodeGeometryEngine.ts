/**
 * SinkerEDMElectrodeGeometryEngine — P2P-FULLSTACK-MS0/U-P2PFS54
 *
 * Print-to-electrode geometry resolver for sinker EDM.
 *
 * Given a PartFeature (cavity/pocket/hole) extracted from a drawing,
 * produces a full electrode geometry specification per burn stage:
 *   - nominal XY size (length × width or diameter)
 *   - per-side undersize (== overcut / spark gap at this stage)
 *   - orbit radius if we plan to orbit/planetary (for finishing)
 *   - stock allowance left for downstream finish stages
 *   - shank length + clearance envelope
 *   - net electrode XY + Z-depth + volume (for wear planning)
 *
 * This sits above ElectrodeDesignEngine (which handles material + stage
 * count + wear) and translates the "how many electrodes, which stages"
 * output into the "give me numbers I can send to the tool crib" shape
 * that the sinker print-to-program pipeline needs.
 *
 * Formulas:
 *   undersize_per_side = spark_gap_by_stage  (from ElectrodeDesignEngine)
 *   stock_for_next_stage = previous_gap - current_gap   (radial)
 *   orbit_radius = max(undersize_per_side, 0.03) when stage is semi/finish
 *     on closed-profile cavities — gives finish electrode a planetary
 *     sweep to hit corners the rough electrode left short.
 *   total_shank_length = cavity_depth + safe_clearance_above_part
 *
 * References:
 *   - Mitsubishi MV-series sinker application guide (gap/undersize tables)
 *   - Klocke, EDM — Manufacturing Processes 3, ch. 6 (overcut model)
 *   - Sinker electrode planning: Charmilles / GF Agie D-Series manual
 */

import {
  electrodeDesignEngine,
  type ElectrodeMaterial,
  type ElectrodeDesignInput,
  type ElectrodeDesignResult,
} from "./ElectrodeDesignEngine.js";
import type { PartFeature } from "./EDMDrawingInterpretationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type SinkerStageName = "rough" | "semi" | "finish";

/** One electrode in the set, sized for a specific burn stage. */
export interface SinkerStageElectrode {
  stage: SinkerStageName;
  /** Spark gap per side at this stage (mm). */
  overcut_per_side_mm: number;
  /** Nominal cavity XY at this stage (mm) — what the electrode cuts. */
  nominal_xy_mm: { length: number; width: number } | { diameter: number };
  /** Actual electrode XY after undersize (mm). */
  electrode_xy_mm: { length: number; width: number } | { diameter: number };
  /** Orbit radius (mm) — 0 if die-sinking without planetary motion. */
  orbit_radius_mm: number;
  /** Stock left radially for the next stage (mm). 0 for the final stage. */
  stock_for_next_stage_mm: number;
  /** Electrode Z-depth = cavity depth + sacrificial length (mm). */
  electrode_depth_mm: number;
  /** Shank length above the working face (mm). */
  shank_length_mm: number;
  /** Approximate electrode working volume (mm³) — used for wear planning. */
  electrode_volume_mm3: number;
  /** Wear-aware oversize hint (mm) — extra added for end-wear. 0 if WC/negligible. */
  end_wear_compensation_mm: number;
}

export interface SinkerElectrodeGeometryInput {
  feature: PartFeature;
  workpiece_material: string;
  workpiece_hardness_HRC?: number;
  electrode_material?: ElectrodeMaterial;
  /** Planetary sweep allowed? Disable for open-profile cavities. */
  allow_orbit?: boolean;
  /** Safety envelope above part — default 10 mm. */
  shank_clearance_mm?: number;
  /** End-wear compensation factor — default 0.05 (5% of wear ratio * depth). */
  end_wear_factor?: number;
}

export interface SinkerElectrodeGeometryResult {
  /** One per burn stage, in cutting order (rough → finish). */
  stages: SinkerStageElectrode[];
  /** Material chosen (defaults to input or graphite_fine). */
  electrode_material: ElectrodeMaterial;
  /** Total electrodes required (stages × num_cavities in ElectrodeDesignEngine). */
  total_electrodes_needed: number;
  /** Maximum XY envelope any electrode occupies (mm). */
  max_envelope_xy_mm: { length: number; width: number };
  /** Maximum electrode Z-depth including shank (mm). */
  max_total_length_mm: number;
  /** Aggregated wear ratio (%) — worst of the stages. */
  worst_case_wear_pct: number;
  /** Human-readable notes + any warnings. */
  notes: string[];
  /** Downstream ElectrodeDesignEngine result (for continuity). */
  design: ElectrodeDesignResult;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Spark gap per stage (mm per side). Matches ElectrodeDesignEngine.GAP_BY_STAGE. */
const GAP_BY_STAGE: Record<SinkerStageName, number> = {
  rough: 0.15,
  semi: 0.08,
  finish: 0.03,
};

const DEFAULT_SHANK_CLEARANCE_MM = 10;
const DEFAULT_END_WEAR_FACTOR = 0.05;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Engine that resolves a cavity print into per-stage electrode geometry.
 * Constructor takes an injected ElectrodeDesignEngine for testability.
 */
export class SinkerEDMElectrodeGeometryEngine {
  constructor(
    private readonly designEngine = electrodeDesignEngine,
  ) {}

  /**
   * Resolve print feature → electrode geometry per burn stage.
   *
   * @param input Cavity/pocket feature + material context
   * @returns Per-stage electrode geometry ready for tool-crib fabrication
   */
  plan(input: SinkerElectrodeGeometryInput): SinkerElectrodeGeometryResult {
    const {
      feature,
      workpiece_material,
      workpiece_hardness_HRC = 55,
      electrode_material = "graphite_fine",
      allow_orbit = true,
      shank_clearance_mm = DEFAULT_SHANK_CLEARANCE_MM,
      end_wear_factor = DEFAULT_END_WEAR_FACTOR,
    } = input;

    if (!feature || !feature.dimensions_mm) {
      throw new Error("feature.dimensions_mm required");
    }
    if (!workpiece_material) {
      throw new Error("workpiece_material required");
    }

    const notes: string[] = [];

    const length = feature.dimensions_mm.length ?? feature.dimensions_mm.diameter ?? 0;
    const width = feature.dimensions_mm.width ?? feature.dimensions_mm.diameter ?? length;
    const depth = feature.dimensions_mm.depth ?? 0;
    const isRound = feature.type === "hole"
      || (feature.dimensions_mm.diameter !== undefined && feature.dimensions_mm.length === undefined);

    if (length <= 0 || width <= 0 || depth <= 0) {
      throw new Error(
        `feature must have positive length/width/depth (got L=${length}, W=${width}, D=${depth})`,
      );
    }

    // Delegate stage-count + wear decision to ElectrodeDesignEngine.
    const designInput: ElectrodeDesignInput = {
      cavity_depth_mm: depth,
      cavity_width_mm: width,
      cavity_length_mm: length,
      workpiece_material,
      workpiece_hardness_HRC,
      surface_finish_target_Ra_um: feature.surface_finish_ra_um ?? 1.6,
      tolerance_mm: feature.tolerance_mm ?? 0.01,
      num_cavities: 1,
      electrode_material,
    };
    const design = this.designEngine.design(designInput);

    // ElectrodeDesignEngine uses stage names "rough" / "semi" / "finish".
    const designStages = design.electrode_stages
      .map((s) => s.stage as SinkerStageName)
      .filter((s): s is SinkerStageName => s === "rough" || s === "semi" || s === "finish");

    const stages: SinkerStageElectrode[] = [];

    // Pre-compute per-stage radial stock for next stage:
    // stage[i] leaves behind (gap[i] - gap[i+1]) for stage[i+1] to cut.
    for (let i = 0; i < designStages.length; i++) {
      const stageName = designStages[i];
      const nextStage = designStages[i + 1];
      const gap = GAP_BY_STAGE[stageName];
      // Final stage leaves no stock; earlier stages leave (gap_i - gap_{i+1}).
      const stockForNext = nextStage
        ? Math.max(0, gap - GAP_BY_STAGE[nextStage])
        : 0;

      // Orbit radius: finishing stages on closed cavities walk a small orbit
      // so the electrode sweeps the corners the previous stage undercut.
      const orbitEnabled = allow_orbit
        && (stageName === "semi" || stageName === "finish")
        && !feature.is_through;
      const orbitRadius = orbitEnabled ? Math.max(gap, 0.03) : 0;

      // Nominal XY = the cavity face this stage needs to produce.
      // Rough stage uses the part cavity minus final-stage undersize so
      // subsequent stages have metal left to cut; semi/finish converge on
      // the exact cavity size.
      const finalGap = GAP_BY_STAGE[designStages[designStages.length - 1]];
      let nomL = length - 2 * (gap - finalGap);
      let nomW = width - 2 * (gap - finalGap);
      if (stageName === designStages[designStages.length - 1]) {
        nomL = length;
        nomW = width;
      }

      // Electrode XY = nominal cavity XY minus gap per side.
      const elL = nomL - 2 * gap;
      const elW = nomW - 2 * gap;

      if (elL <= 0 || elW <= 0) {
        notes.push(
          `Stage ${stageName}: electrode dimension collapsed (L=${elL.toFixed(3)}, W=${elW.toFixed(3)}) — feature too small for selected stage count`,
        );
      }

      // End-wear comp: use wear_ratio_pct to estimate Z shrinkage and oversize
      // the electrode Z-length accordingly.
      const endWear = round3((design.wear_ratio_pct / 100) * depth * end_wear_factor);

      const electrodeDepth = round3(depth + endWear);
      const shankLen = shank_clearance_mm;
      const volume = round3(elL * elW * electrodeDepth);

      stages.push({
        stage: stageName,
        overcut_per_side_mm: gap,
        nominal_xy_mm: isRound ? { diameter: round3(nomL) } : { length: round3(nomL), width: round3(nomW) },
        electrode_xy_mm: isRound ? { diameter: round3(elL) } : { length: round3(elL), width: round3(elW) },
        orbit_radius_mm: round3(orbitRadius),
        stock_for_next_stage_mm: round3(stockForNext),
        electrode_depth_mm: electrodeDepth,
        shank_length_mm: shankLen,
        electrode_volume_mm3: volume,
        end_wear_compensation_mm: endWear,
      });
    }

    // Aggregate metrics.
    const maxL = stages.reduce((m, s) => {
      const v = "length" in s.nominal_xy_mm ? s.nominal_xy_mm.length : s.nominal_xy_mm.diameter;
      return v > m ? v : m;
    }, 0);
    const maxW = stages.reduce((m, s) => {
      const v = "width" in s.nominal_xy_mm ? s.nominal_xy_mm.width : s.nominal_xy_mm.diameter;
      return v > m ? v : m;
    }, 0);
    const maxLen = stages.reduce(
      (m, s) => Math.max(m, s.electrode_depth_mm + s.shank_length_mm),
      0,
    );

    // Wear ratio comes from the design engine for the chosen material+workpiece.
    const worstWear = design.wear_ratio_pct;

    if (allow_orbit && feature.is_through) {
      notes.push("Feature is through — orbit disabled (use straight plunge).");
    }
    if (stages.length === 0) {
      notes.push("No stages assigned — ElectrodeDesignEngine returned empty stage list.");
    }
    if (feature.min_corner_radius_mm !== undefined && feature.min_corner_radius_mm < 0.1) {
      notes.push(
        `Min corner radius ${feature.min_corner_radius_mm} mm < 0.1 mm — micro-EDM or wire-start hole may be needed first`,
      );
    }

    return {
      stages,
      electrode_material,
      total_electrodes_needed: design.num_electrodes_needed,
      max_envelope_xy_mm: { length: round3(maxL), width: round3(maxW) },
      max_total_length_mm: round3(maxLen),
      worst_case_wear_pct: worstWear,
      notes,
      design,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round3(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 1000) / 1000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sinkerEDMElectrodeGeometryEngine = new SinkerEDMElectrodeGeometryEngine();
