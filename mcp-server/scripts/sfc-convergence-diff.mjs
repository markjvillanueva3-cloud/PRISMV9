#!/usr/bin/env node
/**
 * sfc-convergence-diff -- SFC CONVERGENCE decision-support (slot:oscar, 2026-06-21)
 * ================================================================================
 *
 * Produces the EXACT per-material/operation numeric diff between the two SFC engines so the
 * operator can sign off on the convergence re-baseline (reference_oscar_sfc_convergence_plan
 * _2026_06_21 P2 is OUTWARD-FACING -- it changes the production SFC UI numbers, needs sign-off).
 *
 *   - PRODUCTION NOW: speedFeedOrchestratorEngine.compute(input)            (web UI via prism_calc:sf_orchestrate)
 *   - CONVERGENCE TARGET: ultimateSpeedFeedEngine.calculate(adapter(input)) (the published+shop-aligned engine)
 *
 * Read-only: runs both engines and tabulates Vc / RPM / Fc / power / tool-life / Ra deltas. Changes
 * NOTHING in production. Emits a markdown report the operator reviews before approving P2.
 *
 * Reconciliation context (reference_oscar_sfc_engine_divergence_magnitude_2026_06_21): the engine is
 * -26% vs published (conservative-safe) and aligns with JM Die ACTUAL proven cutting (lathe 137 m/min,
 * mill 180-249 m/min HSM); the orchestrator is ~2-3x more conservative than BOTH published AND JM Die.
 *
 * Run:  npx tsx scripts/sfc-convergence-diff.mjs            (table + write report)
 *       npx tsx scripts/sfc-convergence-diff.mjs --json     (machine output)
 *
 * @milestone SFC-CONVERGENCE
 * @unit U-SFC-CONVERGENCE-DIFF
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reexecUnderTsxIfNeeded } from "./lib/tsx-reexec-guard.mjs";

const MCP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(MCP_ROOT, "..", "state", "shared", "SFC-CONVERGENCE-DIFF.md");

// === PURE HELPERS (unit-tested in sfc-convergence-diff.test.mjs) ===

/** Signed percent change from `base` (production) to `target` (convergence). null-safe. */
export function pctDiff(base, target) {
  if (typeof base !== "number" || typeof target !== "number" || !isFinite(base) || !isFinite(target)) return null;
  if (base === 0) return target === 0 ? 0 : null; // undefined ratio
  return ((target - base) / Math.abs(base)) * 100;
}

/** Pull the comparable scalar metrics out of an orchestrator OR engine result (different shapes). */
export function extractMetrics(r, kind) {
  const v = (x) => (x && typeof x === "object" && "value" in x ? x.value : x);
  if (kind === "orchestrator") {
    const o = (r && r.value) ? r.value : r;
    return {
      vc: o?.cutting_speed_mpm, rpm: o?.spindle_rpm, fc: o?.tangential_force_N,
      power: o?.power_kw, life: o?.tool_life_min, ra: o?.surface_finish_Ra_um,
    };
  }
  // engine (UltimateSpeedFeedResult): power=PowerAnalysis.required_power_kw,
  // surface_finish=SurfaceFinishPrediction.practical_ra_um (both OptimizedValue {value}).
  return {
    vc: v(r?.cutting_speed), rpm: v(r?.spindle_rpm) ?? v(r?.rpm),
    fc: v(r?.forces?.tangential_force_N), power: v(r?.power?.required_power_kw),
    life: v(r?.tool_life?.life_minutes), ra: v(r?.surface_finish?.practical_ra_um) ?? v(r?.surface_finish?.theoretical_ra_um),
  };
}

/** Build one comparison row {metric, prod, target, diffPct} array for a labeled case. */
export function buildDiffRows(prodM, targetM) {
  const METRICS = [
    ["Vc (m/min)", "vc"], ["RPM", "rpm"], ["Fc (N)", "fc"],
    ["Power (kW)", "power"], ["Tool life (min)", "life"], ["Ra (um)", "ra"],
  ];
  return METRICS.map(([label, key]) => ({
    metric: label, prod: prodM[key], target: targetM[key], diffPct: pctDiff(prodM[key], targetM[key]),
  }));
}

/**
 * Per-case safety read for the convergence (PURE, tested). A short PRODUCTION tool life means the
 * production UI runs hot (rapid wear -> breakage / over-speed risk). Flags the cases where the
 * convergence MATERIALLY changes the safety picture so the operator cannot miss them:
 *   - "production-overspeed-engine-safer": production life < floor AND engine life materially longer
 *     -> the HB500-class hazard; converging is a SAFETY FIX.
 *   - "convergence-introduces-short-life": engine life < floor AND shorter than production
 *     -> converging would run hotter here; review before approving.
 *   - "ok": neither side is below the floor.
 * `lifeFloorMin` default 15 (min); a finishing/production tool life under this is operationally poor.
 */
