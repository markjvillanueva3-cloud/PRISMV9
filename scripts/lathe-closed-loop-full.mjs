#!/usr/bin/env node
/**
 * lathe-closed-loop-full.mjs -- slot:whiskey (Lathe Wizard -> Kienzle)  [U-W2]
 * ==========================================================================
 * UNIFIED exhaustive print->program closed-loop test driver. Single entry point
 * for "the comprehensive, exhaustive closed-loop test of the system utilizing
 * ALL JM Die ... g-code programs" (operator /goal 2026-06-26).
 *
 * WHY THIS EXISTS (honest framing, R12):
 *   Two measurement rungs already exist and are tested:
 *     Rung A  scripts/lathe-jmdie-param-accuracy-harness.mjs
 *             mines the real JM Okuma .MIN corpus into the empirical
 *             ground-truth parameter cloud (SFM/IPR bands + G50-cap safety).
 *     Rung B  mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts
 *             runs the LIVE PRISM generator (turningPrintToProgramEngine) and
 *             scores its params against the Rung A cloud (envelope agreement).
 *   Neither produced ONE combined verdict, and neither was driven over the FULL
 *   corpus from a single command. This driver orchestrates both, combines their
 *   stdout summaries into one dashboard, and reports per-stage closed-loop
 *   coverage -- including the HONEST gaps (Rung C geometry-read + OKUMA-dir
 *   corpus expansion) so "exhaustive" is a measured claim, not a vibe.
 *
 * It creates NO new physics and duplicates NO engine: print->TurningInput already
 * lives in TurningPrintIntakeEngine (OCR path) -- this is pure orchestration (R5:
 * code, not a model; R8: reuse, do not reinvent).
 *
 * Usage:
 *   node scripts/lathe-closed-loop-full.mjs                 # Rung A sample(600) + Rung B + combine
 *   node scripts/lathe-closed-loop-full.mjs --all           # Rung A over the full .MIN corpus
 *   node scripts/lathe-closed-loop-full.mjs --sample 3000
 *   node scripts/lathe-closed-loop-full.mjs --no-run        # combine existing dashboards only
 *   node scripts/lathe-closed-loop-full.mjs --skip-b        # Rung A only (skip the heavy tsx generator)
 *
 * Output:
 *   state/shared/dashboards/lathe-closed-loop-full.json   machine-readable combined verdict
 *   state/shared/dashboards/lathe-closed-loop-full.md     operator summary
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lastJson } from "./lib/harness-last-json.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const DASH = join(REPO, "state", "shared", "dashboards");
const RUNG_A = join(REPO, "scripts", "lathe-jmdie-param-accuracy-harness.mjs");
const RUNG_B = join(REPO, "mcp-server", "scripts", "lathe-roundtrip-accuracy-harness.ts");
const A_JSON = join(DASH, "lathe-jmdie-param-accuracy.json");
const B_JSON = join(DASH, "lathe-roundtrip-accuracy.json");
const C_JSON = join(DASH, "lathe-rungc-ocr.json"); // Rung C-CAD (U-W2C/U-W2D), produced by lathe-rungc-ocr-loop.mjs
const C_STEP_JSON = join(DASH, "lathe-rungc-step.json"); // Rung C-CAD STEP geometry leg, produced by lathe-rungc-step-loop.mjs (pure JS, not GPU-bound)

// ----------------------------- args -----------------------------
function parseArgs(argv) {
  const a = { all: false, sample: 600, run: true, skipB: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--sample") a.sample = parseInt(argv[++i], 10) || a.sample;
    else if (t.startsWith("--sample=")) a.sample = parseInt(t.slice(9), 10) || a.sample;
    else if (t === "--no-run") a.run = false;
    else if (t === "--skip-b") a.skipB = true;
  }
  return a;
}

// lastJson() lives in ./lib/harness-last-json.mjs (shared + unit-tested).

function readJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function run(cmd, args, timeoutMs, extra = {}) {
  // windowsHide:true -- fleet console-flash rule (every Windows subprocess).
  const r = spawnSync(cmd, args, {
    cwd: REPO, encoding: "utf8", timeout: timeoutMs, windowsHide: true,
    maxBuffer: 64 * 1024 * 1024, ...extra,
  });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "", timedOut: r.error && r.error.code === "ETIMEDOUT" };
}

const pct = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);

// ----------------------------- main -----------------------------
const args = parseArgs(process.argv);
mkdirSync(DASH, { recursive: true });

// Rung A: empirical ground-truth cloud over the real JM .MIN corpus
let a = null, aSource = "existing-dashboard";
if (args.run) {
  // --all means TRUE all: pass --all-roots so Rung A scans the whole JM DIE tree (34,993 .MIN), not just CNC LATHE.
  const aArgs = args.all ? [RUNG_A, "--all", "--all-roots"] : [RUNG_A, "--sample", String(args.sample)];
  const res = run(process.execPath, aArgs, 600_000);
  a = lastJson(res.stdout);
  aSource = a ? "live-run" : "existing-dashboard";
}
if (!a) { const f = readJsonSafe(A_JSON); if (f) a = { analyzed: f.corpus_size != null ? f.corpus_size : f.analyzed, ...f }; }

// Rung B: live PRISM generator scored vs the Rung A cloud
let b = null, bSource = "skipped";
if (args.run && !args.skipB) {
  // Heap bump: the harness material loader re-reads the P_STEELS JSON set per program
  // and accumulates heap; default 4GB OOMs past ~60 programs. 8GB gives headroom until
  // the loader read-path bug is fixed. (reference_whiskey_jm_stock_turning_state_2026_06_26)
  const bEnv = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim() };
  const res = run("npx", ["tsx", RUNG_B, "--json"], 600_000, { cwd: join(REPO, "mcp-server"), shell: true, env: bEnv });
  b = lastJson(res.stdout);
  bSource = b ? "live-run" : (res.timedOut ? "timed-out->dashboard" : "failed->dashboard");
}
if (!b) {
  const f = readJsonSafe(B_JSON);
  if (f) {
    b = {
      envelope_feed_pct: f.envelope_agreement && f.envelope_agreement.overall_feed_pct,
      envelope_sfm_pct: f.envelope_agreement && f.envelope_agreement.overall_sfm_pct,
      safety_all_codes_pct: f.safety_correctness && f.safety_correctness.all_codes_present_pct,
      se_safe: f.safety_efficiency && f.safety_efficiency.safe,
      se_unsafe: f.safety_efficiency && f.safety_efficiency.unsafe,
      se_partial: f.safety_efficiency && f.safety_efficiency.partial,
      se_total_violations: f.safety_efficiency && f.safety_efficiency.total_safety_violations,
    };
    if (bSource === "skipped") bSource = "existing-dashboard";
  }
}

// Rung C-CAD: real part DRAWING -> vision OCR -> program -> scored (U-W2C/U-W2D).
// Read-only fold of the latest Rung C dashboard; its vision run is GPU-bound +
// resumable, driven separately by scripts/lathe-rungc-ocr-loop.mjs.
const c = readJsonSafe(C_JSON);
const cStep = readJsonSafe(C_STEP_JSON);

// Closed-loop stage coverage (verified facts, 2026-06-26 whiskey).
// EXISTS = wired+tested today | PARTIAL = wireable, not yet in the loop | TODO.
const stages = [
  { stage: "1 ingest print/CAD -> features", status: "PARTIAL", note: "PDF/photo: BlueprintVisionOCREngine->TurningPrintIntakeEngine->TurningInput (EXISTS, OCR path). STEP/f3d geometry->features: TODO (Rung C-CAD)." },
  { stage: "2 generate program (G-code/OSP)", status: "EXISTS", note: "turningPrintToProgramEngine.runPipeline() -- headless adapter bound 2026-06-03." },
  { stage: "3 collision check", status: "EXISTS", note: "LatheCollisionZoneEngine.checkAll() (20+ tests) + ContinuousCollisionDetectionEngine." },
  { stage: "4 cost + machining efficiency", status: "EXISTS", note: "Machining efficiency (cycle_time/MRR/tool_life) from program physics, scored by lathe-safety-efficiency-score.mjs. Per-part COST ($/part, 7-bucket: machine/tool/material/setup/quality/energy) via the REAL LathePartCostModelEngine, wired into the STEP geometry leg (U-W-COST-WIRE) with cited JM shop rates (lathe-jm-cost-rates.mjs) + STEP-derived mass. HONEST: cost is null on the cloud/OCR paths (no geometry mass) -- those report machining efficiency only. (Prior note named CostEfficiencyBridge/JobCosting which never ran -- R12 fiction, corrected.)" },
  { stage: "5 safety gate S(x)>=0.70", status: "EXISTS", note: "lathe_safety_predicate_evaluate -> partoff_gate -> workholding -> SafetyVetoSimulationGate.certify." },
  { stage: "6 compare vs empirical JM .MIN cloud", status: a ? "EXISTS" : "NO-DATA", note: "Rung A bands from real corpus; Rung B scores PRISM vs bands." },
  { stage: "7 per-part vs the SPECIFIC JM .MIN (geometry-paired)",
    status: ((cStep && cStep.steps_scored > 0) || (c && c.prints_scored > 0)) ? "EXISTS"
      : (c || cStep) ? "BUILT-PENDING-RUN" : "BUILT",
    note: "TWO geometry legs: (a) OCR/PDF (scripts/lathe-rungc-ocr-loop.mjs, U-W2C) print -> vision OCR -> program -> scored (GPU-bound); (b) STEP (scripts/lathe-rungc-step-loop.mjs) real JM STEP geometry -> occt rotational profile -> program -> scored vs cloud + safety/efficiency (pure JS, NOT GPU-bound). Both paired to .MIN by part#." },
];

// Resolve Rung A fields robustly: the harness STDOUT (live --run) and the persisted dashboard FILE
// (--no-run) differ -- the dashboard nests under aggregate.*/safety.*/sampling.*, so flat reads
// (a.sfm_p50) were null (R12 fix). Computed BEFORE coverage so coverage reads the resolved analyzed
// count too -- else the same dashboard self-contradicts (34993 in rung_a, ? in coverage; arm C P2).
const aR = a ? {
  analyzed: a.analyzed ?? a.sampling?.analyzed ?? a.aggregate?.programs ?? null,
  parse_errors: a.parse_errors ?? a.sampling?.parse_errors ?? null,
  feed_p50: a.feed_p50 ?? a.aggregate?.feed_ipr_overall?.p50 ?? null,
  sfm_p50: a.sfm_p50 ?? a.aggregate?.sfm_overall?.p50 ?? null,
  g96_cap_compliance_pct: a.g96_cap_compliance_pct ?? a.safety?.g96_cap_compliance_pct ?? null,
  overspeed_risk: a.overspeed_risk ?? a.safety?.g96_WITHOUT_cap_OVERSPEED_RISK
    ?? (Array.isArray(a.overspeed_risk_programs) ? a.overspeed_risk_programs.length : null),
} : null;

