/**
 * LatheProgrammingCostEngine (E109)
 * ==================================
 *
 * Dedicated cost model for lathe programming. Computes programmer labor,
 * CAM seat amortization, machine occupancy (for conversational), and setup
 * cost per programming style. All rates are pulled from ShopConfigurationEngine
 * so nothing is hardcoded at the engine level.
 *
 * Distinct from LatheProgrammingStyleSelectorEngine (E107):
 *   - E107: routes a request to a style using multi-criteria scoring
 *   - E109: runs a detailed cost model once a style (or set of styles) is known
 *
 * API:
 *   - estimateProgrammingCost(style, complexity, lotSize, options?)
 *   - compareApproaches(partSpec)
 *   - breakEvenAnalysis(macroInvestmentHrs, lotSizes)
 *
 * Leverages:
 *   - ShopConfigurationEngine — canonical JM Die shop rates
 *
 * @module engines/LatheProgrammingCostEngine
 * @milestone LATHE-AWARE-HARDEN MS11 (U-LAT77-U-LAT82)
 * @version 1.0.0
 */

import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";
import type {
  ProgrammingStyle,
  PartComplexity,
} from "./LatheProgrammingStyleSelectorEngine.js";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProgrammingCostOptions {
  /** Shop profile ID (defaults to ShopConfigurationEngine active profile) */
  profile_id?: string;
  /** Override CAM seat cost (e.g. $200/hr hyperMILL, $150/hr Mastercam) */
  cam_seat_cost_per_hr?: number;
  /** Override programmer rate (CAM or manual) */
  programmer_rate_per_hr?: number;
  /** Override machine hourly rate */
  machine_rate_per_hr?: number;
  /** Override setup rate */
  setup_rate_per_hr?: number;
  /** Optional part feature multiplier (thread/live-tool/5-axis adds complexity) */
  feature_surcharge_pct?: number;
}

export interface ProgrammingCostResult {
  style: ProgrammingStyle;
  complexity: PartComplexity;
  lot_size: number;
  programming_hr: number;
  setup_hr: number;
  cycle_hr: number;
  cam_seat_hr: number;
  cost_breakdown: {
    programming_labor: number;
    cam_seat: number;
    setup: number;
    cycle: number;
    feature_surcharge: number;
  };
  total_cost: number;
  per_part_cost: number;
  assumptions: {
    programmer_rate: number;
    cam_seat_rate: number;
    machine_rate: number;
    setup_rate: number;
    profile_id: string;
  };
}

export interface CompareInput {
  controller?: string;
  part_complexity: PartComplexity;
  lot_size: number;
  has_threading?: boolean;
  has_live_tooling?: boolean;
  requires_5axis?: boolean;
  available_cam_seats?: number;
  options?: ProgrammingCostOptions;
}

export interface CompareResult {
  ranked: Array<{
    style: ProgrammingStyle;
    cost: ProgrammingCostResult;
    notes: string[];
    feasible: boolean;
  }>;
  cheapest_feasible: ProgrammingStyle;
  cheapest_overall: ProgrammingStyle;
}

export interface BreakEvenPoint {
  lot_size: number;
  macro_total_cost: number;
  hardcode_total_cost: number;
  macro_savings: number;
  macro_is_cheaper: boolean;
}

export interface BreakEvenAnalysis {
  macro_investment_hr: number;
  lot_sizes_analyzed: number[];
  break_even_lot_size: number | null;
  points: BreakEvenPoint[];
  recommendation: string;
}

// ── Cost Model Tables ──────────────────────────────────────────────────────

/** Programming hours per style at "moderate" complexity baseline (1.0× multiplier). */
const BASE_PROGRAMMING_HR: Record<ProgrammingStyle, number> = {
  hardcode: 1.0,
  conversational: 0.6,
  macro: 2.5, // upfront parametric investment
  cam: 3.0, // CAM + post + verify loop
};

/** CAM seat time per style (hours using the license) — only CAM uses the seat. */
const BASE_CAM_SEAT_HR: Record<ProgrammingStyle, number> = {
  hardcode: 0,
  conversational: 0,
  macro: 0,
  cam: 2.5, // majority of programming time happens on the seat
};

