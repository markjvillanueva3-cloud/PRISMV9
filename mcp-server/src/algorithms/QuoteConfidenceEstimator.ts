/**
 * QuoteConfidenceEstimator — Business/ERP #7.3
 * Quadrature uncertainty propagation: each cost component carries an
 * uncertainty fraction; total = √(Σ(σᵢ²)) (RSS) for independent contributions.
 * Returns dollar amount + 95% CI half-width so sales can quote "$X ± $Y".
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface CostComponent {
  name: string;
  estimate_usd: number;
  /** Std-deviation as fraction of estimate, e.g. 0.10 = 10% uncertainty. */
  uncertainty_frac: number;
}

export interface QuoteConfidenceInput { components: CostComponent[]; }

export interface QuoteConfidenceResult {
  total_usd: AtomicValue;
  ci_95_half_width_usd: AtomicValue;
  per_component: Array<{ name: string; estimate_usd: number; sigma_usd: number; contribution_pct: number }>;
  largest_contributor: string;
  notes: string[];
  source: string;
}

const COMPONENT_MAX = 100;
const Z_95 = 1.96;

function av(v: number, source: string, conf: number): AtomicValue {
  return { value: v, unit: "USD", uncertainty: Math.abs(v) * 0.05, source, confidence: conf };
}
function emit(reason: string): QuoteConfidenceResult {
  return { total_usd: av(0, "invalid-input", 0), ci_95_half_width_usd: av(0, "invalid-input", 0), per_component: [], largest_contributor: "", notes: [reason], source: "QuoteConfidenceEstimator v1.0.0" };
}

export function estimate(input: QuoteConfidenceInput): QuoteConfidenceResult {
  if (!input || !Array.isArray(input.components)) return emit("missing input or components not array");
  if (input.components.length === 0) return emit("components empty");
  if (input.components.length > COMPONENT_MAX) return emit(`components exceeds ${COMPONENT_MAX}`);

  let total = 0;
  let varianceSum = 0;
  const perComponent: QuoteConfidenceResult["per_component"] = [];
  for (const c of input.components) {
    if (!c || typeof c.name !== "string") return emit("component missing name");
    if (!Number.isFinite(c.estimate_usd)) return emit(`component '${c.name}' estimate_usd not finite`);
    if (!Number.isFinite(c.uncertainty_frac) || c.uncertainty_frac < 0 || c.uncertainty_frac > 2) return emit(`component '${c.name}' uncertainty_frac outside [0, 2]`);
    if (c.estimate_usd < 0) return emit(`component '${c.name}' estimate_usd cannot be negative`);
    total += c.estimate_usd;
    const sigma = c.estimate_usd * c.uncertainty_frac;
    varianceSum += sigma * sigma;
    perComponent.push({ name: c.name, estimate_usd: c.estimate_usd, sigma_usd: sigma, contribution_pct: 0 });
  }
  const totalSigma = Math.sqrt(varianceSum);
  const ciHalf = totalSigma * Z_95;
  // Compute % contribution = sigma_i² / variance_total
  for (const pc of perComponent) {
    pc.contribution_pct = varianceSum > 0 ? (pc.sigma_usd * pc.sigma_usd / varianceSum) * 100 : 0;
  }
  let largest = "";
  let largestPct = -1;
  for (const pc of perComponent) {
    if (pc.contribution_pct > largestPct) { largest = pc.name; largestPct = pc.contribution_pct; }
  }
  const notes: string[] = [];
  notes.push(`total ${total.toFixed(0)} USD ± ${ciHalf.toFixed(0)} USD (95% CI); RSS variance ${totalSigma.toFixed(1)}`);
  if (largestPct > 50) notes.push(`'${largest}' dominates variance (${largestPct.toFixed(1)}%) — tighten that estimate to shrink CI`);
  return {
    total_usd: { value: total, unit: "USD", uncertainty: totalSigma, source: "RSS sum + Z-95", confidence: 0.85 },
    ci_95_half_width_usd: { value: ciHalf, unit: "USD", uncertainty: ciHalf * 0.10, source: "Z-95 × σ", confidence: 0.85 },
    per_component: perComponent,
    largest_contributor: largest,
    notes, source: "QuoteConfidenceEstimator v1.0.0",
  };
}

export const QuoteConfidenceEstimator = { version: "1.0.0" as const, estimate };
