/**
 * BurdenRateEngine — Fully-burdened machine hourly rate.
 *
 * Computes the all-in cost-per-productive-hour for a machine, used by GL
 * (`gl_record_wip_to_cogs`), JobCosting, QuoteEstimator, and AR invoice
 * pricing. Composes the TCO data curated in `MachineRateDatabaseEngine`
 * (depreciation / utilities / floor space / maintenance) and adds the cost
 * components TCO alone does NOT capture:
 *   - Capital cost (interest on tied-up purchase price)
 *   - Insurance + property tax allocation
 *   - Operator direct labor + benefits (fully-loaded wage)
 *   - OEE-adjusted productive-hour denominator (vs. nominal scheduled hours)
 *
 * Formula (industry-standard cost-accounting):
 *   BurdenRate ($/hr) = AnnualIndirectCost / (AnnualOperatingHours × OEE)
 *
 *   where AnnualIndirectCost = depreciation + interest + maintenance
 *       + utilities + floor_space + insurance_tax + operator_labor
 *
 *   depreciation     = purchasePrice / depreciationYears        (straight-line)
 *   interest         = purchasePrice × capitalCostPct           (cost of capital)
 *   maintenance      = purchasePrice × annualMaintenancePct
 *   utilities        = annualUtilities                          (from MRD)
 *   floor_space      = floorSpaceSqFt × floorSpaceCostPerSqFtMonth × 12
 *   insurance_tax    = purchasePrice × insuranceTaxPct
 *   operator_labor   = operatorLaborRate × benefitMultiplier × productive_hours
 *
 * Defaults (override per call via input):
 *   - capitalCostPct    = 0.06  (6% — current US prime + spread for industrial loans)
 *   - insuranceTaxPct   = 0.015 (1.5% — typical Midwest manufacturing aggregate)
 *   - oee               = 0.65  (typical job-shop; world-class 0.85)
 *   - operatorLaborRate = 28.50 ($/hr — US Midwest CNC operator median 2026)
 *   - benefitMultiplier = 1.35  (35% benefit load — health + FICA + WC + 401k)
 *
 * Currency: USD only.
 *
 * References:
 *   - Horngren "Cost Accounting: A Managerial Emphasis" 16e, Ch. 4
 *     (job-order costing — predetermined overhead rates).
 *   - SME "Tool and Manufacturing Engineers Handbook" Vol. 8 §4
 *     (Cost Estimating — machine hour rate calculation).
 *   - APICS CSCP body of knowledge §3 (cost classification).
 *
 * Hotel-soul invariants:
 *   - Cents-resolution; never round to thousands.
 *   - R12 fail-loud: unknown machineId throws (better than silent $0).
 *   - Defensive copy on every public return (frozen objects).
 *
 * @module BurdenRateEngine
 * @milestone HOTEL/U-BURDEN-RATE-REAL (2026-05-25, slot:hotel)
 * @supersedes Stub returning $0 (lost to exFAT corruption 2026-04-10)
 */
import {
  machineRateDatabaseEngine,
  type MachineCategory,
} from "./MachineRateDatabaseEngine.js";

// ─── Defaults (named constants — never inline) ────────────────
/** Cost of capital — annual interest on machine purchase price. */
const DEFAULT_CAPITAL_COST_PCT = 0.06;
/** Insurance + property tax as fraction of purchase price annually. */
const DEFAULT_INSURANCE_TAX_PCT = 0.015;
/** Overall Equipment Effectiveness — typical job-shop default. */
const DEFAULT_OEE = 0.65;
/** Operator direct labor rate ($/hr) — US Midwest CNC operator median 2026. */
const DEFAULT_OPERATOR_LABOR_RATE = 28.5;
/** Benefit multiplier — 35% load (health + FICA + WC + 401k). */
const DEFAULT_BENEFIT_MULTIPLIER = 1.35;
/** ±10% MRD-baseline variance band — outside this gets an explanatory note. */
const VARIANCE_BAND_PCT = 10;
/** Months in a year — for period-cost conversion. */
const MONTHS_PER_YEAR = 12;

// ─── Types ────────────────────────────────────────────────────

export interface BurdenRateInput {
  /** Machine id matching MachineRateDatabaseEngine MACHINES catalog. */
  machineId: string;
  /** Reporting period in months. Default 3 (quarterly). */
  periodMonths?: number;
  /** OEE factor 0..1. Default 0.65 (typical job-shop). */
  oee?: number;
  /** Operator base hourly rate ($/hr). Default 28.50. */
  operatorLaborRate?: number;
  /** Benefit multiplier on labor (1.35 = 35% benefit load). Default 1.35. */
  benefitMultiplier?: number;
  /** Cost of capital as annual fraction. Default 0.06. */
  capitalCostPct?: number;
  /** Insurance + tax as annual fraction of purchase price. Default 0.015. */
  insuranceTaxPct?: number;
}

