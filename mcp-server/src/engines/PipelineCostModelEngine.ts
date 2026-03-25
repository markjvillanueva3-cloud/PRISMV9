/**
 * PipelineCostModelEngine — Total Cost Model at Every Pipeline Stage
 *
 * Computes cost-per-part with full breakdown across 10 cost components:
 *   1. Material      — stock_volume × material_cost_per_cm3 + markup
 *   2. Machining     — cycle_time_min × machine_rate_per_min
 *   3. Tool wear     — Σ(tool_price / parts_per_tool) for each tool
 *   4. Setup         — setup_time_min × labor_rate_per_min / batch_size (amortized)
 *   5. Programming   — programming_hours × programming_rate / batch_size (amortized)
 *   6. Energy        — power_kw × cycle_time_hours × energy_rate_per_kwh
 *   7. Overhead      — (material+machining+tool+setup+programming) × overhead_rate
 *   8. Scrap risk    — total_cost × P(scrap) where P(scrap) derived from Cpk
 *   9. Secondary ops — from SecondaryOpsEngine if applicable
 *  10. Inspection    — inspection_time_min × labor_rate_per_min / sample_size
 *
 * Methods:
 *   computeCostPerPart(input)        → CostBreakdown
 *   compareCosts(options[])          → ranked CostComparison[]
 *   sensitivityAnalysis(input)       → SensitivityResult[]
 *   breakEvenQuantity(...)           → number
 *
 * Default rates (user-overridable):
 *   Machine: $85/hr (3-axis), $125/hr (5-axis), $95/hr (lathe)
 *   Labor:   $45/hr
 *   Programming: $75/hr
 *   Energy:  $0.12/kWh
 *   Overhead: 35%
 *
 * @engine PipelineCostModelEngine
 * @shortcode E1095
 * @dispatcher camDispatcher
 * @actions pipeline_cost_compute, pipeline_cost_compare, pipeline_cost_sensitivity, pipeline_cost_breakeven
 * @milestone CAMX-MS13
 */

// ─── Default rates ────────────────────────────────────────────────────────────

export const DEFAULT_RATES = {
  machine_rate_3axis_per_hr:  85,
  machine_rate_5axis_per_hr:  125,
  machine_rate_lathe_per_hr:  95,
  labor_rate_per_hr:          45,
  programming_rate_per_hr:    75,
  energy_rate_per_kwh:        0.12,
  overhead_rate:              0.35,   // 35%
  material_markup:            0.10,   // 10% material markup
} as const;

// ─── Input / output types ─────────────────────────────────────────────────────

export type MachineType = "3axis" | "5axis" | "lathe" | "custom";

export interface ToolEntry {
  /** Tool purchase price in USD. */
  tool_price_usd: number;
  /** Expected parts per tool before replacement/regrind. */
  parts_per_tool: number;
  /** Optional tool label for reporting. */
  label?: string;
}

export interface SecondaryOpEntry {
  /** Operation id matching SecondaryOpsEngine catalog, or free-form label. */
  operation_id: string;
  /** Override per-part cost if not using catalog lookup. */
  cost_per_part_override?: number;
  quantity?: number;
}

export interface PipelineCostInput {
  // ── Material ──────────────────────────────────────────────
  /** Stock volume in cm³ (raw billet/blank). */
  stock_volume_cm3: number;
  /** Material cost per cm³ in USD. Provide directly or use material_id for lookup. */
  material_cost_per_cm3?: number;
  /** Material key for MarketMaterialPricingEngine lookup (e.g. "aluminum_6061"). */
  material_id?: string;
  /** Stock form for pricing lookup (e.g. "bar", "plate"). */
  material_form?: string;
  /** Material markup fraction (default 0.10 = 10%). */
  material_markup?: number;
  /** Material density kg/cm³ (used if material_id not found). */
  material_density_kg_cm3?: number;

  // ── Machine ───────────────────────────────────────────────
  machine_type?: MachineType;
  /** Override machine rate USD/hr regardless of machine_type. */
  machine_rate_per_hr?: number;
  /** Cycle time in minutes (machining only, excluding setup). */
  cycle_time_min: number;

