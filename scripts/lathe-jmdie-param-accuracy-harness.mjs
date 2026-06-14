#!/usr/bin/env node
/**
 * lathe-jmdie-param-accuracy-harness.mjs — slot:whiskey (Lathe Wizard)
 * ====================================================================
 * Closed-loop print-to-lathe-program ACCURACY foundation.
 *
 * WHY THIS EXISTS (honest framing, R12):
 *   The work order asks to "prove 100% accuracy of print -> cnc program for all
 *   lathe programs ... test by reading print, writing program, posting g-code,
 *   compare to existing programs."  The end-to-end headless lathe generator is
 *   today a STUB (PipelineHarnessAdaptersEngine: domain 'lathe' adapter not yet
 *   bound — only mill is wired).  So before any accuracy % can be HONESTLY
 *   claimed, the measurement apparatus must exist.  This harness builds rung A:
 *   it mines the EXISTING JM Okuma .MIN programs — the master programmers' real
 *   shop-floor output — into the ground-truth parameter cloud that PRISM's
 *   physics + data must reproduce.  "Real-world results" = these programs.
 *
 * WHAT IT MEASURES (100% derived from the data, zero fabrication):
 *   per program:
 *     - tools (Okuma 6-digit T-codes), op count
 *     - spindle mode: G96 (CSS, value = SFM) vs G97 (constant RPM)
 *     - G50 max-RPM cap presence + value           (SAFETY: G96 w/o G50 = overspeed)
 *     - feed values F (IPR on lathe per-rev mode)  -> chip-thickness proxy
 *     - implied surface speed per cut:
 *           G96 active -> SFM = G96 value
 *           G97 active -> SFM = pi * D_inch * RPM / 12   (D = X diameter at cut)
 *     - op-type inference per cut (rough/finish/drill/thread/part-off)
 *     - threading / part-off / centerline-drill detection
 *   corpus aggregate:
 *     - feed IPR distribution (percentiles) overall + by op-type
 *     - SFM distribution (percentiles) overall + by op-type
 *     - G96 vs G97 mix, G50-on-G96 safety-compliance %
 *     - chip-load (IPR) bands by op-type  -> the chip-control reference
 *
 * This is the deterministic extraction leg (R5: code, not a model).  The
 * Workflow + parallel agents consume the emitted JSON to cross-check PRISM's
 * physics (constants.ts CANONICAL_KIENZLE + turning formulas) against this
 * empirical cloud and produce the data-optimization punch list.
 *
 * Usage:
 *   node scripts/lathe-jmdie-param-accuracy-harness.mjs                 # stratified 600 sample
 *   node scripts/lathe-jmdie-param-accuracy-harness.mjs --sample 1200
 *   node scripts/lathe-jmdie-param-accuracy-harness.mjs --all           # full 16.5K corpus
 *   node scripts/lathe-jmdie-param-accuracy-harness.mjs --customer ATF
 *   node scripts/lathe-jmdie-param-accuracy-harness.mjs --out <dir>
 *
 * Output:
 *   state/shared/dashboards/lathe-jmdie-param-accuracy.json   full machine-readable
 *   state/shared/dashboards/lathe-jmdie-param-accuracy.md     operator summary
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const CORPUS = "H:/PRISM/JM DIE/CNC LATHE";
const OUT_DIR_DEFAULT = join(REPO, "state", "shared", "dashboards");

// ───────────────────────────── args ─────────────────────────────
function parseArgs(argv) {
  const a = { sample: 600, all: false, customer: null, out: OUT_DIR_DEFAULT, seed: 1337 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--sample") a.sample = parseInt(argv[++i], 10) || a.sample;
    else if (t.startsWith("--sample=")) a.sample = parseInt(t.slice(9), 10) || a.sample;
    else if (t === "--customer") a.customer = argv[++i];
    else if (t.startsWith("--customer=")) a.customer = t.slice(11);
    else if (t === "--out") a.out = argv[++i];
    else if (t.startsWith("--out=")) a.out = t.slice(6);
    else if (t === "--seed") a.seed = parseInt(argv[++i], 10) || a.seed;
  }
  return a;
}

// deterministic PRNG (mulberry32) so sampling is reproducible
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── corpus walk ──────────────────────────
function walkMin(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) walkMin(fp, acc);
    else if (/\.min$/i.test(e.name)) acc.push(fp);
  }
}

function customerOf(fp) {
  // CNC LATHE/<customer>/.../file.MIN  → segment right after CNC LATHE
  const parts = fp.split(/[\\/]/);
  const idx = parts.findIndex((p) => p.toUpperCase() === "CNC LATHE");
  return idx >= 0 && parts[idx + 2] ? parts[idx + 1] : "_root";
}

/** Stratified sample: round-robin across customer buckets so no one customer
 *  (e.g. the 4166-file CNC#1#2#3 bucket) dominates the sample. */
