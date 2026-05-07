/**
 * LatheOffsetSuperpositionEngine — U-LPT01: Wear-to-Offset Superposition Model
 *
 * Composes four independent dimensional-error sources into a unified Z/radial
 * offset prediction for lathe operations:
 *
 *   δ_total = δ_wear + δ_thermal_spindle + δ_thermal_part + δ_geometric
 *
 * Component sources:
 *   - δ_wear:             flank-wear-driven radial offset, linearised via Taylor life
 *                         when VB not directly measured. Δr = VB · |sin(κr)| where κr
 *                         is the side cutting edge (lead) angle. Ref: Altintas
 *                         "Manufacturing Automation" §3.2; ISO 8688-1 (carbide VB_max).
 *   - δ_thermal_spindle:  spindle + holder + tool growth chain, delegated to
 *                         ThermalGrowthCompensationEngine. ΔL = α·L·ΔT, ISO 230-3.
 *   - δ_thermal_part:     workpiece CTE expansion, same engine, separated for
 *                         provenance.
 *   - δ_geometric:        pre-computed machine geometric error (μm) — usually
 *                         supplied by MachineGeometricAccuracyEngine via the
 *                         21-error model, ball-bar diagnostics, or stored
 *                         calibration. Engine accepts the result as a single μm
 *                         input rather than re-running the full 21-error model.
 *
 * Per LATHE-PRO-v3-ROADMAP MS2 / U-LPT01.
 *
 * Safety: 50μm hard cap mirrors U-LPT04 maximum single-adjustment rule.
 *         |δ_total| > 50μm sets is_within_safety_cap=false; consumer is
 *         expected to require operator review before emitting G10 offset.
 *
 * @module engines/LatheOffsetSuperpositionEngine
 */

import {
  thermalGrowthCompensationEngine,
} from "./ThermalGrowthCompensationEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

/** AtomicValue conforming to PRISM convention. Internal use only — public APIs
 *  may import {@link AtomicValue} from a shared location once one exists. */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export type DisableComponent =
  | "wear"
  | "spindle_thermal"
  | "part_thermal"
  | "geometric";

export interface ToolWearState {
  /** Current measured flank wear (mm). Wins when present. */
  vb_current_mm?: number;
  /** Cumulative cutting time so far (min). Required when vb_current_mm absent. */
  cumulative_cutting_time_min?: number;
  /** Expected tool life until VB reaches vb_max (min). Required when
   *  vb_current_mm absent. Caller may compute via Taylor: T = (C/Vc)^(1/n). */
  expected_tool_life_min?: number;
  /** End-of-life flank wear (mm). Default 0.3mm per ISO 8688-1 carbide. */
  vb_max_mm?: number;
  /** Side cutting edge / lead angle κr (degrees). Default 95° (general turning). */
  side_cutting_edge_angle_deg?: number;
}

export interface OffsetSuperpositionInput {
  tool_wear: ToolWearState;
  operation: {
    spindle_speed_rpm: number;
    cutting_time_min: number;
    cutting_power_kW?: number;
  };
  tool_geometry: {
    overhang_mm: number;
    holder_length_mm?: number;
    tool_material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  };
  workpiece: {
    material:
      | "steel"
      | "aluminum"
      | "cast_iron"
      | "titanium"
      | "stainless"
      | "inconel";
    length_mm: number;
  };
  machine: {
    bearing_type?: "angular_contact" | "roller" | "hydrostatic";
    ambient_temp_C?: number;
    coolant_active?: boolean;
  };
  /** Pre-computed machine geometric error (μm). Default 0. */
  geometric_error_um?: number;
  /** Optional: skip individual components for testing or known-good calibration. */
  disable_components?: DisableComponent[];
}

