/**
 * SecondaryOpsQuotePricingEngine — U-QP-SECONDARY-OPS-PRICING (Axis K)
 *
 * Operator-stated need: "add additional secondary operations like laser
 * marking, grinding, finishing, painting, hardening, honing and other
 * secondary operations" at quote time.
 *
 * Pure pricing engine — composes per-op cost rules (cycle_time, fixed_setup,
 * material multiplier, outsource pass-through). Caller picks ops from the
 * catalog; engine returns line items + total + lead-time delta.
 *
 * No I/O. Caller-supplied catalog override for shop-specific rates.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-SECONDARY-OPS-PRICING
 */

export type SecondaryOp =
  | "laser_marking"
  | "grinding"
  | "finishing"
  | "painting"
  | "hardening"
  | "honing"
  | "anodizing"
  | "passivation"
  | "tumbling"
  | "deburring"
  | "blasting";

export interface OpRule {
  /** Fixed setup cost USD per lot (regardless of qty). */
  setup_usd: number;
  /** Per-part cost USD (multiplied by qty). */
  per_part_usd: number;
  /** Optional material-cost multiplier (when op requires consumables). */
  material_pct: number;
  /** Whether op is typically outsourced (JM Die data — hardening, painting, anodizing usually outsourced). */
  outsourced: boolean;
  /** Lead-time delta in days added to base lead time. */
  lead_days_delta: number;
  /** Operator-facing description. */
  description: string;
}

const DEFAULT_CATALOG: Record<SecondaryOp, OpRule> = {
  laser_marking:  { setup_usd: 35,  per_part_usd: 0.85, material_pct: 0,  outsourced: false, lead_days_delta: 0, description: "Laser marking — part ID / logo / serialization, in-house fiber laser" },
  grinding:       { setup_usd: 80,  per_part_usd: 4.50, material_pct: 0.02, outsourced: false, lead_days_delta: 1, description: "Surface / cylindrical / centerless grinding to Ra ≤ 0.4 μm" },
  finishing:      { setup_usd: 25,  per_part_usd: 1.20, material_pct: 0,  outsourced: false, lead_days_delta: 0, description: "Hand finishing / dressing — burr removal + light polish" },
  painting:       { setup_usd: 60,  per_part_usd: 3.25, material_pct: 0.05, outsourced: true,  lead_days_delta: 5, description: "Painting / powder coat — typically outsourced (5-day round trip)" },
  hardening:      { setup_usd: 120, per_part_usd: 6.75, material_pct: 0.08, outsourced: true,  lead_days_delta: 7, description: "Heat treat / case hardening — outsourced (7-day round trip), per JM Die vendor schedule" },
  honing:         { setup_usd: 90,  per_part_usd: 5.50, material_pct: 0.01, outsourced: false, lead_days_delta: 2, description: "Honing — bore finish to Ra ≤ 0.2 μm with diamond stones" },
  anodizing:      { setup_usd: 50,  per_part_usd: 2.85, material_pct: 0.03, outsourced: true,  lead_days_delta: 6, description: "Anodizing (Type II/III) — outsourced, color-batch dependent" },
  passivation:    { setup_usd: 40,  per_part_usd: 1.50, material_pct: 0.02, outsourced: true,  lead_days_delta: 4, description: "Passivation (citric/nitric) — outsourced for stainless parts" },
  tumbling:       { setup_usd: 20,  per_part_usd: 0.65, material_pct: 0,  outsourced: false, lead_days_delta: 0, description: "Tumbling / vibratory finish — in-house, batched daily" },
  deburring:      { setup_usd: 15,  per_part_usd: 0.45, material_pct: 0,  outsourced: false, lead_days_delta: 0, description: "Manual deburring — included in finishing if not separated out" },
  blasting:       { setup_usd: 35,  per_part_usd: 1.10, material_pct: 0.01, outsourced: false, lead_days_delta: 1, description: "Bead/sand/glass blasting — uniform matte finish" },
};

export interface OpLineItem {
  op: SecondaryOp;
  setup_usd: number;
  per_part_usd: number;
  material_cost_added_usd: number;
  line_total_usd: number;
  outsourced: boolean;
  lead_days_delta: number;
  description: string;
}

export interface PriceOpsInput {
  ops: SecondaryOp[];
  quantity: number;
  base_material_cost_usd?: number;
  /** Optional catalog overrides for shop-specific rates. */
  catalog_overrides?: Partial<Record<SecondaryOp, Partial<OpRule>>>;
}

export interface PriceOpsResult {
  ok: boolean;
  reason?: string;
  line_items: OpLineItem[];
  total_setup_usd: number;
  total_per_part_usd: number;
  total_material_added_usd: number;
  total_secondary_ops_usd: number;
  total_lead_days_delta: number;
  any_outsourced: boolean;
}

export class SecondaryOpsQuotePricingEngine {
  /**
   * Price a selected set of secondary ops. Returns per-op line items + totals.
   * Outsourced ops contribute their full lead-days delta to the lead-time
   * change (vs in-house ops which can sometimes overlap with primary cycle).
   */
  priceOps(input: PriceOpsInput): PriceOpsResult {
    const empty: PriceOpsResult = {
      ok: false, line_items: [], total_setup_usd: 0, total_per_part_usd: 0,
      total_material_added_usd: 0, total_secondary_ops_usd: 0,
      total_lead_days_delta: 0, any_outsourced: false,
    };
    if (!Array.isArray(input.ops)) return { ...empty, reason: "ops must be an array" };
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) return { ...empty, reason: "quantity must be positive finite" };

