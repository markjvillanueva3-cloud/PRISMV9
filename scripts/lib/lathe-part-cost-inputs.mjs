/**
 * lathe-part-cost-inputs.mjs -- slot:whiskey  [KIENZLE U-W-COST-WIRE]
 * ============================================================================
 * PURE mapping layer between the closed-loop's available data (a generated
 * program + the STEP-derived stock/part dims) and LathePartCostModelEngine's
 * `LathePartCostInput` shape. No .ts imports -> node:test-pure + reusable by
 * every closed-loop runner (STEP / OCR / Rung-B).
 *
 * Mass is derived from the STEP feature stock/part dims (bounding-cylinder
 * approximation): part = cyl(finished_od) - bore; stock = cyl(bar_stock_od);
 * waste = stock - part. This OVER-estimates part volume for a heavily-contoured
 * silhouette (it ignores the OD taper) and is therefore an honest cost ESTIMATE,
 * flagged in `_basis`. Material/density come from the cited rates module by ISO.
 *
 * @module scripts/lib/lathe-part-cost-inputs
 */

import { materialFor, insertFor, LATHE_JM_COST_RATES } from "./lathe-jm-cost-rates.mjs";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Volume (mm^3) of a solid cylinder. Returns 0 for non-positive inputs (never NaN). */
export function cylinderVolumeMm3(diaMm, lengthMm) {
  if (!isNum(diaMm) || !isNum(lengthMm) || diaMm <= 0 || lengthMm <= 0) return 0;
  const r = diaMm / 2;
  return Math.PI * r * r * lengthMm;
}

/**
 * Derive stock / part / waste volume (mm^3) from STEP feature dims.
 * @param {{bar_stock_od_mm?:number, finished_od_mm?:number, part_length_mm?:number, bore_id_mm?:number}} feat
 * @returns {{stock_mm3:number, part_mm3:number, waste_mm3:number}}
 */
export function partAndStockVolumeMm3(feat) {
  const f = feat || {};
  const len = f.part_length_mm;
  const stockOd = f.bar_stock_od_mm;
  // finished OD falls back to stock OD (a part with no turning removes ~no OD material)
  const partOd = isNum(f.finished_od_mm) && f.finished_od_mm > 0 ? f.finished_od_mm : stockOd;
  const stock = cylinderVolumeMm3(stockOd, len);
  const partOuter = cylinderVolumeMm3(partOd, len);
  const bore = isNum(f.bore_id_mm) && f.bore_id_mm > 0 ? cylinderVolumeMm3(f.bore_id_mm, len) : 0;
  const part = Math.max(0, partOuter - bore);
  return { stock_mm3: stock, part_mm3: part, waste_mm3: Math.max(0, stock - part) };
}

/** Mass (kg) of a volume (mm^3) at a density (kg/mm^3). 0 on bad input. */
export function massKg(volMm3, densityKgMm3) {
  if (!isNum(volMm3) || !isNum(densityKgMm3) || volMm3 < 0 || densityKgMm3 <= 0) return 0;
  return volMm3 * densityKgMm3;
}

/**
 * Build a LathePartCostInput from a generated program + STEP feature dims.
 *
 * @param {object} args
 * @param {{operations:Array<object>, estimated_cycle_time_sec?:number}} args.prog generated program
 * @param {object} [args.feat] STEP-derived feature dims (stock/part). Omit -> material bucket 0 (flagged).
 * @param {string} [args.isoGroup="P"] ISO machining group for material price/density.
 * @param {object} [args.rates=LATHE_JM_COST_RATES] override rates.
 * @returns {object} LathePartCostInput + `_basis` provenance string.
 */