/** Complexity multiplier for programming hours. */
const COMPLEXITY_MULT: Record<PartComplexity, number> = {
  simple: 0.45,
  moderate: 1.0,
  complex: 2.2,
  very_complex: 4.5,
};

/** Setup hours per style (shop-floor prep before first part). */
const SETUP_HR: Record<ProgrammingStyle, number> = {
  hardcode: 0.5,
  conversational: 0.3,
  macro: 0.75,
  cam: 0.5,
};

/** Cycle-time efficiency factor (lower = faster toolpaths). */
const CYCLE_EFFICIENCY: Record<ProgrammingStyle, number> = {
  hardcode: 1.0,
  conversational: 1.0,
  macro: 0.98,
  cam: 0.85,
};

/** Baseline per-part cycle time (hours) by complexity. */
const CYCLE_BASE_HR: Record<PartComplexity, number> = {
  simple: 0.15,
  moderate: 0.35,
  complex: 0.8,
  very_complex: 1.6,
};

/** Default CAM seat rate fallback when the shop has no specific rate configured. */
const DEFAULT_CAM_SEAT_RATE = 180; // $/hr — amortized seat (hyperMILL-class)

// ── Engine Implementation ──────────────────────────────────────────────────

class LatheProgrammingCostEngineImpl {
  /**
   * Estimate the total programming cost for a given style, complexity, and lot size.
   *
   * @param style Programming style
   * @param complexity Part complexity tier
   * @param lotSize Number of parts in the lot (>= 1)
   * @param options Optional rate overrides
   * @returns Detailed cost breakdown
   */
  estimateProgrammingCost(
    style: ProgrammingStyle,
    complexity: PartComplexity,
    lotSize: number,
    options: ProgrammingCostOptions = {}
  ): ProgrammingCostResult {
    if (lotSize < 1) {
      throw new Error(`[ProgrammingCost] lotSize must be >= 1, got ${lotSize}`);
    }

    const rates = this.resolveRates(options);
    const mult = COMPLEXITY_MULT[complexity];

    const programming_hr = BASE_PROGRAMMING_HR[style] * mult;
    const cam_seat_hr = BASE_CAM_SEAT_HR[style] * mult;
    const setup_hr = SETUP_HR[style];
    const cycle_hr = CYCLE_BASE_HR[complexity] * CYCLE_EFFICIENCY[style] * lotSize;

    const programming_labor = programming_hr * rates.programmer_rate;
    const cam_seat = cam_seat_hr * rates.cam_seat_rate;
    const setup = setup_hr * rates.setup_rate;
    const cycle = cycle_hr * rates.machine_rate;

    // Conversational programming happens AT the machine, not a separate desk —
    // add the machine occupancy cost for the programming hours.
    let conversationalOccupancy = 0;
    if (style === "conversational") {
      conversationalOccupancy = programming_hr * rates.machine_rate;
    }

    const surchargePct = options.feature_surcharge_pct ?? 0;
    const baseTotal = programming_labor + cam_seat + setup + cycle + conversationalOccupancy;
    const surcharge = baseTotal * (surchargePct / 100);

    const total = baseTotal + surcharge;

    return {
      style,
      complexity,
      lot_size: lotSize,
      programming_hr: round2(programming_hr),
      setup_hr: round2(setup_hr),
      cycle_hr: round2(cycle_hr),
      cam_seat_hr: round2(cam_seat_hr),
      cost_breakdown: {
        programming_labor: round2(programming_labor + conversationalOccupancy),
        cam_seat: round2(cam_seat),
        setup: round2(setup),
        cycle: round2(cycle),
        feature_surcharge: round2(surcharge),
      },
      total_cost: round2(total),
      per_part_cost: round2(total / lotSize),
      assumptions: {
        programmer_rate: rates.programmer_rate,
        cam_seat_rate: rates.cam_seat_rate,
        machine_rate: rates.machine_rate,
        setup_rate: rates.setup_rate,
        profile_id: rates.profile_id,
      },
    };
  }