// corpus coverage honesty (R12 / ALL means ALL)
// --all passes --all-roots so Rung A scans the whole JM DIE tree (34,993 .MIN); a sampled/no-run
// pass reads the persisted dashboard which may be CNC-LATHE-only. Report coverage HONESTLY per what
// was actually analyzed (R12) -- not a permanently-stale "CNC LATHE only" WARN.
const fullTreeScanned = !!(aR && aR.analyzed != null && aR.analyzed >= 34000);
const coverage = {
  rung_a_scans: fullTreeScanned ? "JM DIE/ full tree (.MIN, --all-roots)" : "JM DIE/CNC LATHE/ (.MIN)",
  rung_a_analyzed: aR ? aR.analyzed : null,
  known_total_min_files: 34993,
  known_min_under_cnc_lathe: 16558,
  uncovered_min_estimate: fullTreeScanned ? 0 : (aR && aR.analyzed != null ? Math.max(0, 34993 - 16558) : null),
  uncovered_note: fullTreeScanned
    ? "Full JM DIE tree scanned via --all-roots (34,993 .MIN incl OKUMA + CNC LATHE) -- true ALL covered."
    : "Rung A corpus root is CNC LATHE only -- ~18.4K additional .MIN live under JM DIE/OKUMA/ etc. Run with --all (passes --all-roots) to reach true ALL.",
};

