#!/usr/bin/env node
/**
 * sfc-full-sweep-compare — OSCAR-SFC-9AXIS-MS0 / U-OSC-FULL-SWEEP
 * ===============================================================
 *
 * The "compare ALL potential inputs vs G-Wizard + HSMAdvisor baseline" sweep.
 * Enumerates the FULL prod-mode input space the SFC app page exposes (every
 * material × tool-diameter × optimization-mode per ISO group, mill + lathe)
 * via SpeedFeedExhaustiveCombinationEngine, then drives EACH cell through the
 * wired tri-vendor comparator (SpeedFeedTriComparatorEngine) against the same
 * LIVE vendor data the single-cell closed-loop driver uses (G-Wizard toolcrib +
 * HSMAdvisor settings, both abstain/flag honestly when they have no match).
 *
 * Emits:
 *   - a per-cell JSONL ledger (NVMe-friendly streaming, one row per cell)
 *   - a per-ISO-group aggregate of PRISM-vs-baseline Vc deltas (where PRISM
 *     sits relative to the grounded 5-vendor baseline across the whole input
 *     space — the calibration-learning signal).
 *
 * This is the COMPARISON layer (CPU physics, ~96 cells, sub-second each). The
 * GPU/Blackwell training layer (feeding these deltas into PRISM_SFC_CALIB_APPLY
 * calibration) is a separate downstream unit — this sweep produces its input.
 *
 * Run:  npx tsx scripts/sfc-full-sweep-compare.mjs                 (live vendor)
 *       npx tsx scripts/sfc-full-sweep-compare.mjs --no-vendor     (PRISM+baseline)
 *       npx tsx scripts/sfc-full-sweep-compare.mjs --json          (machine output)
 *       npx tsx scripts/sfc-full-sweep-compare.mjs --out <path>    (ledger path)
 *
 * @milestone OSCAR-SFC-9AXIS-MS0
 * @unit U-OSC-FULL-SWEEP
 */

import fs from "node:fs";
import path from "node:path";
import { speedFeedExhaustiveCombinationEngine } from "../src/engines/SpeedFeedExhaustiveCombinationEngine.js";
import { speedFeedTriComparatorEngine } from "../src/engines/SpeedFeedTriComparatorEngine.js";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const NO_VENDOR = args.includes("--no-vendor");
// --mode prod|full (default prod). full = the SFC app page's real selectable input
// space (~69K cells across mill+lathe) — the Blackwell/128GB/NVMe-scale sweep.
const modeIdx = args.indexOf("--mode");
const SWEEP_MODE = modeIdx >= 0 && args[modeIdx + 1] ? args[modeIdx + 1] : "prod";
const outIdx = args.indexOf("--out");
const LEDGER_PATH =
  outIdx >= 0 && args[outIdx + 1]
    ? args[outIdx + 1]
    : path.join("state", "outcomes", "sfc-full-sweep-ledger.jsonl");

const ISO_OF = {}; // material → iso_group, filled as we go

/** Cutting-tool materials the comparator + BOTH vendor adapters model (TriCompareInputSchema
 *  enum). Gating is ASYMMETRIC: the vendor/baseline side abstains (axisVc null) on a material
 *  it has no datum for (the published baseline is carbide-keyed), but PRISM emits a Vc for
 *  EVERY material -- it does NOT model tool/workpiece non-viability as abstention. So we sweep
 *  all and let baseline-coverage gate which combos produce a real delta; `prism_available`
 *  therefore means "PRISM produced a number," NOT "shop-viable combo". */
const TOOL_MATERIALS = ["carbide", "hss", "ceramic", "cbn"];