function stratifiedSample(files, n, rng) {
  const buckets = new Map();
  for (const f of files) {
    const c = customerOf(f);
    if (!buckets.has(c)) buckets.set(c, []);
    buckets.get(c).push(f);
  }
  // shuffle within each bucket
  for (const arr of buckets.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  const order = [...buckets.keys()];
  const out = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const c of order) {
      const arr = buckets.get(c);
      if (arr.length) { out.push(arr.pop()); progress = true; if (out.length >= n) break; }
    }
  }
  return out;
}

// ───────────────────────── OSP parser ───────────────────────────
const RE_TOOL = /\bT(\d{4,8})\b/;
const RE_G50 = /\bG50\s*S(\d+(?:\.\d+)?)/i;
const RE_G96 = /\bG96\s*S(\d+(?:\.\d+)?)/i;
const RE_G97 = /\bG97\s*S(\d+(?:\.\d+)?)/i;
const RE_FEED = /\bF(\d*\.\d+|\d+\.?\d*)\b/i;
const RE_X = /\bX(-?\d*\.?\d+)/i;
const RE_MOVE = /\bG0?([0123])\b/;

function classifyOp({ feedIpr, isThread, isDrill }) {
  if (isThread) return "thread";
  if (isDrill) return "drill";
  if (feedIpr == null) return "rapid";
  if (feedIpr >= 0.006) return "rough";
  if (feedIpr > 0) return "finish";
  return "other";
}

