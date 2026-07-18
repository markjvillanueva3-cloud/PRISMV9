/**
 * CustomerLtvDcf — Business/ERP #7.7
 * Customer Lifetime Value via discounted cashflow:
 *   LTV = Σ (margin_year_t × retention_t) / (1 + discount_rate)^t
 * where retention_t = retention_rate^t (geometric decay).
 *
 * Outputs: LTV in USD, payback period years, recommended max-acquisition-cost.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface LtvInput {
  /** First-year gross margin USD from this customer (revenue minus direct cost). */
  annual_margin_usd: number;
  /** Annual retention probability [0, 1]. e.g. 0.85 = 15%/yr churn. */
  retention_rate: number;
  /** Discount rate (cost of capital). e.g. 0.10 = 10%. Range [0, 0.5]. */
  discount_rate: number;
  /** Forecast horizon years. Range [1, 30]. Default 10. */
  horizon_years?: number;
  /** Customer-acquisition cost (CAC) USD — for LTV/CAC ratio + payback. */
  acquisition_cost_usd?: number;
  /** Annual margin growth rate. Default 0. */
  margin_growth_rate?: number;
}

export interface LtvResult {
  ltv_usd: AtomicValue;
  ltv_to_cac_ratio: AtomicValue;
  payback_years: AtomicValue;
  max_acquisition_cost_usd: AtomicValue;
  per_year_breakdown: Array<{ year: number; margin_usd: number; retention: number; discounted_usd: number; cumulative_usd: number }>;
  notes: string[];
  source: string;
}

const HORIZON_DEFAULT = 10;
const HORIZON_MAX = 30;
const MARGIN_MAX = 100_000_000;
const CAC_MAX = 10_000_000;
const RETENTION_MIN = 0;
const RETENTION_MAX = 1;
const DISCOUNT_MAX = 0.5;
const LTV_CAC_HEALTHY_THRESHOLD = 3;
const PAYBACK_HEALTHY_THRESHOLD_YEARS = 1.5;

function av(v: number, unit: string, source: string, conf: number): AtomicValue {
  return { value: v, unit, uncertainty: Math.abs(v) * 0.10, source, confidence: conf };
}
function emit(reason: string): LtvResult {
  const z = av(0, "USD", "invalid-input", 0);
  return { ltv_usd: z, ltv_to_cac_ratio: { ...z, unit: "ratio" }, payback_years: { ...z, unit: "years" }, max_acquisition_cost_usd: z, per_year_breakdown: [], notes: [reason], source: "CustomerLtvDcf v1.0.0" };
}

export function compute(input: LtvInput): LtvResult {
  if (!input) return emit("missing input");
  if (!Number.isFinite(input.annual_margin_usd) || input.annual_margin_usd < 0 || input.annual_margin_usd > MARGIN_MAX) return emit(`annual_margin_usd outside [0, ${MARGIN_MAX}]`);
  if (!Number.isFinite(input.retention_rate) || input.retention_rate < RETENTION_MIN || input.retention_rate > RETENTION_MAX) return emit(`retention_rate outside [${RETENTION_MIN}, ${RETENTION_MAX}]`);
  if (!Number.isFinite(input.discount_rate) || input.discount_rate < 0 || input.discount_rate > DISCOUNT_MAX) return emit(`discount_rate outside [0, ${DISCOUNT_MAX}]`);
  const horizon = Number.isFinite(input.horizon_years) ? Math.floor(input.horizon_years!) : HORIZON_DEFAULT;
  if (horizon < 1 || horizon > HORIZON_MAX) return emit(`horizon_years outside [1, ${HORIZON_MAX}]`);
  const cac = Number.isFinite(input.acquisition_cost_usd) ? input.acquisition_cost_usd! : 0;
  if (cac < 0 || cac > CAC_MAX) return emit(`acquisition_cost_usd outside [0, ${CAC_MAX}]`);
  const growth = Number.isFinite(input.margin_growth_rate) ? input.margin_growth_rate! : 0;

  let ltv = 0;
  let payback = -1;
  const breakdown: LtvResult["per_year_breakdown"] = [];
  let cumulative = -cac;     // start negative by CAC; payback = when cumulative crosses 0
  for (let t = 1; t <= horizon; t++) {
    const margin_t = input.annual_margin_usd * Math.pow(1 + growth, t - 1);
    const retention_t = Math.pow(input.retention_rate, t - 1);   // year-1 = full margin (no decay yet)
    const discounted = (margin_t * retention_t) / Math.pow(1 + input.discount_rate, t);
    ltv += discounted;
    cumulative += discounted;
    if (payback < 0 && cumulative >= 0) payback = t - (cumulative - discounted < 0 && discounted > 0 ? (cumulative / discounted) : 0);
    breakdown.push({ year: t, margin_usd: margin_t, retention: retention_t, discounted_usd: discounted, cumulative_usd: cumulative });
  }

  const ratio = cac > 0 ? ltv / cac : Infinity;
  const ratioVal = Number.isFinite(ratio) ? ratio : 0;
  const maxCac = ltv / LTV_CAC_HEALTHY_THRESHOLD;

  const notes: string[] = [];
  notes.push(`LTV ${ltv.toFixed(0)} USD over ${horizon}y at ${(input.discount_rate * 100).toFixed(1)}% discount × ${(input.retention_rate * 100).toFixed(1)}% retention`);
  if (cac > 0 && ratio < LTV_CAC_HEALTHY_THRESHOLD) notes.push(`LTV/CAC ${ratio.toFixed(2)} below healthy threshold ${LTV_CAC_HEALTHY_THRESHOLD} — acquisition cost too high vs lifetime value`);
  if (cac > 0 && payback > PAYBACK_HEALTHY_THRESHOLD_YEARS) notes.push(`payback ${payback.toFixed(2)}y exceeds ${PAYBACK_HEALTHY_THRESHOLD_YEARS}y healthy ceiling — improve retention or margin`);

  return {
    ltv_usd: av(ltv, "USD", "DCF over horizon", 0.80),
    ltv_to_cac_ratio: av(ratioVal, "ratio", "LTV/CAC", cac > 0 ? 0.85 : 0),
    payback_years: av(payback >= 0 ? payback : horizon + 1, "years", "cumulative cashflow zero-crossing", payback >= 0 ? 0.80 : 0.50),
    max_acquisition_cost_usd: av(maxCac, "USD", `LTV / ${LTV_CAC_HEALTHY_THRESHOLD} healthy LTV:CAC`, 0.85),
    per_year_breakdown: breakdown,
    notes, source: "CustomerLtvDcf v1.0.0",
  };
}

export const CustomerLtvDcf = { version: "1.0.0" as const, compute };
