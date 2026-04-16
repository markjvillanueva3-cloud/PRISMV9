/**
 * HardTurningDecisionEngine
 * ===========================
 *
 * Decides between hard turning (CBN/ceramic) and grinding for
 * finish-machining hardened parts (> 45 HRC). Balances surface finish,
 * tolerance, cycle time, tooling cost, and part geometry.
 *
 * Decision factors:
 *   - Part hardness (HRC): < 45 → conventional turning; 45-55 → ceramic;
 *     55-62 → CBN; > 62 → CBN only or grind
 *   - Target Ra: < 0.2 μm usually needs grind; 0.2-0.8 μm CBN viable;
 *     > 0.8 μm CBN easy
 *   - Target tolerance: < 0.005 mm often needs grind; 0.005-0.01 mm CBN
 *     marginal; > 0.01 mm CBN comfortable
 *   - Cycle time: CBN usually 3-10× faster than grind
 *   - Setup: CBN done on lathe (one setup); grind needs separate machine
 *   - Tooling cost/part: CBN ~$5-20/edge, grind ~$0-1/part (wheel amort)
 *
 * Canonical references:
 *   - Klocke F. "Manufacturing Processes 1: Cutting" (2011) §5.3
 *   - König W. "Hard Machining" (1996)
 *   - Tönshoff H. "Cutting of Hardened Steel" CIRP Annals 2000
 *
 * @module engines/HardTurningDecisionEngine
 * @milestone LATHE-PRO-MS5
 */

export interface HardTurningInput {
  /** Part hardness (HRC) */
  hardness_hrc: number;
  /** Target surface finish Ra (μm) */
  target_ra_um: number;
  /** Target tolerance (mm) — tightest on finish feature */
  target_tolerance_mm: number;
  /** Feature type */
  feature: "od" | "bore" | "face" | "thread" | "groove";
  /** Lot size */
  lot_size: number;
  /** Part diameter (mm) — affects rigidity */
  diameter_mm: number;
  /** L/D ratio if turning (chatter risk) */
  length_over_diameter?: number;
  /** Does shop have grinding capability? */
  shop_has_grinder?: boolean;
  /** Cost per CBN edge (USD, default 15) */
  cbn_cost_per_edge_usd?: number;
  /** Grind wheel amortized cost per part (USD, default 0.5) */
  grind_cost_per_part_usd?: number;
  /** Programming + setup hours (both options, default 0.5) */
  setup_hours?: number;
}

export type DecisionChoice = "hard_turn_cbn" | "hard_turn_ceramic" | "grind" | "conventional_turn";

export interface HardTurningDecisionResult {
  recommendation: DecisionChoice;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    choice: DecisionChoice;
    score: number;
    trade_off: string;
  }>;
  cost_per_part_usd: number;
  cycle_time_sec_estimate: number;
  tool_material: string;
  expected_ra_um: number;
  expected_tolerance_mm: number;
  surface_integrity_note: string;
}

// ── Decision scoring ──────────────────────────────────────────────────────

