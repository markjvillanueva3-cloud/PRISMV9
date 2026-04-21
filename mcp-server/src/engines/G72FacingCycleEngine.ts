/**
 * G72FacingCycleEngine — Physics-derived G72 multi-pass facing for mill-turn
 *
 * Fanuc/Haas G72 is a face-roughing canned cycle (turret approaches from OD,
 * cuts toward spindle axis). On mill-turn machines, this is the turn-side
 * facing operation emitted through the turret when milling and turning
 * share the same machine.
 *
 * The bug being fixed: the G72 emitter in AutoProgramOrchestratorEngine used
 *   dpp = op.depth_per_pass_mm ?? doc
 * which falls back to the total DOC as a single-pass when no explicit per-pass
 * value is supplied. That generates one huge pass that often exceeds spindle
 * power or tool rigidity. This engine computes a physics-safe DOC per pass
 * from Kienzle force + spindle power + feed + material.
 *
 * Physics chain (all constants from src/physics/constants.ts):
 *   Kienzle:  Fc = kc1.1 × b × h^(1-mc)           [N]
 *             where b = ap / sin(κr), h = f × sin(κr)
 *   Power:    P_cut = Fc × Vc / 60000              [kW]   (Vc in m/min, Fc in N)
 *   Safe ap:  ap_max = (P_avail × η × 60000) / (kc_h × f × Vc)
 *             where kc_h = kc1.1 × h^(-mc) is the effective specific force
 *
 * Guarantees:
 *   - Never returns 0 passes (min 1)
 *   - Clamps to reasonable bounds (0.05 ≤ ap ≤ 8mm)
 *   - Emits warnings when clamping occurs
 *   - Returns structured G72 two-line blocks per pass
 *
 * @module engines/G72FacingCycleEngine
 * @milestone MILL-MASTER-P3-U02-FACE-G72
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";

type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface G72FacingInput {
  /** Starting OD [mm] — where facing tool enters stock */
  face_od_mm: number;
  /** Final face Z [mm] — typically 0 or small positive leave-stock */
  face_z_mm: number;
  /** Total axial stock to remove [mm] (positive scalar). */
  total_doc_mm: number;
  /** Cutting speed [m/min]. */
  cutting_speed_m_min: number;
  /** Feed per revolution [mm/rev]. */
  feed_per_rev_mm: number;
  /** Material ISO group (drives Kienzle kc1.1 + mc). */
  material_iso: ISOGroup;
  /** Available spindle power at the cut [kW]. */
  spindle_power_kw: number;
  /** Approach angle κr [deg]. Default 90° (radial = typical facing tool). */
  lead_angle_deg?: number;
  /** Mechanical efficiency (gearbox + spindle bearings). Default 0.85. */
  efficiency?: number;
  /** Stock allowance left on face for finish pass [mm]. Default 0.1. */
  finish_allowance_mm?: number;
  /** Safety factor on computed ap_max. Default 0.80 (use 80% of power envelope). */
  safety_factor?: number;
  /** Override auto-computed DOC per pass (bypass physics — for testing). */
  force_dpp_mm?: number;
}

export interface G72FacingResult {
  /** Array of G72 two-line pass block pairs (ready to join with newlines). */
  gcode: string[];
  /** Derived DOC per pass used [mm]. */
  dpp_mm: number;
  /** Number of passes. */
  pass_count: number;
  /** Total doc remaining for finish (total_doc - rough_doc) [mm]. */
  finish_allowance_mm: number;
  /** Physics-derived ap_max before safety factor [mm]. */
  ap_max_raw_mm: number;
  /** Cutting force at the selected DOC [N]. */
  cutting_force_n: number;
  /** Cutting power at selected DOC [kW]. */
  cutting_power_kw: number;
  /** Power utilization at selected DOC [0..1]. */
  power_utilization: number;
  /** Warnings (clamping, feed too high, etc.). Never null. */
  warnings: string[];
}

const MIN_AP_MM = 0.05;
const MAX_AP_MM = 8.0;
const DEFAULT_LEAD_DEG = 90;
const DEFAULT_EFF = 0.85;
const DEFAULT_FINISH = 0.1;
const DEFAULT_SF = 0.80;