export function classifyCaseSafety(prodM, targetM, lifeFloorMin = 15) {
  const p = prodM?.life, t = targetM?.life;
  const num = (x) => typeof x === "number" && isFinite(x);
  if (!num(p) || !num(t)) return { flag: "unknown", reason: "tool-life not available on one side" };
  const prodShort = p < lifeFloorMin, engShort = t < lifeFloorMin;
  if (prodShort && t > p * 2) {
    return { flag: "production-overspeed-engine-safer", reason: `production life ${p.toFixed(0)}min < ${lifeFloorMin}min floor; engine ${t.toFixed(0)}min (safer)` };
  }
  if (engShort && t < p) {
    return { flag: "convergence-introduces-short-life", reason: `engine life ${t.toFixed(0)}min < ${lifeFloorMin}min floor and below production ${p.toFixed(0)}min -- review` };
  }
  return { flag: "ok", reason: `production ${p.toFixed(0)}min / engine ${t.toFixed(0)}min` };
}

const SAFETY_MARK = { "production-overspeed-engine-safer": "[!] OVER-SPEED FIX", "convergence-introduces-short-life": "[!] REVIEW", ok: "ok", unknown: "?" };

/**
 * Flag an implausibly-low PRODUCTION cutting speed (a broken result, NOT a conservative one).
 * The orchestrator computes turning rpm/Vc from the TOOL diameter instead of the WORKPIECE
 * diameter (SpeedFeedOrchestratorEngine.ts:2574/2667) -> turning Vc collapses to ~1-2 m/min.
 * `floorMpm` default 10: no real metal-cutting Vc is below this for the materials swept here,
 * so a production Vc under it means the case is BROKEN (the convergence is fixing garbage, not
 * re-baselining a valid number). Pure. Returns true only when prod Vc is a finite number < floor.
 */
export function flagImplausibleProdVc(prodM, floorMpm = 10) {
  const v = prodM?.vc;
  return typeof v === "number" && isFinite(v) && v < floorMpm;
}

const fmt = (x) => (typeof x === "number" && isFinite(x) ? (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2)) : "n/a");
const fmtPct = (x) => (x == null ? "n/a" : `${x >= 0 ? "+" : ""}${x.toFixed(0)}%`);

// === MAIN ===

