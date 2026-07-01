/**
 * MillCSSOptimizerEngine — Constant Surface Speed optimization for mill operations
 *
 * Mill-domain parity for LatheCSSOptimizerEngine (LATHE-PRO). In turning, G96 holds Vc
 * constant by varying RPM as the part diameter changes — the *part* diameter is the
 * surface-speed driver. In milling, the *tool* rotates at fixed RPM, so naive "CSS"
 * doesn't apply. What matters in mill-domain instead is **effective cutting speed at
 * the engaged edge**, which varies with:
 *
 *   1. **Partial radial engagement** — when ae < D, only an arc of the cutter is
 *      engaged; effective Vc averages across the entry/exit arc.
 *   2. **Face-mill periphery vs core** — for face mills with insert rings, the
 *      peripheral Vc differs from average; setting RPM by Dmean under-cuts at periphery.
 *   3. **5-axis tool tilt** — tilting the tool changes the effective contact diameter
 *      (the geometric contact ring) and therefore effective Vc.
 *   4. **Helical interpolation** — bore-milling a hole larger than the cutter requires
 *      a helical path; the effective cutting diameter equals (hole_D - cutter_D), not
 *      cutter_D, when the cutter is at the wall.
 *   5. **Ball-nose effective diameter** — at the cusp/center of a ball-nose mill, the
 *      effective cutting diameter approaches 0; Vc drops to 0 → tool rubs instead of cuts.
 *      Mitigated by tilt angle (lead/lag).
 *
 * Engine computes:
 *   - rpmFromVc(target_Vc, effective_D) — base mill RPM
 *   - optimizeForHelicalInterpolation — bore-out RPM such that effective Vc stays on target
 *   - optimizeForBallNoseEffective — minimum tilt angle to maintain effective Vc above floor
 *   - optimizeForFaceMillPeriphery — RPM selection that respects peripheral max-Vc envelope
 *   - effectiveVcEnvelope — across a range of engagement angles, min/max effective Vc
 *
 * References:
 *   - Sandvik Coromant "Milling Application Guide" (2021) §§ 1.2, 4.1, 5.3 (effective Vc)
 *   - Kennametal "Cutting Data Recommendations" §1.4 (ball-nose effective diameter)
 *   - Altintas Y. "Manufacturing Automation" (2012) §4 (toolpath kinematics)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-CSS-OPTIMIZER (iter61)
 * @version 1.0.0
 * @module MillCSSOptimizerEngine
 */

export interface MillCSSBaseInput {
  /** Target cutting velocity (m/min) */
  Vc_m_min: number;
  /** Tool diameter (mm) */
  tool_diameter_mm: number;
  /** Maximum safe spindle RPM (machine + tool holder rated) */
  rated_max_rpm: number;
  /** Minimum useful RPM (below this stalls / no benefit) */
  min_rpm?: number;
}

export interface MillCSSBaseResult {
  recommended_rpm: number;
  effective_vc_m_min: number;
  vc_target_match_pct: number;  // 100 = perfect, <100 = clamped
  clamped: boolean;
  reasoning: string[];
}

export interface MillCSSHelicalInput extends MillCSSBaseInput {
  /** Hole diameter to be bored (mm). Must be > tool_diameter_mm. */
  hole_diameter_mm: number;
}

export interface MillCSSHelicalResult extends MillCSSBaseResult {
  /** Effective cutting diameter at the hole wall (mm) — equals hole_D - tool_D */
  effective_cut_diameter_mm: number;
}

export interface MillCSSBallNoseInput extends MillCSSBaseInput {
  /** Lead/tilt angle in degrees (0 = center cut = effective_D=0 = rub) */
  tilt_angle_deg: number;
  /** Minimum acceptable effective Vc (m/min) — below this, tool rubs */
  min_effective_vc_m_min?: number;
}

export interface MillCSSBallNoseResult extends MillCSSBaseResult {
  effective_cut_diameter_mm: number;
  /** Minimum tilt angle (deg) required to keep effective Vc above floor */
  min_tilt_angle_deg: number;
  rubbing_risk: boolean;
}