function parseProgram(text, fileName) {
  const lines = text.split(/\r?\n/);
  const tools = new Set();
  let g50cap = null;
  let usesG96 = false, usesG97 = false;
  const g96vals = [];
  const g97vals = [];

  // running modal state
  let mode = null; // 'css' | 'rpm'
  let curSpeed = null; // sfm if css, rpm if rpm
  let lastX = null; // diameter inch
  const cuts = []; // {feedIpr, sfm, op}
  const feeds = [];
  let threadFlag = false, partoffFlag = false, drillFlag = false;

  // name-based op hints
  const upName = (fileName || "").toUpperCase();
  const nameThread = /THREAD|THD|TAP|ACME|UNC|UNF/.test(upName);
  const namePart = /CUTOFF|CUT-OFF|PART-?OFF|COFF|PARTOFF/.test(upName);

  let modalFeed = null;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("(") || line.startsWith("$")) {
      // still scan name-comment threading words inside ()
    }
    const upper = line.toUpperCase();

    const mTool = upper.match(RE_TOOL);
    if (mTool) { tools.add(mTool[1].slice(0, 2)); /* station */ }

    const mG50 = upper.match(RE_G50);
    if (mG50) { const v = parseFloat(mG50[1]); if (v > 0) g50cap = Math.max(g50cap ?? 0, v); }

    const mG96 = upper.match(RE_G96);
    if (mG96) { usesG96 = true; mode = "css"; curSpeed = parseFloat(mG96[1]); if (curSpeed > 0) g96vals.push(curSpeed); }

    const mG97 = upper.match(RE_G97);
    if (mG97) { usesG97 = true; mode = "rpm"; curSpeed = parseFloat(mG97[1]); if (curSpeed > 0) g97vals.push(curSpeed); }

    // explicit single-point thread cycle
    const isThreadLine = /\bG33\b/.test(upper) || /THREAD/.test(upper);
    if (isThreadLine) threadFlag = true;

    const mX = upper.match(RE_X);
    if (mX) lastX = Math.abs(parseFloat(mX[1]));

    const mFeed = upper.match(RE_FEED);
    const mMove = upper.match(RE_MOVE);
    const isCut = mMove && (mMove[1] === "1" || mMove[1] === "2" || mMove[1] === "3");

    if (mFeed) modalFeed = parseFloat(mFeed[1]);

    if (isCut) {
      const feedIpr = modalFeed && modalFeed > 0 && modalFeed < 1 ? modalFeed : null; // IPR sane band <1
      // centerline drilling: a TRUE drill plunge is a LINEAR move (G1) that feeds
      // in Z only (no X restated on the line -> tool already on centerline) while
      // the standing diameter is on/near center (<0.03in). Restating X means a
      // turning/finish pass, NOT drilling — the loose "X<0.06 && has-Z" classifier
      // mislabelled ~73% of programs (workflow cross-check catch, whiskey 2026-06-03).
      const lineHasX = mX != null;
      const lineHasZ = /\bZ-?\.?\d/.test(upper);
      const isLinear = mMove[1] === "1";
      const isDrill = isLinear && lineHasZ && !lineHasX && lastX != null && lastX < 0.03;
      if (isDrill) drillFlag = true;

      // implied SFM
      let sfm = null;
      if (mode === "css" && curSpeed) sfm = curSpeed;
      else if (mode === "rpm" && curSpeed && lastX && lastX > 0.02) sfm = (Math.PI * lastX * curSpeed) / 12;

      if (feedIpr != null) feeds.push(feedIpr);
      const op = classifyOp({ feedIpr, isThread: isThreadLine, isDrill });
      cuts.push({ feedIpr, sfm, op });
    }
  }

  if (nameThread) threadFlag = true;
  if (namePart) partoffFlag = true;

  return {
    file: fileName,
    toolCount: tools.size,
    lineCount: lines.length,
    usesG96, usesG97,
    g50cap,
    g96sfm: g96vals,
    g97rpm: g97vals,
    feeds,
    cuts,
    threadFlag, partoffFlag, drillFlag,
  };
}

// ───────────────────────── stats helpers ────────────────────────
function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return Math.round(s[idx] * 1e6) / 1e6;
}
function dist(arr) {
  if (!arr.length) return { n: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    n: arr.length,
    p05: pct(arr, 5), p25: pct(arr, 25), p50: pct(arr, 50),
    p75: pct(arr, 75), p95: pct(arr, 95),
    mean: Math.round((sum / arr.length) * 1e6) / 1e6,
    min: pct(arr, 0), max: pct(arr, 100),
  };
}

