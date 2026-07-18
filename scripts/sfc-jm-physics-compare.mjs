#!/usr/bin/env node
// scripts/sfc-jm-physics-compare.mjs
//
// SFC-JM-ACCURACY -- the PHYSICS test-against: for every JM lathe G96 CSS op in
// the corpus, compare the PROGRAMMED cutting speed to PRISM's canonical Taylor
// tool-life recommendation for the inferred material. Answers the operator's
// "verify the SFC calculations are correct ... use the [amateur] programs as the
// guideline to test against": a program running far ABOVE the short-life Taylor
// rec is hot (tool-life/safety risk PRISM would catch); far BELOW is conservative
// (productivity left on the table OR HSS tooling -- canonical C is carbide,
// LABELED). Turning is chosen because programmed surface speed IS Vc (no tool
// diameter needed) and lathe is 88% of the JM corpus.
//
// Wires the canonical CANONICAL_TAYLOR from src/physics/constants.ts (NEVER
// inlined -- soul refuse). Imports the .ts under tsx; self-reexecs under tsx when
// launched with bare `node` (mirrors sfc-variability-batch-run's tsx pattern).
//
// USAGE: node scripts/sfc-jm-physics-compare.mjs [--corpus <jsonl>] [--out <prefix>]
//        [--top N] [--json]
// EXIT: 0 ok; 2 corpus/constants missing.