  // ── Tooling ───────────────────────────────────────────────
  /** Array of tools consumed during the operation. */
  tools?: ToolEntry[];

  // ── Setup ─────────────────────────────────────────────────
  /** Total setup time in minutes (amortized across batch). */
  setup_time_min?: number;
  /** Batch quantity for amortizing setup & programming. */
  batch_size?: number;

  // ── Programming ───────────────────────────────────────────
  /** CAM programming hours (amortized across batch). */
  programming_hours?: number;
  /** Override programming rate USD/hr (default $75). */
  programming_rate_per_hr?: number;

  // ── Energy ────────────────────────────────────────────────
  /** Machine power draw in kW. */
  power_kw?: number;
  /** Energy rate USD/kWh (default $0.12). */
  energy_rate_per_kwh?: number;

  // ── Overhead ──────────────────────────────────────────────
  /** Overhead rate as fraction (default 0.35). */
  overhead_rate?: number;

  // ── Scrap risk ────────────────────────────────────────────
  /** Process Cpk — used to estimate P(scrap). */
  cpk?: number;
  /** Override P(scrap) directly (0–1). Overrides cpk. */
  scrap_probability?: number;

  // ── Secondary ops ─────────────────────────────────────────
  /** Secondary operations to include. */
  secondary_ops?: SecondaryOpEntry[];

  // ── Inspection ────────────────────────────────────────────
  /** Inspection time in minutes per inspected part. */
  inspection_time_min?: number;
  /** Sample size (1-of-N inspected). E.g. 10 = inspect every 10th part. */
  inspection_sample_size?: number;

  // ── Labor ─────────────────────────────────────────────────
  /** Labor rate USD/hr (default $45). */
  labor_rate_per_hr?: number;

  // ── Optional label ────────────────────────────────────────
  label?: string;
}

export interface CostLineItem {
  component: string;
  cost_usd: number;
  pct_of_total: number;
  notes: string;
}

export interface CostBreakdown {
  label: string;
  // Individual components (per part)
  material_cost:    number;
  machining_cost:   number;
  tool_wear_cost:   number;
  setup_cost:       number;
  programming_cost: number;
  energy_cost:      number;
  overhead_cost:    number;
  scrap_risk_cost:  number;
  secondary_ops_cost: number;
  inspection_cost:  number;
  // Totals
  subtotal_before_overhead: number;
  total_per_part:   number;
  total_batch:      number;
  // Metadata
  batch_size:       number;
  scrap_probability: number;
  line_items:       CostLineItem[];
  cost_drivers:     CostLineItem[];   // top 3 sorted by pct
  assumptions:      string[];
}

export interface CostComparison {
  rank:          number;
  label:         string;
  total_per_part: number;
  savings_vs_baseline: number;
  savings_pct:   number;
  breakdown:     CostBreakdown;
}

export interface SensitivityResult {
  driver:            string;
  base_value:        number | string;
  delta_applied:     string;
  cost_before:       number;
  cost_after:        number;
  cost_delta:        number;
  sensitivity_pct:   number;
  impact_rank:       number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Estimate P(scrap) from Cpk using complementary error function approximation.
 *
 * A process with Cpk=1.33 (4-sigma) has ~63 ppm defect rate → P(scrap)≈0.000063.
 * Formula: P(defect) = erfc(Cpk × √2) where erfc(x) ≈ using rational approximation.
 * Both tails: P(scrap) = 2 × erfc_tail(Cpk × √2 / 2) but for Cpk the one-tail
 * approximation P = erfc(Cpk × √(9/2) / 3) is commonly used.
 *
 * We use: P(scrap) = erfc(Cpk × sqrt(4.5)) simplified as:
 *   For Cpk ≥ 0: P ≈ exp(-4.5 × Cpk²) / (Cpk × sqrt(9π)) clamped [0,1]
 * Reference: Montgomery, "Introduction to Statistical Quality Control", 8th ed.
 */
function cpkToScrapProbability(cpk: number): number {
  if (cpk <= 0) return 1.0;
  if (cpk >= 3.0) return 1e-9; // near-zero at 6-sigma

  // Rational approximation of erfc for the tail probability
  // P(scrap) ≈ erfc(Cpk * sqrt(4.5))
  // erfc(x) approximated with Abramowitz & Stegun formula 7.1.26
  const x = cpk * Math.sqrt(4.5);
  const t = 1 / (1 + 0.3275911 * x);
  const erfc = (0.254829592 * t - 0.284496736 * t * t + 1.421413741 * t * t * t
    - 1.453152027 * t * t * t * t + 1.061405429 * t * t * t * t * t)
    * Math.exp(-x * x);

  return Math.max(0, Math.min(1, erfc));
}

function machineRateFromType(type: MachineType | undefined): number {
  switch (type) {
    case "5axis":  return DEFAULT_RATES.machine_rate_5axis_per_hr;
    case "lathe":  return DEFAULT_RATES.machine_rate_lathe_per_hr;
    case "3axis":
    case "custom":
    default:       return DEFAULT_RATES.machine_rate_3axis_per_hr;
  }
}

// ─── Engine class ─────────────────────────────────────────────────────────────

class PipelineCostModelEngine {

