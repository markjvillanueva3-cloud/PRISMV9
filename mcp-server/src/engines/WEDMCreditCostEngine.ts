/**
 * WEDMCreditCostEngine — Credit-based billing quantization for WEDM jobs
 *
 * Per WEDM-ERP-MS0 scrutiny fix_14: defines a concrete credit cost formula
 * so the StripeBillingEngine can check balance before allowing a quote/job.
 *
 * Formula:
 *   credits = ceil(cutting_area_mm2 / 10000)
 *           + taper_count
 *           + (passes - 1)
 *   where cutting_area_mm2 = perimeter_mm × thickness_mm × passes
 *
 * Rationale:
 *   - 1 credit ≈ 10,000 mm² of cut face (one "unit" of wire cutting work).
 *   - Each taper operation adds complexity (setup/UV axis time).
 *   - Extra passes beyond the first incur skim-pass credits.
 *
 * This formula is tuned so a typical 40mm-thick 100mm-perimeter single-pass job
 * consumes 1 credit; a four-pass 40mm × 300mm job consumes ~13 credits.
 */

export interface CreditCostInput {
  /** Cut perimeter [mm] — total path length of all profiles */
  perimeter_mm: number;
  /** Workpiece thickness [mm] */
  thickness_mm: number;
  /** Number of passes (rough + skims) */
  passes: number;
  /** Number of taper sections in the program (0 if straight cuts only) */
  taper_count?: number;
}

export interface CreditCostResult {
  /** Total credits required */
  credits: number;
  /** Breakdown for transparency */
  breakdown: {
    area_credits: number;
    taper_credits: number;
    pass_credits: number;
  };
  /** Cutting area [mm²] used in calculation */
  cutting_area_mm2: number;
  /** Formula text for audit trail */
  formula: string;
}

export class WEDMCreditCostEngine {
  /** Pixels-per-credit area threshold — 10,000 mm² per credit */
  private static readonly AREA_PER_CREDIT_MM2 = 10_000;

  /** Minimum credit charge — no job is free */
  private static readonly MIN_CREDITS = 1;

  /** Calculate credits required for a WEDM job */
  static calculate(input: CreditCostInput): CreditCostResult {
    const perimeter = Math.max(0, input.perimeter_mm || 0);
    const thickness = Math.max(0, input.thickness_mm || 0);
    const passes = Math.max(1, Math.floor(input.passes || 1));
    const taperCount = Math.max(0, Math.floor(input.taper_count || 0));

    const cutting_area_mm2 = perimeter * thickness * passes;
    const areaCredits = Math.ceil(cutting_area_mm2 / WEDMCreditCostEngine.AREA_PER_CREDIT_MM2);
    const taperCredits = taperCount;
    const passCredits = passes - 1;

    const total = Math.max(
      WEDMCreditCostEngine.MIN_CREDITS,
      areaCredits + taperCredits + passCredits,
    );

    return {
      credits: total,
      breakdown: {
        area_credits: areaCredits,
        taper_credits: taperCredits,
        pass_credits: passCredits,
      },
      cutting_area_mm2,
      formula: "credits = ceil(perimeter × thickness × passes / 10000) + taper_count + (passes - 1)",
    };
  }

  /** Check whether account balance covers a calculated credit cost */
  static hasBalance(balance: number, required: number): boolean {
    return Number.isFinite(balance) && balance >= required;
  }

  /** Integer cost only, for StripeBillingEngine.checkCredits(cost) compatibility */
  static quickCost(input: CreditCostInput): number {
    return WEDMCreditCostEngine.calculate(input).credits;
  }
}

export const wedmCreditCostEngine = WEDMCreditCostEngine;
