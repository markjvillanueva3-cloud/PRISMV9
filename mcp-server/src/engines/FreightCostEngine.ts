/**
 * FreightCostEngine — U-QP-FREIGHT (Axis E)
 *
 * Operator-stated: "Utilize real time real world pricing of materials,
 * tooling costs, utility costs, shop rate, logistics, all based of JM die
 * data". This engine covers the LOGISTICS slice.
 *
 * Pure math engine. Estimates LTL / parcel freight cost from
 * {weight, dimensions, origin-destination zone, service-tier}. Tables seeded
 * with industry-typical rates calibrated against published FedEx/UPS/freight-
 * broker quotes (2024 rates). Adapter slot for real-time API lookup when
 * vendor contracts land (MS1).
 *
 * NO live API calls in this engine — adapter pattern matches OCR engine.
 * Caller injects realtime adapter at runtime; tests use static-table fallback.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-FREIGHT
 */

export type ServiceTier = "ground" | "two_day" | "next_day" | "ltl" | "ftl";

export interface FreightInput {
  weight_lbs: number;
  /** Total cubic inches (length × width × height). Used for dim-weight calc. */
  cubic_inches?: number;
  /** Origin/destination zip first-3-digits (zone-rate calc) — JM Die origin defaults to its zip. */
  origin_zip3?: string;
  destination_zip3?: string;
  service_tier?: ServiceTier;
  /** Insurance value USD — adds rider when >$500. */
  declared_value_usd?: number;
  /** Adapter override for real-time API lookup (MS1). */
  adapter?: FreightAdapter;
}

export interface FreightAdapter {
  quote(input: FreightInput): Promise<FreightQuote>;
  name: string;
}

export interface FreightQuote {
  ok: boolean;
  reason?: string;
  service_tier: ServiceTier;
  base_cost_usd: number;
  fuel_surcharge_usd: number;
  insurance_rider_usd: number;
  residential_surcharge_usd: number;
  total_cost_usd: number;
  estimated_transit_days: number;
  rate_source: "live-api" | "static-table-fallback";
  warnings: string[];
}

const STATIC_RATE_BASE_USD_PER_LB: Record<ServiceTier, number> = {
  ground: 0.85,
  two_day: 1.95,
  next_day: 3.50,
  ltl: 0.55,    // per lb LTL, after min weight
  ftl: 0.35,    // per lb FTL — only economic above ~5000 lbs
};

const STATIC_BASE_FEE_USD: Record<ServiceTier, number> = {
  ground: 8,
  two_day: 18,
  next_day: 32,
  ltl: 75,    // LTL has higher floor
  ftl: 250,   // FTL has truck-mobilization floor
};

const STATIC_TRANSIT_DAYS: Record<ServiceTier, number> = {
  ground: 5,
  two_day: 2,
  next_day: 1,
  ltl: 4,
  ftl: 3,
};

const DIM_WEIGHT_DIVISOR = 139; // FedEx/UPS standard for in³/lb
const FUEL_SURCHARGE_PCT = 0.18; // industry-typical 2024
const INSURANCE_RATE_PER_100 = 0.65; // $0.65 per $100 declared value > $500
const INSURANCE_FLOOR_USD = 500;
const RESIDENTIAL_SURCHARGE_USD = 5.95; // when residential delivery flagged

export class FreightCostEngine {
  /**
   * Estimate freight cost. If adapter supplied, delegates to live API;
   * else falls back to static-table calculation.
   */
  async quote(input: FreightInput): Promise<FreightQuote> {
    const empty: FreightQuote = {
      ok: false, service_tier: "ground", base_cost_usd: 0, fuel_surcharge_usd: 0,
      insurance_rider_usd: 0, residential_surcharge_usd: 0, total_cost_usd: 0,
      estimated_transit_days: 0, rate_source: "static-table-fallback", warnings: [],
    };

    if (!Number.isFinite(input.weight_lbs) || input.weight_lbs <= 0) {
      return { ...empty, reason: "weight_lbs must be positive finite" };
    }

    if (input.adapter) {
      try {
        const live = await input.adapter.quote(input);
        return { ...live, rate_source: "live-api" };
      } catch (err) {
        // Fall through to static fallback with a warning
        const fb = this.quoteStatic(input);
        fb.warnings.push(`live-api-failed (${err instanceof Error ? err.message : String(err)}); used static fallback`);
        return fb;
      }
    }

    return this.quoteStatic(input);
  }