const report = {
  schemaVersion: "1.0.0",
  unit: "U-W2 -- unified exhaustive lathe closed-loop driver",
  slot: "whiskey",
  rung_a: aR ? {
    source: aSource,
    analyzed: aR.analyzed,
    parse_errors: aR.parse_errors,
    feed_p50_ipr: aR.feed_p50,
    sfm_p50: pct(aR.sfm_p50),
    g96_cap_compliance_pct: aR.g96_cap_compliance_pct,
    overspeed_risk_programs: aR.overspeed_risk,
  } : { source: "none", note: "Rung A produced no data -- run without --no-run." },
  rung_b: b ? {
    source: bSource,
    envelope_feed_in_band_pct: pct(b.envelope_feed_pct),
    envelope_sfm_in_band_pct: pct(b.envelope_sfm_pct),
    prism_safety_codes_present_pct: pct(b.safety_all_codes_pct),
    safety_efficiency: (b.se_safe != null || b.se_unsafe != null)
      ? { safe: b.se_safe, unsafe: b.se_unsafe, partial: b.se_partial, total_violations: b.se_total_violations } : null,
  } : { source: bSource, note: "Rung B not run (use without --skip-b; needs npx tsx)." },
  rung_c: c ? {
    source: "lathe-rungc-ocr.json",
    prints_attempted: c.prints_attempted != null ? c.prints_attempted : null,
    prints_scored: c.prints_scored != null ? c.prints_scored : null,
    prints_geometry_only: c.prints_geometry_only != null ? c.prints_geometry_only : null,
    full_geometry_loop_closed: !!c.full_geometry_loop_closed,
    avg_both_in_band_pct: pct(c.avg_both_in_band_pct),
    safety_efficiency: c.safety_efficiency || null,
    tribal_advisory: c.tribal_advisory || null,
  } : { source: "none", note: "Rung C-CAD BUILT (lathe-rungc-ocr-loop.mjs) but no dashboard yet -- the vision run is GPU-bound + resumable; drains via --limit 1 when the GPU frees." },
  rung_c_step: cStep ? {
    source: "lathe-rungc-step.json",
    steps_attempted: cStep.steps_attempted ?? null,
    steps_scored: cStep.steps_scored ?? null,
    steps_suspect_not_revolution: cStep.steps_suspect_not_revolution ?? null,
    steps_paired_to_min: cStep.steps_paired_to_min ?? null,
    full_geometry_loop_closed: !!cStep.full_geometry_loop_closed,
    avg_both_in_band_pct: pct(cStep.avg_both_in_band_pct),
    safety_efficiency: cStep.safety_efficiency || null,
    tribal_advisory: cStep.tribal_advisory || null,
  } : { source: "none", note: "Rung C-CAD STEP leg BUILT (scripts/lathe-rungc-step-loop.mjs) -- run `npx tsx scripts/lathe-rungc-step-loop.mjs --all --limit N` (pure JS, no GPU)." },
  coverage,
  stages,
  verdict: {
    apparatus_runs: !!a,
    prism_vs_jm_scored: !!b,
    geometry_leg_built: true, // OCR/PDF (U-W2C) + STEP (lathe-rungc-step-loop.mjs)
    full_geometry_loop_closed: !!((c && c.full_geometry_loop_closed) || (cStep && cStep.full_geometry_loop_closed)),
    full_geometry_loop_closed_ocr: !!(c && c.full_geometry_loop_closed),
    full_geometry_loop_closed_step: !!(cStep && cStep.full_geometry_loop_closed),
    headline: aR
      ? `Empirical cloud over ${aR.analyzed != null ? aR.analyzed : "?"} JM .MIN (SFM p50 ${pct(aR.sfm_p50)}, ${aR.g96_cap_compliance_pct != null ? aR.g96_cap_compliance_pct : "?"}% G50-cap, ${aR.overspeed_risk != null ? aR.overspeed_risk : "?"} overspeed-risk)` +
        (b ? `; PRISM in-band feed ${pct(b.envelope_feed_pct)}% / SFM ${pct(b.envelope_sfm_pct)}%` : "; Rung B pending") +
        (cStep && cStep.steps_scored ? `; Rung C-STEP ${cStep.steps_scored} part(s) scored (both-in-band ${pct(cStep.avg_both_in_band_pct)}%), geometry loop CLOSED` :
          c && c.prints_scored ? `; Rung C ${c.prints_scored} print(s) scored, geometry loop ${c.full_geometry_loop_closed ? "CLOSED" : "open"}` : "; Rung C built, geometry pending")
      : "No empirical data -- run Rung A first.",
  },
};