async function main() {
  // A bare `node sfc-convergence-diff.mjs` cannot resolve the `.ts` engine imports below -- Node
  // type-strip won't rewrite a .js specifier to .ts. Relaunch under tsx ONCE; no-op under tsx.
  // Placed inside main() (not module scope) so importing this file for its pure helpers in
  // sfc-convergence-diff.test.mjs never triggers a relaunch. [[tsx-reexec-guard]]
  reexecUnderTsxIfNeeded(import.meta.url);
  const JSON_OUT = process.argv.includes("--json");
  const { speedFeedOrchestratorEngine } = await import("../src/engines/SpeedFeedOrchestratorEngine.js");
  const { ultimateSpeedFeedEngine } = await import("../src/engines/UltimateSpeedFeedEngine.js");
  const { orchestratorToUltimateInput } = await import("../src/engines/lib/orchestrator-input-adapter.js");

  // Representative production inputs (same 6 materials as the convergence baseline + rough/finish).
  const CASES = [
    { label: "Steel P mill rough", in: { material: "steel", iso_group: "P", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 } },
    { label: "Steel P mill finish", in: { material: "steel", iso_group: "P", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "finishing", axial_depth_mm: 0.5, radial_depth_mm: 1 } },
    { label: "Aluminum N mill finish", in: { material: "aluminum", iso_group: "N", tool_diameter_mm: 8, flutes: 3, operation: "milling", cut_type: "finishing", axial_depth_mm: 1, radial_depth_mm: 0.5 } },
    { label: "Titanium S mill rough", in: { material: "titanium", iso_group: "S", tool_diameter_mm: 12, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 2, radial_depth_mm: 4 } },
    { label: "Hardened steel HB500 finish", in: { material: "steel", iso_group: "P", hardness_hb: 500, tool_diameter_mm: 6, flutes: 4, operation: "milling", cut_type: "finishing", axial_depth_mm: 0.5, radial_depth_mm: 0.3 } },
    { label: "Stainless M mill rough", in: { material: "stainless steel", iso_group: "M", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 } },
    { label: "Cast iron K mill rough", in: { material: "cast iron", iso_group: "K", tool_diameter_mm: 16, flutes: 4, operation: "milling", cut_type: "roughing", axial_depth_mm: 4, radial_depth_mm: 8 } },
    // TURNING -- JM Die's PRIMARY domain. The orchestrator computes rpm/Vc from tool_diameter
    // not workpiece_diameter (SpeedFeedOrchestratorEngine.ts:2574) -> production Vc collapses to
    // ~1-2 m/min (BROKEN). The engine uses workpiece_diameter correctly. These cases demonstrate
    // the turning correctness gap (reference_oscar_orchestrator_turning_broken_2026_06_21).
    { label: "Steel P OD turning rough", in: { material: "steel", iso_group: "P", operation: "turning", cut_type: "roughing", workpiece_diameter_mm: 50, tool_diameter_mm: 0.8, axial_depth_mm: 3, flutes: 1 } },
    { label: "Stainless M OD turning rough", in: { material: "stainless steel", iso_group: "M", operation: "turning", cut_type: "roughing", workpiece_diameter_mm: 40, tool_diameter_mm: 0.8, axial_depth_mm: 2.5, flutes: 1 } },
    { label: "Cast iron K OD turning rough", in: { material: "cast iron", iso_group: "K", operation: "turning", cut_type: "roughing", workpiece_diameter_mm: 80, tool_diameter_mm: 0.8, axial_depth_mm: 3, flutes: 1 } },
    { label: "Aluminum N OD turning finish", in: { material: "aluminum", iso_group: "N", operation: "turning", cut_type: "finishing", workpiece_diameter_mm: 30, tool_diameter_mm: 0.4, axial_depth_mm: 0.5, flutes: 1 } },
  ];

  const results = [];
  for (const c of CASES) {
    let prodM = {}, targetM = {}, err = null;
    try { prodM = extractMetrics(speedFeedOrchestratorEngine.compute(c.in), "orchestrator"); }
    catch (e) { err = `orchestrator: ${e.message}`; }
    try { targetM = extractMetrics(ultimateSpeedFeedEngine.calculate(orchestratorToUltimateInput(c.in)), "engine"); }
    catch (e) { err = (err ? err + "; " : "") + `engine: ${e.message}`; }
    results.push({ label: c.label, op: c.in.operation, rows: buildDiffRows(prodM, targetM), safety: classifyCaseSafety(prodM, targetM), prodVcBroken: flagImplausibleProdVc(prodM), err });
  }
  const overspeed = results.filter((r) => r.safety.flag === "production-overspeed-engine-safer");
  const reviewCases = results.filter((r) => r.safety.flag === "convergence-introduces-short-life");
  const broken = results.filter((r) => r.prodVcBroken);

  if (JSON_OUT) { console.log(JSON.stringify(results, null, 2)); return; }

  // markdown report
  let md = `# SFC Convergence Diff -- production (orchestrator) vs convergence target (engine)\n\n`;
  md += `> Decision-support for the operator-gated convergence P2 (re-baselines production SFC UI numbers).\n`;
  md += `> PRODUCTION = SpeedFeedOrchestratorEngine.compute (web UI). TARGET = UltimateSpeedFeedEngine.calculate(adapter).\n`;
  md += `> The engine is -26% vs published + aligned with JM Die ACTUAL proven cutting (lathe 137 / mill 180-249 m/min);\n`;
  md += `> the orchestrator is ~2-3x more conservative than BOTH published AND JM Die's own proven programs.\n\n`;
  // Safety summary up top (the operator must not miss the over-speed cases).
  md += `## Safety summary\n\n`;
  if (broken.length) {
    md += `**[!!] ${broken.length} case(s) where PRODUCTION is BROKEN (implausible Vc < 10 m/min)** -- the orchestrator computes turning rpm/Vc from the TOOL diameter instead of the WORKPIECE diameter (SpeedFeedOrchestratorEngine.ts:2574). These are NOT a re-baseline of valid numbers -- the convergence FIXES a broken result:\n`;
    for (const r of broken) md += `- **${r.label}** (${r.op}): production Vc ${fmt(r.rows.find((x) => x.metric.startsWith("Vc"))?.prod)} m/min (broken) -> engine ${fmt(r.rows.find((x) => x.metric.startsWith("Vc"))?.target)} m/min (correct)\n`;
    md += `\n`;
  }
  if (overspeed.length) {
    md += `**[!] ${overspeed.length} production OVER-SPEED case(s) the convergence FIXES** (production runs a hazardously short tool life; the engine is safer):\n`;
    for (const r of overspeed) md += `- **${r.label}**: ${r.safety.reason}\n`;
    md += `\n`;
  } else md += `No production over-speed cases flagged.\n\n`;
  if (reviewCases.length) {
    md += `**[!] ${reviewCases.length} case(s) where the convergence would run HOTTER -- review before approving:**\n`;
    for (const r of reviewCases) md += `- **${r.label}**: ${r.safety.reason}\n`;
    md += `\n`;
  }
  for (const r of results) {
    const mark = r.prodVcBroken ? "[!!] PRODUCTION BROKEN (turning uses tool not workpiece dia)" : SAFETY_MARK[r.safety.flag];
    md += `## ${r.label}  [${mark}]${r.err ? `  (ERROR: ${r.err})` : ""}\n\n`;
    md += `| metric | production | -> target | diff |\n|---|---|---|---|\n`;
    for (const row of r.rows) md += `| ${row.metric} | ${fmt(row.prod)} | ${fmt(row.target)} | ${fmtPct(row.diffPct)} |\n`;
    md += `\n_${r.prodVcBroken ? "production BROKEN (implausible Vc) -- convergence FIXES it" : `safety: ${r.safety.reason}`}_\n\n`;
    console.log(`${r.label}  [${mark}]:`);
    for (const row of r.rows) console.log(`  ${row.metric.padEnd(16)} ${fmt(row.prod).padStart(8)} -> ${fmt(row.target).padStart(8)}  ${fmtPct(row.diffPct)}`);
  }
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md);
  console.log(`\nReport -> ${REPORT_PATH}`);
}

const isMain = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