  /**
   * Compute full cost-per-part breakdown from pipeline cost inputs.
   * All 10 cost components are calculated; zero-value components are included
   * with explanatory notes.
   */
  computeCostPerPart(input: PipelineCostInput): CostBreakdown {
    const label = input.label ?? "Part";
    const assumptions: string[] = [];

    // ── Rates resolution ──────────────────────────────────────────────────────
    const laborRatePerMin   = (input.labor_rate_per_hr ?? DEFAULT_RATES.labor_rate_per_hr) / 60;
    const machineRatePerMin = (input.machine_rate_per_hr ?? machineRateFromType(input.machine_type)) / 60;
    const programmingRate   = input.programming_rate_per_hr ?? DEFAULT_RATES.programming_rate_per_hr;
    const energyRate        = input.energy_rate_per_kwh ?? DEFAULT_RATES.energy_rate_per_kwh;
    const overheadRate      = input.overhead_rate ?? DEFAULT_RATES.overhead_rate;
    const materialMarkup    = input.material_markup ?? DEFAULT_RATES.material_markup;
    const batchSize         = Math.max(1, input.batch_size ?? 1);

    if (!input.machine_rate_per_hr) {
      assumptions.push(`Machine rate: $${(machineRatePerMin * 60).toFixed(0)}/hr (${input.machine_type ?? "3-axis default"})`);
    }
    if (!input.labor_rate_per_hr)      assumptions.push(`Labor rate: $${DEFAULT_RATES.labor_rate_per_hr}/hr (default)`);
    if (!input.programming_rate_per_hr) assumptions.push(`Programming rate: $${DEFAULT_RATES.programming_rate_per_hr}/hr (default)`);
    if (!input.energy_rate_per_kwh)     assumptions.push(`Energy rate: $${DEFAULT_RATES.energy_rate_per_kwh}/kWh (default)`);
    if (!input.overhead_rate)           assumptions.push(`Overhead: ${(DEFAULT_RATES.overhead_rate * 100).toFixed(0)}% (default)`);

    // ── 1. Material cost ──────────────────────────────────────────────────────
    let materialCostPerCm3 = input.material_cost_per_cm3 ?? 0;
    if (!materialCostPerCm3 && input.material_id) {
      // Estimate using density and base price — caller should use MarketMaterialPricingEngine
      // for accurate pricing. Fallback heuristic:
      const densityKg = input.material_density_kg_cm3 ?? 0.0027; // default Al density
      materialCostPerCm3 = densityKg * 6.50; // fallback $/kg × density
      assumptions.push(`Material cost estimated from density (${input.material_id} fallback — use MarketMaterialPricingEngine for accuracy)`);
    }
    const materialCost = round2(input.stock_volume_cm3 * materialCostPerCm3 * (1 + materialMarkup));
    if (materialMarkup > 0) assumptions.push(`Material markup: ${(materialMarkup * 100).toFixed(0)}%`);

    // ── 2. Machining cost ─────────────────────────────────────────────────────
    const machiningCost = round2(input.cycle_time_min * machineRatePerMin);

    // ── 3. Tool wear cost ─────────────────────────────────────────────────────
    const tools = input.tools ?? [];
    const toolWearCost = round2(
      tools.reduce((sum, t) => sum + (t.tool_price_usd / Math.max(1, t.parts_per_tool)), 0)
    );
    if (tools.length === 0) assumptions.push("No tool entries provided — tool wear cost = $0");

    // ── 4. Setup cost (amortized) ─────────────────────────────────────────────
    const setupTimeMin = input.setup_time_min ?? 0;
    const setupCost = round2((setupTimeMin * laborRatePerMin) / batchSize);
    if (setupTimeMin === 0) assumptions.push("Setup time = 0 — setup cost omitted");

    // ── 5. Programming cost (amortized) ──────────────────────────────────────
    const programmingHours = input.programming_hours ?? 0;
    const programmingCost  = round2((programmingHours * programmingRate) / batchSize);
    if (programmingHours === 0) assumptions.push("Programming hours = 0 — programming cost omitted");

    // ── 6. Energy cost ────────────────────────────────────────────────────────
    const powerKw = input.power_kw ?? 0;
    const cycleTimeHours = input.cycle_time_min / 60;
    const energyCost = round2(powerKw * cycleTimeHours * energyRate);
    if (powerKw === 0) assumptions.push("Power kW = 0 — energy cost omitted");

    // ── 7. Overhead (on direct costs excl. energy+scrap+inspection) ───────────
    const subtotalForOverhead = materialCost + machiningCost + toolWearCost + setupCost + programmingCost;
    const overheadCost = round2(subtotalForOverhead * overheadRate);

    // ── 8. Scrap risk ─────────────────────────────────────────────────────────
    let pScrap: number;
    if (input.scrap_probability !== undefined) {
      pScrap = Math.max(0, Math.min(1, input.scrap_probability));
      assumptions.push(`P(scrap) = ${(pScrap * 100).toFixed(4)}% (user override)`);
    } else if (input.cpk !== undefined) {
      pScrap = cpkToScrapProbability(input.cpk);
      assumptions.push(`P(scrap) = ${(pScrap * 100).toFixed(4)}% from Cpk=${input.cpk.toFixed(2)}`);
    } else {
      pScrap = 0;
      assumptions.push("No Cpk or scrap_probability — scrap risk = $0");
    }
    // Subtotal before scrap to compute scrap cost on whole part
    const priorSubtotal = subtotalForOverhead + overheadCost + energyCost;
    const scrapRiskCost = round2(priorSubtotal * pScrap);

    // ── 9. Secondary ops ──────────────────────────────────────────────────────
    const secOps = input.secondary_ops ?? [];
    let secondaryOpsCost = 0;
    for (const op of secOps) {
      if (op.cost_per_part_override !== undefined) {
        secondaryOpsCost += op.cost_per_part_override;
      } else {
        // Caller should pre-resolve costs using SecondaryOpsEngine
        assumptions.push(`Secondary op '${op.operation_id}': no cost override — $0 (use SecondaryOpsEngine to resolve)`);
      }
    }
    secondaryOpsCost = round2(secondaryOpsCost);

    // ── 10. Inspection ────────────────────────────────────────────────────────
    const inspectionTimeMin  = input.inspection_time_min ?? 0;
    const inspectionSampleSize = Math.max(1, input.inspection_sample_size ?? 1);
    const inspectionCost = round2((inspectionTimeMin * laborRatePerMin) / inspectionSampleSize);
    if (inspectionTimeMin === 0) assumptions.push("Inspection time = 0 — inspection cost omitted");

    // ── Totals ────────────────────────────────────────────────────────────────
    const subtotalBeforeOverhead = round2(
      materialCost + machiningCost + toolWearCost + setupCost + programmingCost
    );
    const totalPerPart = round2(
      materialCost + machiningCost + toolWearCost + setupCost + programmingCost
      + energyCost + overheadCost + scrapRiskCost + secondaryOpsCost + inspectionCost
    );
    const totalBatch = round2(totalPerPart * batchSize);

    // ── Line items ────────────────────────────────────────────────────────────
    const lineItems: CostLineItem[] = [
      { component: "Material",       cost_usd: materialCost,      pct_of_total: totalPerPart > 0 ? round2(materialCost / totalPerPart * 100) : 0,      notes: `${input.stock_volume_cm3} cm³ × $${materialCostPerCm3.toFixed(4)}/cm³ + ${(materialMarkup * 100).toFixed(0)}% markup` },
      { component: "Machining",      cost_usd: machiningCost,     pct_of_total: totalPerPart > 0 ? round2(machiningCost / totalPerPart * 100) : 0,     notes: `${input.cycle_time_min} min × $${(machineRatePerMin * 60).toFixed(2)}/hr ÷ 60` },
      { component: "Tool Wear",      cost_usd: toolWearCost,      pct_of_total: totalPerPart > 0 ? round2(toolWearCost / totalPerPart * 100) : 0,      notes: `${tools.length} tool(s) — Σ(price/life)` },
      { component: "Setup",          cost_usd: setupCost,         pct_of_total: totalPerPart > 0 ? round2(setupCost / totalPerPart * 100) : 0,         notes: `${setupTimeMin} min setup ÷ batch ${batchSize}` },
      { component: "Programming",    cost_usd: programmingCost,   pct_of_total: totalPerPart > 0 ? round2(programmingCost / totalPerPart * 100) : 0,   notes: `${programmingHours}h × $${programmingRate}/hr ÷ batch ${batchSize}` },
      { component: "Energy",         cost_usd: energyCost,        pct_of_total: totalPerPart > 0 ? round2(energyCost / totalPerPart * 100) : 0,        notes: `${powerKw} kW × ${cycleTimeHours.toFixed(3)}h × $${energyRate}/kWh` },
      { component: "Overhead",       cost_usd: overheadCost,      pct_of_total: totalPerPart > 0 ? round2(overheadCost / totalPerPart * 100) : 0,      notes: `${(overheadRate * 100).toFixed(0)}% on direct costs` },
      { component: "Scrap Risk",     cost_usd: scrapRiskCost,     pct_of_total: totalPerPart > 0 ? round2(scrapRiskCost / totalPerPart * 100) : 0,     notes: `P(scrap)=${(pScrap * 100).toFixed(4)}%` },
      { component: "Secondary Ops",  cost_usd: secondaryOpsCost,  pct_of_total: totalPerPart > 0 ? round2(secondaryOpsCost / totalPerPart * 100) : 0,  notes: `${secOps.length} operation(s)` },
      { component: "Inspection",     cost_usd: inspectionCost,    pct_of_total: totalPerPart > 0 ? round2(inspectionCost / totalPerPart * 100) : 0,    notes: `${inspectionTimeMin} min ÷ sample size ${inspectionSampleSize}` },
    ];

    const costDrivers = [...lineItems]
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, 3);