export interface OffsetSuperpositionResult {
  delta_total_um: AtomicValue;
  delta_total_mm: AtomicValue;
  breakdown: {
    delta_wear_um: AtomicValue;
    delta_thermal_spindle_um: AtomicValue;
    delta_thermal_part_um: AtomicValue;
    delta_geometric_um: AtomicValue;
  };
  is_within_safety_cap: boolean;
  safety_cap_um: number;
  recommendations: string[];
  warnings: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** U-LPT04: maximum single-adjustment offset (μm). Source: LATHE-PRO-v3-ROADMAP.md §MS2. */
const SAFETY_CAP_UM = 50;

/** ISO 8688-1: end-of-life flank wear for carbide turning inserts (mm). */
const DEFAULT_VB_MAX_MM = 0.3;

/** Default lead angle for general turning inserts (degrees). */
const DEFAULT_LEAD_ANGLE_DEG = 95;

/** 30% uncertainty on flank-wear linearisation (Altintas §3.2 — wear models
 *  have wide spread between insert grades, work materials, and coolant states). */
const WEAR_RELATIVE_UNCERTAINTY = 0.30;

/** 20% uncertainty on geometric error inputs (calibration drift between
 *  ball-bar tests, structural temperature variation). */
const GEOMETRIC_RELATIVE_UNCERTAINTY = 0.20;

/** Below this magnitude we suppress the warmup/tool-change recommendation —
 *  thermal stability + wear are still within "ignore-and-keep-going" range. */
const WARMUP_RECOMMENDATION_THRESHOLD_UM = 25;

const ZERO_VALUE: Readonly<AtomicValue> = {
  value: 0,
  unit: "μm",
  uncertainty: 0,
  source: "disabled",
};

// ─── Engine ────────────────────────────────────────────────────────

/**
 * Composes four offset components into δ_total with full provenance.
 *
 * @example
 * const result = latheOffsetSuperpositionEngine.calculate({
 *   tool_wear: { cumulative_cutting_time_min: 30, expected_tool_life_min: 60 },
 *   operation: { spindle_speed_rpm: 2000, cutting_time_min: 30 },
 *   tool_geometry: { overhang_mm: 25, tool_material: "carbide" },
 *   workpiece: { material: "steel", length_mm: 100 },
 *   machine: { bearing_type: "angular_contact" },
 * });
 * if (!result.is_within_safety_cap) requireOperatorReview(result);
 */
class LatheOffsetSuperpositionEngine {
  /**
   * Compute the unified offset across all four sources.
   * @param input — see {@link OffsetSuperpositionInput}
   * @returns aggregated offset with per-component breakdown and safety status
   */
  calculate(input: OffsetSuperpositionInput): OffsetSuperpositionResult {
    const disable = new Set(input.disable_components ?? []);
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // ─── δ_wear ──────────────────────────────────────────
    const deltaWear: AtomicValue = disable.has("wear")
      ? { ...ZERO_VALUE }
      : this.computeWearOffset(input.tool_wear, warnings);

    // ─── δ_thermal_spindle + δ_thermal_part ──────────────
    let deltaThermalSpindle: AtomicValue;
    let deltaThermalPart: AtomicValue;
    if (disable.has("spindle_thermal") && disable.has("part_thermal")) {
      deltaThermalSpindle = { ...ZERO_VALUE };
      deltaThermalPart = { ...ZERO_VALUE };
    } else {
      const tg = thermalGrowthCompensationEngine.calculate({
        spindle_speed_rpm: input.operation.spindle_speed_rpm,
        cutting_time_min: input.operation.cutting_time_min,
        ambient_temp_C: input.machine.ambient_temp_C,
        spindle_bearing_type: input.machine.bearing_type,
        tool_material: input.tool_geometry.tool_material,
        tool_overhang_mm: input.tool_geometry.overhang_mm,
        tool_holder_length_mm: input.tool_geometry.holder_length_mm,
        workpiece_material: input.workpiece.material,
        workpiece_length_mm: input.workpiece.length_mm,
        cutting_power_kW: input.operation.cutting_power_kW,
        coolant_active: input.machine.coolant_active,
      });

      deltaThermalSpindle = disable.has("spindle_thermal")
        ? { ...ZERO_VALUE }
        : {
            value: round2(
              tg.spindle_growth_um.value +
                tg.tool_holder_growth_um.value +
                tg.tool_growth_um.value,
            ),
            unit: "μm",
            uncertainty: round2(
              rss(
                tg.spindle_growth_um.uncertainty,
                tg.tool_holder_growth_um.uncertainty,
                tg.tool_growth_um.uncertainty,
              ),
            ),
            source: "ThermalGrowthCompensationEngine.spindle_chain",
          };

      deltaThermalPart = disable.has("part_thermal")
        ? { ...ZERO_VALUE }
        : {
            value: tg.workpiece_growth_um.value,
            unit: "μm",
            uncertainty: tg.workpiece_growth_um.uncertainty,
            source: "ThermalGrowthCompensationEngine.workpiece",
          };
    }

    // ─── δ_geometric ─────────────────────────────────────
    const geomInput = input.geometric_error_um ?? 0;
    if (!Number.isFinite(geomInput)) {
      throw new Error(
        `LatheOffsetSuperposition: geometric_error_um must be finite, got ${geomInput}`,
      );
    }
    const deltaGeometric: AtomicValue = disable.has("geometric")
      ? { ...ZERO_VALUE }
      : {
          value: geomInput,
          unit: "μm",
          uncertainty: round2(
            Math.abs(geomInput) * GEOMETRIC_RELATIVE_UNCERTAINTY,
          ),
          source:
            input.geometric_error_um != null
              ? "MachineGeometricAccuracyEngine.upstream"
              : "default_zero",
        };

    // ─── Sum ─────────────────────────────────────────────
    const totalUm =
      deltaWear.value +
      deltaThermalSpindle.value +
      deltaThermalPart.value +
      deltaGeometric.value;
    const totalUncertaintyUm = rss(
      deltaWear.uncertainty,
      deltaThermalSpindle.uncertainty,
      deltaThermalPart.uncertainty,
      deltaGeometric.uncertainty,
    );

    const isWithinCap = Math.abs(totalUm) <= SAFETY_CAP_UM;
    if (!isWithinCap) {
      warnings.push(
        `δ_total=${totalUm.toFixed(1)}μm exceeds U-LPT04 safety cap of ${SAFETY_CAP_UM}μm — operator review required before applying offset`,
      );
    }
    if (
      !disable.has("spindle_thermal") &&
      Math.abs(totalUm) > WARMUP_RECOMMENDATION_THRESHOLD_UM
    ) {
      recommendations.push(
        "Consider machine warmup or scheduled tool change before continuing",
      );
    }
    if (deltaWear.warning) {
      warnings.push(deltaWear.warning);
    }

    const totalRounded = round2(totalUm);
    const totalUncRounded = round2(totalUncertaintyUm);

    return {
      delta_total_um: {
        value: totalRounded,
        unit: "μm",
        uncertainty: totalUncRounded,
        source: "superposition",
      },
      delta_total_mm: {
        value: round4(totalRounded / 1000),
        unit: "mm",
        uncertainty: round4(totalUncRounded / 1000),
        source: "superposition",
      },
      breakdown: {
        delta_wear_um: deltaWear,
        delta_thermal_spindle_um: deltaThermalSpindle,
        delta_thermal_part_um: deltaThermalPart,
        delta_geometric_um: deltaGeometric,
      },
      is_within_safety_cap: isWithinCap,
      safety_cap_um: SAFETY_CAP_UM,
      recommendations,
      warnings,
    };
  }

