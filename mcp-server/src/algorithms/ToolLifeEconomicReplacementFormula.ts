/**
 * ToolLifeEconomicReplacementFormula — total-cost-of-ownership (TCO)
 * break-even for cutting tools (hotel iter15, 2026-05-24,
 * U-TOOL-LIFE-ECON-REPLACE).
 *
 * Closes G10 from the ERP-comparison audit. Sibling formula to Gilbert 1950
 * (minimum-cost cutting velocity, already shipped at
 * `gilbert-econ-speed-wire`); this one is the *per-tool* economic-life
 * decision — given a tool's purchase price + change-out labor + scrap risk
 * for late changes, at what tool life T* (minutes of cut) is the next
 * insert/tool change economically justified?
 *
 * Three pure surfaces:
 *
 *   1. costPerCutMinute(toolPrice, regrindCost, edgesPerTool, changeoutMin,
 *                       laborRate, machineRate, T_cut_min)
 *      C(T) = (toolPrice/edges + regrindCost + changeoutMin·(labor+machine))/T
 *
 *   2. economicLife(toolPrice, regrindCost, edgesPerTool, changeoutMin,
 *                  laborRate, machineRate, scrapRiskPerHr, partValueAvg)
 *      T* = the life that minimizes total $/cut-minute given a hazard rate
 *      of part-scrap escalating with overrun (closed-form for the basic
 *      hazard model).
 *
 *   3. replacementSchedule(toolPrice, regrindCost, edgesPerTool, changeoutMin,
 *                         laborRate, machineRate, T_actual_min[])
 *      Per-tool cost table for actual measured-life samples; sensitivity to
 *      whether a tool is being run past its economic life.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** on every bad input
 *   - **deterministic** — no PRNG, no clock
 *   - **dimensional consistency** — all rates $/min, all times in minutes;
 *     mixing units is the most common bug in tool-cost models
 *
 * Reference: Trent & Wright "Metal Cutting" 4e (Butterworth-Heinemann 2000),
 * Ch.5 (Tool Life and Cutting Conditions); Boothroyd & Knight "Fundamentals
 * of Machining and Machine Tools" 3e (CRC 2006), §3.9 (Optimum Cutting
 * Conditions).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolCostInput {
  tool_price: number;             // $ per tool (insert or tool body)
  regrind_cost: number;           // $ per regrind (0 if disposable)
  edges_per_tool: number;         // # cutting edges before disposal (>= 1)
  changeout_min: number;          // minutes per tool change
  labor_rate_per_min: number;     // operator $/min
  machine_rate_per_min: number;   // machine $/min (depreciation+facility+power)
}

export interface CostPerMinuteResult {
  cost_per_cut_minute: number;    // $/min of in-cut time
  tool_cost_per_min: number;
  changeout_cost_per_min: number;
  components: {
    edge_amortized_cost: number;  // $/tool-life
    changeout_total_cost: number; // $/tool-life
  };
}

export interface EconomicLifeResult extends CostPerMinuteResult {
  t_economic_min: number;         // T* — optimal life in minutes
  scrap_risk_per_hr: number;
  expected_scrap_cost_per_min: number;
}

export interface ReplacementScheduleRow {
  sample_index: number;
  actual_life_min: number;
  cost_per_cut_minute: number;
  pct_above_economic: number;     // (actual − T*) / T* in [-1, ∞)
  flag: "below_economic" | "near_economic" | "above_economic";
}

// ─── Constants (named, not magic) ──────────────────────────────────────────

const MIN_EDGES_PER_TOOL = 1;
const MINUTES_PER_HOUR = 60;
const ECON_LIFE_NEAR_TOLERANCE = 0.10;  // within 10% of T* counts as "near"
const HAZARD_BASELINE_MIN = 1;          // T* hazard floor — prevents div-by-zero in degenerate inputs

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertEdges(n: number): void {
  if (!Number.isInteger(n) || n < MIN_EDGES_PER_TOOL) {
    throw new Error(`edges_per_tool: must be integer >= ${MIN_EDGES_PER_TOOL} (got ${n})`);
  }
}

function validateInput(i: ToolCostInput): void {
  assertPositive(i.tool_price, "tool_price");
  assertNonNegative(i.regrind_cost, "regrind_cost");
  assertEdges(i.edges_per_tool);
  assertPositive(i.changeout_min, "changeout_min");
  assertNonNegative(i.labor_rate_per_min, "labor_rate_per_min");
  assertNonNegative(i.machine_rate_per_min, "machine_rate_per_min");
}

// ─── Surface 1: Cost per cut-minute ────────────────────────────────────────

/**
 * Compute $/cut-minute for a given tool life T (in minutes of in-cut time).
 * Amortizes: (a) tool body + regrinds across edges_per_tool edges, (b) the
 * changeout labor+machine downtime, both divided by the realized life.
 *
 * @param input — tool cost parameters
 * @param t_cut_min — actual tool life in cut-minutes (> 0)
 */
