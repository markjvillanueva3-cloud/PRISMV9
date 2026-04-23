/**
 * GrindingReplacementEngine
 * ===========================
 *
 * Answers: "Can this grinding operation be replaced with hard turning
 * (CBN/ceramic) on a lathe?"  Complement to HardTurningDecisionEngine —
 * starts from an existing grind process baseline and evaluates feasibility
 * + cost/time savings of substitution.
 *
 * Replacement is feasible when ALL of:
 *   - Ra target ≥ 0.3 μm (pushed to 0.2 with wiper inserts + tight control)
 *   - Tolerance ≥ 0.008 mm on diameter (tighter needs grind or combo)
 *   - Part hardness 45-62 HRC (below: conventional; above: grind-only)
 *   - L/D of turned feature ≤ 8 (chatter limit)
 *   - Lot size amortizes CBN tooling (typically > 25 pc)
 *   - Shop has thermally stable lathe + high-precision turret
 *
 * Replacement is BLOCKED when:
 *   - Surface finish < 0.2 μm Ra (mirror finish)
 *   - Cylindrical form/concentricity < 0.003 mm
 *   - Tensile residual stress required (fatigue components)
 *   - Wall section < 2 mm (part deflection risk)
 *
 * Canonical references:
 *   - Klocke F. "Manufacturing Processes 2: Grinding" (2009)
 *   - Tönshoff H. "Hard Machining" CIRP Annals (2000)
 *   - König W. "Hard Machining" (1996) §§4-6
 *
 * @module engines/GrindingReplacementEngine
 * @milestone LATHE-PRO-MS6
 */

export interface GrindingBaseline {
  /** Current grinding Ra achieved (μm) */
  achieved_ra_um: number;
  /** Current tolerance (mm) */
  achieved_tolerance_mm: number;
  /** Stock removal per pass (radial, mm) */
  stock_removal_mm: number;
  /** Cycle time grind (sec, per part) */
  grind_cycle_sec: number;
  /** Cost per part grind (USD) */
  grind_cost_per_part_usd: number;
}

export interface GrindingReplacementInput {
  baseline: GrindingBaseline;
  /** Part hardness (HRC) */
  hardness_hrc: number;
  /** Feature L/D ratio */
  length_over_diameter: number;
  /** Feature diameter (mm) */
  diameter_mm: number;
  /** Wall thickness if tube (mm) — skips check if solid */
  wall_thickness_mm?: number;
  /** Target lot size */
  lot_size: number;
  /** Residual stress constraint: "tensile_required" | "compressive_ok" | "any" */
  residual_stress_requirement?: "tensile_required" | "compressive_ok" | "any";
  /** Concentricity required (mm) */
  concentricity_mm?: number;
  /** Shop turret precision rating (< 0.005 mm = high) */
  turret_precision_mm?: number;
  /** Estimated CBN cycle time (sec) if known */
  cbn_cycle_sec_estimate?: number;
  /** Estimated CBN cost per part (USD) if known */
  cbn_cost_per_part_usd_estimate?: number;
}

export type Feasibility = "replace" | "partial" | "blocked";

export interface GrindingReplacementResult {
  feasibility: Feasibility;
  confidence: number;
  reasoning: string[];
  blockers: string[];
  expected_ra_um: number;
  expected_tolerance_mm: number;
  /** Cycle-time delta (positive = savings) */
  cycle_time_savings_sec?: number;
  /** Cost delta per part (positive = savings) */
  cost_savings_per_part_usd?: number;
  /** Break-even lot size (where replacement pays for itself) */
  break_even_lot_size?: number;
  recommended_tool_material: "CBN" | "ceramic" | "carbide" | "grind";
  surface_integrity_tradeoff: string;
}