    return {
      label,
      material_cost:        materialCost,
      machining_cost:       machiningCost,
      tool_wear_cost:       toolWearCost,
      setup_cost:           setupCost,
      programming_cost:     programmingCost,
      energy_cost:          energyCost,
      overhead_cost:        overheadCost,
      scrap_risk_cost:      scrapRiskCost,
      secondary_ops_cost:   secondaryOpsCost,
      inspection_cost:      inspectionCost,
      subtotal_before_overhead: subtotalBeforeOverhead,
      total_per_part:       totalPerPart,
      total_batch:          totalBatch,
      batch_size:           batchSize,
      scrap_probability:    pScrap,
      line_items:           lineItems,
      cost_drivers:         costDrivers,
      assumptions,
    };
  }

  /**
   * Compare multiple manufacturing options, ranked by total cost per part.
   * The first option is used as the baseline for savings calculation.
   */
  compareCosts(options: PipelineCostInput[]): CostComparison[] {
    if (options.length === 0) return [];

    const breakdowns = options.map((opt) => this.computeCostPerPart(opt));
    const baseline = breakdowns[0].total_per_part;

    const comparisons: CostComparison[] = breakdowns.map((bd, i) => ({
      rank:                0,   // set after sort
      label:               bd.label,
      total_per_part:      bd.total_per_part,
      savings_vs_baseline: round2(baseline - bd.total_per_part),
      savings_pct:         baseline > 0 ? round2((baseline - bd.total_per_part) / baseline * 100) : 0,
      breakdown:           bd,
    }));

    comparisons.sort((a, b) => a.total_per_part - b.total_per_part);
    comparisons.forEach((c, i) => (c.rank = i + 1));

    return comparisons;
  }

