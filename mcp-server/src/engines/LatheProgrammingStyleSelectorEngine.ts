/**
 * LatheProgrammingStyleSelectorEngine (E107)
 * ===========================================
 *
 * Multi-criteria programming style selector for lathe programming requests.
 * Routes to one of 4 styles based on controller capability, part complexity,
 * lot size, family potential, operator skill, CAM availability, and timing.
 *
 * Styles:
 *   - macro         — parametric G-code (Macro B / User Task / WinMax NC Productivity)
 *   - hardcode      — explicit G-code blocks (one-off, simple)
 *   - cam           — external CAM seat (hyperMILL / Mastercam / Fusion / etc.)
 *   - conversational — dialog-based (MAZATROL / WinMax / Klartext / navi-mill / ShopMill / Manual Guide i)
 *
 * Conversational sub-types (6 supported):
 *   - mazatrol, winmax, klartext, navi_mill, shop_mill, manual_guide_i
 *
 * Contract:
 *   - selectProgrammingStyle(input) → StyleRecommendation
 *   - compareProgrammingCosts(input) → StyleCostComparison
 *
 * Integrations:
 *   - ControllerFeatureMatrixEngine — conversational capability + macro support
 *   - LatheIntelligenceEngine.decideMacroVsHardCode — existing macro logic (reused)
 *   - PRISMSelfAwarenessEngine.recommendAIFeatures — cross-engine awareness
 *
 * @module engines/LatheProgrammingStyleSelectorEngine
 * @milestone LATHE-AWARE-HARDEN MS9 (U-LAT66)
 * @version 1.0.0
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type ProgrammingStyle = "macro" | "hardcode" | "cam" | "conversational";

export type ConversationalType =
  | "mazatrol"
  | "winmax"
  | "klartext"
  | "navi_mill"
  | "shop_mill"
  | "manual_guide_i";

export type PartComplexity = "simple" | "moderate" | "complex" | "very_complex";
export type OperatorSkill = "beginner" | "intermediate" | "expert";
export type TimeConstraint = "urgent" | "normal" | "flexible";
export type MachineAvailability = "dedicated" | "shared" | "bottleneck";

export interface StyleSelectionInput {
  controller: string; // e.g. "okuma_osp_p300", "mazatrol_smooth_ai", "hurco_winmax"
  part_complexity: PartComplexity;
  lot_size: number;
  family_parts_expected: number;
  operator_skill_level: OperatorSkill;
  available_cam_seats: number;
  time_constraint: TimeConstraint;
  machine_availability: MachineAvailability;

  // Optional: detailed feature flags for deeper routing
  has_threading?: boolean;
  has_live_tooling?: boolean;
  requires_5axis?: boolean;
  material?: string;
  shop_rate_usd_hr?: number;
  programming_rate_usd_hr?: number;
}

export interface StyleScore {
  style: ProgrammingStyle;
  conversational_type?: ConversationalType;
  score: number; // 0-100
  reasons: string[];
  disqualifiers: string[];
}

export interface CostEstimate {
  programming_hr: number;
  machine_hr: number;
  setup_hr: number;
  total_cost: number;
  cost_breakdown: {
    programming: number;
    setup: number;
    cycle: number;
  };
}

export interface StyleRecommendation {
  recommended_style: ProgrammingStyle;
  conversational_type?: ConversationalType;
  confidence: number; // 0-1
  reasoning: string[];
  cost_estimate: CostEstimate;
  alternatives: Array<{
    style: ProgrammingStyle;
    conversational_type?: ConversationalType;
    score: number;
    trade_off: string;
  }>;
  future_planning: {
    reuse_potential: number; // 0-1
    family_benefit: number; // 0-1
    notes: string[];
  };
  controller_queried: string;
  timestamp: string;
}

export interface StyleCostComparison {
  controller: string;
  part_complexity: PartComplexity;
  lot_size: number;
  ranked_options: Array<{
    style: ProgrammingStyle;
    conversational_type?: ConversationalType;
    total_cost: number;
    cost_estimate: CostEstimate;
    notes: string[];
  }>;
  cheapest: ProgrammingStyle;
  cheapest_conv_type?: ConversationalType;
  break_even_notes: string[];
  timestamp: string;
}

// ── Zod Schemas (MCP input validation) ─────────────────────────────────────

export const styleSelectionInputSchema = z.object({
  controller: z.string().min(1),
  part_complexity: z.enum(["simple", "moderate", "complex", "very_complex"]),
  lot_size: z.number().int().positive(),
  family_parts_expected: z.number().int().nonnegative(),
  operator_skill_level: z.enum(["beginner", "intermediate", "expert"]),
  available_cam_seats: z.number().int().nonnegative(),
  time_constraint: z.enum(["urgent", "normal", "flexible"]),
  machine_availability: z.enum(["dedicated", "shared", "bottleneck"]),
  has_threading: z.boolean().optional(),
  has_live_tooling: z.boolean().optional(),
  requires_5axis: z.boolean().optional(),
  material: z.string().optional(),
  shop_rate_usd_hr: z.number().positive().optional(),
  programming_rate_usd_hr: z.number().positive().optional(),
});

// ── Controller Family Detection ────────────────────────────────────────────

/**
 * Map controller string → conversational type (if any).
 * Returns undefined if the controller does not support conversational programming.
 */
