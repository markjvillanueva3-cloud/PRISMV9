/**
 * lathe-jm-cost-rates.mjs -- slot:whiskey  [KIENZLE U-W-COST-WIRE]
 * ============================================================================
 * Canonical, CITED cost-economic constants for the lathe closed-loop COST leg.
 *
 * WHY THIS FILE EXISTS (R8/R12): the closed-loop driver's stage-4 manifest line
 * claimed "cost ... EXISTS (CycleTimeEngine + CostEfficiencyBridgeEngine +
 * JobCostingEngine)" but NO cost was ever computed (the scorer emitted only
 * cycle_time/MRR/tool_life). To close that gap with the REAL LathePartCostModelEngine
 * (a 7-bucket per-part cost model) the loop needs shop rates + material/tooling
 * pricing that no existing JM config carried. These are COST-ECONOMIC constants
 * (NOT cutting physics -- kc1.1/Taylor stay in src/physics/constants.ts and are
 * used by the pipeline, never here), gathered in ONE cited module instead of
 * inlined magic numbers, exactly as physics constants live in constants.ts.
 *
 * All values are documented ESTIMATES with provenance; they bias a cost ESTIMATE,
 * never a safety/geometry decision. Override per call site if a real JM quote
 * provides actuals. The loaded shop rate is the dominant driver.
 *
 * Provenance:
 *   - Loaded machine rate: Gardner Business Media "Top Shops" job-shop economics +
 *     standard CNC-lathe loaded rate (depreciation + power + maintenance + floor +
 *     allocated labor) ~ $75-120/hr for a mid-size mold/die shop. JM Die is mid-size.
 *   - Energy price: US EIA industrial average ~ $0.08-0.14/kWh.
 *   - Scrap rate: ISO 3685 economic-machining; LathePartCostModelEngine default 0.02 (proven).
 *   - Insert economics: standard CNMG/turning insert cost + edges-per-insert (Sandvik/Kennametal
 *     catalog list pricing, mid-range), holder amortization per edge.
 *   - Material price + density by ISO group: bar-stock market mid-range + handbook density.
 *
 * @module scripts/lib/lathe-jm-cost-rates
 */

/** Canonical JM-shop cost rates for the lathe closed-loop cost leg. */
export const LATHE_JM_COST_RATES = Object.freeze({
  /** Loaded machine hour rate $/hr (depreciation + power + maintenance + floor + allocated labor). */
  machine_rate_per_hr: 85,
  /** Setup labor loaded rate $/hr. */
  setup_rate_per_hr: 75,
  /** Representative lathe setup time (s): ~30 min for chuck + tool load + offsets on an Okuma OSP. */
  setup_time_s: 1800,
  /**
   * Batch size for setup amortization. A single closed-loop part stands in for a production LOT;
   * 25 = a representative JM turned-part lot. Setup ($/pc) = setup_time_hr x rate / batch_size, so at
   * batch=1 a 30-min setup ($37.50) would drown the machining-cost signal. The per-part RUN cost
   * (machine+tool+material+energy) is the machining-efficiency signal and stays visible in the buckets.
   */
  batch_size: 25,
  /** Industrial electricity price $/kWh (EIA industrial average, mid). */
  energy_price_per_kwh: 0.12,
  /** Proven-process scrap-rate default (matches LathePartCostModelEngine default; ISO 3685). */
  scrap_rate: 0.02,
  /**
   * Tool-change (turret index + rapid re-approach) time, seconds. Feeds the Gilbert minimum-cost
   * cutting-speed cap (economicVcCap) in TurningPrintToProgramEngine. Typical CNC-lathe turret index
   * 5-15 s (Sandvik / Kennametal application data); 8 s representative for an Okuma OSP turret.
   */
  tool_change_time_s: 8,

  /**
   * Material price ($/kg) + density (kg/mm^3) by ISO machining group.
   * density: handbook (steel 7.85 g/cc, stainless 8.0, cast iron 7.2, aluminum 2.7, Ni-superalloy 8.4).
   * price: bar-stock market mid-range; estimate only.
   */
  material: Object.freeze({
    P: { price_per_kg: 1.80, density_kg_mm3: 7.85e-6 }, // carbon/alloy steel
    M: { price_per_kg: 4.50, density_kg_mm3: 8.00e-6 }, // stainless
    K: { price_per_kg: 1.20, density_kg_mm3: 7.20e-6 }, // cast iron
    N: { price_per_kg: 6.00, density_kg_mm3: 2.70e-6 }, // aluminum / non-ferrous
    S: { price_per_kg: 35.0, density_kg_mm3: 8.40e-6 }, // Ni/Ti superalloy
    H: { price_per_kg: 3.50, density_kg_mm3: 7.85e-6 }, // hardened steel
  }),

  /**
   * Per-insert economics by operation class: insert list cost $, usable edges/insert,
   * holder amortization $/edge. Tool bucket = (op_cycle / tool_life) x (insert_cost/edges + holder_amort).
   */
  insert: Object.freeze({
    rough:    { insert_cost: 12.0, edges_per_insert: 4, holder_amort_per_edge: 0.5 },
    finish:   { insert_cost: 14.0, edges_per_insert: 4, holder_amort_per_edge: 0.5 },
    face:     { insert_cost: 12.0, edges_per_insert: 4, holder_amort_per_edge: 0.5 },
    thread:   { insert_cost: 22.0, edges_per_insert: 3, holder_amort_per_edge: 0.8 },
    groove:   { insert_cost: 18.0, edges_per_insert: 2, holder_amort_per_edge: 0.8 },
    part_off: { insert_cost: 18.0, edges_per_insert: 2, holder_amort_per_edge: 0.8 },
    drill:    { insert_cost: 10.0, edges_per_insert: 1, holder_amort_per_edge: 0.3 },
    bore:     { insert_cost: 14.0, edges_per_insert: 4, holder_amort_per_edge: 0.6 },
    default:  { insert_cost: 12.0, edges_per_insert: 4, holder_amort_per_edge: 0.5 },
  }),
});