    // Dedup
    const uniqueOps = [...new Set(input.ops)];
    if (uniqueOps.length === 0) {
      return { ...empty, ok: true };
    }

    const baseMaterial = Number.isFinite(input.base_material_cost_usd) && input.base_material_cost_usd! >= 0
      ? input.base_material_cost_usd!
      : 0;

    const line_items: OpLineItem[] = [];
    for (const op of uniqueOps) {
      const defaultRule = DEFAULT_CATALOG[op];
      if (!defaultRule) {
        return { ...empty, reason: `unknown secondary op: ${op}` };
      }
      const override = input.catalog_overrides?.[op] ?? {};
      const rule: OpRule = { ...defaultRule, ...override };
      const material_cost_added_usd = round2(baseMaterial * rule.material_pct);
      const line_total_usd = round2(rule.setup_usd + (rule.per_part_usd * input.quantity) + (material_cost_added_usd * input.quantity));
      line_items.push({
        op,
        setup_usd: rule.setup_usd,
        per_part_usd: rule.per_part_usd,
        material_cost_added_usd,
        line_total_usd,
        outsourced: rule.outsourced,
        lead_days_delta: rule.lead_days_delta,
        description: rule.description,
      });
    }

    const total_setup_usd = round2(line_items.reduce((s, l) => s + l.setup_usd, 0));
    const total_per_part_usd = round2(line_items.reduce((s, l) => s + l.per_part_usd, 0));
    const total_material_added_usd = round2(line_items.reduce((s, l) => s + l.material_cost_added_usd, 0));
    const total_secondary_ops_usd = round2(line_items.reduce((s, l) => s + l.line_total_usd, 0));
    // Lead-time delta: outsourced ops are sequential (sum); in-house ops take the MAX (parallel-overlap with primary).
    const outsourcedDelta = line_items.filter(l => l.outsourced).reduce((s, l) => s + l.lead_days_delta, 0);
    const inHouseDelta = line_items.filter(l => !l.outsourced).reduce((m, l) => Math.max(m, l.lead_days_delta), 0);
    const total_lead_days_delta = outsourcedDelta + inHouseDelta;
    const any_outsourced = line_items.some(l => l.outsourced);

    return {
      ok: true,
      line_items,
      total_setup_usd,
      total_per_part_usd,
      total_material_added_usd,
      total_secondary_ops_usd,
      total_lead_days_delta,
      any_outsourced,
    };
  }

  /** Return all available op types — for UI dropdown population. */
  listAvailableOps(): SecondaryOp[] {
    return Object.keys(DEFAULT_CATALOG) as SecondaryOp[];
  }

  /** Get the full default catalog — for operator UI display + rate editing. */
  getCatalog(): Record<SecondaryOp, OpRule> {
    return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
  }

  /**
   * QUOTING-SYNERGY-MS0/U-SECONDARY-OPS-PROFILE-OVERRIDE (iter14):
   * Price ops using shop-profile-supplied rate overrides instead of hardcoded JM defaults.
   *
   * The shop profile (`state/shared/shop-profiles/<id>.json`) carries an optional
   * `secondary_op_overrides` field — when present, those per-op rates override
   * the hardcoded catalog for the matching ops. Per-shop pricing without engine
   * code duplication. Caller-supplied `catalog_overrides` (e.g., one-off
   * adjustments for a single quote) take precedence over the profile.
   *
   * Resolution order (highest precedence first):
   *   1. input.catalog_overrides[op]           (one-off caller override)
   *   2. profile.secondary_op_overrides[op]    (shop-wide rate)
   *   3. DEFAULT_CATALOG[op]                   (JM Die hardcoded baseline)
   */
  async priceOpsForProfile(input: PriceOpsInput, opts: { profile_id?: string } = {}): Promise<PriceOpsResult & { profile_id: string }> {
    const { shopProfileTemplateEngine } = await import("./ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile(opts.profile_id);

    // Merge profile overrides (shop-wide) UNDER caller overrides (per-quote).
    const profileOverrides = profile.secondary_op_overrides ?? {};
    const callerOverrides = input.catalog_overrides ?? {};
    const mergedOverrides: Partial<Record<SecondaryOp, Partial<OpRule>>> = {};
    const allKeys = new Set<string>([...Object.keys(profileOverrides), ...Object.keys(callerOverrides)]);
    for (const k of allKeys) {
      const op = k as SecondaryOp;
      mergedOverrides[op] = {
        ...(profileOverrides[k] ?? {}),
        ...(callerOverrides[op] ?? {}),
      };
    }

    const result = this.priceOps({ ...input, catalog_overrides: mergedOverrides });
    return { ...result, profile_id: profile.profile_id };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const secondaryOpsQuotePricingEngine = new SecondaryOpsQuotePricingEngine();
export default secondaryOpsQuotePricingEngine;