export interface MillCSSFaceMillInput extends MillCSSBaseInput {
  /** Maximum diameter on the insert ring (mm) — periphery */
  face_mill_max_diameter_mm: number;
  /** Maximum Vc envelope at the periphery — beyond this, insert grade fails */
  max_peripheral_vc_m_min: number;
}

export interface MillCSSFaceMillResult extends MillCSSBaseResult {
  peripheral_vc_m_min: number;
  exceeds_peripheral_envelope: boolean;
}

export interface MillCSSEnvelopeInput extends MillCSSBaseInput {
  /** Range of engagement angles to evaluate (deg) */
  engagement_angles_deg: number[];
  /** Active engagement defines effective_D approximation */
}

export interface MillCSSEnvelopeResult {
  per_angle: Array<{ angle_deg: number; effective_vc_m_min: number; effective_d_mm: number }>;
  min_effective_vc_m_min: number;
  max_effective_vc_m_min: number;
  recommended_rpm: number;
  reasoning: string[];
}

function rpmFromVc(Vc_m_min: number, diameter_mm: number): number {
  if (diameter_mm <= 0) return Infinity;
  return (1000 * Vc_m_min) / (Math.PI * diameter_mm);
}

function vcFromRpm(rpm: number, diameter_mm: number): number {
  return (Math.PI * diameter_mm * rpm) / 1000;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round1(n: number): number { return Math.round(n * 10) / 10; }

class MillCSSOptimizerEngineImpl {
  /**
   * Base mill RPM from target Vc + tool diameter. Respects rated_max_rpm clamp.
   */
  optimize(input: MillCSSBaseInput): MillCSSBaseResult {
    this.validateBase(input);
    const reasoning: string[] = [];
    const idealRpm = rpmFromVc(input.Vc_m_min, input.tool_diameter_mm);
    const minRpm = input.min_rpm ?? 50;
    let rpm = idealRpm;
    let clamped = false;
    if (rpm > input.rated_max_rpm) {
      rpm = input.rated_max_rpm;
      clamped = true;
      reasoning.push(`Ideal RPM ${round1(idealRpm)} exceeds rated ${input.rated_max_rpm} — clamped`);
    } else if (rpm < minRpm) {
      rpm = minRpm;
      clamped = true;
      reasoning.push(`Ideal RPM ${round1(idealRpm)} below useful min ${minRpm} — clamped`);
    } else {
      reasoning.push(`Ideal RPM ${round1(idealRpm)} within machine envelope`);
    }
    const effectiveVc = vcFromRpm(rpm, input.tool_diameter_mm);
    const matchPct = (effectiveVc / input.Vc_m_min) * 100;
    return {
      recommended_rpm: Math.round(rpm),
      effective_vc_m_min: round2(effectiveVc),
      vc_target_match_pct: round1(matchPct),
      clamped,
      reasoning,
    };
  }

  /**
   * Helical interpolation for bore-milling. Effective cutting diameter at the wall is
   * (hole_D - tool_D); RPM must be computed against this effective D, not tool_D.
   */
  optimizeForHelicalInterpolation(input: MillCSSHelicalInput): MillCSSHelicalResult {
    this.validateBase(input);
    if (input.hole_diameter_mm <= input.tool_diameter_mm) {
      throw new Error("MillCSSOptimizerEngine.optimizeForHelicalInterpolation: hole_diameter_mm must be > tool_diameter_mm");
    }
    const reasoning: string[] = [];
    const effectiveD = input.hole_diameter_mm - input.tool_diameter_mm;
    // The cutter's contact point sweeps a circle of effective_D around the hole center,
    // so the effective cutting speed is at the tool's outer edge — but the speed observed
    // by the part is at effectiveD radius. Caller wants Vc at the part surface.
    const idealRpm = rpmFromVc(input.Vc_m_min, effectiveD);
    const minRpm = input.min_rpm ?? 50;
    let rpm = idealRpm;
    let clamped = false;
    if (rpm > input.rated_max_rpm) {
      rpm = input.rated_max_rpm;
      clamped = true;
      reasoning.push(`Helical-interp ideal RPM ${round1(idealRpm)} exceeds rated ${input.rated_max_rpm} — clamped`);
    } else if (rpm < minRpm) {
      rpm = minRpm;
      clamped = true;
    }
    const effectiveVc = vcFromRpm(rpm, effectiveD);
    reasoning.push(`Effective cut diameter ${round2(effectiveD)}mm = hole_D ${input.hole_diameter_mm} − tool_D ${input.tool_diameter_mm}`);
    return {
      recommended_rpm: Math.round(rpm),
      effective_vc_m_min: round2(effectiveVc),
      vc_target_match_pct: round1((effectiveVc / input.Vc_m_min) * 100),
      clamped,
      effective_cut_diameter_mm: round2(effectiveD),
      reasoning,
    };
  }

  /**
   * Ball-nose effective diameter optimization. At tilt=0, effective_D=0 (cusp/center of
   * ball) → Vc=0 → rub. Effective_D scales with sin(tilt_angle) for lead/lag tilt.
   * Returns minimum tilt to keep effective Vc above floor.
   */
  optimizeForBallNoseEffective(input: MillCSSBallNoseInput): MillCSSBallNoseResult {
    this.validateBase(input);
    if (input.tilt_angle_deg < 0 || input.tilt_angle_deg > 90) {
      throw new Error("MillCSSOptimizerEngine.optimizeForBallNoseEffective: tilt_angle_deg must be in [0, 90]");
    }
    const reasoning: string[] = [];
    const vcFloor = input.min_effective_vc_m_min ?? Math.max(20, input.Vc_m_min * 0.3);
    const tiltRad = (input.tilt_angle_deg * Math.PI) / 180;
    const effectiveD = input.tool_diameter_mm * Math.sin(tiltRad);
    const idealRpm = effectiveD > 0 ? rpmFromVc(input.Vc_m_min, effectiveD) : Infinity;
    const minRpm = input.min_rpm ?? 50;
    let rpm = idealRpm;
    let clamped = false;
    if (rpm > input.rated_max_rpm || !isFinite(rpm)) {
      rpm = input.rated_max_rpm;
      clamped = true;
      reasoning.push(`Ball-nose effective_D=${round2(effectiveD)}mm at tilt ${input.tilt_angle_deg}° gives RPM≥rated_max — clamped`);
    } else if (rpm < minRpm) {
      rpm = minRpm;
      clamped = true;
    }
    const effectiveVc = vcFromRpm(rpm, effectiveD);
    // Solve for min tilt: effective_D needed = 1000*Vc / (π*rpm_max), then arcsin
    const minEffectiveD = (1000 * vcFloor) / (Math.PI * input.rated_max_rpm);
    const minTiltRad = Math.asin(Math.min(1, minEffectiveD / input.tool_diameter_mm));
    const minTiltDeg = (minTiltRad * 180) / Math.PI;
    const rubbingRisk = effectiveVc < vcFloor;
    if (rubbingRisk) {
      reasoning.push(`Effective Vc ${round2(effectiveVc)}m/min below floor ${vcFloor} — increase tilt to ≥${round1(minTiltDeg)}°`);
    }
    return {
      recommended_rpm: Math.round(rpm),
      effective_vc_m_min: round2(effectiveVc),
      vc_target_match_pct: round1((effectiveVc / input.Vc_m_min) * 100),
      clamped,
      effective_cut_diameter_mm: round2(effectiveD),
      min_tilt_angle_deg: round1(minTiltDeg),
      rubbing_risk: rubbingRisk,
      reasoning,
    };
  }

  /**
   * Face mill periphery check. RPM is set by Vc at mean diameter, but the peripheral
   * insert sees Vc at face_mill_max_diameter — verify it doesn't exceed envelope.
   */
  optimizeForFaceMillPeriphery(input: MillCSSFaceMillInput): MillCSSFaceMillResult {
    this.validateBase(input);
    if (input.face_mill_max_diameter_mm <= 0) {
      throw new Error("MillCSSOptimizerEngine.optimizeForFaceMillPeriphery: face_mill_max_diameter_mm must be > 0");
    }
    const base = this.optimize(input);
    const peripheralVc = vcFromRpm(base.recommended_rpm, input.face_mill_max_diameter_mm);
    const exceeds = peripheralVc > input.max_peripheral_vc_m_min;
    const reasoning = [...base.reasoning,
      `Peripheral Vc at D=${input.face_mill_max_diameter_mm}mm: ${round2(peripheralVc)}m/min vs envelope ${input.max_peripheral_vc_m_min}m/min`,
    ];
    if (exceeds) {
      const safeRpm = rpmFromVc(input.max_peripheral_vc_m_min, input.face_mill_max_diameter_mm);
      reasoning.push(`Reduce RPM to ${Math.round(safeRpm)} to stay within peripheral Vc envelope`);
    }
    return {
      ...base,
      peripheral_vc_m_min: round2(peripheralVc),
      exceeds_peripheral_envelope: exceeds,
      reasoning,
    };
  }

  /**
   * Sweep effective Vc across a range of engagement angles. The effective cutting
   * diameter at engagement angle θ approximates D * sin(θ) for partial-engagement
   * arc geometry (rough approximation; exact value depends on radial engagement).
   */
  effectiveVcEnvelope(input: MillCSSEnvelopeInput): MillCSSEnvelopeResult {
    this.validateBase(input);
    if (!Array.isArray(input.engagement_angles_deg) || input.engagement_angles_deg.length === 0) {
      throw new Error("MillCSSOptimizerEngine.effectiveVcEnvelope: engagement_angles_deg array required");
    }
    const reasoning: string[] = [];
    // Recommended RPM is computed against the full tool diameter (cutter surface)
    const baseRpm = Math.min(input.rated_max_rpm, rpmFromVc(input.Vc_m_min, input.tool_diameter_mm));
    const perAngle = input.engagement_angles_deg.map(angleDeg => {
      const angleRad = (angleDeg * Math.PI) / 180;
      const effectiveD = input.tool_diameter_mm * Math.sin(angleRad);
      const effectiveVc = vcFromRpm(baseRpm, effectiveD);
      return {
        angle_deg: angleDeg,
        effective_vc_m_min: round2(effectiveVc),
        effective_d_mm: round2(effectiveD),
      };
    });
    const vcs = perAngle.map(p => p.effective_vc_m_min);
    const minVc = Math.min(...vcs);
    const maxVc = Math.max(...vcs);
    reasoning.push(`Across ${input.engagement_angles_deg.length} angles, effective Vc ranges ${round2(minVc)} - ${round2(maxVc)} m/min`);
    if (minVc < input.Vc_m_min * 0.5) {
      reasoning.push(`At least one angle drops below 50% target Vc — verify tool path engagement`);
    }
    return {
      per_angle: perAngle,
      min_effective_vc_m_min: round2(minVc),
      max_effective_vc_m_min: round2(maxVc),
      recommended_rpm: Math.round(baseRpm),
      reasoning,
    };
  }

  getStats(): {
    modes: string[];
    canonical_reference: string;
  } {
    return {
      modes: [
        "optimize (base RPM from target Vc + D)",
        "optimizeForHelicalInterpolation (hole bore-out)",
        "optimizeForBallNoseEffective (tilt vs cusp Vc)",
        "optimizeForFaceMillPeriphery (insert ring max-Vc envelope)",
        "effectiveVcEnvelope (engagement-angle sweep)",
      ],
      canonical_reference: "Sandvik Milling Application Guide §§1.2,4.1,5.3; Kennametal §1.4; Altintas (2012) §4",
    };
  }

  // ── Validation ───────────────────────────────────────────────────────

  private validateBase(input: MillCSSBaseInput): void {
    if (!input) throw new Error("MillCSSOptimizerEngine: input required");
    if (!(input.Vc_m_min > 0)) throw new Error("MillCSSOptimizerEngine: Vc_m_min must be > 0");
    if (!(input.tool_diameter_mm > 0)) throw new Error("MillCSSOptimizerEngine: tool_diameter_mm must be > 0");
    if (!(input.rated_max_rpm > 0)) throw new Error("MillCSSOptimizerEngine: rated_max_rpm must be > 0");
  }
}

export const millCSSOptimizerEngine = new MillCSSOptimizerEngineImpl();
export type { MillCSSOptimizerEngineImpl };