function detectConversationalType(controller: string): ConversationalType | undefined {
  const c = controller.toLowerCase();
  if (c.includes("mazatrol") || c.includes("mazak_smooth")) return "mazatrol";
  if (c.includes("winmax") || c.includes("hurco")) return "winmax";
  if (c.includes("heidenhain") || c.includes("klartext") || c.includes("tnc")) return "klartext";
  if (c.includes("navi") || c.includes("okuma_osp")) return "navi_mill";
  if (c.includes("shopmill") || c.includes("shop_mill") || c.includes("siemens")) return "shop_mill";
  if (c.includes("manual_guide") || c.includes("fanuc_30i") || c.includes("fanuc_31i")) return "manual_guide_i";
  return undefined;
}

/**
 * Default CAM-seat availability assumption if the input is missing or 0.
 * Some shops have no CAM seats but can still use conversational or macro.
 */
function hasCAMAvailable(input: StyleSelectionInput): boolean {
  return input.available_cam_seats > 0;
}

// ── Default Rate Table (JM Die shop rates, canonical) ──────────────────────

// Reference: ShopConfigurationEngine DEFAULT_PROFILE_ID = "jm-die"
const DEFAULT_PROGRAMMING_RATE = 95; // $/hr (engineer/programmer)
const DEFAULT_SHOP_RATE = 85; // $/hr (lathe + operator blended)

// ── Complexity → Time Multiplier Table ─────────────────────────────────────

// Programming-time multipliers relative to a "moderate" baseline = 1.0
const COMPLEXITY_MULT: Record<PartComplexity, number> = {
  simple: 0.45,
  moderate: 1.0,
  complex: 2.2,
  very_complex: 4.5,
};

// Baseline programming hours per style for "moderate" complexity
const STYLE_BASE_PROG_HR: Record<ProgrammingStyle, number> = {
  hardcode: 1.0,
  conversational: 0.6,
  macro: 2.5, // upfront investment pays off on families
  cam: 3.0, // CAM seat setup + post + verify
};

// Setup hours per style (shop floor time to get the program running)
const STYLE_SETUP_HR: Record<ProgrammingStyle, number> = {
  hardcode: 0.5,
  conversational: 0.3,
  macro: 0.75,
  cam: 0.5,
};

// Cycle-time efficiency factor vs baseline (1.0 = baseline; lower = faster)
// CAM usually produces the most efficient toolpaths for complex geometry.
const STYLE_CYCLE_EFFICIENCY: Record<ProgrammingStyle, number> = {
  hardcode: 1.0,
  conversational: 1.0,
  macro: 0.98,
  cam: 0.85,
};