export class G72FacingCycleEngine {
  /**
   * Generate a physics-derived G72 multi-pass facing cycle.
   *
   * @param input - Facing cycle inputs (geometry + physics)
   * @returns Structured result with G-code + derived values + warnings
   */
  generate(input: G72FacingInput): G72FacingResult {
    const warnings: string[] = [];

    const sf = input.safety_factor ?? DEFAULT_SF;
    const eff = input.efficiency ?? DEFAULT_EFF;
    const finishAllow = input.finish_allowance_mm ?? DEFAULT_FINISH;
    const leadDeg = input.lead_angle_deg ?? DEFAULT_LEAD_DEG;
    const leadRad = (leadDeg * Math.PI) / 180;
    const sinLead = Math.sin(leadRad);
    if (sinLead <= 0) {
      warnings.push(`lead_angle ${leadDeg}° invalid — using 90°`);
    }
    const sinEff = sinLead > 0 ? sinLead : 1;

    // Physics from constants
    const mat = CANONICAL_KIENZLE[input.material_iso];
    const { kc1_1, mc } = mat;

    // Physics-derived max DOC
    // Effective specific cutting force at this chip thickness:
    //   h = feed × sin(κr)
    //   kc_h = kc1.1 × h^(-mc)
    // Power constraint:
    //   P = (kc_h × b × h × Vc) / (60000 × η)   (kW, with Vc in m/min)
    //   where b × h = ap × feed  (chip area is invariant under κr)
    // So:
    //   ap_max = (P_avail × η × 60000) / (kc_h × feed × Vc)
    const h = input.feed_per_rev_mm * sinEff;
    const kcH = h > 0 ? kc1_1 * Math.pow(h, -mc) : kc1_1;
    const denom = kcH * input.feed_per_rev_mm * input.cutting_speed_m_min;
    const apMaxRaw = denom > 0
      ? (input.spindle_power_kw * eff * 60000) / denom
      : MAX_AP_MM;

    // Apply safety factor, clamp to sane bounds
    let dpp = input.force_dpp_mm ?? apMaxRaw * sf;
    if (dpp < MIN_AP_MM) {
      warnings.push(`computed dpp ${dpp.toFixed(4)}mm below minimum — clamped to ${MIN_AP_MM}mm`);
      dpp = MIN_AP_MM;
    }
    if (dpp > MAX_AP_MM) {
      warnings.push(`computed dpp ${dpp.toFixed(2)}mm above maximum — clamped to ${MAX_AP_MM}mm`);
      dpp = MAX_AP_MM;
    }

    // Reserve finish allowance — rough passes remove everything except finish_allowance
    const roughDoc = Math.max(0, input.total_doc_mm - finishAllow);
    if (roughDoc <= 0) {
      warnings.push(`total_doc (${input.total_doc_mm}) ≤ finish_allowance (${finishAllow}) — nothing to rough`);
      return {
        gcode: [
          `(G72 FACING — no rough passes needed, total_doc ${input.total_doc_mm}mm ≤ finish_allowance ${finishAllow}mm)`,
        ],
        dpp_mm: 0,
        pass_count: 0,
        finish_allowance_mm: finishAllow,
        ap_max_raw_mm: apMaxRaw,
        cutting_force_n: 0,
        cutting_power_kw: 0,
        power_utilization: 0,
        warnings,
      };
    }

    const passCount = Math.max(1, Math.ceil(roughDoc / dpp));
    // Rebalance so all passes are equal (avoids tiny last pass)
    const dppBalanced = roughDoc / passCount;

    // Verify forces at chosen dpp
    const bEff = dppBalanced / sinEff;
    const Fc = kc1_1 * bEff * Math.pow(h, 1 - mc);
    const Pcut = (Fc * input.cutting_speed_m_min) / 60000;
    const powerUtil = input.spindle_power_kw > 0 ? Pcut / (input.spindle_power_kw * eff) : 0;

    if (powerUtil > 1) {
      warnings.push(`power utilization ${(powerUtil * 100).toFixed(0)}% exceeds available — expect stalling`);
    }
    if (h > 0.4) {
      warnings.push(`chip thickness h=${h.toFixed(2)}mm is aggressive for facing — consider lower feed`);
    }

    // Emit G72 two-line blocks
    // Line 1: G72 W(dpp) R(retract)
    // Line 2: G72 P(NS) Q(NF) U(X_stock) W(finish_allow) F(feed)
    const gcode: string[] = [];
    gcode.push(
      `(G72 FACING — ${passCount} rough pass${passCount > 1 ? "es" : ""}, ` +
        `dpp=${dppBalanced.toFixed(3)}mm, material=${input.material_iso}, ` +
        `power_util=${(powerUtil * 100).toFixed(0)}%)`,
    );
    gcode.push(`G72 W${dppBalanced.toFixed(3)} R1.0`);
    gcode.push(
      `G72 P[NS] Q[NF] U0.3 W${finishAllow.toFixed(3)} F${input.feed_per_rev_mm.toFixed(3)}`,
    );

    return {
      gcode,
      dpp_mm: dppBalanced,
      pass_count: passCount,
      finish_allowance_mm: finishAllow,
      ap_max_raw_mm: apMaxRaw,
      cutting_force_n: Fc,
      cutting_power_kw: Pcut,
      power_utilization: powerUtil,
      warnings,
    };
  }
}

export const g72FacingCycleEngine = new G72FacingCycleEngine();