export function costPerCutMinute(input: ToolCostInput, t_cut_min: number): CostPerMinuteResult {
  validateInput(input);
  assertPositive(t_cut_min, "t_cut_min");
  const edgeAmortized = input.tool_price / input.edges_per_tool + input.regrind_cost;
  const changeoutTotal = input.changeout_min * (input.labor_rate_per_min + input.machine_rate_per_min);
  const toolPerMin = edgeAmortized / t_cut_min;
  const changeoutPerMin = changeoutTotal / t_cut_min;
  return {
    cost_per_cut_minute: toolPerMin + changeoutPerMin,
    tool_cost_per_min: toolPerMin,
    changeout_cost_per_min: changeoutPerMin,
    components: {
      edge_amortized_cost: edgeAmortized,
      changeout_total_cost: changeoutTotal,
    },
  };
}

// ─── Surface 2: Economic life under scrap hazard ───────────────────────────

/**
 * Solve for T* — the tool life that minimizes total $/cut-minute including
 * a part-scrap hazard that grows linearly with t (the longer you run past
 * fresh, the higher the probability of producing a scrap part).
 *
 * Cost model:
 *   C(t) = (K_fixed / t) + (λ · part_value · t / 2)
 * where K_fixed = edge_amortized + changeout_total, λ = scrap_risk_per_min
 * (scrap_risk_per_hr / 60), part_value = avg $/part scrapped.
 *
 * Setting dC/dt = 0:
 *   T* = sqrt(2·K_fixed / (λ · part_value))
 *
 * If scrap_risk_per_hr = 0 (no part-quality hazard), T* → ∞ in theory; we
 * floor it to a sensible operator-supplied baseline.
 */
export function economicLife(
  input: ToolCostInput,
  scrapRiskPerHr: number,
  partValueAvg: number,
): EconomicLifeResult {
  validateInput(input);
  assertNonNegative(scrapRiskPerHr, "scrap_risk_per_hr");
  assertNonNegative(partValueAvg, "part_value_avg");

  const kFixed = (input.tool_price / input.edges_per_tool + input.regrind_cost)
    + (input.changeout_min * (input.labor_rate_per_min + input.machine_rate_per_min));

  const lambdaPerMin = scrapRiskPerHr / MINUTES_PER_HOUR;
  const hazardProduct = lambdaPerMin * partValueAvg;
  let tStar: number;
  if (hazardProduct <= 0) {
    // No scrap risk → economic life is operator-bounded; floor to baseline
    tStar = HAZARD_BASELINE_MIN;
  } else {
    tStar = Math.sqrt((2 * kFixed) / hazardProduct);
  }
  const base = costPerCutMinute(input, tStar);
  const expectedScrapPerMin = (lambdaPerMin * partValueAvg * tStar) / 2;
  return {
    ...base,
    cost_per_cut_minute: base.cost_per_cut_minute + expectedScrapPerMin,
    t_economic_min: tStar,
    scrap_risk_per_hr: scrapRiskPerHr,
    expected_scrap_cost_per_min: expectedScrapPerMin,
  };
}

// ─── Surface 3: Per-sample replacement schedule ────────────────────────────

/**
 * For a list of measured actual lives (e.g., last 20 tool changes), compute
 * the $/cut-minute and how each sample compares to the economic optimum.
 *
 * Flags:
 *   - "below_economic" — life < T* by more than tolerance (changing too early)
 *   - "near_economic"  — life within ±10% of T* (sweet spot)
 *   - "above_economic" — life > T* by more than tolerance (running past optimum)
 */
export function replacementSchedule(
  input: ToolCostInput,
  scrapRiskPerHr: number,
  partValueAvg: number,
  actualLivesMin: number[],
): ReplacementScheduleRow[] {
  if (!Array.isArray(actualLivesMin) || actualLivesMin.length === 0) {
    throw new Error("actualLivesMin: must be non-empty array");
  }
  const econ = economicLife(input, scrapRiskPerHr, partValueAvg);
  const tStar = econ.t_economic_min;
  const rows: ReplacementScheduleRow[] = [];
  for (let i = 0; i < actualLivesMin.length; i++) {
    const t = actualLivesMin[i];
    assertPositive(t, `actualLivesMin[${i}]`);
    const cpm = costPerCutMinute(input, t);
    const pctDelta = (t - tStar) / tStar;
    let flag: ReplacementScheduleRow["flag"];
    if (pctDelta < -ECON_LIFE_NEAR_TOLERANCE) flag = "below_economic";
    else if (pctDelta > ECON_LIFE_NEAR_TOLERANCE) flag = "above_economic";
    else flag = "near_economic";
    rows.push({
      sample_index: i,
      actual_life_min: t,
      cost_per_cut_minute: cpm.cost_per_cut_minute,
      pct_above_economic: pctDelta,
      flag,
    });
  }
  return rows;
}