/** Map an exhaustive-sweep cell's input_summary → a TriCompareInput at a given tool material. */
function cellToTriInput(c, toolMaterial = "carbide") {
  const s = c.input_summary;
  return {
    material: { iso_group: s.iso_group, name: s.material },
    tooling: {
      tool_diameter_mm: s.tool_diameter_mm,
      flutes: s.flutes > 0 ? s.flutes : undefined,
      tool_material: toolMaterial,
    },
    toolpath: {
      operation: c.domain === "lathe" ? "turning" : "milling",
      cut_type: s.cut_type === "semi" ? "semi_finishing" : s.cut_type,
    },
    optimization_mode:
      s.mode === "aggressive_rush" || s.mode === "cost_batch" ? s.mode : "prism_optimized",
    include_baseline: true,
    include_hsmadvisor: !NO_VENDOR,
    include_gwizard: !NO_VENDOR,
  };
}

function axisVc(sys) {
  return sys && sys.available && sys.axes && Number.isFinite(sys.axes.vc_mpm) ? sys.axes.vc_mpm : null;
}

function run() {
  // Stream the per-cell ledger (NVMe append). Cells are produced lazily via the
  // engine generator (runStreaming) so a 69K-cell `full` sweep never holds all
  // results in memory — the 128GB host streams one cell at a time to the ledger.
  const dir = path.dirname(LEDGER_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let ledgerLines = 0;
  if (fs.existsSync(LEDGER_PATH)) fs.rmSync(LEDGER_PATH); // fresh sweep

  // Aggregate accumulators, per ISO group.
  const byIso = {}; // iso → { n, prismVsBaselineDeltaPct: [], prismLower, prismHigher, gwSeen, hsmSeen }
  const byMaterial = {}; // tool_material → { n, available, deltas[] } -- proves the comparison varies with tool material
  // Per-VENDOR published-reference accumulator (U-OSC-COMPARE-PER-VENDOR): the explicit
  // "PRISM vs G-Wizard" / "PRISM vs HSMAdvisor" the goal asks for, BY NAME. cnccookbook =
  // CNCCookbook, the publisher of G-Wizard (its rows ARE G-Wizard's published S&F table);
  // hsmadvisor = HSMAdvisor's public reference table. Signed vc/fz variances come from the
  // comparator's per_source breakdown (positive = PRISM faster/higher than that vendor).
  const byVendor = { cnccookbook: { n: 0, vcDeltas: [], fzDeltas: [] }, hsmadvisor: { n: 0, vcDeltas: [], fzDeltas: [] } };
  let prismRan = 0;
  let cellErrors = 0;
  let totalCells = 0;
  let totalComparisons = 0; // = base cells x tool materials actually run

  function* allCells() {
    for (const domain of ["mill", "lathe"]) {
      yield* speedFeedExhaustiveCombinationEngine.runStreaming({ domain, sample_mode: SWEEP_MODE });
    }
  }

  for (const c of allCells()) {
    if (c.output === null) {
      cellErrors++;
      continue; // orchestrator threw for this cell — excluded from comparison
    }
    totalCells++;
    // Sweep tool_material per cell -- the goal's "tooling + insert" axis. PRISM computes a
    // per-material recommendation for EVERY material (Vc varies strongly: hss << carbide <<
    // ceramic/cbn); the PRISM-vs-baseline DELTA only lands where the (carbide-keyed) baseline
    // has a datum. PRISM does not abstain on non-viable combos -- baseline-coverage gates them.
    for (const tm of TOOL_MATERIALS) {
      let res;
      try {
        res = speedFeedTriComparatorEngine.run(cellToTriInput(c, tm));
      } catch (e) {
        cellErrors++;
        continue;
      }
      totalComparisons++;
      const by = Object.fromEntries(res.systems.map((s) => [s.system, s]));
      const prismVc = axisVc(by.prism);
      const baselineVc = axisVc(by.baseline);
      const gwVc = axisVc(by.gwizard);
      const hsmVc = axisVc(by.hsmadvisor);
      if (prismVc !== null) prismRan++;

      const iso = c.input_summary.iso_group;
      byIso[iso] ||= { n: 0, deltas: [], prismLower: 0, prismHigher: 0, gwSeen: 0, hsmSeen: 0 };
      const a = byIso[iso];
      a.n++;
      let deltaPct = null;
      if (prismVc !== null && baselineVc !== null && baselineVc > 0) {
        deltaPct = ((prismVc - baselineVc) / baselineVc) * 100;
        a.deltas.push(deltaPct);
        if (prismVc < baselineVc) a.prismLower++;
        else a.prismHigher++;
      }
      if (gwVc !== null) a.gwSeen++;
      if (hsmVc !== null) a.hsmSeen++;

      // Per-tool-material rollup -- the proof the axis is meaningful (PRISM Vc differs by
      // material) AND an honest record of comparison REACH (baselineSeen): a null-baseline
      // material has PRISM numbers but no published datum to compare against.
      byMaterial[tm] ||= { n: 0, available: 0, baselineSeen: 0, deltas: [] };
      const mm = byMaterial[tm];
      mm.n++;
      if (prismVc !== null) mm.available++;
      if (baselineVc !== null) mm.baselineSeen++;
      if (deltaPct !== null) mm.deltas.push(deltaPct);

      // Per-VENDOR published deltas: extract cnccookbook (= G-Wizard publisher) + hsmadvisor
      // rows from the comparator's per_source breakdown. This is the published reference, NOT
      // the live closed-app calculator (those are the gwizard/hsmadvisor `systems[]` adapters,
      // which read the installed apps and abstain when no cut is open).
      let gwPubDelta = null;
      let hsmPubDelta = null;
      const perSource = (res.baseline_detail && res.baseline_detail.per_source) || [];
      for (const ps of perSource) {
        const acc =
          ps.source === "cnccookbook" ? byVendor.cnccookbook : ps.source === "hsmadvisor" ? byVendor.hsmadvisor : null;
        if (!acc) continue;
        acc.n++;
        if (Number.isFinite(ps.vc_variance_pct)) acc.vcDeltas.push(ps.vc_variance_pct);
        if (Number.isFinite(ps.fz_variance_pct)) acc.fzDeltas.push(ps.fz_variance_pct);
        if (ps.source === "cnccookbook") gwPubDelta = ps.vc_variance_pct;
        if (ps.source === "hsmadvisor") hsmPubDelta = ps.vc_variance_pct;
      }

      const row = {
        cell_id: c.cell_id,
        domain: c.domain,
        iso,
        material: c.input_summary.material,
        tool_material: tm,
        tool_diameter_mm: c.input_summary.tool_diameter_mm,
        mode: c.input_summary.mode,
        prism_vc_mpm: prismVc,
        baseline_vc_mpm: baselineVc,
        gwizard_vc_mpm: gwVc,
        gwizard_aligned: by.gwizard?.aligned ?? null,
        hsmadvisor_vc_mpm: hsmVc,
        hsmadvisor_aligned: by.hsmadvisor?.aligned ?? null,
        consensus_vc_mpm: res.consensus ? res.consensus.vc_mpm : null,
        // Published-reference per-vendor Vc deltas (signed %, PRISM vs vendor published table).
        gwizard_published_vc_delta_pct: gwPubDelta, // cnccookbook = G-Wizard's published S&F
        hsmadvisor_published_vc_delta_pct: hsmPubDelta, // HSMAdvisor public reference table
      };
      fs.appendFileSync(LEDGER_PATH, JSON.stringify(row) + "\n");
      ledgerLines++;
    }
  }

  // Build per-ISO summary.
  const median = (xs) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((p, q) => p - q);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const isoSummary = Object.fromEntries(
    Object.entries(byIso).map(([iso, a]) => [
      iso,
      {
        cells: a.n,
        prism_vs_baseline_median_delta_pct: a.deltas.length ? Number(median(a.deltas).toFixed(1)) : null,
        prism_conservative_cells: a.prismLower, // PRISM below baseline = safe direction
        prism_aggressive_cells: a.prismHigher,
        gwizard_contributed: a.gwSeen,
        hsmadvisor_contributed: a.hsmSeen,
      },
    ]),
  );

  // Per-tool-material summary -- the proof the tool_material axis is MEANINGFUL: if the
  // median delta differs across materials, the comparison genuinely varies with tool material
  // (not just more carbide rows). Identical medians would mean the axis is inert on this surface.
  const perToolMaterial = Object.fromEntries(
    TOOL_MATERIALS.map((tm) => {
      const mm = byMaterial[tm] || { n: 0, available: 0, baselineSeen: 0, deltas: [] };
      return [
        tm,
        {
          comparisons: mm.n,
          prism_available: mm.available, // how many combos PRISM produced a Vc for
          baseline_datapoints: mm.baselineSeen, // published baseline reach for this tool material
          prism_vs_baseline_median_delta_pct: mm.deltas.length ? Number(median(mm.deltas).toFixed(1)) : null,
        },
      ];
    }),
  );

  // Per-VENDOR published-reference summary -- the explicit "PRISM vs G-Wizard" / "PRISM vs
  // HSMAdvisor" the goal names. Median signed Vc/fz delta per vendor + conservative/aggressive
  // split. Published reference, NOT the live closed-app calculator (operator-gated, no API).
  const perVendor = {
    gwizard_cnccookbook_published: byVendor.cnccookbook,
    hsmadvisor_published: byVendor.hsmadvisor,
  };
  const perVendorSummary = Object.fromEntries(
    Object.entries(perVendor).map(([label, v]) => [
      label,
      {
        published_datapoints: v.n, // how many cells had this vendor's published datum to compare
        prism_vs_vendor_median_vc_delta_pct: v.vcDeltas.length ? Number(median(v.vcDeltas).toFixed(1)) : null,
        prism_vs_vendor_median_fz_delta_pct: v.fzDeltas.length ? Number(median(v.fzDeltas).toFixed(1)) : null,
        prism_conservative_cells: v.vcDeltas.filter((d) => d < 0).length, // PRISM below vendor = safe
        prism_aggressive_cells: v.vcDeltas.filter((d) => d > 0).length,
      },
    ]),
  );

  const summary = {
    total_cells: totalCells,
    total_comparisons: totalComparisons,
    tool_materials: TOOL_MATERIALS,
    sweep_mode: SWEEP_MODE,
    prism_ran: prismRan,
    cell_errors: cellErrors,
    ledger_rows: ledgerLines,
    ledger_path: LEDGER_PATH,
    vendor_mode: NO_VENDOR ? "offline (PRISM+baseline)" : "live (G-Wizard + HSMAdvisor)",
    per_iso: isoSummary,
    per_tool_material: perToolMaterial,
    per_vendor_published: perVendorSummary,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("\nSFC FULL-SWEEP COMPARISON — all app-page inputs × PRISM x baseline x vendors");
  console.log("=".repeat(78));
  console.log(`cells: ${totalCells}  ·  PRISM ran: ${prismRan}  ·  errors: ${cellErrors}  ·  sweep_mode: ${SWEEP_MODE}`);
  console.log(`ledger: ${LEDGER_PATH} (${ledgerLines} rows)  ·  vendor: ${summary.vendor_mode}`);
  console.log("-".repeat(78));
  console.log("Per-ISO-group PRISM-vs-baseline (the calibration-learning signal):");
  console.log("  ISO | cells | median Δ% (PRISM vs baseline) | conservative/aggressive | GW/HSM contributed");
  for (const [iso, s] of Object.entries(isoSummary)) {
    const d = s.prism_vs_baseline_median_delta_pct;
    const dir = d === null ? "—" : d < 0 ? `${d}% (conservative=SAFE)` : `+${d}% (aggressive)`;
    console.log(
      `  ${iso.padEnd(3)} | ${String(s.cells).padStart(5)} | ${String(dir).padEnd(28)} | ` +
        `${s.prism_conservative_cells}/${s.prism_aggressive_cells} | ${s.gwizard_contributed}/${s.hsmadvisor_contributed}`,
    );
  }
  console.log("-".repeat(78));
  console.log(
    `Per-TOOL-MATERIAL PRISM-vs-baseline (the "tooling + insert if viable" axis; ` +
      `${totalComparisons} comparisons across ${TOOL_MATERIALS.length} materials):`,
  );
  console.log("  tool_material | comparisons | PRISM ran | baseline pts | median delta% (PRISM vs baseline)");
  for (const [tm, s] of Object.entries(perToolMaterial)) {
    const d = s.prism_vs_baseline_median_delta_pct;
    const dStr = d === null ? "n/a (no baseline)" : d < 0 ? `${d}% (conservative=SAFE)` : `+${d}%`;
    console.log(
      `  ${tm.padEnd(13)} | ${String(s.comparisons).padStart(11)} | ${String(s.prism_available).padStart(9)} | ` +
        `${String(s.baseline_datapoints).padStart(12)} | ${dStr}`,
    );
  }
  console.log(
    "  NOTE: PRISM computes a per-material recommendation for ALL tool materials (Vc varies\n" +
      "  strongly: e.g. hss << carbide << ceramic/cbn), but the published 5-vendor BASELINE is\n" +
      "  carbide-keyed -> non-carbide rows have PRISM numbers with no datum to compare against\n" +
      "  (baseline pts = 0). Closing that needs non-carbide reference data (the catalog-OCR unit),\n" +
      "  NOT a PRISM change. Same lesson as the G-Wizard crib (geometry-only) finding.",
  );
  console.log("-".repeat(78));
  console.log("PRISM vs G-Wizard & HSMAdvisor -- SPECIFICALLY (each vendor's PUBLISHED S&F reference):");
  console.log("  vendor (published table)   | datapoints | median Vc delta%    | median fz delta% | conserv/aggr");
  const vmap = [
    ["G-Wizard (CNCCookbook S&F)", perVendorSummary.gwizard_cnccookbook_published],
    ["HSMAdvisor (public table)", perVendorSummary.hsmadvisor_published],
  ];
  for (const [label, s] of vmap) {
    const vc = s.prism_vs_vendor_median_vc_delta_pct;
    const fz = s.prism_vs_vendor_median_fz_delta_pct;
    const vcStr = vc === null ? "n/a (no datum)" : vc < 0 ? `${vc}% (conservative=SAFE)` : `+${vc}% (aggressive)`;
    const fzStr = fz === null ? "n/a" : `${fz > 0 ? "+" : ""}${fz}%`;
    console.log(
      `  ${label.padEnd(26)} | ${String(s.published_datapoints).padStart(10)} | ${vcStr.padEnd(19)} | ${fzStr.padEnd(16)} | ${s.prism_conservative_cells}/${s.prism_aggressive_cells}`,
    );
  }
  console.log(
    "  NOTE: this is each vendor's PUBLISHED speeds/feeds reference (G-Wizard is CNCCookbook's\n" +
      "  product -> the cnccookbook rows ARE G-Wizard's published table). It is NOT the live\n" +
      "  closed-app calculator: those are the `gwizard`/`hsmadvisor` live adapters (above), which\n" +
      "  read the installed apps and abstain -- G-Wizard's crib is geometry-only, HSMAdvisor\n" +
      "  exposes only its one open cut. A number-for-number LIVE-calculator comparison requires\n" +
      "  the operator to run + export from the closed apps (no API / no local cutting-data file --\n" +
      "  verified 2026-06-09: HSMAdvisor cut data is binary, G-Wizard tooltables.csv is a 2-line index).",
  );
  console.log("=".repeat(78));
  console.log(
    "Reading: negative median delta% = PRISM recommends BELOW the 5-vendor baseline (the\n" +
      "  safe/conservative direction). GW/HSM 'contributed' = how many cells had a live\n" +
      "  aligned vendor data point (G-Wizard crib is geometry-only → typically 0; HSMAdvisor\n" +
      "  publishes only its one open cut). The per-cell JSONL ledger is the training input\n" +
      "  for the downstream PRISM_SFC_CALIB_APPLY calibration layer (GPU/Blackwell).\n",
  );
}

run();