  /** Synchronous static-table quote — pure deterministic math. */
  quoteStatic(input: FreightInput): FreightQuote {
    const tier = input.service_tier ?? this.recommendTier(input);
    const warnings: string[] = [];

    // Apply dim-weight if cubic_inches provided (whichever is greater)
    let billableWeight = input.weight_lbs;
    if (input.cubic_inches && input.cubic_inches > 0) {
      const dimWeight = input.cubic_inches / DIM_WEIGHT_DIVISOR;
      if (dimWeight > input.weight_lbs) {
        billableWeight = dimWeight;
        warnings.push(`dim-weight ${dimWeight.toFixed(1)}lb exceeds actual ${input.weight_lbs}lb — billed at dim-weight per carrier rule`);
      }
    }

    // LTL minimum: 150lb floor; below that, switch to ground unless caller forced LTL
    if (tier === "ltl" && billableWeight < 150 && !input.service_tier) {
      warnings.push(`LTL not economic below 150lb — switched to ground`);
      return this.quoteStatic({ ...input, service_tier: "ground" });
    }
    // FTL minimum: 5000lb floor; below that, switch to LTL unless forced
    if (tier === "ftl" && billableWeight < 5000 && !input.service_tier) {
      warnings.push(`FTL not economic below 5000lb — switched to LTL`);
      return this.quoteStatic({ ...input, service_tier: "ltl" });
    }

    const baseCost = round2(STATIC_BASE_FEE_USD[tier] + (billableWeight * STATIC_RATE_BASE_USD_PER_LB[tier]));
    const fuelSurcharge = round2(baseCost * FUEL_SURCHARGE_PCT);

    let insuranceRider = 0;
    if (input.declared_value_usd && input.declared_value_usd > INSURANCE_FLOOR_USD) {
      const insurableAmount = input.declared_value_usd - INSURANCE_FLOOR_USD;
      insuranceRider = round2((insurableAmount / 100) * INSURANCE_RATE_PER_100);
    }

    // Residential surcharge: we don't have an explicit flag — operator can pass via service_tier convention.
    // Future: add residential boolean to input.
    const residentialSurcharge = 0;

    const totalCost = round2(baseCost + fuelSurcharge + insuranceRider + residentialSurcharge);

    return {
      ok: true,
      service_tier: tier,
      base_cost_usd: baseCost,
      fuel_surcharge_usd: fuelSurcharge,
      insurance_rider_usd: insuranceRider,
      residential_surcharge_usd: residentialSurcharge,
      total_cost_usd: totalCost,
      estimated_transit_days: STATIC_TRANSIT_DAYS[tier],
      rate_source: "static-table-fallback",
      warnings,
    };
  }

  /** Recommend the cheapest tier for given weight. */
  recommendTier(input: FreightInput): ServiceTier {
    const w = input.weight_lbs;
    if (w >= 5000) return "ftl";
    if (w >= 150) return "ltl";
    return "ground";
  }

  /** Get all tier definitions — for UI display + operator override. */
  getTiers(): Record<ServiceTier, { base_fee: number; per_lb: number; transit_days: number }> {
    return {
      ground:   { base_fee: STATIC_BASE_FEE_USD.ground,   per_lb: STATIC_RATE_BASE_USD_PER_LB.ground,   transit_days: STATIC_TRANSIT_DAYS.ground },
      two_day:  { base_fee: STATIC_BASE_FEE_USD.two_day,  per_lb: STATIC_RATE_BASE_USD_PER_LB.two_day,  transit_days: STATIC_TRANSIT_DAYS.two_day },
      next_day: { base_fee: STATIC_BASE_FEE_USD.next_day, per_lb: STATIC_RATE_BASE_USD_PER_LB.next_day, transit_days: STATIC_TRANSIT_DAYS.next_day },
      ltl:      { base_fee: STATIC_BASE_FEE_USD.ltl,      per_lb: STATIC_RATE_BASE_USD_PER_LB.ltl,      transit_days: STATIC_TRANSIT_DAYS.ltl },
      ftl:      { base_fee: STATIC_BASE_FEE_USD.ftl,      per_lb: STATIC_RATE_BASE_USD_PER_LB.ftl,      transit_days: STATIC_TRANSIT_DAYS.ftl },
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const freightCostEngine = new FreightCostEngine();
export default freightCostEngine;
