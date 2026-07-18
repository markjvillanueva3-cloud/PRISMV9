/**
 * cam-part-program-planner.mjs — sequence the resolver + optimization rules across a WHOLE
 * part's operations into an ordered, optimized part-program PLAN. This is the OFFLINE scaffold
 * of the closed-loop harness (#6): given a part's op-family sequence + inputs, it produces the
 * full ordered list of resolved+optimized recipes the live Fusion binder (#5b) will drive — and
 * it validates lathe operation ordering + aggregates the part-level safety/optimization picture.
 *
 * Offline, pure (no Fusion, no MCP). Builds only on the tested resolver + rules.
 */
import {
  loadMatrix, resolveRecipe, applyOptimizationRules, loadOptimizationRules,
  DEFAULT_MATRIX_PATH, DEFAULT_OPT_RULES_PATH,
} from "./cam-turning-recipe-resolver.mjs";
import { loadLearnedOrder, DEFAULT_LEARNED_ORDER_PATH } from "./cam-learned-order-store.mjs";

// Canonical lathe operation ordering (lower rank = earlier). A sane turned part runs roughly:
// face datum → center/drill → OD rough → ID bore → OD finish → groove → thread → part-off.
// CORPUS-LEARNED ordering (cam-learn-order-run.mjs over 2000 real JM programs, 2026-06-02 — the
// offline loop's self-improve step). The prior hand-set order drilled/bored BEFORE OD turning; the
// corpus disproved that at 92-100% confidence (n=218..1337): JM does OD turning (rough->finish)
// FIRST, then drilling/boring. Verified disagreements applied: OD_roughing<drilling_centering (99%),
// OD_roughing<peck_drill (99%), OD_finishing<ID_boring (92%), OD_finishing<bore_finish (100%).
// Invariants preserved: facing first, parting_cutoff last. Report: CAM-ORDER-LEARN-REPORT.json.
//
// SELF-LEARN PERSIST (U-CAM-SELFLEARN-PERSIST): this map is now the FAIL-SOFT FALLBACK. The live
// effective order is loaded from the durable artifact learned-op-order.json by planPartProgramFromDefaults
// (via cam-learned-order-store.loadLearnedOrder) — so the planner's order is now DATA it LOADS, not a hard
// wire (the LOAD side of the loop is closed). HONEST SCOPE: in #35 the persisted order IS this curated
// const; a retrain (cam-learn-order-run) refreshes the artifact's provenance + the audit report, NOT its
// order — so a corpus *shift* does not yet change ordering on its own. Auto-merging fresh corpus
// disagreements INTO the persisted order (so a shift changes ordering with zero code edit) is the WRITE
// side, U-CAM-RETRAIN-LIFECYCLE (#36). This map is the default when no artifact is present or it is invalid.
export const LATHE_OP_ORDER = {
  facing: 10,
  OD_roughing: 20,
  drilling_centering: 30,
  peck_drill: 32,
  tap: 34,
  OD_finishing: 40,
  profile: 42,
  ID_boring: 50,
  bore_finish: 52,
  chamfer: 55,
  grooving: 60,
  face_grooving: 62,
  threading: 70,
  live_tool_milling: 80,
  parting_cutoff: 99,
};

/**
 * @param {object} matrix  template matrix (loadMatrix)
 * @param {object} rules   optimization rules (loadOptimizationRules)
 * @param {object} part    { partNumber?, material_iso_group?, machineId?, machineModel?,
 *                            operations: [{ family, inputs? }] }
 * @param {object} [orderMap=LATHE_OP_ORDER]  family→rank map driving op ordering. Defaults to the
 *                            hard-coded fallback; planPartProgramFromDefaults injects the learned artifact.
 * @param {string} [orderSource="builtin-default"]  provenance label for the order map (surfaced in the result).
 * @returns the ordered, optimized part-program plan + a part-level summary.
 */
export function planPartProgram(matrix, rules, part, orderMap = LATHE_OP_ORDER, orderSource = "builtin-default") {
  if (!part || !Array.isArray(part.operations) || part.operations.length === 0) {
    throw new Error("planPartProgram: part.operations[] (non-empty) is required");
  }
  const effectiveOrder = orderMap && typeof orderMap === "object" ? orderMap : LATHE_OP_ORDER;
  const orderedOps = part.operations.map((op, i) => {
    const inputs = { material_iso_group: part.material_iso_group, ...(op.inputs || {}) };
    const recipe = resolveRecipe(matrix, op.family, inputs);
    const optimized = applyOptimizationRules(recipe, rules);
    return { seq: i + 1, order_rank: effectiveOrder[op.family] ?? 50, ...optimized };
  });

  // Sequence sanity — flag operations that run out of canonical lathe order (advisory, not a block;
  // a part may legitimately re-visit, but parting-before-finishing is almost always an error).
  const sequence_warnings = [];
  for (let i = 1; i < orderedOps.length; i++) {
    if (orderedOps[i].order_rank < orderedOps[i - 1].order_rank) {
      sequence_warnings.push(
        `seq ${orderedOps[i].seq} (${orderedOps[i].family}) runs before ${orderedOps[i - 1].family} — out of canonical lathe order`
      );
    }
  }

  const allGates = orderedOps.flatMap((o) => (o.safety_gates || []).map((g) => g.rule));
  const roi = {};
  for (const o of orderedOps) {
    for (const [k, n] of Object.entries(o.optimization_summary?.by_roi || {})) roi[k] = (roi[k] || 0) + n;
  }

  return {
    partNumber: part.partNumber ?? null,
    machineId: part.machineId ?? null,
    machineModel: part.machineModel ?? null,
    material_iso_group: part.material_iso_group ?? null,
    order_source: orderSource, // provenance: which order map drove this plan (learned-artifact | default-fallback | builtin-default)
    op_count: orderedOps.length,
    ordered_ops: orderedOps,
    part_summary: {
      total_safety_gates: allGates.length,
      unique_safety_gates: [...new Set(allGates)].length,
      ops_pending_material: orderedOps.filter((o) => (o.optimization_summary?.pending_material || 0) > 0).length,
      ops_not_ready_to_drive: orderedOps.filter((o) => !o.ready_to_drive).length,
      optimization_moves_by_roi: roi,
      sequence_warnings,
      material_resolved: part.material_iso_group != null,
    },
  };
}

/**
 * Convenience: load matrix + rules + the LEARNED op-order from default paths and plan in one call.
 * This is the entry the offline closed-loop drives (cam-offline-loop-run.mjs) — loading the learned
 * artifact HERE is what closes the loop: a retrain that writes a new learned-op-order.json changes the
 * planned ordering on the next run with no code edit. Falls back to the hard-coded LATHE_OP_ORDER when
 * the artifact is absent/invalid (fail-soft, R12 — the load-bearing safety is in loadLearnedOrder).
 */
export function planPartProgramFromDefaults(
  part, matrixPath = DEFAULT_MATRIX_PATH, rulesPath = DEFAULT_OPT_RULES_PATH, orderPath = DEFAULT_LEARNED_ORDER_PATH,
) {
  const loaded = loadLearnedOrder(orderPath, LATHE_OP_ORDER);
  return planPartProgram(loadMatrix(matrixPath), loadOptimizationRules(rulesPath), part, loaded.order, loaded.source);
}