  /**
   * Compute flank-wear-driven radial offset (μm) via VB · |sin(κr)|.
   *
   * Resolution order:
   *   1. vb_current_mm if supplied (measured)
   *   2. linearised Taylor: VB = VB_max · (t / T_life) for 0 ≤ t ≤ T_life
   *   3. no_wear_data → returns 0 with warning surfaced via AtomicValue.warning
   */
  private computeWearOffset(
    state: ToolWearState,
    warnings: string[],
  ): AtomicValue {
    const vbMaxMm = state.vb_max_mm ?? DEFAULT_VB_MAX_MM;
    const leadDeg = state.side_cutting_edge_angle_deg ?? DEFAULT_LEAD_ANGLE_DEG;

    if (vbMaxMm <= 0 || !Number.isFinite(vbMaxMm)) {
      throw new Error(
        `LatheOffsetSuperposition: vb_max_mm must be positive, got ${vbMaxMm}`,
      );
    }
    if (!Number.isFinite(leadDeg)) {
      throw new Error(
        `LatheOffsetSuperposition: side_cutting_edge_angle_deg must be finite, got ${leadDeg}`,
      );
    }

    let vbMm: number;
    let resolution: string;
    if (state.vb_current_mm != null) {
      vbMm = state.vb_current_mm;
      resolution = "measured_vb";
    } else if (
      state.cumulative_cutting_time_min != null &&
      state.expected_tool_life_min != null &&
      state.expected_tool_life_min > 0
    ) {
      const wearRatio = clamp(
        state.cumulative_cutting_time_min / state.expected_tool_life_min,
        0,
        1,
      );
      vbMm = vbMaxMm * wearRatio;
      resolution = `linearised_taylor(ratio=${wearRatio.toFixed(3)})`;
      if (wearRatio >= 0.95) {
        warnings.push(
          `Tool wear ratio ${(wearRatio * 100).toFixed(0)}% — replace insert before next operation`,
        );
      }
    } else {
      return {
        value: 0,
        unit: "μm",
        uncertainty: 0,
        source: "no_wear_data",
        warning:
          "tool_wear input missing both vb_current_mm and (cumulative_cutting_time_min + expected_tool_life_min)",
      };
    }

    if (vbMm < 0) {
      throw new Error(
        `LatheOffsetSuperposition: invalid negative VB (${vbMm}mm) — flank wear cannot be negative`,
      );
    }

    const leadRad = (leadDeg * Math.PI) / 180;
    const radialProjection = Math.abs(Math.sin(leadRad));
    const deltaUm = vbMm * 1000 * radialProjection;
    const uncertainty = deltaUm * WEAR_RELATIVE_UNCERTAINTY;

    return {
      value: round2(deltaUm),
      unit: "μm",
      uncertainty: round2(uncertainty),
      source: `flank_wear_radial(${resolution}, kr=${leadDeg}deg)`,
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function rss(...values: number[]): number {
  return Math.sqrt(values.reduce((acc, v) => acc + v * v, 0));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Singleton — match PRISM engine convention (cf. ThermalGrowthCompensationEngine). */
export const latheOffsetSuperpositionEngine = new LatheOffsetSuperpositionEngine();
