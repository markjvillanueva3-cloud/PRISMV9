/**
 * WEDMFlushAdequacyGateEngine — Wire EDM Flushing Adequacy Gate
 *
 * Decides whether the flushing system moves dielectric fast enough through the
 * kerf to evict debris before the next pulse. Thin, medium and thick workpieces
 * require progressively higher velocities because the flush path length grows
 * linearly with thickness while the kerf cross-section stays constant.
 *
 * Output plugs directly into WEDMProgramSafetyGateEngine's `flushing` input and
 * contributes 0.15 to the composite S(x). A failing flush gate forces HARD BLOCK
 * of program emit unless an experienced operator explicitly overrides with a
 * tribal-knowledge acknowledgement — and only when velocity is at least at the
 * tribal_override_floor (never below).
 *
 * Physics
 * -------
 *
 *   v_f = Q / (π · g · L)                                    [m/s]
 *
 *   Q  = pump volumetric flow           [mm³/s]
 *   g  = one-sided gap (wire offset)    [mm]
 *   L  = workpiece thickness            [mm]
 *   π·g·L ≈ kerf swept cross-section for a round-wire cut
 *
 * Minimum v_f by thickness band (submerged cut):
 *   ≤ 25 mm   → 0.5 m/s
 *   25–75 mm  → 0.8 m/s
 *   > 75 mm   → 1.2 m/s
 *
 * Side-flush (no tank submersion) multiplies the threshold by SIDE_FLUSH_PENALTY
 * to compensate for the dielectric surface air-entraining the top of the cut.
 *
 * Sources
 * -------
 *   - Kunieda et al. 2005 CIRP Annals §3 (debris eviction physics)
 *   - Klocke Table 8.7 (thick-section flushing)
 *   - Mitsubishi MV1200S Operator Manual §4.2 (minimum flushing flow by Z)
 *   - Sodick VL400Q Operator Manual §4.3 (flushing tables)
 *   - WEDM_FLUSH_ADEQUACY constants in physics/wedm-constants.ts
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-04
 *
 * @see WEDMProgramSafetyGateEngine — composite S(x) gate consumer
 * @see WEDMDielectricFlushAdjustEngine — adjusts pressure for conductivity
 */

import { WEDM_FLUSH_ADEQUACY } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type FlushMode = "submerged" | "side_flush";

export type FlushAdequacyVerdict =
  | "pass"
  | "marginal"
  | "fail_tribal_override_allowed"
  | "fail_hard_block";

export type FlushThicknessBand = "thin" | "medium" | "thick";

export interface FlushAdequacyInput {
  /** Pump volumetric flow rate through the cut [mm³/s]. REQUIRED. */
  flow_mm3_s: number;
  /** Workpiece thickness [mm]. REQUIRED. */
  thickness_mm: number;
  /** Flush mode — submerged (tank full) or side-flush nozzle only. */
  mode: FlushMode;
  /**
   * One-sided gap [mm] — wire offset + overburn. Defaults to
   * WEDM_FLUSH_ADEQUACY.default_gap_mm when not supplied.
   */
  gap_mm?: number;
  /**
   * Tribal-knowledge override from an experienced operator. Allows emit in the
   * {@link FlushAdequacyVerdict} range between tribal_override_floor and the
   * band's minimum, but NEVER below the floor. Must record operator id.
   */
  tribal_override?: {
    enabled: boolean;
    operator_id: string;
    acknowledgement: string;
  };
}