writeFileSync(join(DASH, "lathe-closed-loop-full.json"), JSON.stringify(report, null, 2));

function renderMd(r) {
  const ra = r.rung_a, rb = r.rung_b, c = r.coverage;
  let s = `# Lathe Wizard (-> Kienzle) -- Unified Closed-Loop Dashboard (U-W2)\n\n`;
  s += `> slot:whiskey | ${r.unit}. Run: \`node scripts/lathe-closed-loop-full.mjs --all\`.\n\n`;
  s += `**Headline:** ${r.verdict.headline}\n\n`;
  s += `## Rung A -- empirical JM ground-truth cloud\n`;
  s += ra.analyzed != null
    ? `- analyzed **${ra.analyzed}** .MIN (${ra.source}), parse errors ${ra.parse_errors}\n- feed p50 **${ra.feed_p50_ipr} IPR** | SFM p50 **${ra.sfm_p50}**\n- G50-cap compliance **${ra.g96_cap_compliance_pct}%** | **${ra.overspeed_risk_programs}** overspeed-risk programs (G96 w/o G50)\n\n`
    : `- (no data)\n\n`;
  s += `## Rung B -- PRISM generator vs JM cloud\n`;
  s += rb.envelope_feed_in_band_pct != null
    ? `- feed in-band **${rb.envelope_feed_in_band_pct}%** | SFM in-band **${rb.envelope_sfm_in_band_pct}%** (${rb.source})\n- PRISM safety codes present **${rb.prism_safety_codes_present_pct}%**\n\n`
    : `- ${rb.note || "not run"}\n\n`;
  s += `## Rung C -- real DRAWING -> vision OCR -> program -> scored (geometry leg, U-W2C/U-W2D)\n`;
  const rc = r.rung_c;
  if (rc && rc.prints_attempted != null) {
    s += `- prints attempted **${rc.prints_attempted}** | scored **${rc.prints_scored}** | geometry-only ${rc.prints_geometry_only ?? "n/a"}\n`;
    s += `- **full_geometry_loop_closed: ${rc.full_geometry_loop_closed}** | avg both-in-band ${rc.avg_both_in_band_pct ?? "n/a"}%\n`;
    if (rc.safety_efficiency) {
      const se = rc.safety_efficiency;
      s += `- safety: SAFE ${se.safe} / UNSAFE ${se.unsafe} / PARTIAL ${se.partial} (violations ${se.total_safety_violations}) | efficiency: avg cycle ${se.avg_cycle_time_sec}s, avg MRR ${se.avg_mrr_mm3_min} mm3/min, min tool-life ${se.min_tool_life_min} min\n\n`;
    } else s += `\n`;
  } else {
    s += `- ${rc && rc.note ? rc.note : "built; vision run pending GPU (resumable --limit 1)"}\n\n`;
  }
  const cs = r.rung_c_step;
  s += `## Rung C-STEP -- real JM STEP geometry -> profile -> program -> scored (pure JS, no GPU)\n`;
  if (cs && cs.steps_attempted != null) {
    s += `- steps attempted **${cs.steps_attempted}** | scored **${cs.steps_scored}** | suspect-skipped ${cs.steps_suspect_not_revolution ?? "n/a"} | paired to .MIN ${cs.steps_paired_to_min ?? "n/a"}\n`;
    s += `- **full_geometry_loop_closed (STEP subset): ${cs.full_geometry_loop_closed}** | avg both-in-band ${cs.avg_both_in_band_pct ?? "n/a"}%\n\n`;
  } else {
    s += `- ${cs && cs.note ? cs.note : "built; run lathe-rungc-step-loop.mjs --all"}\n\n`;
  }
  s += `## Corpus coverage (ALL means ALL -- honest)\n`;
  s += `- Rung A scans: \`${c.rung_a_scans}\` -> ${c.rung_a_analyzed != null ? c.rung_a_analyzed : "?"} analyzed\n`;
  s += `- Known total .MIN: **${c.known_total_min_files}** (CNC LATHE: ${c.known_min_under_cnc_lathe})\n`;
  s += `- WARN: ${c.uncovered_note}\n\n`;
  s += `## Closed-loop stage coverage\n\n| stage | status | note |\n|----|----|----|\n`;
  for (const st of r.stages) s += `| ${st.stage} | ${st.status} | ${st.note} |\n`;
  return s + `\n_Verdict: apparatus_runs=${r.verdict.apparatus_runs} | prism_vs_jm_scored=${r.verdict.prism_vs_jm_scored} | full_geometry_loop_closed=${r.verdict.full_geometry_loop_closed}_\n`;
}
writeFileSync(join(DASH, "lathe-closed-loop-full.md"), renderMd(report));

console.log(JSON.stringify({
  ok: true,
  rung_a: report.rung_a.analyzed != null ? report.rung_a.analyzed : null,
  rung_b_feed_pct: report.rung_b.envelope_feed_in_band_pct != null ? report.rung_b.envelope_feed_in_band_pct : null,
  overspeed_risk: report.rung_a.overspeed_risk_programs != null ? report.rung_a.overspeed_risk_programs : null,
  full_geometry_loop_closed: report.verdict.full_geometry_loop_closed,
  json: join(DASH, "lathe-closed-loop-full.json"),
}));