export interface BurdenRateComponents {
  depreciation_per_hr: number;
  capital_cost_per_hr: number;
  maintenance_per_hr: number;
  utilities_per_hr: number;
  floor_space_per_hr: number;
  insurance_tax_per_hr: number;
  operator_labor_per_hr: number;
  total_per_hr: number;
}

export interface BurdenRateAssumptions {
  annual_operating_hours: number;
  oee_factor: number;
  productive_hours_annual: number;
  productive_hours_period: number;
  capital_cost_pct: number;
  insurance_tax_pct: number;
  operator_labor_rate: number;
  benefit_multiplier: number;
}

export interface BurdenRateResult {
  machineId: string;
  machineName: string;
  family: string;
  tier: string;
  periodMonths: number;
  burdenRate: number;
  periodCost: number;
  components: BurdenRateComponents;
  assumptions: BurdenRateAssumptions;
  currency: "USD";
  source: "BurdenRateEngine.v2";
  cross_check: {
    mrd_typical_hourly_rate: number;
    variance_pct: number;
    variance_explanation: string;
  };
}

export interface ShopAverageBurdenResult {
  weighted_burden_rate: number;
  total_period_cost: number;
  total_productive_hours: number;
  per_machine: BurdenRateResult[];
  currency: "USD";
}

// ─── Engine ───────────────────────────────────────────────────

class BurdenRateEngine {
  /**
   * Calculate fully-burdened machine hourly rate.
   *
   * @param machineIdOrInput either a string machineId (legacy 2-arg call) or full input object
   * @param periodMonths reporting period in months (legacy positional)
   * @returns full burden-rate breakdown
   * @throws Error if machineId is unknown (R12 fail-loud — never silent $0)
   */
  calculateBurdenRate(
    machineIdOrInput: string | BurdenRateInput,
    periodMonths?: number,
  ): BurdenRateResult {
    const input: BurdenRateInput =
      typeof machineIdOrInput === "string"
        ? { machineId: machineIdOrInput, periodMonths: periodMonths ?? 3 }
        : { ...machineIdOrInput };

    if (!input.machineId || typeof input.machineId !== "string") {
      throw new Error(
        "BurdenRateEngine: machineId is required and must be a string",
      );
    }
    const months = input.periodMonths ?? 3;
    if (!Number.isFinite(months) || months <= 0) {
      throw new Error(
        `BurdenRateEngine: periodMonths must be a positive finite number, got ${months}`,
      );
    }

    const machine: MachineCategory | null = machineRateDatabaseEngine.getMachine(input.machineId);
    if (!machine) {
      throw new Error(
        `BurdenRateEngine: unknown machineId "${input.machineId}" (not in MachineRateDatabase)`,
      );
    }

    const oee = input.oee ?? DEFAULT_OEE;
    const operatorLaborRate = input.operatorLaborRate ?? DEFAULT_OPERATOR_LABOR_RATE;
    const benefitMultiplier = input.benefitMultiplier ?? DEFAULT_BENEFIT_MULTIPLIER;
    const capitalCostPct = input.capitalCostPct ?? DEFAULT_CAPITAL_COST_PCT;
    const insuranceTaxPct = input.insuranceTaxPct ?? DEFAULT_INSURANCE_TAX_PCT;

    if (oee <= 0 || oee > 1) {
      throw new Error(`BurdenRateEngine: oee must be in (0,1], got ${oee}`);
    }
    if (operatorLaborRate < 0) {
      throw new Error(
        `BurdenRateEngine: operatorLaborRate must be non-negative, got ${operatorLaborRate}`,
      );
    }
    if (benefitMultiplier < 1) {
      throw new Error(
        `BurdenRateEngine: benefitMultiplier must be ≥1, got ${benefitMultiplier}`,
      );
    }

    const purchasePrice = machine.purchasePrice.typical;
    const annualOperatingHours = machine.annualOperatingHours;
    const productiveHoursAnnual = annualOperatingHours * oee;

    // Annual cost components ($/year)
    const depreciation_annual = purchasePrice / machine.depreciationYears;
    const capital_cost_annual = purchasePrice * capitalCostPct;
    const maintenance_annual = purchasePrice * machine.annualMaintenancePct;
    const utilities_annual = machine.annualUtilities;
    const floor_space_annual =
      machine.floorSpaceSqFt * machine.floorSpaceCostPerSqFtMonth * MONTHS_PER_YEAR;
    const insurance_tax_annual = purchasePrice * insuranceTaxPct;
    const operator_labor_per_hr = operatorLaborRate * benefitMultiplier;

    // Per-productive-hour components.
    const depreciation_per_hr = depreciation_annual / productiveHoursAnnual;
    const capital_cost_per_hr = capital_cost_annual / productiveHoursAnnual;
    const maintenance_per_hr = maintenance_annual / productiveHoursAnnual;
    const utilities_per_hr = utilities_annual / productiveHoursAnnual;
    const floor_space_per_hr = floor_space_annual / productiveHoursAnnual;
    const insurance_tax_per_hr = insurance_tax_annual / productiveHoursAnnual;

    const total_per_hr =
      depreciation_per_hr +
      capital_cost_per_hr +
      maintenance_per_hr +
      utilities_per_hr +
      floor_space_per_hr +
      insurance_tax_per_hr +
      operator_labor_per_hr;

    const productive_hours_period = productiveHoursAnnual * (months / MONTHS_PER_YEAR);
    const periodCost = total_per_hr * productive_hours_period;

    const mrdTypical = machine.hourlyRate.typical;
    const variance =
      mrdTypical > 0 ? ((total_per_hr - mrdTypical) / mrdTypical) * 100 : 0;
    const variance_explanation =
      variance > VARIANCE_BAND_PCT
        ? "BurdenRate higher than MRD typical — operator labor + capital cost + OEE adjustment exceed pure TCO baseline."
        : variance < -VARIANCE_BAND_PCT
          ? "BurdenRate lower than MRD typical — likely higher OEE or zero operator labor input."
          : "BurdenRate within ±10% of MRD typical (consistent).";

    return Object.freeze({
      machineId: machine.id,
      machineName: machine.name,
      family: machine.family,
      tier: machine.tier,
      periodMonths: months,
      burdenRate: this.round2(total_per_hr),
      periodCost: this.round2(periodCost),
      components: Object.freeze({
        depreciation_per_hr: this.round2(depreciation_per_hr),
        capital_cost_per_hr: this.round2(capital_cost_per_hr),
        maintenance_per_hr: this.round2(maintenance_per_hr),
        utilities_per_hr: this.round2(utilities_per_hr),
        floor_space_per_hr: this.round2(floor_space_per_hr),
        insurance_tax_per_hr: this.round2(insurance_tax_per_hr),
        operator_labor_per_hr: this.round2(operator_labor_per_hr),
        total_per_hr: this.round2(total_per_hr),
      }),
      assumptions: Object.freeze({
        annual_operating_hours: annualOperatingHours,
        oee_factor: oee,
        productive_hours_annual: this.round2(productiveHoursAnnual),
        productive_hours_period: this.round2(productive_hours_period),
        capital_cost_pct: capitalCostPct,
        insurance_tax_pct: insuranceTaxPct,
        operator_labor_rate: operatorLaborRate,
        benefit_multiplier: benefitMultiplier,
      }),
      currency: "USD" as const,
      source: "BurdenRateEngine.v2" as const,
      cross_check: Object.freeze({
        mrd_typical_hourly_rate: mrdTypical,
        variance_pct: this.round2(variance),
        variance_explanation,
      }),
    });
  }

