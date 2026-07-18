/**
 * sfc-exhaustive-combinatorial-sweep.mjs (slot:oscar)
 * =====================================================
 * Drives the REAL customer-page SFC engine (ProductEngine.productSFC) across the
 * combinatorial input space a user could enter -- material x tool-diameter x flutes x
 * tool-material x operation x coolant x the ap(depth) x ae(width) ENGAGEMENT GRID per
 * tool -- and classifies every result so the "valid SAFE result for EVERY logical
 * combination" guarantee is MEASURED, not asserted. This is the harness the
 * SFC-status-assessment flagged as missing (ParametricSweep8640 tests a parallel
 * reimplementation, never the real engine).
 *
 * The full 0.001"-resolution ap x ae sweep per tool x all machines/holders is BILLIONS
 * of combos -> this runs as a SHARD: axis lists + a `--grid N` engagement resolution +
 * a `--max N` hard cap. The full run is a scheduled/sharded job; raise --grid toward the
 * 0.001" (=0.0254 mm) step and lift --max for the exhaustive pass.
 *
 * Results (summary + every breaking combo) are written to state/shared/sfc-sweep/ so the
 * billions of rows never enter an LLM context. Only a compact summary prints to stdout.
 *
 * Run:  node --import tsx scripts/sfc-exhaustive-combinatorial-sweep.mjs [--grid 6] [--max 8000] [--out <file>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productSFC } from "../mcp-server/src/engines/ProductEngine.ts";
import { perCellOracle, makeCrossCellOracle } from "./lib/sfc-sweep-oracle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const GRID = Math.max(2, parseInt(arg("grid", "6"), 10));
const MAX = parseInt(arg("max", "8000"), 10);
const OUT = arg("out", path.join(REPO, "state", "shared", "sfc-sweep", `sweep-${GRID}grid-${MAX}cap.json`));
// --shard i/N : run ONLY the combos whose global index % N === i, so N shards can run in
// parallel across the 32-thread host and together cover the full space (strided, even coverage
// even if each shard is --max-capped). Absent -> single-process (gIndex never advances ->
// byte-identical to the pre-shard behavior). The overnight driver launches N shards + merges.
const SHARD = arg("shard", null);
let SHARD_I = null, SHARD_N = null;
if (SHARD) {
  const [i, n] = String(SHARD).split("/").map(Number);
  if (Number.isInteger(i) && Number.isInteger(n) && n > 0 && i >= 0 && i < n) { SHARD_I = i; SHARD_N = n; }
  else { console.log(`[sweep] ignoring malformed --shard '${SHARD}' (want i/N, 0<=i<N)`); }
}
let gIndex = 0; // global combo index across ALL combos (shard-invariant); advances only when sharding

// ---- Input axes (spanning; material set covers all 6 ISO groups + the underscore/alias
// regression forms the math-accuracy audit flagged). Holders/machines/controllers are
// resolved server-side from machine_name + the catalogs wired this session; the page
// physics inputs swept here are the ones that drive the calculation. ----
const MATERIALS = ["1045", "4140", "316", "GG25", "6061", "7075", "Ti-6Al-4V", "D2", "Inconel 718", "stainless_steel", "cast_iron"];
const DIAMETERS = [3, 6, 10, 12, 16, 20];      // mm
const FLUTES = [2, 3, 4, 5];
const TOOL_MATERIALS = ["Carbide", "HSS"];
const OPERATIONS = ["slot_milling", "profile_milling", "face_milling", "pocket_milling", "adaptive_milling", "drilling", "boring", "reaming", "tapping", "thread_milling"];
const COOLANTS = ["flood", "mist", "dry", "through_tool"];

// Engagement grid per tool: ae (width) 5%..100% of D, ap (depth) 10%..200% of D, GRID steps each.
function engagementGrid(D) {
  const pts = [];
  for (let i = 0; i < GRID; i++) {
    const ae = D * (0.05 + (0.95 * i) / (GRID - 1));       // 0.05D .. 1.0D
    for (let j = 0; j < GRID; j++) {
      const ap = D * (0.1 + (1.9 * j) / (GRID - 1));        // 0.1D .. 2.0D
      pts.push([Math.round(ap * 1000) / 1000, Math.round(ae * 1000) / 1000]);
    }
  }
  return pts;
}

const REQUIRED_POSITIVE = ["cutting_speed_m_min", "spindle_rpm", "feed_per_tooth_mm", "cutting_force_N", "power_kW", "mrr_cm3_min", "tool_life_min"];

/** Classify one engine result. Returns { class, detail }. */
function classify(r) {
  if (r && r.error) return { class: "blocked", detail: String(r.error).slice(0, 120) };
  const v = r && r.result;
  if (!v) return { class: "no_result", detail: JSON.stringify(r).slice(0, 120) };
  for (const k of REQUIRED_POSITIVE) {
    const x = v[k];
    if (typeof x !== "number" || !Number.isFinite(x)) return { class: "DEFECT_nonfinite", detail: `${k}=${x}` };
    if (x < 0) return { class: "DEFECT_negative", detail: `${k}=${x}` };
  }
  if (v.tool_life_min === 9999 || v.tool_life_min === 99999) return { class: "SUSPECT_life_sentinel", detail: `life=${v.tool_life_min}` };
  if (v.cutting_speed_m_min > 2000 || v.cutting_speed_m_min < 1) return { class: "SUSPECT_vc_band", detail: `vc=${v.cutting_speed_m_min}` };
  if (v.spindle_rpm > 1e6) return { class: "SUSPECT_rpm", detail: `rpm=${v.spindle_rpm}` };
  return { class: "ok", detail: "" };
}