import { createReadStream, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { programmedVcMmin, classifyProgrammedVc } from "./lib/sfc-taylor-vc-lib.mjs";
import { inferIsoGroup } from "./lib/sfc-material-infer.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONSTANTS_TS = resolve(REPO_ROOT, "mcp-server/src/physics/constants.ts");
const TSX_CLI = resolve(REPO_ROOT, "mcp-server/node_modules/tsx/dist/cli.mjs");
const DEFAULT_CORPUS = "state/shared/sfc-jm-program-corpus/program-params.jsonl";
const DEFAULT_OUT = "state/shared/SFC-JM-PHYSICS-COMPARE";
const DEFAULT_TOP = 50;

function parseArgs(argv) {
  const a = { corpus: DEFAULT_CORPUS, out: DEFAULT_OUT, top: DEFAULT_TOP, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--corpus") a.corpus = argv[++i];
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--top") a.top = Number(argv[++i]) || DEFAULT_TOP;
    else if (t === "--json") a.json = true;
  }
  return a;
}

// Load CANONICAL_TAYLOR from the TS source. Returns null if the runtime can't load
// .ts (bare node) so the caller can reexec under tsx.
async function loadCanonicalTaylor() {
  try {
    const mod = await import(pathToFileURL(CONSTANTS_TS).href);
    return mod.CANONICAL_TAYLOR ?? null;
  } catch {
    return null;
  }
}

function eachRow(path, onRow) {
  return new Promise((res, rej) => {
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line) return;
      let row; try { row = JSON.parse(line); } catch { return; }
      onRow(row);
    });
    rl.on("close", res);
    rl.on("error", rej);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const corpusPath = resolve(REPO_ROOT, args.corpus);
  if (!existsSync(corpusPath)) { console.error(`[fatal] corpus not found: ${corpusPath}`); process.exit(2); }

  const CANONICAL_TAYLOR = await loadCanonicalTaylor();
  if (!CANONICAL_TAYLOR) {
    // bare node can't import .ts -> reexec under tsx once.
    if (!process.env.SFC_PHYS_REEXEC && existsSync(TSX_CLI)) {
      const r = spawnSync(process.execPath, [TSX_CLI, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
        { stdio: "inherit", windowsHide: true, env: { ...process.env, SFC_PHYS_REEXEC: "1" } });
      process.exit(r.status ?? 1);
    }
    console.error("[fatal] could not load CANONICAL_TAYLOR from constants.ts (run under tsx)");
    process.exit(2);
  }

  // byBand = stock-grade reading (unknown-material ops default to JM modal H, a
  // hardened-tool-steel band). byBandSoftBound = the SAME unknown ops reclassified
  // as P -- because die tool steel is usually rough-TURNED in the ANNEALED (soft)
  // state (P-like machinability) and only hardened (true H, CBN) later for grinding/
  // hard-turning. The programs don't record hardness state, so the truth lies
  // between these two bounds -- we report both rather than a falsely-precise point.
  const counts = { cssOps: 0, compared: 0, byBand: {}, byBandSoftBound: {}, byIso: {}, byMatConfidence: {}, aggressiveClamped: 0, aggressiveUnclamped: 0 };
  const top = [];
  // Rank UNCLAMPED-aggressive first (high-confidence true over-speeds), then by
  // how far over the rec -- so the actionable 42 surface above the 16.9k clamped
  // upper-bound flags instead of being buried.
  const bySeverity = (a, b) => (a.clamped === b.clamped ? b.ratioNominal - a.ratioNominal : (a.clamped ? 1 : -1));
  const pushTop = (rec) => {
    top.push(rec);
    if (top.length > args.top * 4) { top.sort(bySeverity); top.length = args.top; }
  };

  await eachRow(corpusPath, (row) => {
    if (!row.ok || !Array.isArray(row.ops) || row.machineCategory === "mill") return; // turning/lathe/unknown
    // material: prefer the corpus-stored hint (comment-mined > path), else infer
    // from path here (back-compat for corpus rows written before materialIso).
    const mat = row.materialIso
      ? { iso: row.materialIso, confidence: row.materialConfidence || "default", matched: row.materialMatched || null }
      : inferIsoGroup(`${row.filePath || ""} ${row.customer || ""} ${row.topFolder || ""}`);
    const taylor = CANONICAL_TAYLOR[mat.iso];
    if (!taylor) return;
    for (const op of row.ops) {
      if (op.spindleMode !== "css") continue; // turning surface-speed ops only
      counts.cssOps++;
      const { mmin } = programmedVcMmin(op.spindleValue, row.units);
      if (mmin == null) continue;
      const cls = classifyProgrammedVc(mmin, taylor.C, taylor.n);
      if (cls.band === "unknown") continue;
      counts.compared++;
      counts.byBand[cls.band] = (counts.byBand[cls.band] || 0) + 1;
      counts.byIso[mat.iso] = (counts.byIso[mat.iso] || 0) + 1;
      counts.byMatConfidence[mat.confidence] = (counts.byMatConfidence[mat.confidence] || 0) + 1;
      // soft-bound: unknown-material ops reclassified as P (annealed tool steel);
      // confidently-inferred ops keep their grade in both readings.
      const softIso = mat.confidence === "default" ? "P" : mat.iso;
      const softTaylor = CANONICAL_TAYLOR[softIso];
      const softBand = classifyProgrammedVc(mmin, softTaylor.C, softTaylor.n).band;
      counts.byBandSoftBound[softBand] = (counts.byBandSoftBound[softBand] || 0) + 1;
      if (cls.band === "aggressive") {
        // the safety-relevant tail: programmed CSS hotter than the 10-min-life rec.
        // A G96 op preceded by a G50 max-rpm clamp has its EFFECTIVE surface speed
        // capped (rpm*pi*D <= clamp), so the programmed CSS is only an UPPER bound.
        // Unclamped-aggressive ops are the high-confidence true over-speeds.
        const clamped = Number.isFinite(op.spindleClampRpm) && op.spindleClampRpm > 0;
        if (clamped) counts.aggressiveClamped++; else counts.aggressiveUnclamped++;
        pushTop({
          filePath: row.filePath, customer: row.customer, iso: mat.iso, matMatched: mat.matched, matConfidence: mat.confidence,
          spindleValue: op.spindleValue, units: row.units, programmedVcMmin: Number(mmin.toFixed(1)),
          recVcAggressive: Number(cls.recVc.aggressive.toFixed(1)), ratioNominal: Number(cls.ratioNominal.toFixed(2)),
          clamped, spindleClampRpm: op.spindleClampRpm ?? null,
        });
      }
    }
  });
  top.sort(bySeverity);
  top.length = Math.min(top.length, args.top);

  const report = {
    generatedAt: new Date().toISOString(),
    corpus: corpusPath, cssOps: counts.cssOps, compared: counts.compared,
    byBand: counts.byBand, byBandSoftBound: counts.byBandSoftBound,
    byIso: counts.byIso, byMaterialConfidence: counts.byMatConfidence,
    aggressiveClamped: counts.aggressiveClamped, aggressiveUnclamped: counts.aggressiveUnclamped,
    topAggressive: top,
    note: "Programmed lathe CSS Vc vs canonical Taylor rec (Vc=C/T^n, C from src/physics/constants.ts). bands: aggressive=hotter than 10-min-life rec; in-band=10-30min; conservative/very-conservative=cooler. MATERIAL-STATE SENSITIVITY: byBand defaults unknown-material ops to JM's modal stock H (hardened tool steel, 93.7% of JM purchases); byBandSoftBound defaults them to P (annealed/soft -- die tool steel is usually rough-TURNED soft, hardened later). The programs do not record hardness state, so the true band lies BETWEEN these. aggressiveUnclamped=high-confidence over-speeds (no G50 cap); aggressiveClamped=G50-rpm-capped upper-bound. Material ~93% default (byMaterialConfidence). TEST-AGAINST candidates, not ground truth.",
  };
  const outPrefix = resolve(REPO_ROOT, args.out);
  mkdirSync(dirname(outPrefix), { recursive: true });
  writeFileSync(`${outPrefix}.json`, JSON.stringify(report, null, 2));

  if (args.json) console.log(JSON.stringify({ cssOps: counts.cssOps, compared: counts.compared, byBand: counts.byBand, byIso: counts.byIso, byMaterialConfidence: counts.byMatConfidence }, null, 2));
  else {
    console.log(`[physics-compare] ${counts.cssOps} CSS ops, ${counts.compared} compared`);
    console.log(`  byBand (H stock-grade, unknown->H) ${JSON.stringify(counts.byBand)}`);
    console.log(`  byBandSoftBound (annealed, unknown->P) ${JSON.stringify(counts.byBandSoftBound)}`);
    console.log(`  aggressive: ${counts.aggressiveUnclamped} unclamped (high-conf over-speed) + ${counts.aggressiveClamped} clamped (G50-capped, upper-bound)`);
    console.log(`  byIso ${JSON.stringify(counts.byIso)} | matConfidence ${JSON.stringify(counts.byMatConfidence)}`);
    console.log(`  report: ${outPrefix}.json (top ${top.length} aggressive/hot ops)`);
  }
  process.exit(0);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) main().catch((e) => { console.error(`[physics-compare] fatal: ${e?.message || e}`); process.exit(1); });