export interface FlushAdequacyResult {
  success: boolean;
  pass: boolean;
  verdict: FlushAdequacyVerdict;
  velocity_m_s: number;
  required_velocity_m_s: number;
  band: FlushThicknessBand;
  mode: FlushMode;
  hard_block: boolean;
  tribal_override_used: boolean;
  /**
   * Input shape that WEDMProgramSafetyGateEngine.evaluate() expects on its
   * `flushing` field. Ready to forward directly into the composite gate.
   */
  safety_gate_input: {
    pass: boolean;
    velocity_m_s: number;
    required_velocity_m_s: number;
    mode: FlushMode;
  };
  /** S(x) contribution (0.15 when passing, 0 otherwise). */
  safety_score_contribution: number;
  summary: string;
  warnings: string[];
  recommendations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (local to this engine — all values live in wedm-constants.ts)
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_SCORE_PASS = 0.15;
const SAFETY_SCORE_FAIL = 0.0;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMFlushAdequacyGateEngine {
  readonly name = "WEDMFlushAdequacyGateEngine";
  readonly version = "1.0.0";

  /**
   * Evaluate flushing adequacy and return a structured verdict plus a ready-
   * to-use `safety_gate_input` for WEDMProgramSafetyGateEngine.
   *
   * @param input flow, thickness, mode, optional gap and operator override
   * @returns verdict, kerf velocity, and composite-gate payload
   */
  evaluate(input: FlushAdequacyInput): FlushAdequacyResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const thickness = Number.isFinite(input.thickness_mm) ? input.thickness_mm : 0;
    const flow = Number.isFinite(input.flow_mm3_s) ? input.flow_mm3_s : 0;
    const gap = Number.isFinite(input.gap_mm) && (input.gap_mm as number) > 0
      ? (input.gap_mm as number)
      : WEDM_FLUSH_ADEQUACY.default_gap_mm;
    const mode: FlushMode = input.mode === "side_flush" ? "side_flush" : "submerged";

    if (thickness <= 0 || flow <= 0) {
      // Degenerate input — cannot compute, fail-closed.
      return this.buildFailClosed(
        "degenerate input (thickness or flow ≤ 0)",
        thickness,
        mode,
      );
    }

    const band = this.classifyBand(thickness);
    const baseline = this.baselineRequirement(band);
    const required = mode === "side_flush" ? baseline * WEDM_FLUSH_ADEQUACY.side_flush_penalty : baseline;

    // v_f = Q / (π · g · L). Convert mm/s → m/s by / 1000.
    const kerfAreaMm2 = Math.PI * gap * thickness;
    const velocityMmS = flow / kerfAreaMm2;
    const velocityMS = velocityMmS / 1000;

    const hardFloor = required * WEDM_FLUSH_ADEQUACY.tribal_override_floor;
    const passed = velocityMS >= required;

    let verdict: FlushAdequacyVerdict;
    let tribalOverrideUsed = false;
    let effectivePass = passed;
    let hardBlock = !passed;

    if (passed) {
      verdict = "pass";
      hardBlock = false;
    } else if (velocityMS < hardFloor) {
      // Below absolute safety floor — no operator override permitted.
      verdict = "fail_hard_block";
      hardBlock = true;
      warnings.push(
        `Kerf velocity ${velocityMS.toFixed(2)} m/s below absolute safety floor ${hardFloor.toFixed(2)} m/s — operator override forbidden`,
      );
      recommendations.push(
        "Increase pump flow, widen gap (next-larger condition code), or split into thinner sections before retrying",
      );
    } else if (input.tribal_override?.enabled && input.tribal_override.operator_id) {
      // Between floor and required, operator acknowledged → allow emit.
      verdict = "fail_tribal_override_allowed";
      tribalOverrideUsed = true;
      effectivePass = true;
      hardBlock = false;
      warnings.push(
        `Kerf velocity ${velocityMS.toFixed(2)} m/s below required ${required.toFixed(2)} m/s — tribal override accepted (operator ${input.tribal_override.operator_id})`,
      );
      recommendations.push(
        "Monitor wire-break rate and Ra closely for this run; calibrate pump if issue recurs",
      );
    } else {
      // Below required but above floor, no override supplied → block with hint.
      verdict = "fail_tribal_override_allowed";
      hardBlock = true;
      warnings.push(
        `Kerf velocity ${velocityMS.toFixed(2)} m/s below required ${required.toFixed(2)} m/s`,
      );
      recommendations.push(
        "Increase flow or switch to submerged mode; experienced operators may supply tribal_override to proceed",
      );
    }

    // Marginal pass: within 10% of threshold — log a warning for monitoring.
    if (verdict === "pass" && velocityMS < required * 1.10) {
      verdict = velocityMS >= required ? "marginal" : verdict;
      recommendations.push(
        "Velocity is within 10% of minimum — consider raising flow one step for margin",
      );
    }

    const pass = effectivePass;

    const safetyGateInput = {
      pass,
      velocity_m_s: velocityMS,
      required_velocity_m_s: required,
      mode,
    };

    return {
      success: true,
      pass,
      verdict,
      velocity_m_s: velocityMS,
      required_velocity_m_s: required,
      band,
      mode,
      hard_block: hardBlock,
      tribal_override_used: tribalOverrideUsed,
      safety_gate_input: safetyGateInput,
      safety_score_contribution: pass ? SAFETY_SCORE_PASS : SAFETY_SCORE_FAIL,
      summary: hardBlock
        ? `FLUSH BLOCK: ${verdict} — v=${velocityMS.toFixed(2)} m/s vs required ${required.toFixed(2)} m/s (${band}, ${mode})`
        : `FLUSH OK: v=${velocityMS.toFixed(2)} m/s ≥ ${required.toFixed(2)} m/s (${band}, ${mode}${tribalOverrideUsed ? ", tribal override" : ""})`,
      warnings,
      recommendations,
    };
  }