// ───────────────────────────── main ─────────────────────────────
function main() {
  const args = parseArgs(process.argv);
  const t0 = Date.now();
  const all = [];
  walkMin(CORPUS, all);
  let pool = all;
  if (args.customer) {
    const c = args.customer.toUpperCase();
    pool = all.filter((f) => customerOf(f).toUpperCase().includes(c));
  }
  const rng = mulberry32(args.seed);
  const files = args.all ? pool : stratifiedSample(pool, Math.min(args.sample, pool.length), rng);

  const programs = [];
  const allFeeds = [], allSfm = [], g96LiteralSfm = [];
  const feedByOp = {}, sfmByOp = {};
  let parseErrors = 0;
  let nG96 = 0, nG97 = 0, nG96WithCap = 0, nG96NoCap = 0, nThread = 0, nPartoff = 0, nDrill = 0;
  let nWithAnyCap = 0;
  const caps = [];

  for (const fp of files) {
    let text;
    try { text = readFileSync(fp, "latin1"); } catch { parseErrors++; continue; }
    const fileName = fp.split(/[\\/]/).pop();
    let p;
    try { p = parseProgram(text, fileName); } catch { parseErrors++; continue; }
    p.customer = customerOf(fp);
    p.path = fp;

    for (const f of p.feeds) allFeeds.push(f);
    for (const v of p.g96sfm) if (v > 0 && v < 5000) g96LiteralSfm.push(v); // trustworthy CSS literals (no diameter artifact)
    for (const cut of p.cuts) {
      if (cut.feedIpr != null) { (feedByOp[cut.op] ??= []).push(cut.feedIpr); }
      if (cut.sfm != null && isFinite(cut.sfm) && cut.sfm > 0 && cut.sfm < 5000) {
        allSfm.push(cut.sfm); (sfmByOp[cut.op] ??= []).push(cut.sfm);
      }
    }
    if (p.usesG96) { nG96++; if (p.g50cap) nG96WithCap++; else nG96NoCap++; }
    if (p.usesG97) nG97++;
    if (p.g50cap) { nWithAnyCap++; caps.push(p.g50cap); }
    if (p.threadFlag) nThread++;
    if (p.partoffFlag) nPartoff++;
    if (p.drillFlag) nDrill++;

    // keep a compact per-program record (drop the heavy cuts array)
    programs.push({
      file: p.file, customer: p.customer, path: p.path,
      toolCount: p.toolCount, lineCount: p.lineCount,
      usesG96: p.usesG96, usesG97: p.usesG97, g50cap: p.g50cap,
      g96sfm: p.g96sfm, feedP50: pct(p.feeds, 50), feedN: p.feeds.length,
      cutCount: p.cuts.length,
      threadFlag: p.threadFlag, partoffFlag: p.partoffFlag, drillFlag: p.drillFlag,
      g96NoCapRisk: p.usesG96 && !p.g50cap,
    });
  }

  const N = programs.length;
  const safety = {
    g96_programs: nG96,
    g97_programs: nG97,
    g96_with_g50_cap: nG96WithCap,
    g96_WITHOUT_cap_OVERSPEED_RISK: nG96NoCap,
    g96_cap_compliance_pct: nG96 ? Math.round((nG96WithCap / nG96) * 1000) / 10 : null,
    any_rpm_cap_programs: nWithAnyCap,
    rpm_cap_distribution: dist(caps),
  };

  const opDist = {};
  for (const op of new Set([...Object.keys(feedByOp), ...Object.keys(sfmByOp)])) {
    opDist[op] = { feed_ipr: dist(feedByOp[op] || []), sfm: dist(sfmByOp[op] || []) };
  }

  const report = {
    schemaVersion: "1.0.0",
    generated_at: new Date(t0).toISOString(),
    corpus_root: CORPUS,
    rung: "A — empirical JM ground-truth parameter cloud (real-world results reference)",
    honest_note:
      "This measures PRISM-reproducible parameters against JM master-programmer real output. " +
      "It is NOT a full print->program->post roundtrip (lathe generator adapter is still a stub). " +
      "Accuracy %s reported by downstream agents are physics-envelope agreement, not byte-match.",
    sampling: { mode: args.all ? "full" : "stratified", requested: args.sample, scanned_total: all.length, analyzed: N, parse_errors: parseErrors, seed: args.seed },
    runtime_ms: Date.now() - t0,
    aggregate: {
      programs: N,
      avg_tools_per_program: N ? Math.round((programs.reduce((a, p) => a + p.toolCount, 0) / N) * 100) / 100 : 0,
      feed_ipr_overall: dist(allFeeds),
      sfm_overall: dist(allSfm),
      sfm_g96_literal: dist(g96LiteralSfm), // programmed CSS values — the artifact-free surface-speed reference
      threading_program_pct: N ? Math.round((nThread / N) * 1000) / 10 : 0,
      partoff_program_pct: N ? Math.round((nPartoff / N) * 1000) / 10 : 0,
      drill_program_pct: N ? Math.round((nDrill / N) * 1000) / 10 : 0,
    },
    safety,
    op_parameter_reference: opDist,
    // top overspeed-risk programs for the punch list
    overspeed_risk_programs: programs.filter((p) => p.g96NoCapRisk).slice(0, 40).map((p) => ({ file: p.file, customer: p.customer, path: p.path })),
    programs_sampled: programs.slice(0, 250), // cap embedded list
  };

  mkdirSync(args.out, { recursive: true });
  const jsonPath = join(args.out, "lathe-jmdie-param-accuracy.json");
  const mdPath = join(args.out, "lathe-jmdie-param-accuracy.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, renderMd(report));
  console.log(JSON.stringify({
    ok: true, analyzed: N, parse_errors: parseErrors,
    feed_p50: report.aggregate.feed_ipr_overall.p50,
    sfm_p50: report.aggregate.sfm_overall.p50,
    g96_cap_compliance_pct: safety.g96_cap_compliance_pct,
    overspeed_risk: nG96NoCap,
    json: jsonPath, md: mdPath, runtime_ms: report.runtime_ms,
  }, null, 2));
}

function d(x) { return x == null ? "—" : x; }
function renderMd(r) {
  const a = r.aggregate, s = r.safety;
  let md = `# JM Die Lathe — Print→Program Parameter Accuracy (Rung A)\n\n`;
  md += `_Generated ${r.generated_at} · ${r.sampling.mode} sample · ${a.programs} programs analyzed (${r.sampling.parse_errors} parse errors) · ${r.runtime_ms} ms_\n\n`;
  md += `> ${r.honest_note}\n\n`;
  md += `## Real-world parameter cloud (what JM master programmers actually run)\n\n`;
  md += `**Feed (IPR)** — p05 ${d(a.feed_ipr_overall.p05)} · p25 ${d(a.feed_ipr_overall.p25)} · **p50 ${d(a.feed_ipr_overall.p50)}** · p75 ${d(a.feed_ipr_overall.p75)} · p95 ${d(a.feed_ipr_overall.p95)} (n=${d(a.feed_ipr_overall.n)})\n\n`;
  md += `**Surface speed (SFM, implied from G97 RPM × dia)** — p05 ${d(a.sfm_overall.p05)} · p25 ${d(a.sfm_overall.p25)} · **p50 ${d(a.sfm_overall.p50)}** · p75 ${d(a.sfm_overall.p75)} · p95 ${d(a.sfm_overall.p95)} (n=${d(a.sfm_overall.n)})\n\n`;
  md += `**Surface speed (SFM, programmed G96 CSS literals — artifact-free)** — p05 ${d(a.sfm_g96_literal.p05)} · p25 ${d(a.sfm_g96_literal.p25)} · **p50 ${d(a.sfm_g96_literal.p50)}** · p75 ${d(a.sfm_g96_literal.p75)} · p95 ${d(a.sfm_g96_literal.p95)} (n=${d(a.sfm_g96_literal.n)})\n\n`;
  md += `avg tools/program ${a.avg_tools_per_program} · threading ${a.threading_program_pct}% · part-off ${a.partoff_program_pct}% · drill ${a.drill_program_pct}%\n\n`;
  md += `## Chip-control reference — feed & speed by operation\n\n| op | feed p50 (IPR) | feed p05–p95 | SFM p50 | SFM p05–p95 | n |\n|----|----|----|----|----|----|\n`;
  for (const [op, v] of Object.entries(r.op_parameter_reference)) {
    md += `| ${op} | ${d(v.feed_ipr.p50)} | ${d(v.feed_ipr.p05)}–${d(v.feed_ipr.p95)} | ${d(v.sfm.p50)} | ${d(v.sfm.p05)}–${d(v.sfm.p95)} | ${d(v.feed_ipr.n)} |\n`;
  }
  md += `\n## Safety compliance (G96 CSS ⇒ G50 max-RPM cap)\n\n`;
  md += `- G96 (CSS) programs: **${s.g96_programs}**\n- G97 (constant RPM) programs: ${s.g97_programs}\n`;
  md += `- G96 WITH G50 cap: ${s.g96_with_g50_cap}\n- **G96 WITHOUT cap (overspeed risk): ${s.g96_WITHOUT_cap_OVERSPEED_RISK}**\n`;
  md += `- G50 cap compliance on CSS programs: **${d(s.g96_cap_compliance_pct)}%**\n`;
  md += `- RPM cap distribution (RPM): p50 ${d(s.rpm_cap_distribution.p50)} · p95 ${d(s.rpm_cap_distribution.p95)} (n=${d(s.rpm_cap_distribution.n)})\n\n`;
  md += `_Full data: \`state/shared/dashboards/lathe-jmdie-param-accuracy.json\`_\n`;
  return md;
}

main();