// ── Engine Implementation ──────────────────────────────────────────────────

class LatheProgrammingStyleSelectorEngineImpl {
  /**
   * Route a lathe programming request to the best-fit style.
   *
   * @param input Multi-criteria selection input
   * @returns Recommendation with reasoning, cost, and alternatives
   */
  selectProgrammingStyle(input: StyleSelectionInput): StyleRecommendation {
    styleSelectionInputSchema.parse(input);

    log.info(`[StyleSelector] Evaluating styles for controller=${input.controller}`);

    const scores = this.scoreAllStyles(input);
    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];
    if (!top) {
      throw new Error("[StyleSelector] No styles scored — this should never happen");
    }

    const confidence =
      scores.length >= 2 ? Math.min(1, (top.score - scores[1]!.score) / 30 + 0.5) : 0.8;

    const alternatives = scores.slice(1).map((s) => ({
      style: s.style,
      conversational_type: s.conversational_type,
      score: s.score,
      trade_off: this.explainTradeOff(s, top),
    }));

    const cost = this.estimateCost(top.style, input);

    const future = this.analyzeFuturePlanning(input, top.style);

    return {
      recommended_style: top.style,
      conversational_type: top.conversational_type,
      confidence,
      reasoning: top.reasons,
      cost_estimate: cost,
      alternatives,
      future_planning: future,
      controller_queried: input.controller,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Compare total cost across all 4 styles for the same input.
   *
   * @param input Multi-criteria selection input
   * @returns Ranked cost comparison
   */
  compareProgrammingCosts(input: StyleSelectionInput): StyleCostComparison {
    styleSelectionInputSchema.parse(input);

    const styles: ProgrammingStyle[] = ["hardcode", "conversational", "macro", "cam"];

    const ranked = styles
      .map((style) => {
        const cost = this.estimateCost(style, input);
        const notes = this.costNotes(style, input);
        const convType =
          style === "conversational" ? detectConversationalType(input.controller) : undefined;
        return {
          style,
          conversational_type: convType,
          total_cost: cost.total_cost,
          cost_estimate: cost,
          notes,
        };
      })
      .sort((a, b) => a.total_cost - b.total_cost);

    const cheapest = ranked[0]!;

    return {
      controller: input.controller,
      part_complexity: input.part_complexity,
      lot_size: input.lot_size,
      ranked_options: ranked,
      cheapest: cheapest.style,
      cheapest_conv_type: cheapest.conversational_type,
      break_even_notes: this.breakEvenAnalysis(input, ranked),
      timestamp: new Date().toISOString(),
    };
  }

  // ── Scoring ────────────────────────────────────────────────────────────

  private scoreAllStyles(input: StyleSelectionInput): StyleScore[] {
    return [
      this.scoreHardcode(input),
      this.scoreMacro(input),
      this.scoreConversational(input),
      this.scoreCAM(input),
    ];
  }

  private scoreHardcode(input: StyleSelectionInput): StyleScore {
    const reasons: string[] = [];
    const disqualifiers: string[] = [];
    let score = 30; // baseline

    if (input.part_complexity === "simple") {
      score += 25;
      reasons.push("Simple part — hardcode is fastest to write");
    }
    if (input.lot_size <= 5 && input.family_parts_expected <= 1) {
      score += 20;
      reasons.push(`One-off work (lot=${input.lot_size}, family=${input.family_parts_expected}) — macros/CAM overhead not justified`);
    }
    if (input.time_constraint === "urgent") {
      score += 10;
      reasons.push("Urgent timing — hardcode has lowest programming overhead");
    }
    if (input.part_complexity === "very_complex") {
      score -= 30;
      disqualifiers.push("Very complex geometry — hardcode is error-prone at this scale");
    }
    if (input.requires_5axis) {
      score -= 40;
      disqualifiers.push("5-axis required — hardcode toolpaths are dangerous without CAM verification");
    }
    if (input.family_parts_expected >= 3) {
      score -= 10;
      reasons.push("Family of parts present — hardcode forces N duplicate programs");
    }
    if (input.operator_skill_level === "expert") {
      score += 5;
      reasons.push("Expert operator can safely edit hardcode on the floor");
    }
    if (
      input.operator_skill_level === "beginner" &&
      (input.part_complexity === "simple" || input.part_complexity === "moderate") &&
      !input.requires_5axis
    ) {
      score += 10;
      reasons.push("Beginner + simple/moderate part — hardcode is safer than macro to hand-edit");
    }

    return { style: "hardcode", score: Math.max(0, Math.min(100, score)), reasons, disqualifiers };
  }

  private scoreMacro(input: StyleSelectionInput): StyleScore {
    const reasons: string[] = [];
    const disqualifiers: string[] = [];
    let score = 30;

    if (input.family_parts_expected >= 3) {
      score += 30;
      reasons.push(`Family of ${input.family_parts_expected} parts — single parametric macro covers all variants`);
    } else if (input.family_parts_expected === 2) {
      score += 10;
      reasons.push("Small family — modest macro benefit");
    }
    if (input.lot_size >= 50) {
      score += 10;
      reasons.push(`Lot size ${input.lot_size} amortizes upfront macro programming time`);
    }
    if (input.operator_skill_level === "beginner") {
      score -= 35;
      disqualifiers.push("Beginner operator — macros require understanding to edit safely");
    }
    if (input.operator_skill_level === "expert") {
      score += 10;
      reasons.push("Expert operator can maintain parametric macros");
    }
    if (input.time_constraint === "urgent" && input.family_parts_expected <= 1) {
      score -= 15;
      reasons.push("Urgent + no family — macro's upfront investment wastes time");
    }
    if (input.part_complexity === "very_complex") {
      score -= 15;
      disqualifiers.push("Very complex part — macro readability suffers at this scale (prefer CAM)");
    }

    return { style: "macro", score: Math.max(0, Math.min(100, score)), reasons, disqualifiers };
  }

  private scoreConversational(input: StyleSelectionInput): StyleScore {
    const reasons: string[] = [];
    const disqualifiers: string[] = [];
    let score = 20;
    const convType = detectConversationalType(input.controller);

    if (!convType) {
      disqualifiers.push(`Controller "${input.controller}" does not support conversational programming`);
      return { style: "conversational", score: 0, reasons, disqualifiers };
    }

    reasons.push(`Controller supports ${convType} conversational programming`);
    score += 25;

    if (input.operator_skill_level === "beginner") {
      score += 20;
      reasons.push("Beginner operator — conversational's dialog workflow reduces G-code errors");
    } else if (input.operator_skill_level === "intermediate") {
      score += 10;
      reasons.push("Intermediate operator can work conversational productively");
    }

    if (input.part_complexity === "simple" || input.part_complexity === "moderate") {
      score += 15;
      reasons.push(`${input.part_complexity} complexity fits conversational dialog workflow`);
    }
    if (input.part_complexity === "complex") {
      score -= 5;
      reasons.push("Complex parts stretch conversational workflow — verify feature coverage");
    }
    if (input.part_complexity === "very_complex") {
      score -= 25;
      disqualifiers.push("Very complex parts — conversational dialog cannot model all features");
    }
    if (input.requires_5axis) {
      score -= 30;
      disqualifiers.push("5-axis work — conversational modes lack full TCP/kinematic coverage");
    }
    if (input.available_cam_seats === 0 && input.part_complexity !== "very_complex") {
      score += 10;
      reasons.push("No CAM seats available — conversational is the pragmatic choice");
    }
    if (input.time_constraint === "urgent") {
      score += 10;
      reasons.push("Urgent — conversational has lowest time-to-first-chip");
    }
    if (input.machine_availability === "bottleneck") {
      score -= 5;
      reasons.push("Bottleneck machine — on-machine conversational time has higher opportunity cost");
    }

    return {
      style: "conversational",
      conversational_type: convType,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      disqualifiers,
    };
  }

  private scoreCAM(input: StyleSelectionInput): StyleScore {
    const reasons: string[] = [];
    const disqualifiers: string[] = [];
    let score = 30;

    if (!hasCAMAvailable(input)) {
      disqualifiers.push("No CAM seats available");
      score = 0;
      return { style: "cam", score, reasons, disqualifiers };
    }

    reasons.push(`${input.available_cam_seats} CAM seat(s) available`);

    if (input.part_complexity === "complex") {
      score += 20;
      reasons.push("Complex part — CAM toolpath optimization delivers cycle-time gains");
    }
    if (input.part_complexity === "very_complex") {
      score += 35;
      reasons.push("Very complex part — CAM is the only practical option for verifiable toolpaths");
    }
    if (input.requires_5axis) {
      score += 25;
      reasons.push("5-axis required — CAM with post-processor handles TCP correctly");
    }
    if (input.lot_size >= 50 || input.family_parts_expected >= 5) {
      score += 10;
      reasons.push("High volume — CAM cycle-time optimization pays off");
    }
    if (input.time_constraint === "urgent" && input.part_complexity === "simple") {
      score -= 15;
      reasons.push("Urgent + simple part — CAM post/verify loop is overkill");
    }
    if (input.part_complexity === "simple" && input.lot_size <= 5) {
      score -= 20;
      reasons.push("Simple one-off — CAM setup overhead exceeds part value");
    }

    return { style: "cam", score: Math.max(0, Math.min(100, score)), reasons, disqualifiers };
  }

  // ── Cost Estimation ────────────────────────────────────────────────────

  private estimateCost(style: ProgrammingStyle, input: StyleSelectionInput): CostEstimate {
    const progRate = input.programming_rate_usd_hr ?? DEFAULT_PROGRAMMING_RATE;
    const shopRate = input.shop_rate_usd_hr ?? DEFAULT_SHOP_RATE;
    const complexityMult = COMPLEXITY_MULT[input.part_complexity];

    const programming_hr = STYLE_BASE_PROG_HR[style] * complexityMult;
    const setup_hr = STYLE_SETUP_HR[style];

    // Baseline cycle time per part in hours — depends on complexity only
    const baselineCycleHr =
      input.part_complexity === "simple"
        ? 0.15
        : input.part_complexity === "moderate"
        ? 0.35
        : input.part_complexity === "complex"
        ? 0.8
        : 1.6;
    const machine_hr = baselineCycleHr * STYLE_CYCLE_EFFICIENCY[style] * input.lot_size;

    const programming = programming_hr * progRate;
    const setup = setup_hr * shopRate;
    const cycle = machine_hr * shopRate;

    return {
      programming_hr: round(programming_hr, 2),
      machine_hr: round(machine_hr, 2),
      setup_hr: round(setup_hr, 2),
      total_cost: round(programming + setup + cycle, 2),
      cost_breakdown: {
        programming: round(programming, 2),
        setup: round(setup, 2),
        cycle: round(cycle, 2),
      },
    };
  }

  private costNotes(style: ProgrammingStyle, input: StyleSelectionInput): string[] {
    const notes: string[] = [];
    if (style === "macro" && input.family_parts_expected >= 3) {
      notes.push(`Macro cost amortizes across ${input.family_parts_expected} family members`);
    }
    if (style === "cam" && input.part_complexity === "very_complex") {
      notes.push("CAM cycle-time efficiency outweighs programming cost for very complex parts");
    }
    if (style === "conversational" && !detectConversationalType(input.controller)) {
      notes.push("Controller does not support conversational programming — cost shown is hypothetical");
    }
    if (style === "hardcode" && input.lot_size <= 5) {
      notes.push("Hardcode is cost-optimal for small one-off lots");
    }
    return notes;
  }

  private breakEvenAnalysis(
    input: StyleSelectionInput,
    ranked: StyleCostComparison["ranked_options"]
  ): string[] {
    const notes: string[] = [];
    const macroEntry = ranked.find((r) => r.style === "macro");
    const hardcodeEntry = ranked.find((r) => r.style === "hardcode");
    const camEntry = ranked.find((r) => r.style === "cam");

    if (macroEntry && hardcodeEntry) {
      const diff = macroEntry.total_cost - hardcodeEntry.total_cost;
      if (diff > 0) {
        const perPartDiff = diff / Math.max(1, input.lot_size);
        notes.push(
          `Macro costs $${round(diff, 2)} more than hardcode at lot=${input.lot_size}; break-even at family ≈ ${Math.max(2, Math.ceil(diff / 200))} parts`
        );
        if (perPartDiff > 5) {
          notes.push(`Per-part cost difference $${round(perPartDiff, 2)} — macro upfront investment not yet paying off`);
        }
      } else {
        notes.push(`Macro is $${round(-diff, 2)} cheaper than hardcode at this volume`);
      }
    }

    if (camEntry && hardcodeEntry && input.part_complexity !== "simple") {
      const diff = camEntry.total_cost - hardcodeEntry.total_cost;
      if (diff < 0) {
        notes.push(
          `CAM is $${round(-diff, 2)} cheaper than hardcode on ${input.part_complexity} parts due to cycle-time efficiency`
        );
      }
    }

    return notes;
  }

  // ── Reasoning helpers ──────────────────────────────────────────────────

  private explainTradeOff(alt: StyleScore, top: StyleScore): string {
    const delta = top.score - alt.score;
    if (delta < 5) return `Close second (${delta} pts behind) — viable fallback`;
    if (delta < 15) return `Moderate gap (${delta} pts) — consider if top choice unavailable`;
    if (alt.disqualifiers.length > 0) return `Disqualified: ${alt.disqualifiers[0]}`;
    return `Not recommended (${delta} pts behind top choice)`;
  }

  private analyzeFuturePlanning(
    input: StyleSelectionInput,
    chosen: ProgrammingStyle
  ): StyleRecommendation["future_planning"] {
    const family = input.family_parts_expected;
    const notes: string[] = [];

    // Reuse potential = how much of this work survives on the next similar job
    let reuse = 0.1;
    if (chosen === "macro") reuse = 0.85;
    if (chosen === "cam") reuse = 0.75;
    if (chosen === "conversational") reuse = 0.4;
    if (chosen === "hardcode") reuse = 0.15;

    // Family benefit = how much the chosen style leverages the family size
    let familyBenefit = 0.2;
    if (chosen === "macro" && family >= 3) familyBenefit = 0.9;
    if (chosen === "cam" && family >= 3) familyBenefit = 0.7;
    if (chosen === "conversational") familyBenefit = 0.35;
    if (chosen === "hardcode") familyBenefit = 0.1;

    if (chosen === "macro" && family < 3) {
      notes.push("Macro chosen without a family — consider identifying future variants to boost ROI");
    }
    if (chosen === "hardcode" && family >= 3) {
      notes.push(`Family of ${family} detected but hardcode chosen — revisit if lot size grows`);
    }
    if (chosen === "cam" && input.available_cam_seats === 1) {
      notes.push("Single CAM seat — bottleneck risk if concurrent jobs arrive");
    }

    return { reuse_potential: reuse, family_benefit: familyBenefit, notes };
  }

  /**
   * Statistics / introspection — for dispatcher status endpoints.
   */
  getStats(): {
    styles_supported: number;
    conversational_types: number;
    default_programming_rate_usd_hr: number;
    default_shop_rate_usd_hr: number;
  } {
    return {
      styles_supported: 4,
      conversational_types: 6,
      default_programming_rate_usd_hr: DEFAULT_PROGRAMMING_RATE,
      default_shop_rate_usd_hr: DEFAULT_SHOP_RATE,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheProgrammingStyleSelectorEngine = new LatheProgrammingStyleSelectorEngineImpl();
export type { LatheProgrammingStyleSelectorEngineImpl };