  /**
   * Compare all 4 styles for the same part spec. Flags infeasible combinations
   * (e.g. CAM when no seat available, conversational on a non-capable controller).
   */
  compareApproaches(input: CompareInput): CompareResult {
    const styles: ProgrammingStyle[] = ["hardcode", "conversational", "macro", "cam"];
    const featureSurcharge = this.computeFeatureSurcharge(input);
    const mergedOptions: ProgrammingCostOptions = {
      ...input.options,
      feature_surcharge_pct:
        (input.options?.feature_surcharge_pct ?? 0) + featureSurcharge,
    };

    const ranked = styles.map((style) => {
      const cost = this.estimateProgrammingCost(
        style,
        input.part_complexity,
        input.lot_size,
        mergedOptions
      );

      const { feasible, notes } = this.evaluateFeasibility(style, input);

      return { style, cost, notes, feasible };
    });

    // Sort by total cost ascending
    const sortedAll = [...ranked].sort((a, b) => a.cost.total_cost - b.cost.total_cost);
    const cheapest_overall = sortedAll[0]!.style;

    const feasibleOnly = sortedAll.filter((r) => r.feasible);
    const cheapest_feasible = feasibleOnly.length > 0 ? feasibleOnly[0]!.style : cheapest_overall;

    return {
      ranked: sortedAll,
      cheapest_feasible,
      cheapest_overall,
    };
  }