function scoreHardTurnCbn(input: HardTurningInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 50;

  if (input.hardness_hrc < 45) {
    score -= 30;
    notes.push("CBN overkill below 45 HRC — conventional carbide cheaper");
  } else if (input.hardness_hrc >= 55 && input.hardness_hrc <= 62) {
    score += 30;
    notes.push("55-62 HRC is CBN sweet spot");
  } else if (input.hardness_hrc > 62) {
    score += 15;
    notes.push(">62 HRC pushes CBN limits — consider grind backup");
  }

  if (input.target_ra_um >= 0.4) {
    score += 20;
    notes.push(`Ra ${input.target_ra_um}μm easily achievable with CBN`);
  } else if (input.target_ra_um >= 0.2) {
    score += 5;
    notes.push(`Ra ${input.target_ra_um}μm marginal — feed + nose radius tuning required`);
  } else {
    score -= 25;
    notes.push(`Ra < 0.2μm difficult with CBN — prefer grind`);
  }

  if (input.target_tolerance_mm >= 0.01) {
    score += 15;
  } else if (input.target_tolerance_mm >= 0.005) {
    score += 5;
    notes.push("Tight tolerance — in-process gauging recommended");
  } else {
    score -= 20;
    notes.push("Tolerance < 0.005mm — grinding more consistent");
  }

  if ((input.length_over_diameter ?? 0) > 4) {
    score -= 15;
    notes.push("L/D > 4 — chatter risk; steady rest or CBN-dampened bar required");
  }

  if (input.feature === "bore" && input.diameter_mm < 20) {
    score -= 10;
    notes.push("Small bore (<20mm) — CBN boring bar reach limited");
  }

  // Cost: CBN good for medium-high volume
  if (input.lot_size < 20) {
    score -= 5;
  } else if (input.lot_size > 200) {
    score += 10;
    notes.push("Large lot — CBN cycle-time savings dominate");
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreHardTurnCeramic(input: HardTurningInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 40;

  if (input.hardness_hrc >= 45 && input.hardness_hrc <= 55) {
    score += 25;
    notes.push("45-55 HRC is ceramic sweet spot — cheaper than CBN");
  } else if (input.hardness_hrc > 55) {
    score -= 25;
    notes.push(">55 HRC — ceramic breaks, use CBN instead");
  }

  if (input.target_ra_um >= 0.8) {
    score += 15;
  } else {
    score -= 15;
    notes.push("Ceramic surface finish rougher than CBN — use CBN for <0.8 Ra");
  }

  if (input.feature === "thread" || input.feature === "groove") {
    score -= 20;
    notes.push("Ceramic too brittle for interrupted cuts (threads, grooves)");
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreGrind(input: HardTurningInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;

  if (!input.shop_has_grinder) {
    notes.push("No grinder available on-site — this option adds outside-service cost");
    score -= 30;
  }

  if (input.target_ra_um < 0.2) {
    score += 30;
    notes.push(`Ra ${input.target_ra_um}μm is grind territory`);
  }
  if (input.target_tolerance_mm < 0.005) {
    score += 20;
    notes.push(`Tolerance ${input.target_tolerance_mm}mm comfortably ground`);
  }

  if (input.feature === "thread") {
    score -= 20; // thread grind is specialty
  }

  // Grind adds setup + transport
  if (input.lot_size < 10) {
    score -= 15;
    notes.push("Small lot — grind setup overhead dominates");
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreConventional(input: HardTurningInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;

  if (input.hardness_hrc < 45) {
    score += 40;
    notes.push("< 45 HRC — conventional carbide sufficient");
  } else {
    score -= 40;
    notes.push("≥ 45 HRC — carbide wears too fast, use CBN/ceramic");
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

class HardTurningDecisionEngineImpl {
  decide(input: HardTurningInput): HardTurningDecisionResult {
    if (input.hardness_hrc <= 0 || input.target_ra_um <= 0 || input.target_tolerance_mm <= 0) {
      throw new Error("hardness, Ra, tolerance must all be positive");
    }

    const scores = [
      { choice: "hard_turn_cbn" as DecisionChoice, ...scoreHardTurnCbn(input) },
      { choice: "hard_turn_ceramic" as DecisionChoice, ...scoreHardTurnCeramic(input) },
      { choice: "grind" as DecisionChoice, ...scoreGrind(input) },
      { choice: "conventional_turn" as DecisionChoice, ...scoreConventional(input) },
    ];

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0]!;

    const confidence =
      scores.length >= 2
        ? Math.min(1, (top.score - scores[1]!.score) / 30 + 0.5)
        : 0.7;

    const toolMaterial = {
      hard_turn_cbn: "CBN (PCBN, BZN)",
      hard_turn_ceramic: "Ceramic (Al2O3 + TiC, SiAlON)",
      grind: "Grinding wheel (CBN or AlO3)",
      conventional_turn: "Carbide insert (coated)",
    }[top.choice];

    const cbnCost = input.cbn_cost_per_edge_usd ?? 15;
    const grindCost = input.grind_cost_per_part_usd ?? 0.5;
    const costPerPart =
      top.choice === "hard_turn_cbn"
        ? cbnCost / Math.max(1, Math.min(input.lot_size, 50))
        : top.choice === "grind"
        ? grindCost
        : top.choice === "hard_turn_ceramic"
        ? 3 / Math.max(1, Math.min(input.lot_size, 20))
        : 0.4;

    const cycleTimeEstimate = {
      hard_turn_cbn: 30,
      hard_turn_ceramic: 40,
      grind: 180, // 3× CBN + setup
      conventional_turn: 45,
    }[top.choice];

    const expectedRa = {
      hard_turn_cbn: 0.4,
      hard_turn_ceramic: 1.0,
      grind: 0.1,
      conventional_turn: 1.6,
    }[top.choice];

    const expectedTolerance = {
      hard_turn_cbn: 0.01,
      hard_turn_ceramic: 0.02,
      grind: 0.002,
      conventional_turn: 0.05,
    }[top.choice];

    const surfaceIntegrity = {
      hard_turn_cbn:
        "White layer risk if feeds too high — monitor; compressive residual stress beneficial",
      hard_turn_ceramic:
        "Thermal damage risk — use MQL or flood coolant",
      grind:
        "Tensile residual stress likely — may need stress-relief or shot peen",
      conventional_turn: "Standard carbide finish — typical manufacturing surface",
    }[top.choice];

    return {
      recommendation: top.choice,
      confidence: round2(confidence),
      reasoning: top.notes,
      alternatives: scores.slice(1).map((s) => ({
        choice: s.choice,
        score: s.score,
        trade_off: s.notes[0] ?? "",
      })),
      cost_per_part_usd: round2(costPerPart),
      cycle_time_sec_estimate: cycleTimeEstimate,
      tool_material: toolMaterial,
      expected_ra_um: expectedRa,
      expected_tolerance_mm: expectedTolerance,
      surface_integrity_note: surfaceIntegrity,
    };
  }

  getStats(): {
    decision_choices: DecisionChoice[];
    factors_considered: string[];
  } {
    return {
      decision_choices: ["hard_turn_cbn", "hard_turn_ceramic", "grind", "conventional_turn"],
      factors_considered: [
        "hardness_hrc",
        "target_ra_um",
        "target_tolerance_mm",
        "feature_type",
        "lot_size",
        "length_over_diameter",
        "shop_has_grinder",
      ],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const hardTurningDecisionEngine = new HardTurningDecisionEngineImpl();
export type { HardTurningDecisionEngineImpl };