// Silence the engine's per-call [DEBUG] spam during the sweep (restore for the summary).
const realLog = console.log, realDebug = console.debug, realInfo = console.info;
const noop = () => {};

const counts = {};
const breaks = []; // every non-ok, non-blocked combo (the guarantee violations)
const oracleBreaks = []; // per-cell silent-wrong (math-inconsistent) findings
const crossCell = makeCrossCellOracle(); // accumulates HSS/carbide + ISO-speed ordering
let total = 0;
let oracleHits = 0;
let capped = false;

console.log = noop; console.debug = noop; console.info = noop;
outer:
for (const material of MATERIALS) {
  for (const tool_diameter of DIAMETERS) {
    const grid = engagementGrid(tool_diameter);
    for (const number_of_teeth of FLUTES) {
      for (const tool_material of TOOL_MATERIALS) {
        for (const operation of OPERATIONS) {
          for (const coolant_type of COOLANTS) {
            for (const [depth, width] of grid) {
              if (SHARD_N !== null && (gIndex++ % SHARD_N) !== SHARD_I) continue; // not this shard's cell (gIndex advances for every combo)
              if (total >= MAX) { capped = true; break outer; }
              total++;
              const params = { material, tool_diameter, number_of_teeth, tool_material, operation, coolant_type, depth, width };
              let cls;
              let res;
              try {
                res = productSFC("sfc_calculate", params);
                cls = classify(res);
              } catch (e) {
                cls = { class: "THROW", detail: String(e && e.message).slice(0, 120) };
              }
              counts[cls.class] = (counts[cls.class] || 0) + 1;
              if (cls.class !== "ok" && cls.class !== "blocked") {
                if (breaks.length < 2000) breaks.push({ ...params, ...cls });
              }
              // Silent-wrong oracle: only on results the classifier accepted as a real
              // numeric answer (ok) -- a blocked/defect cell has no published numbers to cross-check.
              if (cls.class === "ok" && res && res.result) {
                const viols = perCellOracle(params, res.result);
                if (viols.length) {
                  oracleHits++;
                  if (oracleBreaks.length < 2000) oracleBreaks.push({ ...params, oracle: viols });
                }
                crossCell.record(params, res.result);
              }
            }
          }
        }
      }
    }
  }
}
const crossViolations = crossCell.violations({ maxReport: 1000 });
console.log = realLog; console.debug = realDebug; console.info = realInfo;

