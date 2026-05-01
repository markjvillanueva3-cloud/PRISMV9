/**
 * MultiProcessQuoteEngine — Unified Multi-Process Quote Combiner
 *
 * Combines outputs from all process-specific quoting engines into a single
 * unified quote for parts requiring multiple manufacturing processes.
 * E.g.: CNC machined body + sheet metal bracket + welded assembly + anodize.
 *
 * @engine MultiProcessQuoteEngine
 * @dispatcher businessDispatcher
 * @actions multi_process_quote, multi_process_estimate
 */

export interface ProcessStep {
  id: string;                       // unique step identifier
  process: "cnc_machining" | "sheet_metal" | "additive" | "injection_mold" | "casting" | "welding" | "secondary_ops";
  description: string;
  // Pre-computed costs from individual engines (or inline estimates)
  unit_cost?: number;               // per-part cost from process engine
  tooling_cost?: number;            // one-time NRE/tooling
  setup_cost?: number;              // per-batch setup
  lead_time_days?: number;          // process lead time
  // For inline estimation (if engine output not available)
  estimated_hours?: number;         // process hours per part
  machine_rate_hr?: number;         // $/hr for this process
  material_cost?: number;           // raw material for this step
  // Dependencies
  depends_on?: string[];            // step IDs that must complete first
  // Quantity
  quantity?: number;                // override if different from main qty (e.g., nested parts)
}

export interface MultiProcessQuoteInput {
  project_name?: string;
  part_name?: string;
  steps: ProcessStep[];
  quantity: number;
  markup_pct?: number;              // default 25%
  rush?: boolean;                   // rush multiplier
  shipping_cost?: number;           // flat shipping
  packaging_cost_per_unit?: number;
  engineering_hours?: number;       // NRE engineering time
  engineering_rate_hr?: number;     // default $95/hr
}

export interface MultiProcessQuoteResult {
  project_name: string;
  steps: Array<{
    id: string;
    process: string;
    description: string;
    unit_cost: number;
    tooling_cost: number;
    setup_cost: number;
    lead_time_days: number;
    subtotal_per_part: number;
  }>;
  summary: {
    total_unit_cost: number;
    total_tooling: number;
    total_setup: number;
    engineering_nre: number;
    shipping: number;
    packaging: number;
    overhead: number;
    subtotal_per_part: number;
    amortized_nre_per_part: number;
    cost_per_part: number;
    price_per_part: number;
    total_price: number;
    margin_pct: number;
  };
  schedule: {
    critical_path_days: number;
    parallel_paths: string[][];
    total_lead_days: number;
  };
  warnings: string[];
  price_breaks?: Array<{ qty: number; price_per_part: number }>;
}

// ── Default rates for inline estimation ──
const DEFAULT_RATES: Record<string, number> = {
  cnc_machining: 85,
  sheet_metal: 65,
  additive: 45,
  injection_mold: 55,
  casting: 50,
  welding: 55,
  secondary_ops: 40,
};

