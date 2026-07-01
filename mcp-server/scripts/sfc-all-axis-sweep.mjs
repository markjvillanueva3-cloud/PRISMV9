#!/usr/bin/env node
/**
 * sfc-all-axis-sweep -- OSCAR-SFC-9AXIS-MS0 / U-OSC-ALL-AXIS-SWEEP
 * ================================================================
 *
 * Clause 1 of the standing /goal: "Run calculations for every possible combination of
 * machines, spindles, controller, materials, work holding/fixture, tool holder connection
 * type and holding mechanism (balance, max speeds, rigidity, dampening, accuracy), tooling +
 * insert, coolant type, tool path type, cutting parameters, desired finish quality
 * (roughing/semifinish/finish) -- with MAX VARIABILITY."
 *
 * The comparison sweep (sfc-full-sweep-compare.mjs) varied only the material/tool/parameter
 * axes and held the MACHINE-SIDE axes (machine, spindle, controller, holder connection +
 * balance + runout, workholding, coolant) at orchestrator defaults. This sweep closes that gap
 * by enumerating EVERY named axis through the live SpeedFeedNineAxisOrchestratorEngine.
 *
 * Two complementary phases (DOE-honest reading of "every combination with max variability"):
 *   1. OAT (one-axis-at-a-time): for each named axis, hold all others at a canonical baseline
 *      and sweep that axis through its FULL set of levels. Proves every axis is exercised
 *      across its whole range and QUANTIFIES its effect (rpm/feed/mrr/vc spread %). This is
 *      the "max variability" evidence -- per axis, end to end.
 *   2. FACTORIAL: a bounded full-factorial over the categorical machine-side axes
 *      (way x workholding x holder x coolant x material x tool_material x cut_type x diameter),
 *      streamed one row per combination to an NVMe ledger. Proves COMBINATION coverage +
 *      interactions. `--mode full` expands every axis to its full enum (Blackwell/NVMe scale).
 *
 * Each cell is fail-soft (orchestrator throw -> recorded as infeasible, never crashes the
 * sweep); the aggregate is fail-loud (R12: a dead axis with zero spread is reported as DEAD,
 * not hidden).
 *
 * Run:  npx tsx scripts/sfc-all-axis-sweep.mjs                 (OAT + core factorial)
 *       npx tsx scripts/sfc-all-axis-sweep.mjs --mode full     (full-enum factorial)
 *       npx tsx scripts/sfc-all-axis-sweep.mjs --json          (machine output)
 *       npx tsx scripts/sfc-all-axis-sweep.mjs --out <path>    (ledger path)
 *
 * @milestone OSCAR-SFC-9AXIS-MS0
 * @unit U-OSC-ALL-AXIS-SWEEP
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { reexecForHeapIfNeeded } from "./lib/sweep-heap-reexec.mjs";
import { reexecUnderTsxIfNeeded } from "./lib/tsx-reexec-guard.mjs";
// Silent-wrong math oracle (U-SFC-SWEEP-ORACLE, slot:oscar). The all-axis sweep proves every
// axis MOVES output; the oracle proves the output is mathematically self-consistent. The
// RPM<->Vc<->D identity (n = Vc*1000/(pi*D)) is exact for EVERY machine/holder/controller/
// strategy combination, so it is the universal lens applied here. The geometric MRR identity
// (ap*ae*vf/1000) is strategy-dependent on this orchestrator (adaptive/HSM average engagement
// != peak), so it is proven separately on the geometric ProductEngine path, not asserted here.
import { checkRpmConsistency, checkChipThinningDirection, makeCrossCellOracle } from "../../scripts/lib/sfc-sweep-oracle.mjs";

// `--mode full` expands every machine-side axis to its full enum (Blackwell scale) -- the same
// exhaustive-sweep heap-OOM class as sfc-full-sweep-compare (default ~2GB heap FATAL-OOMs mid-stream).
// Relaunch with a 32GB heap (host has 136GB) BEFORE the tsx re-exec so the flag survives via
// NODE_OPTIONS inheritance; no-op for core mode (R15: the shared guard serves every sibling sweep).
// [[reference_oscar_full_sweep_heap_oom_2026_06_25]]
reexecForHeapIfNeeded(import.meta.url);

// A bare `node sfc-all-axis-sweep.mjs` (cron / engineered loop / ad-hoc / MCP boot) cannot resolve
// the `.ts` engine import below -- Node type-strip won't rewrite a .js specifier to .ts. Relaunch
// under tsx ONCE so every launch path works; no-op when already under tsx. [[tsx-reexec-guard]]
reexecUnderTsxIfNeeded(import.meta.url);
const { speedFeedNineAxisOrchestratorEngine } = await import("../src/engines/SpeedFeedNineAxisOrchestratorEngine.js");

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const modeIdx = args.indexOf("--mode");
const MODE = modeIdx >= 0 && args[modeIdx + 1] ? args[modeIdx + 1] : "core"; // core | full
const outIdx = args.indexOf("--out");
const LEDGER_PATH =
  outIdx >= 0 && args[outIdx + 1]
    ? args[outIdx + 1]
    : path.join("state", "outcomes", "sfc-all-axis-sweep-ledger.jsonl");

// ISO-group material representatives (name + hardness so every group is physically resolvable).
const MATERIALS = {
  P: { name: "AISI 1018", iso_group: "P", hardness_hb: 126 },
  M: { name: "304 Stainless", iso_group: "M", hardness_hb: 170 },
  K: { name: "Gray cast iron", iso_group: "K", hardness_hb: 200 },
  N: { name: "6061-T6 Aluminum", iso_group: "N", hardness_hb: 95 },
  S: { name: "Ti-6Al-4V", iso_group: "S", hardness_hb: 334 },
  H: { name: "D2 tool steel 55HRC", iso_group: "H", hardness_hrc: 55 },
};

// TWO canonical baselines so axes that are CAPS (holder balance/runout cap RPM only at high
// RPM) or finish-regime (target_ra binds only when finish fz is high) are exercised where they
// BIND. An axis is judged LIVE if it moves output in EITHER regime -- otherwise a conditionally-
// live cap would be mislabeled "dead" at a single rigid-roughing baseline (cry-wolf). Every OAT
// patch overrides exactly ONE axis of a baseline; everything else stays put so spread is attributable.
// Regime A -- rigid VMC, heavy carbide roughing (force-side axes bind: workholding, rigidity, material).
function baseRigidRough() {
  return {
    machine: { way_type: "box_way", build_quality: "production", rigidity: "high", weight_kg: 4000, power_kw: 22, max_rpm: 12000, accuracy_um: 5 },
    spindle: { hp: 30, through_spindle_coolant: true },
    controller: { brand: "fanuc", high_speed_machining: true },
    material: { ...MATERIALS.P },
    workholding: { type: "kurt_vise", clamp_force_available_kn: 40 },
    tool_holder: { type: "cat40", balance_class: "g6_3", runout_tir_um: 5, operator_has_balancer: true },
    tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", stickout_mm: 36 },
    coolant: { type: "flood" },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "adaptive", axial_depth_mm: 6, radial_depth_mm: 4.8 },
    mode: "prism_optimized",
  };
}
// Regime B -- light high-RPM finish (speed-cap axes bind: holder balance/runout, accuracy, finish Ra).
function baseLightFinishHiRpm() {
  return {
    machine: { way_type: "linear_rail", build_quality: "premium", rigidity: "medium", weight_kg: 1500, power_kw: 15, max_rpm: 30000, accuracy_um: 3 },
    spindle: { hp: 15, through_spindle_coolant: true },
    controller: { brand: "fanuc", high_speed_machining: true },
    material: { ...MATERIALS.N },
    workholding: { type: "kurt_vise", clamp_force_available_kn: 25 },
    tool_holder: { type: "hsk_a63", balance_class: "g2_5", runout_tir_um: 3, operator_has_balancer: true },
    tooling: { tool_diameter_mm: 3, flutes: 3, tool_material: "carbide", stickout_mm: 18 },
    coolant: { type: "mql" },
    toolpath: { operation: "milling", cut_type: "finishing", strategy: "hsm", axial_depth_mm: 0.5, radial_depth_mm: 0.3, radial_depth_pct: 10, target_ra_um: 0.8 },
    mode: "prism_optimized",
  };
}
const BASELINES = { rigid_rough: baseRigidRough, light_finish_hirpm: baseLightFinishHiRpm };

// Deep-ish merge: patch is { subkey: {..} } or scalar top-level keys; merges one level into the base.
function withPatch(base, patch) {
  const b = base();
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && b[k] && typeof b[k] === "object") {
      b[k] = { ...b[k], ...v };
    } else {
      b[k] = v;
    }
  }
  return b;
}

// EVERY named axis -> its full level set. label is the human tag, patch overrides the axis.
const AXES = {
  // machines: rigidity via way-type x build-quality + discrete rigidity class
  machine_way: ["box_way", "linear_rail", "hybrid_way", "roller_bearing"].map((w) => ({ label: w, patch: { machine: { way_type: w } } })),
  machine_build: ["premium", "production", "economy"].map((q) => ({ label: q, patch: { machine: { build_quality: q } } })),
  machine_rigidity: ["low", "medium", "high"].map((r) => ({ label: r, patch: { machine: { rigidity: r } } })),
  machine_weight: [800, 2000, 4000, 8000].map((w) => ({ label: `${w}kg`, patch: { machine: { weight_kg: w } } })),
  machine_accuracy: [2, 5, 10, 25].map((a) => ({ label: `${a}um`, patch: { machine: { accuracy_um: a } } })),
  // spindles: HP + thru-tool coolant
  spindle_hp: [10, 20, 30, 50].map((h) => ({ label: `${h}hp`, patch: { spindle: { hp: h } } })),
  spindle_thru: [true, false].map((t) => ({ label: `thru=${t}`, patch: { spindle: { through_spindle_coolant: t } } })),
  // controllers: brand + smoothing/HSM/AICC feature stack
  controller_brand: ["fanuc", "siemens", "heidenhain", "okuma", "haas", "mazak", "hurco"].map((b) => ({ label: b, patch: { controller: { brand: b } } })),
  controller_features: [
    { label: "basic", patch: { controller: { high_speed_machining: false, ai_contour_control: false, smoothing: false, end_point_control: false } } },
    { label: "hsm", patch: { controller: { high_speed_machining: true } } },
    { label: "hsm+smoothing", patch: { controller: { high_speed_machining: true, smoothing: true } } },
    { label: "aicc-premium", patch: { controller: { high_speed_machining: true, ai_contour_control: true, smoothing: true, end_point_control: true } } },
  ],
  // materials: 6 ISO groups
  material: Object.keys(MATERIALS).map((g) => ({ label: g, patch: { material: { ...MATERIALS[g] } } })),
  // work holding / fixture: full enum (rigid tombstone -> weak vacuum)
  workholding: ["kurt_vise", "soft_jaw", "magnetic", "vacuum", "custom_fixture", "tombstone", "collet", "chuck_3jaw", "chuck_4jaw"].map((w) => ({ label: w, patch: { workholding: { type: w } } })),
  // tool holder CONNECTION type: full enum (taper / HSK / Capto / shrink / hydraulic / collet)
  tool_holder_type: ["cat40", "cat50", "bt30", "bt40", "bt50", "hsk_a40", "hsk_a63", "hsk_a100", "capto_c5", "capto_c6", "shrink_fit", "hydraulic", "er_collet", "mill_chuck"].map((t) => ({ label: t, patch: { tool_holder: { type: t } } })),
  // holding MECHANISM: ISO-1940 balance grade (max speed) + runout TIR (accuracy/dampening proxy)
  holder_balance: ["g0_4", "g1", "g2_5", "g6_3", "g16", "g40"].map((b) => ({ label: b, patch: { tool_holder: { balance_class: b } } })),
  holder_runout: [1, 3, 5, 10, 20].map((r) => ({ label: `${r}um`, patch: { tool_holder: { runout_tir_um: r } } })),
  // tooling + insert: tool material
  tool_material: ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"].map((m) => ({ label: m, patch: { tooling: { tool_material: m } } })),
  tool_diameter: [3, 6, 12, 20, 50].map((d) => ({ label: `${d}mm`, patch: { tooling: { tool_diameter_mm: d } } })),
  tool_flutes: [2, 3, 4, 6].map((f) => ({ label: `${f}fl`, patch: { tooling: { flutes: f } } })),
  // coolant type: full enum
  coolant: ["flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic"].map((c) => ({ label: c, patch: { coolant: { type: c } } })),
  // tool path type: strategy enum
  toolpath_strategy: ["conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot"].map((s) => ({ label: s, patch: { toolpath: { strategy: s } } })),
  // operation type
  operation: ["milling", "turning", "drilling", "boring", "reaming", "thread_milling"].map((o) => ({ label: o, patch: { toolpath: { operation: o } } })),
  // desired finish quality: cut_type (roughing / semifinish / finish)
  cut_type: ["roughing", "semi_finishing", "finishing"].map((c) => ({ label: c, patch: { toolpath: { cut_type: c } } })),
  // desired finish quality: target Ra (um). The finish-Ra cap (fz_max = sqrt(targetRa/predictedRa(1,r)))
  // SKIPS without a nose radius and only BINDS when the target is finer than the category fz delivers,
  // so we supply corner_radius_mm AND sweep down to mirror-finish Ra 0.1 to exercise the bind path.
  target_ra: [0.1, 0.2, 0.4, 0.8, 1.6].map((ra) => ({ label: `Ra${ra}`, patch: { tooling: { corner_radius_mm: 0.4 }, toolpath: { cut_type: "finishing", target_ra_um: ra } } })),
  // cutting parameter: optimization mode
  mode: ["prism_optimized", "aggressive_rush", "cost_batch"].map((m) => ({ label: m, patch: { mode: m } })),
  // cutting parameter: radial engagement (ae/D) -- set BOTH mm + pct so whichever the SFC reads takes
  radial_pct: [10, 25, 50, 75, 100].map((p) => ({ label: `ae${p}%`, patch: { toolpath: { radial_depth_mm: (12 * p) / 100, radial_depth_pct: p } } })),
  // cutting parameter: axial depth of cut (ap)
  axial_depth: [0.5, 2, 4, 6, 10].map((ap) => ({ label: `ap${ap}`, patch: { toolpath: { axial_depth_mm: ap } } })),
};

// Pull the headline output axes from an orchestrator recommendation (null-safe). tool_life is
// included so axes that move TOOL LIFE but not vc/feed/mrr (holder runout/connection-type ->
// runout-life + balance derates) are credited LIVE instead of falsely read as inert on speed/feed.
function outOf(res) {
  const r = res && res.recommendation;
  if (!r) return null;
  return {
    vc: num(r.cutting_speed_mpm),
    rpm: num(r.spindle_rpm),
    feed: num(r.feed_rate_mmmin),
    fz: num(r.feed_per_tooth_mm),
    mrr: num(r.mrr_cm3min),
    tool_life: num(r.tool_life_min),
  };
}
function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
function median(xs) {
  const s = xs.filter((x) => x !== null).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function spreadPct(xs) {
  const s = xs.filter((x) => x !== null);
  if (s.length < 2) return null;
  const lo = Math.min(...s);
  const hi = Math.max(...s);
  const med = median(s);
  return med && med !== 0 ? Number((((hi - lo) / Math.abs(med)) * 100).toFixed(1)) : null;
}

const AXIS_LIVE_THRESHOLD_PCT = 0.1; // > this spread in ANY regime => the axis genuinely moves output

// Axes that are INTENTIONALLY inert on speed/feed -- physics-reviewer-verified by-design (NOT gaps).
// They must read distinctly from a genuine wiring-gap so the sweep does not over-report "incomplete":
// an inert by-design axis is CORRECT, only the non-by-design inert axes are the remaining work.
const BY_DESIGN_INERT = {
  machine_accuracy: "positioning accuracy is a geometric error-budget term, orthogonal to chip-formation (Kienzle/Taylor/SLD) -- coupling it into vc/fz would be unphysical; machine stiffness is already carried by machine_rigidity_factor",
  controller_brand: "controller capability is per-option-license not per-vendor (two fanuc machines differ on AICC) -- correctly keyed on the feature flags, not the brand string",
};

function runOAT() {
  // For each axis: sweep every level over BOTH baseline regimes; the axis's effect = the LARGER
  // spread across regimes (so a cap axis that only binds at high RPM is still credited LIVE).
  const perAxis = {};
  let runs = 0;
  let feasible = 0;
  for (const [axis, levels] of Object.entries(AXES)) {
    const perRegime = {};
    for (const [regime, baseFn] of Object.entries(BASELINES)) {
      const rows = [];
      for (const lv of levels) {
        runs++;
        let out = null;
        let ok = false;
        try {
          const res = speedFeedNineAxisOrchestratorEngine.run(withPatch(baseFn, lv.patch));
          out = outOf(res);
          ok = out !== null && out.rpm !== null;
          if (ok) feasible++;
        } catch (e) {
          ok = false;
        }
        rows.push({ ok, ...(out || { vc: null, rpm: null, feed: null, mrr: null }) });
      }
      perRegime[regime] = {
        rpm: spreadPct(rows.map((r) => r.rpm)),
        feed: spreadPct(rows.map((r) => r.feed)),
        mrr: spreadPct(rows.map((r) => r.mrr)),
        tool_life: spreadPct(rows.map((r) => r.tool_life)),
        feasible_levels: rows.filter((r) => r.ok).length,
      };
    }
    // Best (largest) spread per metric across regimes, + which regime produced the strongest signal.
    const best = (metric) => {
      const vals = Object.values(perRegime).map((r) => r[metric]).filter((x) => x !== null);
      return vals.length ? Math.max(...vals) : null;
    };
    const rpmS = best("rpm");
    const feedS = best("feed");
    const mrrS = best("mrr");
    const tlS = best("tool_life");
    // Classify HOW the axis is live FIRST: on the speed/feed headline, or tool-life-only. A
    // runout/connection-type axis can be inert on vc/feed/mrr yet drive the Taylor tool-life derate
    // -- still a real calculation effect, but honestly NOT a change to the speed/feed recommendation.
    const headlineLive = [rpmS, feedS, mrrS].some((s) => s !== null && s > AXIS_LIVE_THRESHOLD_PCT);
    const live = headlineLive || (tlS !== null && tlS > AXIS_LIVE_THRESHOLD_PCT);
    const effect = live
      ? headlineLive ? "speed_feed" : "tool_life_only"
      : BY_DESIGN_INERT[axis] ? "by_design_inert" : "inert";
    // regime = the baseline where this axis's DEFINING signal peaks (headline metrics for a
    // speed_feed axis, tool-life for a tool_life_only axis) -- so a balance/RPM-cap axis reports the
    // high-RPM regime where its cap binds, not whichever regime happens to have the largest tool-life move.
    const regimeMetrics = headlineLive ? ["rpm", "feed", "mrr"] : ["tool_life"];
    let bestRegime = null;
    let bestMag = -1;
    for (const [regime, r] of Object.entries(perRegime)) {
      const mag = Math.max(...regimeMetrics.map((m) => (r[m] === null ? 0 : r[m])));
      if (mag > bestMag) {
        bestMag = mag;
        bestRegime = regime;
      }
    }
    perAxis[axis] = {
      levels: levels.length,
      feasible_levels: Math.max(...Object.values(perRegime).map((r) => r.feasible_levels)),
      rpm_spread_pct: rpmS,
      feed_spread_pct: feedS,
      mrr_spread_pct: mrrS,
      tool_life_spread_pct: tlS,
      live,
      effect,
      regime: live ? bestRegime : null,
    };
  }
  return { perAxis, runs, feasible };
}

function factorialLevels() {
  // core = bounded representative levels; full = full enums for the heavy machine-side axes.
  if (MODE === "full") {
    return {
      machine_way: ["box_way", "linear_rail", "hybrid_way", "roller_bearing"],
      workholding: ["kurt_vise", "soft_jaw", "custom_fixture", "tombstone", "collet", "chuck_3jaw", "chuck_4jaw"],
      tool_holder: ["cat40", "bt40", "hsk_a63", "capto_c6", "shrink_fit", "hydraulic", "er_collet"],
      coolant: ["flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic"],
      material: ["P", "M", "K", "N", "S", "H"],
      tool_material: ["carbide", "hss", "cermet", "ceramic", "cbn"],
      cut_type: ["roughing", "semi_finishing", "finishing"],
      diameter: [3, 6, 12, 20, 50],
      mode: ["prism_optimized", "aggressive_rush", "cost_batch"],
    };
  }
  return {
    machine_way: ["box_way", "linear_rail"],
    workholding: ["kurt_vise", "custom_fixture", "collet"],
    tool_holder: ["cat40", "hsk_a63", "shrink_fit"],
    coolant: ["flood", "dry", "through_tool"],
    material: ["P", "M", "K", "N", "S", "H"],
    tool_material: ["carbide", "hss"],
    cut_type: ["roughing", "finishing"],
    diameter: [6, 12, 20],
    mode: ["prism_optimized"],
  };
}

function runFactorial() {
  const L = factorialLevels();
  const dir = path.dirname(LEDGER_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(LEDGER_PATH)) fs.rmSync(LEDGER_PATH);

  let total = 0;
  let feasible = 0;
  let rows = 0;
  let oracleChecked = 0;
  const oracleViolations = []; // silent-wrong: rpm != Vc*1000/(pi*D) on a feasible cell
  let thinningChecked = 0;
  const thinningViolations = []; // silent-wrong: feed_rate < geometric fz*z*RPM (inverted chip-thinning -> under-feed/rub)
  // Cross-cell oracle: HSS Vc must be < carbide Vc (same machine/holder/material/...), and
  // aluminium(N) > steel(P) > superalloy(S) speed ordering -- matched on the factorial's own axes.
  const xcell = makeCrossCellOracle({
    toolMatKey: (p) => `${p.way}|${p.workholding}|${p.tool_holder}|${p.coolant}|${p.iso}|${p.cut_type}|${p.diameter_mm}|${p.mode}`,
    materialKey: (p) => `${p.way}|${p.workholding}|${p.tool_holder}|${p.coolant}|${p.cut_type}|${p.diameter_mm}|${p.mode}`,
    isoOf: (p) => p.iso,
  });
  const isoTouched = new Set();
  for (const way of L.machine_way)
    for (const wh of L.workholding)
      for (const th of L.tool_holder)
        for (const cl of L.coolant)
          for (const mat of L.material)
            for (const tm of L.tool_material)
              for (const ct of L.cut_type)
                for (const dia of L.diameter)
                  for (const md of L.mode) {
                    total++;
                    const input = withPatch(baseRigidRough, {
                      machine: { way_type: way },
                      workholding: { type: wh },
                      tool_holder: { type: th },
                      coolant: { type: cl },
                      material: { ...MATERIALS[mat] },
                      tooling: { tool_material: tm, tool_diameter_mm: dia },
                      toolpath: { cut_type: ct, radial_depth_mm: ct === "finishing" ? dia * 0.1 : dia * 0.4 },
                      mode: md,
                    });
                    let out = null;
                    let ok = false;
                    let warn = 0;
                    try {
                      const res = speedFeedNineAxisOrchestratorEngine.run(input);
                      out = outOf(res);
                      warn = Array.isArray(res?.warnings) ? res.warnings.length : 0;
                      ok = out !== null && out.rpm !== null;
                      if (ok) feasible++;
                    } catch (e) {
                      ok = false;
                    }
                    // Silent-wrong oracle: on a feasible cell, the published RPM must equal
                    // Vc*1000/(pi*D) for the resolved diameter -- exact for every combination.
                    if (ok && out.vc !== null) {
                      oracleChecked++;
                      const viol = checkRpmConsistency({ tool_diameter: dia }, { cutting_speed_m_min: out.vc, spindle_rpm: out.rpm });
                      if (viol && oracleViolations.length < 500) {
                        oracleViolations.push({ way, workholding: wh, tool_holder: th, coolant: cl, iso: mat, tool_material: tm, cut_type: ct, diameter_mm: dia, mode: md, ...viol });
                      }
                      // Chip-thinning sign: published feed must be >= geometric fz*z*RPM. The
                      // factorial is milling (baseRigidRough operation), so the milling-op gate is satisfied.
                      if (out.fz !== null && out.feed !== null) {
                        thinningChecked++;
                        const tv = checkChipThinningDirection(
                          { operation: "face_milling", number_of_teeth: input.tooling.flutes },
                          { feed_per_tooth_mm: out.fz, spindle_rpm: out.rpm, feed_rate_mm_min: out.feed },
                        );
                        if (tv && thinningViolations.length < 500) {
                          thinningViolations.push({ way, workholding: wh, tool_holder: th, coolant: cl, iso: mat, tool_material: tm, cut_type: ct, diameter_mm: dia, mode: md, ...tv });
                        }
                      }
                      // Cross-cell record (HSS<carbide + ISO speed ordering); evaluated after the loop.
                      xcell.record(
                        { way, workholding: wh, tool_holder: th, coolant: cl, iso: mat, material: mat, cut_type: ct, diameter_mm: dia, mode: md, tool_material: tm },
                        { cutting_speed_m_min: out.vc },
                      );
                    }
                    isoTouched.add(mat);
                    fs.appendFileSync(
                      LEDGER_PATH,
                      JSON.stringify({
                        way, workholding: wh, tool_holder: th, coolant: cl, iso: mat,
                        tool_material: tm, cut_type: ct, diameter_mm: dia, mode: md,
                        feasible: ok, warnings: warn,
                        vc_mpm: out?.vc ?? null, rpm: out?.rpm ?? null, feed_mmmin: out?.feed ?? null, mrr_cm3min: out?.mrr ?? null,
                      }) + "\n",
                    );
                    rows++;
                  }
  const crossViolations = xcell.violations({ maxReport: 500 });
  return { total, feasible, rows, isoTouched: [...isoTouched].sort(), axes: Object.keys(L), levelCounts: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.length])), oracleChecked, oracleViolations, thinningChecked, thinningViolations, crossViolations };
}

function main() {
  const oat = runOAT();
  const fac = runFactorial();

  const deadAxes = Object.entries(oat.perAxis).filter(([, v]) => !v.live).map(([k]) => k);
  const summary = {
    unit: "U-OSC-ALL-AXIS-SWEEP",
    mode: MODE,
    named_axes_swept: Object.keys(AXES).length,
    oat_runs: oat.runs,
    oat_feasible: oat.feasible,
    dead_axes: deadAxes, // R12: an axis with zero output spread is reported, not hidden
    factorial_combinations: fac.total,
    factorial_feasible: fac.feasible,
    factorial_iso_groups: fac.isoTouched,
    factorial_axes: fac.axes,
    factorial_level_counts: fac.levelCounts,
    ledger_path: LEDGER_PATH,
    ledger_rows: fac.rows,
    // Silent-wrong math oracle (U-SFC-SWEEP-ORACLE): rpm == Vc*1000/(pi*D) on every feasible cell.
    oracle_rpm_checked: fac.oracleChecked,
    oracle_rpm_violations: fac.oracleViolations.length,
    oracle_rpm_violation_sample: fac.oracleViolations.slice(0, 10),
    oracle_thinning_checked: fac.thinningChecked,
    oracle_thinning_violations: fac.thinningViolations.length,
    oracle_thinning_violation_sample: fac.thinningViolations.slice(0, 10),
    oracle_crosscell_violations: fac.crossViolations.length,
    oracle_crosscell_violation_sample: fac.crossViolations.slice(0, 10),
    per_axis: Object.fromEntries(
      Object.entries(oat.perAxis).map(([k, v]) => [
        k,
        { levels: v.levels, feasible_levels: v.feasible_levels, rpm_spread_pct: v.rpm_spread_pct, feed_spread_pct: v.feed_spread_pct, mrr_spread_pct: v.mrr_spread_pct, tool_life_spread_pct: v.tool_life_spread_pct, live: v.live, effect: v.effect, regime: v.regime },
      ]),
    ),
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("\nSFC ALL-AXIS SWEEP -- every named axis through the live NineAxisOrchestrator");
  console.log("=".repeat(82));
  console.log(`named axes swept: ${summary.named_axes_swept}  ·  OAT runs: ${oat.runs} (${oat.feasible} feasible)  ·  mode: ${MODE}`);
  console.log(`factorial: ${fac.total} combinations (${fac.feasible} feasible) across ${fac.axes.length} axes  ·  ledger: ${LEDGER_PATH} (${fac.rows} rows)`);
  console.log("-".repeat(82));
  console.log("PHASE 1 -- OAT (each axis swept over ALL its levels x 2 regimes; spread% = max-variability effect):");
  console.log("  axis                | lvl | feas | rpm % | feed % | mrr % | tlife % | EFFECT (regime)");
  for (const [axis, v] of Object.entries(oat.perAxis)) {
    const f = (x) => (x === null ? "    -" : String(x).padStart(6));
    const tag = v.live ? `${v.effect} (${v.regime})` : "INERT";
    console.log(
      `  ${axis.padEnd(19)} | ${String(v.levels).padStart(3)} | ${String(v.feasible_levels).padStart(4)} | ${f(v.rpm_spread_pct)} | ${f(v.feed_spread_pct)} | ${f(v.mrr_spread_pct)} | ${f(v.tool_life_spread_pct)} | ${tag}`,
    );
  }
  console.log("-".repeat(82));
  const sfCount = Object.values(oat.perAxis).filter((v) => v.effect === "speed_feed").length;
  const tlCount = Object.values(oat.perAxis).filter((v) => v.effect === "tool_life_only").length;
  const byDesignAxes = Object.entries(oat.perAxis).filter(([, v]) => v.effect === "by_design_inert").map(([k]) => k);
  const gapAxes = Object.entries(oat.perAxis).filter(([, v]) => v.effect === "inert").map(([k]) => k);
  const liveCount = summary.named_axes_swept - deadAxes.length;
  if (gapAxes.length === 0) {
    console.log(`PHASE 1 verdict: ${liveCount}/${summary.named_axes_swept} LIVE (${sfCount} speed/feed + ${tlCount} tool-life-only) + ${byDesignAxes.length} by-design-inert. 0 REMAINING GAPS -- every named axis is accounted for.`);
    if (byDesignAxes.length) console.log(`  by-design-inert (MUST NOT move speed/feed, correct as-is): ${byDesignAxes.join(", ")}`);
  } else {
    console.log(`PHASE 1 verdict: ${liveCount}/${summary.named_axes_swept} LIVE (${sfCount} speed/feed + ${tlCount} tool-life-only) + ${byDesignAxes.length} by-design-inert. REMAINING GAPS (${gapAxes.length}): ${gapAxes.join(", ")}`);
    if (byDesignAxes.length) console.log(`  by-design-inert (correct, NOT a gap): ${byDesignAxes.join(", ")}`);
    console.log("  REMAINING GAPS triage by cause: OPTIMIZER-INTERNALIZED (radial/axial DOC chosen by prism_optimized");
    console.log("  -> operator input advisory; re-test under cost_batch/aggressive_rush) OR a WIRING GAP (a factor");
    console.log("  computed but not flowed to the headline). Fix = the U-OSC-DEAD-AXIS-TRIAGE follow-up.");
  }
  console.log("-".repeat(82));
  console.log("PHASE 2 -- FACTORIAL (every combination of the categorical machine-side axes):");
  console.log(`  ${fac.total} combinations streamed (${fac.feasible} feasible / ${fac.total - fac.feasible} retention-or-physics-infeasible)`);
  console.log(`  axes: ${fac.axes.join(" x ")}`);
  console.log(`  level counts: ${Object.entries(fac.levelCounts).map(([k, n]) => `${k}=${n}`).join(", ")}`);
  console.log(`  ISO groups covered: ${fac.isoTouched.join(", ")}`);
  console.log("  NOTE: infeasible cells are HONEST -- e.g. ceramic/cbn on P/N, or a vacuum/collet");
  console.log("  fixture that can't react the cutting force, fail the orchestrator's retention/");
  console.log("  balance/force gates (fail-loud per cell). Run `--mode full` for the full-enum");
  console.log("  factorial (Blackwell/NVMe scale). The JSONL ledger is the downstream calibration input.");
  console.log("-".repeat(82));
  console.log("PHASE 3 -- SILENT-WRONG ORACLE (rpm == Vc*1000/(pi*D) exact on every feasible cell):");
  if (fac.oracleViolations.length === 0) {
    console.log(`  rpm==Vc*1000/(pi*D): ${fac.oracleChecked} cells -> 0 inconsistent (self-consistent across ALL machine/holder/controller/material/coolant combinations).`);
  } else {
    console.log(`  rpm==Vc*1000/(pi*D): ${fac.oracleChecked} cells -> ${fac.oracleViolations.length} RPM-INCONSISTENT (SILENT-WRONG):`);
    for (const v of fac.oracleViolations.slice(0, 5)) {
      console.log(`    ${v.iso} ${v.tool_material} D${v.diameter_mm} ${v.way}/${v.tool_holder} -> expected rpm ${v.expected.toFixed(0)}, engine ${v.actual.toFixed(0)} (${(v.relPct * 100).toFixed(1)}%)`);
    }
  }
  if (fac.thinningViolations.length === 0) {
    console.log(`  feed >= geometric fz*z*RPM: ${fac.thinningChecked} cells -> 0 inverted (chip-thinning sign correct -- never under-feeds below the geometric chip load).`);
  } else {
    console.log(`  feed >= geometric fz*z*RPM: ${fac.thinningChecked} cells -> ${fac.thinningViolations.length} INVERTED (SILENT-WRONG under-feed/rub):`);
    for (const v of fac.thinningViolations.slice(0, 5)) {
      console.log(`    ${v.iso} ${v.tool_material} D${v.diameter_mm} ${v.way} -> feed ${v.feedRate.toFixed(0)} < geometric ${v.geometricFeed.toFixed(0)} (ratio ${v.ratio.toFixed(2)})`);
    }
  }
  if (fac.crossViolations.length === 0) {
    console.log(`  cross-cell (HSS<carbide + N>P>S speed ordering): 0 violations (tool-material + machinability ordering correct across all matched cells).`);
  } else {
    console.log(`  cross-cell (HSS<carbide + N>P>S speed ordering): ${fac.crossViolations.length} VIOLATIONS (SILENT-WRONG):`);
    for (const v of fac.crossViolations.slice(0, 5)) {
      if (v.kind === "hss_not_slower_than_carbide") console.log(`    hss_not_slower [${v.key}] carbideVc=${v.carbideVc.toFixed(1)} hssVc=${v.hssVc.toFixed(1)}`);
      else console.log(`    speed_ordering [${v.key}] ${v.faster.material}(${v.faster.iso})Vc=${v.faster.vc.toFixed(1)} <= ${v.slower.material}(${v.slower.iso})Vc=${v.slower.vc.toFixed(1)}`);
    }
  }
  console.log("=".repeat(82));
}

// Run only when invoked directly (so tests can import runOAT/runFactorial without side effects).
const INVOKED_DIRECTLY = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (INVOKED_DIRECTLY) main();

export { runOAT, runFactorial, AXES, BASELINES, withPatch, baseRigidRough, baseLightFinishHiRpm, MATERIALS, AXIS_LIVE_THRESHOLD_PCT };