  /**
   * Analyze the break-even point between macro and hardcode across a range of
   * lot sizes. Useful for deciding whether parametric macro investment pays off.
   *
   * @param macroInvestmentHr Extra upfront programming time for macro vs hardcode
   * @param lotSizes Lot sizes to analyze (e.g. [10, 50, 100, 500])
   * @param complexity Part complexity (default "moderate")
   * @param options Rate overrides
   */
  breakEvenAnalysis(
    macroInvestmentHr: number,
    lotSizes: number[],
    complexity: PartComplexity = "moderate",
    options: ProgrammingCostOptions = {}
  ): BreakEvenAnalysis {
    if (macroInvestmentHr < 0) {
      throw new Error(`[ProgrammingCost] macroInvestmentHr must be >= 0`);
    }
    if (lotSizes.length === 0) {
      throw new Error(`[ProgrammingCost] lotSizes cannot be empty`);
    }

    // Note: we do NOT use macroInvestmentHr to override the engine's internal
    // programming time; instead we add it as a surcharge to macro cost so
    // callers can sweep "what if macro takes X more hours than base" scenarios.
    const rates = this.resolveRates(options);
    const surchargeCost = macroInvestmentHr * rates.programmer_rate;

    const points: BreakEvenPoint[] = lotSizes.map((lotSize) => {
      const macro = this.estimateProgrammingCost("macro", complexity, lotSize, options);
      const hardcode = this.estimateProgrammingCost("hardcode", complexity, lotSize, options);
      const macroTotal = macro.total_cost + surchargeCost;
      return {
        lot_size: lotSize,
        macro_total_cost: round2(macroTotal),
        hardcode_total_cost: hardcode.total_cost,
        macro_savings: round2(hardcode.total_cost - macroTotal),
        macro_is_cheaper: macroTotal < hardcode.total_cost,
      };
    });

    const firstCrossover = points.find((p) => p.macro_is_cheaper);
    const break_even_lot_size = firstCrossover?.lot_size ?? null;

    const recommendation = this.formatBreakEvenRecommendation(
      break_even_lot_size,
      macroInvestmentHr
    );

    return {
      macro_investment_hr: macroInvestmentHr,
      lot_sizes_analyzed: lotSizes,
      break_even_lot_size,
      points,
      recommendation,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private resolveRates(options: ProgrammingCostOptions): {
    programmer_rate: number;
    cam_seat_rate: number;
    machine_rate: number;
    setup_rate: number;
    profile_id: string;
  } {
    let shopRates;
    let profileId = "unknown";
    try {
      const profile = options.profile_id
        ? shopConfigurationEngine.getProfile(options.profile_id)
        : shopConfigurationEngine.getActiveProfile();
      shopRates = profile.rates;
      profileId = profile.id;
    } catch (err) {
      log.warn(`[ProgrammingCost] Shop config unavailable, using fallback defaults: ${err}`);
      shopRates = {
        labor_per_hr: 55,
        overhead_per_hr: 30,
        admin_per_hr: 15,
        setup_per_hr: 65,
        programming_per_hr: 85,
        inspection_per_hr: 55,
      };
      profileId = "fallback";
    }

    const programmer_rate =
      options.programmer_rate_per_hr ?? shopRates.programming_per_hr;
    const cam_seat_rate = options.cam_seat_cost_per_hr ?? DEFAULT_CAM_SEAT_RATE;
    // machine_rate = labor + overhead blended rate (approximation of lathe run rate)
    const machine_rate =
      options.machine_rate_per_hr ?? shopRates.labor_per_hr + shopRates.overhead_per_hr;
    const setup_rate = options.setup_rate_per_hr ?? shopRates.setup_per_hr;

    return { programmer_rate, cam_seat_rate, machine_rate, setup_rate, profile_id: profileId };
  }

  private computeFeatureSurcharge(input: CompareInput): number {
    let pct = 0;
    if (input.has_threading) pct += 5;
    if (input.has_live_tooling) pct += 8;
    if (input.requires_5axis) pct += 15;
    return pct;
  }

  private evaluateFeasibility(
    style: ProgrammingStyle,
    input: CompareInput
  ): { feasible: boolean; notes: string[] } {
    const notes: string[] = [];
    let feasible = true;

    if (style === "cam" && (input.available_cam_seats ?? 0) === 0) {
      feasible = false;
      notes.push("No CAM seats available");
    }

    if (style === "conversational") {
      const controller = (input.controller ?? "").toLowerCase();
      const hasConv =
        controller.includes("mazatrol") ||
        controller.includes("mazak_smooth") ||
        controller.includes("winmax") ||
        controller.includes("hurco") ||
        controller.includes("heidenhain") ||
        controller.includes("tnc") ||
        controller.includes("navi") ||
        controller.includes("okuma_osp") ||
        controller.includes("shopmill") ||
        controller.includes("siemens") ||
        controller.includes("manual_guide") ||
        controller.includes("fanuc_30i") ||
        controller.includes("fanuc_31i");
      if (!hasConv) {
        feasible = false;
        notes.push(`Controller "${input.controller}" does not support conversational programming`);
      }
    }

    if (style === "hardcode" && input.requires_5axis) {
      feasible = false;
      notes.push("5-axis work requires CAM verification — hardcode is not feasible");
    }

    if (style === "conversational" && input.requires_5axis) {
      feasible = false;
      notes.push("5-axis work not supported by conversational modes");
    }

    return { feasible, notes };
  }

  private formatBreakEvenRecommendation(
    breakEven: number | null,
    macroInvestment: number
  ): string {
    if (breakEven === null) {
      return `Macro does not break even within analyzed range (extra ${macroInvestment}hr investment). Consider only if family size grows or lot size exceeds tested range.`;
    }
    if (breakEven <= 10) {
      return `Macro pays off at very low volume (lot >= ${breakEven}) — strong recommendation to invest in macro.`;
    }
    if (breakEven <= 50) {
      return `Macro breaks even at lot = ${breakEven}. Reasonable investment for medium-volume work.`;
    }
    return `Macro only pays off at high volume (lot >= ${breakEven}). Consider simpler hardcode for current lot sizes.`;
  }

  /**
   * Lightweight stats for dispatcher status endpoint.
   */
  getStats(): {
    styles_supported: number;
    default_cam_seat_rate: number;
    uses_shop_config: boolean;
  } {
    let profileId = "none";
    try {
      profileId = shopConfigurationEngine.getActiveProfile().id;
    } catch {
      // fine
    }
    return {
      styles_supported: 4,
      default_cam_seat_rate: DEFAULT_CAM_SEAT_RATE,
      uses_shop_config: profileId !== "none",
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheProgrammingCostEngine = new LatheProgrammingCostEngineImpl();
export type { LatheProgrammingCostEngineImpl };