  /**
   * Gate wrapper — returns allow/deny plus the full evaluation result.
   *
   * @param input same shape as {@link evaluate}
   * @returns `{ allow, reason, result }`
   */
  gate(input: FlushAdequacyInput): { allow: boolean; reason: string; result: FlushAdequacyResult } {
    const result = this.evaluate(input);
    return { allow: result.pass, reason: result.summary, result };
  }

  /**
   * Classify thickness into a band. Boundaries are inclusive on the lower side
   * and exclusive on the upper so that edge values land in the looser band
   * (safer default).
   *
   * @param thicknessMm workpiece thickness
   * @returns "thin" (≤25mm), "medium" (25-75mm), or "thick" (>75mm)
   */
  classifyBand(thicknessMm: number): FlushThicknessBand {
    if (thicknessMm <= WEDM_FLUSH_ADEQUACY.thin_band_max_mm) return "thin";
    if (thicknessMm <= WEDM_FLUSH_ADEQUACY.medium_band_max_mm) return "medium";
    return "thick";
  }

  /**
   * Baseline required velocity (submerged) for a thickness band, before the
   * side-flush penalty is applied.
   *
   * @param band thickness band from {@link classifyBand}
   * @returns minimum m/s for that band in submerged mode
   */
  baselineRequirement(band: FlushThicknessBand): number {
    switch (band) {
      case "thin":
        return WEDM_FLUSH_ADEQUACY.v_min_thin_m_s;
      case "medium":
        return WEDM_FLUSH_ADEQUACY.v_min_medium_m_s;
      case "thick":
        return WEDM_FLUSH_ADEQUACY.v_min_thick_m_s;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ════════════════════════════════════════════════════════════════════════════

  private buildFailClosed(
    reason: string,
    thicknessMm: number,
    mode: FlushMode,
  ): FlushAdequacyResult {
    const band = this.classifyBand(thicknessMm > 0 ? thicknessMm : WEDM_FLUSH_ADEQUACY.thin_band_max_mm);
    const required = this.baselineRequirement(band) * (mode === "side_flush" ? WEDM_FLUSH_ADEQUACY.side_flush_penalty : 1);
    return {
      success: true,
      pass: false,
      verdict: "fail_hard_block",
      velocity_m_s: 0,
      required_velocity_m_s: required,
      band,
      mode,
      hard_block: true,
      tribal_override_used: false,
      safety_gate_input: {
        pass: false,
        velocity_m_s: 0,
        required_velocity_m_s: required,
        mode,
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `FLUSH BLOCK: ${reason}`,
      warnings: [reason],
      recommendations: ["Supply both flow_mm3_s > 0 and thickness_mm > 0"],
    };
  }
}

export const wedmFlushAdequacyGateEngine = new WEDMFlushAdequacyGateEngine();
