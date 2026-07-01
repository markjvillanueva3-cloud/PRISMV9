/**
 * lathe-vc-economy-validate.mjs -- slot:whiskey  [U-W-GENERATOR-VC-ECONOMY validation]
 * ============================================================================
 * LIVE A/B proof that the Gilbert minimum-cost Vc cap (economicVcCap, wired into
 * TurningPrintToProgramEngine via optimization_target "min_cost") makes generated
 * lathe programs more ECONOMICAL on REAL JM geometry -- without touching safety.
 *
 * For a bounded sample of real turnable JM STEP parts (sampled from the closed-loop
 * cursor), generate each part TWO ways through the SAME pipeline + cost model:
 *   A = optimization_target "max_speed"  (cap SKIPPED -> aggressive table Vc; the pre-fix regime
 *                                          that produced the ~74%-uneconomical-tool-life finding)
 *   B = optimization_target "min_cost"   (Gilbert economic Vc cap applied)
 * and compare per-part + aggregate: avg $/pc, uneconomical-tool-life count, min tool life, AND the
 * safety verdict (which MUST be identical -- the cap only LOWERS Vc, never changes collision/overspeed).
 *
 * R12: prints hard numbers, not "looks fine". MUST run via tsx (imports the .ts engines):
 *   npx tsx scripts/lathe-vc-economy-validate.mjs [N]      (N = sample size, default 30)
 *
 * @module scripts/lathe-vc-economy-validate
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stepFileToProfile } from "./lathe-step-profile-probe.mjs";
import { profileToTurningFeatures } from "./lib/lathe-step-profile-to-features.mjs";
import { scoreSafetyEfficiency } from "./lib/lathe-safety-efficiency-score.mjs";
import { buildLathePartCostInput } from "./lib/lathe-part-cost-inputs.mjs";
import { latheEconomicsParams } from "./lib/lathe-jm-cost-rates.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const CURSOR = join(REPO, "state", "shared", "lathe-rungc-step-cursor.jsonl");
const N = Math.max(1, parseInt(process.argv[2] || "30", 10));

const E = "../mcp-server/src/engines/";
const { normalizeLatheInput } = await import(E + "PipelineHarnessAdaptersEngine.js");
const { turningPrintToProgramEngine } = await import(E + "TurningPrintToProgramEngine.js");
const { lathePartCostModelEngine } = await import(E + "LathePartCostModelEngine.js");

// ---- sample real turnable parts from the closed-loop cursor (stage "scored") ----
function turnableSteps(limit) {
  const out = [];
  if (!existsSync(CURSOR)) return out;
  const seen = new Set();
  for (const line of readFileSync(CURSOR, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.stage !== "scored" || !r.rel) continue;
    const rel = r.rel;
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = /^[a-zA-Z]:[\\/]/.test(rel) ? rel : join(REPO, rel.replace(/^\.\//, ""));
    if (existsSync(abs)) out.push(abs);
    if (out.length >= limit) break;
  }
  return out;
}

function genAndCost(baseTi, feat, target, econ) {
  const ti = { ...baseTi, optimization_target: target, economics: econ };
  const prog = turningPrintToProgramEngine.runPipeline(ti);
  if (!prog?.success || !Array.isArray(prog.operations) || prog.operations.length === 0) return null;
  const costInput = buildLathePartCostInput({ prog, feat, isoGroup: (prog.material && prog.material.iso_group) || "P" });
  const cr = lathePartCostModelEngine.compute(costInput);
  const partCost = { total_cost_with_scrap_amortized: cr.total_cost_with_scrap_amortized, total_cost: cr.total_cost, buckets: cr.buckets, _basis: costInput._basis };
  // STEP corpus is 1018/P (pipeline default) -> taylorN 0.25 for the Gilbert T_econ economy floor.
  const se = scoreSafetyEfficiency(prog, { max_spindle_rpm: ti.max_spindle_rpm, max_power_kW: ti.max_power_kW, partCost, taylorN: 0.25, economics: latheEconomicsParams() });
  // per-op diagnostics: which op drives the minimum tool life (the binding uneconomical op)?
  const opDiag = prog.operations.map((o) => ({
    type: o.operation_type,
    vc: o.cutting_params?.cutting_speed_m_min ?? null,
    life: o.physics?.tool_life_min ?? null,
  }));
  let bind = null;
  for (const od of opDiag) if (typeof od.life === "number" && (bind === null || od.life < bind.life)) bind = od;
  const roughOp = prog.operations.find((o) => /rough|turn/i.test(o.operation_type || "") && !/finish|thread|groove|part|drill/i.test(o.operation_type || ""));
  return {
    cost: se.efficiency.cost_usd,
    min_tool_life: se.efficiency.min_tool_life_min,
    economical: se.efficiency.tool_life_economical,
    tool_cost_share: se.efficiency.tool_cost_share,
    dom_free_op_life: se.efficiency.dominant_tool_cost_op_life_min, // life of the dominant economically-free op
    t_econ: se.efficiency.economic_optimum_life_min,                // Gilbert optimum life
    verdict: se.verdict,
    rough_vc: roughOp?.cutting_params?.cutting_speed_m_min ?? null,
    binding_op: bind, // {type, vc, life} -- the op with the shortest tool life
    ops: opDiag,
  };
}

const parts = turnableSteps(N);
if (parts.length === 0) { console.log(JSON.stringify({ ok: false, reason: "no turnable parts in cursor" })); process.exit(0); }

const rows = [];
for (const abs of parts) {
  let profile;
  try { profile = await stepFileToProfile(abs); } catch { continue; }
  if ((profile.units !== "mm" && profile.units !== "inch") || profile.suspect) continue;
  const feat = profileToTurningFeatures(profile);
  if (!feat.ok) continue;
  const baseTi = normalizeLatheInput({
    part_number: abs.split(/[\\/]/).pop(),
    bar_stock_od_mm: feat.bar_stock_od_mm,
    part_length_mm: feat.part_length_mm,
    features: feat.features,
  });
  baseTi.finished_od_mm = feat.finished_od_mm;
  // BASELINE = balanced + machine_rate 0 -> economicVcCap returns null -> NO cap (the true pre-fix behavior).
  // This isolates the cap's effect (vs the confounded max_speed*1.15 global boost).
  const NOCAP_ECON = { machine_rate_per_hr: 0, tool_change_time_sec: 8, tool_cost_per_edge_usd: 3.5 };
  const A = genAndCost(baseTi, feat, "balanced", NOCAP_ECON); // TRUE pre-fix baseline (no Vc cap)
  const B = genAndCost(baseTi, feat, "min_cost", latheEconomicsParams()); // Gilbert economic cap (true optimum)
  if (!A || !B) continue;
  rows.push({ part: abs.split(/[\\/]/).pop(), A, B });
}

// ---- aggregate ----
const withCost = rows.filter((r) => typeof r.A.cost === "number" && typeof r.B.cost === "number");
const avg = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
const r2 = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

const avgCostA = avg(withCost.map((r) => r.A.cost));
const avgCostB = avg(withCost.map((r) => r.B.cost));
const uneconA = rows.filter((r) => r.A.economical === false).length;
const uneconB = rows.filter((r) => r.B.economical === false).length;
const avgLifeA = avg(rows.map((r) => r.A.min_tool_life).filter((x) => typeof x === "number"));
const avgLifeB = avg(rows.map((r) => r.B.min_tool_life).filter((x) => typeof x === "number"));
const costDroppedOrEqual = withCost.filter((r) => r.B.cost <= r.A.cost + 1e-9).length;
const safetyIdentical = rows.filter((r) => r.A.verdict === r.B.verdict).length;
const vcLowered = rows.filter((r) => typeof r.A.rough_vc === "number" && typeof r.B.rough_vc === "number" && r.B.rough_vc <= r.A.rough_vc).length;

const summary = {
  ok: true,
  sample_parts: rows.length,
  parts_with_cost: withCost.length,
  avg_cost_usd: { baseline_nocap: r2(avgCostA), min_cost_capped: r2(avgCostB), delta_pct: avgCostA ? r2(((avgCostB - avgCostA) / avgCostA) * 100) : null },
  uneconomical_tool_life_parts: { baseline_nocap: uneconA, min_cost_capped: uneconB },
  avg_min_tool_life_min: { baseline_nocap: r2(avgLifeA), min_cost_capped: r2(avgLifeB) },
  invariants: {
    cost_dropped_or_equal: `${costDroppedOrEqual}/${withCost.length}`,
    safety_verdict_identical: `${safetyIdentical}/${rows.length}`,
    rough_vc_lowered_or_equal: `${vcLowered}/${rows.length}`,
  },
  verdict:
    avgCostB !== null && avgCostA !== null && avgCostB <= avgCostA && uneconB <= uneconA && safetyIdentical === rows.length
      ? "PASS -- min_cost(capped) is cheaper or equal on avg, fewer uneconomical parts, safety unchanged"
      : "REVIEW -- cap did not reduce cost/uneconomical on this sample (see binding_op diagnostics)",
  legend: "A = balanced + NO cap (true pre-fix baseline); B = min_cost (Gilbert economic Vc cap)",
};
const out = { summary, rows };
const OUTDIR = join(REPO, "state", "shared", "dashboards");
try { mkdirSync(OUTDIR, { recursive: true }); } catch { /* exists */ }
const OUTFILE = join(OUTDIR, "lathe-vc-economy-validate.json");
writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log("WROTE " + OUTFILE);
console.log(JSON.stringify(summary, null, 2));