const oracleByKind = {};
for (const b of oracleBreaks) for (const v of b.oracle) oracleByKind[v.kind] = (oracleByKind[v.kind] || 0) + 1;
for (const v of crossViolations) oracleByKind[v.kind] = (oracleByKind[v.kind] || 0) + 1;

const summary = {
  schemaVersion: "1.1.0",
  generatedAt: new Date().toISOString(),
  grid: GRID, maxCap: MAX, capped,
  shard: SHARD_N !== null ? { i: SHARD_I, n: SHARD_N } : null,
  totalProbed: total,
  axisCardinality: { materials: MATERIALS.length, diameters: DIAMETERS.length, flutes: FLUTES.length, toolMaterials: TOOL_MATERIALS.length, operations: OPERATIONS.length, coolants: COOLANTS.length, engagementPerTool: GRID * GRID },
  counts,
  defectClasses: Object.keys(counts).filter((k) => k.startsWith("DEFECT") || k === "THROW" || k === "no_result"),
  breakCount: breaks.length,
  breaks,
  // Silent-wrong oracle: results that were "ok" (finite+positive) but FAIL an independent math invariant.
  oracle: {
    perCellHits: oracleHits,
    crossCellHits: crossViolations.length,
    byKind: oracleByKind,
    perCellBreaks: oracleBreaks,
    crossCellBreaks: crossViolations,
  },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));

const ok = counts.ok || 0;
const blocked = counts.blocked || 0;
const defects = Object.entries(counts).filter(([k]) => k.startsWith("DEFECT") || k === "THROW" || k === "no_result").reduce((a, [, n]) => a + n, 0);
const suspects = Object.entries(counts).filter(([k]) => k.startsWith("SUSPECT")).reduce((a, [, n]) => a + n, 0);
const oracleTotal = oracleHits + crossViolations.length;
realLog(`\n=== SFC EXHAUSTIVE SWEEP (grid=${GRID}, probed=${total}${capped ? " [CAPPED]" : ""}) ===`);
realLog(`ok=${ok}  blocked(safety)=${blocked}  DEFECTS=${defects}  SUSPECT=${suspects}`);
realLog(`SILENT-WRONG ORACLE: perCell=${oracleHits}  crossCell=${crossViolations.length}  byKind=${JSON.stringify(oracleByKind)}`);
realLog(`by class: ${JSON.stringify(counts)}`);
realLog(`results -> ${path.relative(REPO, OUT)} (${breaks.length} break rows, ${oracleTotal} oracle rows)`);
if (breaks.length) {
  realLog(`first 5 breaks:`);
  for (const b of breaks.slice(0, 5)) realLog(`  [${b.class}] ${b.material} D${b.tool_diameter} z${b.number_of_teeth} ${b.operation} ap${b.depth} ae${b.width} -> ${b.detail}`);
}
if (oracleHits) {
  realLog(`first 5 per-cell oracle violations (finite+positive but math-inconsistent):`);
  for (const b of oracleBreaks.slice(0, 5)) realLog(`  ${b.material} D${b.tool_diameter} z${b.number_of_teeth} ${b.operation} ap${b.depth} ae${b.width} -> ${b.oracle.map((v) => `${v.kind}(${(v.relPct * 100).toFixed(0)}%)`).join(", ")}`);
}
if (crossViolations.length) {
  realLog(`first 5 cross-cell oracle violations (silent-wrong ordering):`);
  for (const v of crossViolations.slice(0, 5)) {
    if (v.kind === "hss_not_slower_than_carbide") realLog(`  hss_not_slower [${v.key}] carbideVc=${v.carbideVc.toFixed(1)} hssVc=${v.hssVc.toFixed(1)}`);
    else realLog(`  speed_ordering [${v.key}] ${v.faster.material}(${v.faster.iso})Vc=${v.faster.vc.toFixed(1)} <= ${v.slower.material}(${v.slower.iso})Vc=${v.slower.vc.toFixed(1)}`);
  }
}