export class MultiProcessQuoteEngine {
  quote(input: MultiProcessQuoteInput): MultiProcessQuoteResult {
    const markup = (input.markup_pct ?? 25) / 100;
    const rushMult = input.rush ? 1.35 : 1.0;
    const qty = input.quantity;
    const warnings: string[] = [];

    // ── Process each step ──
    const steps = input.steps.map(step => {
      let unitCost = step.unit_cost ?? 0;
      const toolingCost = step.tooling_cost ?? 0;
      const setupCost = step.setup_cost ?? 0;
      const leadDays = step.lead_time_days ?? 5;

      // Inline estimation if no pre-computed cost
      if (!step.unit_cost && step.estimated_hours) {
        const rate = step.machine_rate_hr ?? DEFAULT_RATES[step.process] ?? 60;
        unitCost = step.estimated_hours * rate + (step.material_cost ?? 0);
      }

      return {
        id: step.id,
        process: step.process,
        description: step.description,
        unit_cost: Math.round(unitCost * 100) / 100,
        tooling_cost: Math.round(toolingCost),
        setup_cost: Math.round(setupCost * 100) / 100,
        lead_time_days: leadDays,
        subtotal_per_part: Math.round((unitCost + setupCost / qty) * 100) / 100,
        depends_on: step.depends_on ?? [],
      };
    });

    // ── Totals ──
    const totalUnitCost = steps.reduce((s, st) => s + st.unit_cost, 0);
    const totalTooling = steps.reduce((s, st) => s + st.tooling_cost, 0);
    const totalSetup = steps.reduce((s, st) => s + st.setup_cost, 0);
    const engHours = input.engineering_hours ?? 0;
    const engRate = input.engineering_rate_hr ?? 95;
    const engNRE = engHours * engRate;
    const shipping = input.shipping_cost ?? 0;
    const packaging = (input.packaging_cost_per_unit ?? 0) * qty;
    const overhead = totalUnitCost * 0.12; // 12% overhead on direct costs

    const totalNRE = totalTooling + engNRE;
    const amortizedNRE = totalNRE / qty;
    const costPerPart = totalUnitCost + totalSetup / qty + overhead + (input.packaging_cost_per_unit ?? 0);
    const pricePerPart = (costPerPart + amortizedNRE) * (1 + markup) * rushMult;
    const totalPrice = pricePerPart * qty + shipping;

    // ── Schedule: critical path via topological sort ──
    const schedule = this._computeSchedule(steps);

    // ── Warnings ──
    if (steps.length > 8) warnings.push("Complex multi-process job (>8 steps) — verify process sequence carefully");
    if (totalTooling > 50000) warnings.push(`High tooling NRE ($${totalTooling.toLocaleString()}) — confirm volume justifies investment`);
    if (schedule.critical_path_days > 60) warnings.push("Lead time >60 days — consider expediting critical path steps");
    if (input.rush) warnings.push("Rush order: 35% premium applied");

    // ── Price breaks ──
    const breakQtys = [10, 50, 100, 500, 1000, 5000].filter(q => q !== qty && q > qty * 0.3);
    const priceBreaks = breakQtys.map(q => {
      const amort = totalNRE / q;
      const perPart = (totalUnitCost + totalSetup / q + overhead + (input.packaging_cost_per_unit ?? 0) + amort) * (1 + markup);
      return { qty: q, price_per_part: Math.round(perPart * 100) / 100 };
    });

    return {
      project_name: input.project_name ?? input.part_name ?? "Multi-Process Quote",
      steps: steps.map(({ depends_on: _d, ...rest }) => rest),
      summary: {
        total_unit_cost: Math.round(totalUnitCost * 100) / 100,
        total_tooling: Math.round(totalTooling),
        total_setup: Math.round(totalSetup * 100) / 100,
        engineering_nre: Math.round(engNRE),
        shipping: Math.round(shipping * 100) / 100,
        packaging: Math.round(packaging * 100) / 100,
        overhead: Math.round(overhead * 100) / 100,
        subtotal_per_part: Math.round((totalUnitCost + totalSetup / qty + overhead) * 100) / 100,
        amortized_nre_per_part: Math.round(amortizedNRE * 100) / 100,
        cost_per_part: Math.round(costPerPart * 100) / 100,
        price_per_part: Math.round(pricePerPart * 100) / 100,
        total_price: Math.round(totalPrice),
        margin_pct: Math.round(markup * 100),
      },
      schedule,
      warnings,
      price_breaks: priceBreaks.length > 0 ? priceBreaks : undefined,
    };
  }

  /** Quick estimate without pre-computed engine outputs. */
  estimate(input: {
    steps: Array<{
      process: string;
      hours: number;
      material_cost?: number;
      tooling_cost?: number;
      lead_days?: number;
    }>;
    quantity: number;
    markup_pct?: number;
  }): { cost_per_part: number; price_per_part: number; total_price: number; lead_days: number } {
    const markup = (input.markup_pct ?? 25) / 100;
    let totalCost = 0;
    let totalTooling = 0;
    let maxLead = 0;

    for (const step of input.steps) {
      const rate = DEFAULT_RATES[step.process] ?? 60;
      totalCost += step.hours * rate + (step.material_cost ?? 0);
      totalTooling += step.tooling_cost ?? 0;
      maxLead = Math.max(maxLead, step.lead_days ?? 5);
    }

    const costPerPart = totalCost + totalTooling / input.quantity;
    const pricePerPart = costPerPart * (1 + markup);

    return {
      cost_per_part: Math.round(costPerPart * 100) / 100,
      price_per_part: Math.round(pricePerPart * 100) / 100,
      total_price: Math.round(pricePerPart * input.quantity),
      lead_days: maxLead,
    };
  }

  private _computeSchedule(
    steps: Array<{ id: string; lead_time_days: number; depends_on: string[] }>,
  ): { critical_path_days: number; parallel_paths: string[][]; total_lead_days: number } {
    // Build adjacency and compute earliest start/finish
    const earliest = new Map<string, number>();
    const finish = new Map<string, number>();

    // Topological order
    const visited = new Set<string>();
    const order: string[] = [];
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const step = stepMap.get(id);
      if (!step) return;
      for (const dep of step.depends_on) visit(dep);
      order.push(id);
    };
    for (const s of steps) visit(s.id);

    // Forward pass
    for (const id of order) {
      const step = stepMap.get(id)!;
      let es = 0;
      for (const dep of step.depends_on) {
        es = Math.max(es, finish.get(dep) ?? 0);
      }
      earliest.set(id, es);
      finish.set(id, es + step.lead_time_days);
    }

    const criticalPath = Math.max(...[...finish.values()], 0);

    // Identify parallel paths (groups of steps with same earliest start)
    const byStart = new Map<number, string[]>();
    for (const [id, es] of earliest) {
      const arr = byStart.get(es) ?? [];
      arr.push(id);
      byStart.set(es, arr);
    }
    const parallelPaths = [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids);

    return {
      critical_path_days: criticalPath,
      parallel_paths: parallelPaths,
      total_lead_days: criticalPath,
    };
  }
}

export const multiProcessQuoteEngine = new MultiProcessQuoteEngine();