export function buildLathePartCostInput({ prog, feat, isoGroup = "P", rates = LATHE_JM_COST_RATES } = {}) {
  const ops = Array.isArray(prog?.operations) ? prog.operations : [];
  const nOps = ops.length;
  const totalCycleS = isNum(prog?.estimated_cycle_time_sec) ? prog.estimated_cycle_time_sec : 0;
  // Per-op cycle-time fallback: even split of total, used ONLY for an op that lacks its own
  // cycle_time_sec (legacy/partial program). The generator DOES carry an accurate per-op
  // TurningPlannedOp.cycle_time_sec (estimateCycleTime: cut-length x passes / feedRate + overhead),
  // so we prefer it below -- see U-W-COST-PEROP-CYCLE.
  const perOpCycleS = nOps > 0 ? totalCycleS / nOps : 0;

  const operations = ops.map((o) => {
    const ins = insertFor(o?.operation_type);
    const toolLifeMin = o?.physics?.tool_life_min;
    // Use the generator's REAL per-op cycle time so tool consumption (op_cycle / tool_life) is
    // attributed per op. The prior even split charged a LIGHT finish pass a full totalCycle/nOps,
    // inflating its tool bucket -> the closed-loop "uneconomical" flag artifact (U-W-COST-PEROP-CYCLE,
    // 2026-06-27). Fall back to the even split only if an op carries no cycle_time_sec.
    const opCycleS = isNum(o?.cycle_time_sec) && o.cycle_time_sec > 0 ? o.cycle_time_sec : perOpCycleS;
    return {
      op: String(o?.operation_type ?? "op"),
      cycle_time_s: opCycleS,
      tool_life_s: isNum(toolLifeMin) && toolLifeMin > 0 ? toolLifeMin * 60 : 0, // 0 => engine skips tool bucket for this op
      insert_cost: ins.insert_cost,
      edges_per_insert: ins.edges_per_insert,
      holder_amort_per_edge: ins.holder_amort_per_edge,
    };
  });

  // Average spindle power (kW) across ops carrying physics.power_kW -> energy bucket.
  const powers = ops.map((o) => o?.physics?.power_kW).filter(isNum);
  const avgPowerKw = powers.length ? powers.reduce((s, v) => s + v, 0) / powers.length : 0;

  const mat = materialFor(isoGroup);
  const haveGeom = !!feat && isNum(feat?.bar_stock_od_mm) && isNum(feat?.part_length_mm);
  const vol = haveGeom ? partAndStockVolumeMm3(feat) : { stock_mm3: 0, part_mm3: 0, waste_mm3: 0 };
  const partMassKg = massKg(vol.part_mm3, mat.density_kg_mm3);
  const wasteMassKg = massKg(vol.waste_mm3, mat.density_kg_mm3);

  // The basis string carries the key assumptions WITH the number (R12): setup is amortized over the
  // representative batch, so a reader of cost_usd sees the lot assumption without opening the rates module.
  const batchNote = `; setup amortized over batch=${rates.batch_size}`;
  const perOpNote = ops.some((o) => isNum(o?.cycle_time_sec) && o.cycle_time_sec > 0)
    ? "; tool bucket uses real per-op cycle_time_sec" : "; tool bucket uses even-split cycle (no per-op time)";
  const basis = (haveGeom
    ? "machine+tool+material+setup+energy; mass from bounding-cylinder geometry (over-estimates contoured ODs)"
    : "machine+tool+setup+energy ONLY -- material bucket 0 (no STEP geometry mass available)") + batchNote + perOpNote;

  return {
    cycle_time_s: totalCycleS,
    machine_rate_per_hr: rates.machine_rate_per_hr,
    operations,
    part_mass_kg: partMassKg,
    waste_mass_kg: wasteMassKg,
    material_price_per_kg: mat.price_per_kg,
    setup_time_s: rates.setup_time_s,
    setup_rate_per_hr: rates.setup_rate_per_hr,
    batch_size: rates.batch_size,
    scrap_rate: rates.scrap_rate,
    spindle_power_kw: avgPowerKw,
    energy_price_per_kwh: rates.energy_price_per_kwh,
    _basis: basis,
  };
}
