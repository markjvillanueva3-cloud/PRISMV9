#!/usr/bin/env node
// scripts/region-drop-report.mjs
//
// BLUEPRINT-VISION-OCR P1.5 -- thin CLI over region-drop-report-lib. Reads N seed runs of
// truetest-results.jsonl (one per --region-route validate-perfect-parts run, each in its own outDir)
// and prints a CROSS-SEED per-page drop verdict so the region-route page-drop investigation
// (the known 2/3-page drop on print 05850) is conclusive WITHOUT eyeballing raw JSONL.
//
//   node scripts/region-drop-report.mjs <seed1/truetest-results.jsonl> <seed2/...> [<seed3/...>] [--json]
//
// Each file is ONE seed run; its label is the file's parent-directory basename (fallback: the index).
// A STABLE drop label across seeds is systematic (code_bug_suspect / host_suspect / genuine_blank);
// a VARYING label is VLM variance. The thin-glue half of the pure-lib + thin-glue split
// (core: scripts/lib/region-drop-report-lib.mjs).

import { readFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

import { aggregateRegionDropDiags, parseResultsJsonl } from "./lib/region-drop-report-lib.mjs";

function parseArgs(args) {
  const o = { files: [], json: false };
  for (const a of args) {
    if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else o.files.push(a);
  }
  return o;
}

// label a seed run by its containing directory (the outDir), falling back to a positional index.
function labelFor(file, idx) {
  try {
    const d = basename(dirname(resolve(file)));
    return d || `seed${idx + 1}`;
  } catch {
    return `seed${idx + 1}`;
  }
}

function main() {
  const o = parseArgs(argv.slice(2));
  if (o.help || !o.files.length) {
    process.stderr.write("usage: region-drop-report.mjs <seed1/truetest-results.jsonl> [seed2/...] [--json]\n");
    exit(2);
  }
  const runs = [];
  for (let i = 0; i < o.files.length; i++) {
    const file = o.files[i];
    let text = "";
    try { text = readFileSync(file, "utf8"); }
    catch (e) { process.stderr.write(`[region-drop-report] cannot read ${file}: ${e instanceof Error ? e.message : String(e)}\n`); continue; }
    runs.push({ label: labelFor(file, i), records: parseResultsJsonl(text) });
  }
  if (!runs.length) { process.stderr.write("[region-drop-report] no readable seed files\n"); exit(2); }

  const report = aggregateRegionDropDiags(runs);
  if (o.json) {
    process.stdout.write(JSON.stringify(report) + "\n");
    return;
  }

  const s = report.summary;
  process.stdout.write(`\n[region-drop-report] ${report.seedCount} seed run(s) -> ${s.totalPages} region-routed page(s)\n`);
  if (s.provisional) {
    const why = report.seedCount < 2
      ? "a single seed cannot separate a systematic defect from VLM variance -- every page is vacuously 'stable'"
      : `fewer than ${s.minSeedsForConfidence} seeds -- a 'stable' label is weak evidence`;
    process.stdout.write(`  *** PROVISIONAL: ${why}. Re-run with >=${s.minSeedsForConfidence} seeds before trusting any verdict (multi-seed-before-claim doctrine). ***\n`);
  }
  process.stdout.write(`  attributions (page-occurrences across seeds): ${JSON.stringify(s.byAttribution)}\n`);
  process.stdout.write(`  verdicts: code_bug_suspect=${s.codeBugSuspect} host_suspect=${s.hostSuspect} genuine_blank=${s.genuineBlank} variance=${s.variance} ok=${s.ok}\n`);
  // most actionable first: stable code-bug suspects, then host, then variance
  const order = { code_bug_suspect: 0, host_suspect: 1, variance: 2, genuine_blank: 3, ok: 4 };
  const interesting = report.pages.filter((p) => p.verdict !== "ok").sort((a, b) => (order[a.verdict] - order[b.verdict]) || (a.key < b.key ? -1 : 1));
  if (interesting.length) {
    process.stdout.write(`\n  page                       seeds  vchk   verdict            dominant                   collapsed\n`);
    for (const p of interesting) {
      // vchk = variance-checked (>=2 seeds could have disagreed). A verdict with vchk=false is provisional.
      process.stdout.write(`  ${p.key.padEnd(26)} ${String(p.seeds).padEnd(6)} ${String(p.varianceChecked).padEnd(6)} ${p.verdict.padEnd(18)} ${p.dominant.padEnd(26)} ${p.collapsedSeen ? "yes" : "-"}\n`);
    }
  }
  process.stdout.write(`\n  READING (vchk=true only): code_bug_suspect (stable merge_or_unit_dropped, collapsed=yes) = chase the merge clique-representative selection; host_suspect = floor failed under load (retry on a healthy host); variance = VLM stochasticity (not a code bug); genuine_blank = expected non-callout page. vchk=false (<2 seeds) verdicts are provisional.\n`);
}

const isMain = argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); }
  catch (e) { process.stderr.write(`[region-drop-report] FAIL: ${String(e && e.stack || e)}\n`); exit(1); }
}
