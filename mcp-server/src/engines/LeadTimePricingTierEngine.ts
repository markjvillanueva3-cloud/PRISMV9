/**
 * LeadTimePricingTierEngine — U-QP-LEAD-TIME-TIERS (Axis F)
 *
 * Emits 3 price points {rush / standard / economy} with explicit lead-time
 * days + cost-delta + reasoning. Composes QueueingLeadTimeEngine output with
 * RUSH_MULTIPLIERS to surface the trade-off matrix the operator stated:
 * "generate a quote with different price points depending on lead times".
 *
 * Pure deterministic math. No I/O. Caller supplies the base unit_price +
 * standard lead-days; engine produces the 3-tier emission.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-LEAD-TIME-TIERS
 */

export type LeadTimeTier = "rush" | "standard" | "economy";

export interface LeadTimeTierConfig {
  /** Multiplier applied to base unit_price for this tier (1.0 = no change). */
  priceMultiplier: number;
  /** Days to delivery relative to standard (negative = faster). */
  leadDaysDelta: number;
  /** Operator-facing rationale string. */
  rationale: string;
}

export interface LeadTimeTierResult {
  tier: LeadTimeTier;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  cost_delta_per_part: number;
  cost_delta_pct: number;
  rationale: string;
}

export interface TierEmitInput {
  base_unit_price: number;
  base_lead_days: number;
  quantity: number;
  /** Override default tier configs. */
  configs?: Partial<Record<LeadTimeTier, Partial<LeadTimeTierConfig>>>;
}

export interface TierEmitResult {
  ok: boolean;
  reason?: string;
  tiers: LeadTimeTierResult[];
  default_tier: LeadTimeTier;
}

const DEFAULT_CONFIGS: Record<LeadTimeTier, LeadTimeTierConfig> = {
  rush: {
    priceMultiplier: 1.5,
    leadDaysDelta: -7,
    rationale: "Rush: priority queue + OT + expedited tooling — adds ~50% premium for 7-day faster delivery",
  },
  standard: {
    priceMultiplier: 1.0,
    leadDaysDelta: 0,
    rationale: "Standard: normal queue + first-shift labor — baseline price + lead time",
  },
  economy: {
    priceMultiplier: 0.92,
    leadDaysDelta: 14,
    rationale: "Economy: batched with similar runs + second-shift labor — ~8% savings for 14-day longer delivery",
  },
};

const ALL_TIERS: LeadTimeTier[] = ["rush", "standard", "economy"];

export class LeadTimePricingTierEngine {
  /**
   * Emit 3 tiers from a base quote. Returns sorted by lead_time_days ascending
   * (rush first, economy last) for operator-friendly display.
   */
  emit(input: TierEmitInput): TierEmitResult {
    if (!Number.isFinite(input.base_unit_price) || input.base_unit_price <= 0) {
      return { ok: false, reason: "base_unit_price must be positive finite", tiers: [], default_tier: "standard" };
    }
    if (!Number.isFinite(input.base_lead_days) || input.base_lead_days < 0) {
      return { ok: false, reason: "base_lead_days must be non-negative finite", tiers: [], default_tier: "standard" };
    }
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      return { ok: false, reason: "quantity must be positive finite", tiers: [], default_tier: "standard" };
    }

    const tiers: LeadTimeTierResult[] = ALL_TIERS.map((tier) => {
      const defaultCfg = DEFAULT_CONFIGS[tier];
      const override = input.configs?.[tier] ?? {};
      const cfg: LeadTimeTierConfig = { ...defaultCfg, ...override };
      const unit_price = round2(input.base_unit_price * cfg.priceMultiplier);
      const lead_time_days = Math.max(0, input.base_lead_days + cfg.leadDaysDelta);
      const cost_delta_per_part = round2(unit_price - input.base_unit_price);
      const cost_delta_pct = round2(((cfg.priceMultiplier - 1) * 100));
      return {
        tier,
        unit_price,
        total_price: round2(unit_price * input.quantity),
        lead_time_days,
        cost_delta_per_part,
        cost_delta_pct,
        rationale: cfg.rationale,
      };
    });

    tiers.sort((a, b) => a.lead_time_days - b.lead_time_days);

    return {
      ok: true,
      tiers,
      default_tier: "standard",
    };
  }

  /** Get the default config table — for UI display + operator awareness. */
  getDefaults(): Record<LeadTimeTier, LeadTimeTierConfig> {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const leadTimePricingTierEngine = new LeadTimePricingTierEngine();
export default leadTimePricingTierEngine;