  /**
   * Calculate burden rate for multiple machines (defaults to 3-month period).
   * @param machineIds list of machine IDs
   * @returns array of burden-rate results
   */
  getAll(machineIds: string[]): BurdenRateResult[] {
    return machineIds.map((id) => this.calculateBurdenRate(id, 3));
  }

  /**
   * Calculate weighted-average shop-wide burden rate.
   * Weight = each machine's expected productive hours for the period.
   * @param machineIds list of machine IDs in the fleet
   * @param periodMonths reporting period
   * @returns shop-wide weighted rate + per-machine rates + total period cost
   */
  shopAverage(machineIds: string[], periodMonths = 3): ShopAverageBurdenResult {
    if (machineIds.length === 0) {
      throw new Error(
        "BurdenRateEngine.shopAverage: machineIds must be non-empty",
      );
    }
    const rates = machineIds.map((id) =>
      this.calculateBurdenRate({ machineId: id, periodMonths }),
    );
    let totalCost = 0;
    let totalHours = 0;
    for (const r of rates) {
      totalCost += r.periodCost;
      totalHours += r.assumptions.productive_hours_period;
    }
    return Object.freeze({
      weighted_burden_rate:
        totalHours > 0 ? this.round2(totalCost / totalHours) : 0,
      total_period_cost: this.round2(totalCost),
      total_productive_hours: this.round2(totalHours),
      per_machine: rates,
      currency: "USD" as const,
    });
  }

  /** Round to cents (2dp) — never round to thousands. */
  private round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }
}

export const burdenRateEngine = new BurdenRateEngine();