/** Resolve material price+density for an ISO group (default P/steel). Always returns a record. */
export function materialFor(isoGroup) {
  const g = String(isoGroup ?? "P").toUpperCase().slice(0, 1);
  return LATHE_JM_COST_RATES.material[g] ?? LATHE_JM_COST_RATES.material.P;
}

/**
 * Resolve insert economics for an operation type. Maps free-form operation_type
 * (e.g. "rough_turn", "od_finish", "single_point_thread", "part_off") to a class.
 * Always returns a record (default class on no match).
 */
export function insertFor(opType) {
  const t = String(opType ?? "").toLowerCase();
  const I = LATHE_JM_COST_RATES.insert;
  if (/(thread)/.test(t)) return I.thread;
  if (/(part[_-]?off|cut[_-]?off|part_off)/.test(t)) return I.part_off;
  if (/(groov)/.test(t)) return I.groove;
  if (/(drill|center_drill|peck)/.test(t)) return I.drill;
  if (/(bore|boring|id_)/.test(t)) return I.bore;
  if (/(finish)/.test(t)) return I.finish;
  if (/(face|facing)/.test(t)) return I.face;
  if (/(rough|turn)/.test(t)) return I.rough;
  return I.default;
}

/**
 * Economic-machining params for the Gilbert minimum-cost Vc cap in TurningPrintToProgramEngine
 * (the engine's TurningInput.economics shape). Derived from the canonical rates above so the
 * closed-loop COST leg and the generator's Vc cap share ONE source of truth (no drift).
 * tool_cost_per_edge = insert_list / edges_per_insert + holder_amort_per_edge (op-class aware via
 * insertFor; default = rough, the regime where over-aggressive Vc hurts most).
 * @param {string} [opType] operation type (e.g. "rough_turn", "od_finish"); default -> rough/default class
 * @returns {{machine_rate_per_hr:number, tool_change_time_sec:number, tool_cost_per_edge_usd:number}}
 */
export function latheEconomicsParams(opType) {
  const ins = insertFor(opType);
  const toolCostPerEdge = ins.insert_cost / ins.edges_per_insert + ins.holder_amort_per_edge;
  return {
    machine_rate_per_hr: LATHE_JM_COST_RATES.machine_rate_per_hr,
    tool_change_time_sec: LATHE_JM_COST_RATES.tool_change_time_s,
    tool_cost_per_edge_usd: Math.round(toolCostPerEdge * 100) / 100,
  };
}

/**
 * Gilbert economic-optimum (minimum-cost) tool life, MINUTES. At this life the per-part (machine+tool)
 * cost is minimized: T_econ = (1/n - 1) * (t_change + C_tool / C_machine), with t_change in MIN and
 * C_machine in $/MIN (Gilbert 1950 "Economics of Machining"; Armarego & Brown 1969 sec 9.5). It is the
 * ECONOMIC floor for "is this op running faster than cost-optimal": an op at life >= T_econ is at/below
 * the optimal cutting speed (economical); below T_econ it is over-driven (uneconomical). This REPLACES
 * the arbitrary fixed 15-min heuristic, which mislabels a part running AT the cost optimum (~7.8 min for
 * P-steel + JM economics) as uneconomical. Returns null on degenerate n. Pure + exported for the
 * closed-loop economical flag (U-W-ECONOMY-FLAG-RECALIBRATE).
 * @param {number} taylorN Taylor exponent n (0<n<1) -- from CANONICAL_TAYLOR[iso] (canonical physics)
 * @param {{machine_rate_per_hr:number, tool_change_time_sec:number, tool_cost_per_edge_usd:number}} [econ]
 * @returns {number|null} economic-optimum tool life in minutes, or null when not computable
 */
export function economicOptimumLifeMin(taylorN, econ = latheEconomicsParams()) {
  if (!Number.isFinite(taylorN) || taylorN <= 0 || taylorN >= 1) return null;
  const M = econ?.machine_rate_per_hr;
  if (!Number.isFinite(M) || M <= 0) return null;
  const tChangeMin = (Number.isFinite(econ.tool_change_time_sec) ? econ.tool_change_time_sec : 0) / 60;
  const cToolPerMachineMin = (Number.isFinite(econ.tool_cost_per_edge_usd) ? econ.tool_cost_per_edge_usd : 0) / (M / 60);
  return (1 / taylorN - 1) * (tChangeMin + cToolPerMachineMin);
}