  /**
   * Sensitivity analysis — perturb each numeric input by ±10% and report
   * the resulting cost change. Drivers are ranked by absolute impact.
   *
   * Only inputs with nonzero base values are perturbed.
   */
  sensitivityAnalysis(input: PipelineCostInput): SensitivityResult[] {
    const base = this.computeCostPerPart(input).total_per_part;
    if (base === 0) return [];

    const deltas: { key: keyof PipelineCostInput; label: string; factor: number }[] = [
      { key: "stock_volume_cm3",      label: "Stock Volume (cm³)",         factor: 0.10 },
      { key: "material_cost_per_cm3", label: "Material Cost/cm³",          factor: 0.10 },
      { key: "cycle_time_min",        label: "Cycle Time (min)",           factor: 0.10 },
      { key: "machine_rate_per_hr",   label: "Machine Rate ($/hr)",        factor: 0.10 },
      { key: "setup_time_min",        label: "Setup Time (min)",           factor: 0.10 },
      { key: "batch_size",            label: "Batch Size",                 factor: -0.10 }, // more = cheaper
      { key: "programming_hours",     label: "Programming Hours",          factor: 0.10 },
      { key: "power_kw",              label: "Power (kW)",                 factor: 0.10 },
      { key: "overhead_rate",         label: "Overhead Rate",              factor: 0.10 },
      { key: "cpk",                   label: "Cpk (process capability)",   factor: -0.10 }, // higher Cpk = less scrap
    ];

    const results: SensitivityResult[] = [];

    for (const d of deltas) {
      const baseVal = input[d.key];
      if (baseVal === undefined || baseVal === null || baseVal === 0) continue;
      if (typeof baseVal !== "number") continue;

      const newVal = baseVal * (1 + d.factor);
      const perturbed = { ...input, [d.key]: newVal };
      const perturbedCost = this.computeCostPerPart(perturbed).total_per_part;
      const delta = round2(perturbedCost - base);

      results.push({
        driver:          d.label,
        base_value:      baseVal,
        delta_applied:   `${d.factor > 0 ? "+" : ""}${(d.factor * 100).toFixed(0)}%`,
        cost_before:     base,
        cost_after:      round2(perturbedCost),
        cost_delta:      delta,
        sensitivity_pct: round2(Math.abs(delta) / base * 100),
        impact_rank:     0,  // set after sort
      });
    }

    results.sort((a, b) => Math.abs(b.cost_delta) - Math.abs(a.cost_delta));
    results.forEach((r, i) => (r.impact_rank = i + 1));

    return results;
  }