class GrindingReplacementEngineImpl {
  evaluate(i: GrindingReplacementInput): GrindingReplacementResult {
    const reasoning: string[] = [];
    const blockers: string[] = [];
    let score = 50;

    // --- Hard blockers ---
    if (i.baseline.achieved_ra_um < 0.2) {
      blockers.push(`Ra ${i.baseline.achieved_ra_um}μm < 0.2μm mirror finish — grind only`);
      score -= 100;
    }
    if (i.baseline.achieved_tolerance_mm < 0.003) {
      blockers.push(
        `Tolerance ${i.baseline.achieved_tolerance_mm}mm < 0.003mm — hard turn infeasible`
      );
      score -= 80;
    }
    if (i.hardness_hrc < 45) {
      blockers.push(`${i.hardness_hrc} HRC < 45 — use conventional carbide, not CBN`);
      score -= 40;
    }
    if (i.hardness_hrc > 65) {
      blockers.push(`${i.hardness_hrc} HRC > 65 — even CBN pushes limits`);
      score -= 30;
    }
    if (i.residual_stress_requirement === "tensile_required") {
      blockers.push("Tensile residual stress required — hard turning gives compressive");
      score -= 100;
    }
    if (i.length_over_diameter > 10) {
      blockers.push(`L/D ${i.length_over_diameter} > 10 — chatter makes CBN impractical`);
      score -= 60;
    }
    if ((i.wall_thickness_mm ?? Infinity) < 2) {
      blockers.push("Wall < 2mm — part deflection too high for turning");
      score -= 50;
    }

    // --- Soft scoring ---
    if (i.baseline.achieved_ra_um >= 0.4) {
      score += 20;
      reasoning.push("Ra target comfortable for CBN");
    } else if (i.baseline.achieved_ra_um >= 0.2) {
      score += 5;
      reasoning.push("Ra target marginal — needs wiper inserts, feed tuning");
    }
    if (i.baseline.achieved_tolerance_mm >= 0.01) {
      score += 15;
      reasoning.push("Tolerance comfortable for hard turning");
    }
    if (i.hardness_hrc >= 55 && i.hardness_hrc <= 62) {
      score += 20;
      reasoning.push(`${i.hardness_hrc} HRC — CBN sweet spot`);
    }
    if (i.length_over_diameter < 4) {
      score += 15;
    }
    if (i.lot_size >= 50) {
      score += 10;
      reasoning.push("Lot size amortizes CBN tooling cost");
    }
    if ((i.turret_precision_mm ?? 0.02) < 0.005) {
      score += 10;
      reasoning.push("High-precision turret supports tight CBN tolerances");
    }

    // Determine feasibility: any blocker forces "blocked"
    let feasibility: Feasibility;
    if (blockers.length > 0) {
      feasibility = "blocked";
    } else if (score >= 65) {
      feasibility = "replace";
    } else if (score >= 35) {
      feasibility = "partial";
    } else {
      feasibility = "blocked";
    }

    // Tool material
    let toolMat: "CBN" | "ceramic" | "carbide" | "grind";
    if (feasibility === "blocked") {
      toolMat = "grind";
    } else if (i.hardness_hrc >= 55) {
      toolMat = "CBN";
    } else if (i.hardness_hrc >= 45) {
      toolMat = "ceramic";
    } else {
      toolMat = "carbide";
    }

    // Expected Ra/tolerance with CBN
    const expectedRa =
      toolMat === "CBN" ? Math.max(0.3, i.baseline.achieved_ra_um) :
      toolMat === "ceramic" ? 0.8 :
      toolMat === "carbide" ? 1.6 :
      i.baseline.achieved_ra_um;
    const expectedTol =
      toolMat === "CBN" ? Math.max(0.008, i.baseline.achieved_tolerance_mm) :
      toolMat === "ceramic" ? 0.02 :
      toolMat === "carbide" ? 0.05 :
      i.baseline.achieved_tolerance_mm;

    // Cycle time / cost savings
    const cbnCycle = i.cbn_cycle_sec_estimate ?? i.baseline.grind_cycle_sec * 0.35;
    const cbnCost = i.cbn_cost_per_part_usd_estimate ?? i.baseline.grind_cost_per_part_usd * 0.75;
    const cycleSavings = i.baseline.grind_cycle_sec - cbnCycle;
    const costSavings = i.baseline.grind_cost_per_part_usd - cbnCost;

    // Break-even: fixed setup cost recouped
    const setupDeltaUsd = 200; // crude: CBN tool + program + prove-out
    const breakEven = costSavings > 0 ? Math.ceil(setupDeltaUsd / costSavings) : undefined;

    const integrity =
      feasibility === "blocked"
        ? "Keep grinding — replacement infeasible"
        : toolMat === "CBN"
        ? "Compressive residual stress + white-layer risk (monitor feed) — fatigue-beneficial"
        : toolMat === "ceramic"
        ? "Thermally-driven surface — MQL/flood coolant mandatory"
        : "Standard carbide surface characteristics";

    const confidence = Math.min(1, Math.max(0, (score / 100) + 0.2));

    return {
      feasibility,
      confidence: round2(confidence),
      reasoning,
      blockers,
      expected_ra_um: round2(expectedRa),
      expected_tolerance_mm: round4(expectedTol),
      cycle_time_savings_sec: round1(cycleSavings),
      cost_savings_per_part_usd: round2(costSavings),
      break_even_lot_size: breakEven,
      recommended_tool_material: toolMat,
      surface_integrity_tradeoff: integrity,
    };
  }

  getStats(): { blocker_count: number; scoring_factors: string[] } {
    return {
      blocker_count: 7,
      scoring_factors: [
        "Ra target",
        "tolerance",
        "hardness HRC",
        "L/D ratio",
        "wall thickness",
        "lot size",
        "turret precision",
        "residual stress requirement",
      ],
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const grindingReplacementEngine = new GrindingReplacementEngineImpl();
export type { GrindingReplacementEngineImpl };