  /**
   * Break-even quantity — how many parts must be produced for the total
   * revenue to exceed fixed + variable costs.
   *
   * Formula: N = fixed_setup_cost / (target_price - per_part_variable_cost)
   *
   * Returns Infinity if target_price <= per_part_cost (never breaks even).
   */
  breakEvenQuantity(
    setupCostUsd: number,
    perPartVariableCost: number,
    targetPricePerPart: number,
  ): {
    break_even_qty:      number;
    margin_per_part:     number;
    target_price:        number;
    per_part_cost:       number;
    setup_cost:          number;
    feasible:            boolean;
    note:                string;
  } {
    const margin = targetPricePerPart - perPartVariableCost;
    const feasible = margin > 0;
    const qty = feasible ? Math.ceil(setupCostUsd / margin) : Infinity;

    return {
      break_even_qty:  feasible ? qty : -1,
      margin_per_part: round2(margin),
      target_price:    round2(targetPricePerPart),
      per_part_cost:   round2(perPartVariableCost),
      setup_cost:      round2(setupCostUsd),
      feasible,
      note: feasible
        ? `Produce ${qty} parts to recover $${setupCostUsd.toFixed(2)} setup cost`
        : `Target price $${targetPricePerPart.toFixed(2)} ≤ variable cost $${perPartVariableCost.toFixed(2)} — break-even impossible`,
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const pipelineCostModelEngine = new PipelineCostModelEngine();
export { PipelineCostModelEngine };
