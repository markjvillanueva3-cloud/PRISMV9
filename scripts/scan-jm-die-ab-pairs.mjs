#!/usr/bin/env node
// CLI scan-runner for U-LATHE-AB-VERSION-LOCATOR.
// Walks JM-Die archive (or any subdir), pairs A/B versions, emits JSONL corpus + summary.
//
// Design memo: reference_lathe_ab_version_locator_design_2026_05_27
// Template: mcp-server/data/ingestion_cache/AB-LOCATOR-SCAN-RUNNER-TEMPLATE.md
// Pure helpers: scripts/lib/lathe-ab-version-locator.mjs
//
// Usage: node scripts/scan-jm-die-ab-pairs.mjs [scan_root] [out_jsonl]
//   defaults: scan_root="H:/PRISM/JM DIE/CNC LATHE", out_jsonl=mcp-server/data/ingestion_cache/jm-die-ab-pairs-<date>.jsonl

import fs from "node:fs";
import path from "node:path";
import { parsePath, groupByPart, pairAB } from "./lib/lathe-ab-version-locator.mjs";
import { parseBlocks, validateThreading } from "./lathe-quality-pipeline.mjs";

// CLI args: [scan_root] [out_jsonl] [--score] [--score-limit=N] [--upgraded-only]
const POS_ARGS = process.argv.slice(2).filter(a => !a.startsWith("--"));
const FLAGS = new Set(process.argv.slice(2).filter(a => a.startsWith("--")));
const SCAN_ROOT = POS_ARGS[0] || "H:/PRISM/JM DIE/CNC LATHE";
const OUT_JSONL = POS_ARGS[1] || `mcp-server/data/ingestion_cache/jm-die-ab-pairs-${new Date().toISOString().slice(0, 10)}.jsonl`;
const SCORE_PAIRS = FLAGS.has("--score");
// Cap pair count for --score (full archive would be 14K pairs × 2 file reads = 28K I/O ops)
const SCORE_LIMIT = parseInt(process.argv.slice(2).find(a => a.startsWith("--score-limit="))?.split("=")[1] || "100", 10);
// iter257: --upgraded-only filters scoring to PRISM_UPGRADED b-paths only (excludes -A/-B human-revision pairs).
// See [[reference_ab_locator_over_pairing_human_revisions_2026_05_27]] for empirical rationale.
const UPGRADED_ONLY = FLAGS.has("--upgraded-only");

const FILE_EXTS = new Set([".min", ".nc", ".pim"]);

function walkDir(root, accumulator) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (e) {
    process.stderr.write(`[warn] cannot read ${root}: ${e.message}\n`);
    return;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, accumulator);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (FILE_EXTS.has(ext)) accumulator.push(full);
    }
  }
}

function main() {
  process.stderr.write(`Scanning ${SCAN_ROOT} for .MIN/.nc/.pim files (recursive)...\n`);
  const t0 = Date.now();
  const files = [];
  walkDir(SCAN_ROOT, files);
  process.stderr.write(`Found ${files.length} program files in ${Date.now() - t0} ms. Parsing paths...\n`);

  const parsed = files.map(parsePath);
  const errored = parsed.filter(p => p.parse_error);
  const valid = parsed.filter(p => !p.parse_error);
  process.stderr.write(`Parsed: ${valid.length} valid, ${errored.length} errors\n`);

  const groups = groupByPart(valid);
  const pairsAll = pairAB(groups, { includeUnpaired: true });
  const paired = pairsAll.filter(p => !p.unpaired);
  const unpaired = pairsAll.filter(p => p.unpaired);
  process.stderr.write(`Pairs: ${paired.length} paired, ${unpaired.length} unpaired singletons\n`);

  // Ensure output dir exists
  fs.mkdirSync(path.dirname(OUT_JSONL), { recursive: true });

  const out = fs.createWriteStream(OUT_JSONL);
  let scored = 0;
  let filteredOut = 0;
  for (const pair of paired) {
    const isUpgraded = pair.b.full_path.includes("PRISM_UPGRADED");
    // iter257: --upgraded-only filters non-PRISM_UPGRADED pairs from output entirely
    if (UPGRADED_ONLY && !isUpgraded) { filteredOut++; continue; }
    // iter270: detect empty_source pair_type (A-file <10 non-blank-non-comment lines).
    // See [[reference_ab_locator_over_pairing_human_revisions_2026_05_27]] iter269 update.
    let pairType = isUpgraded ? "prism_upgraded" : "human_revision";
    try {
      const aLines = fs.readFileSync(pair.a.full_path, "utf8").split(/\r?\n/);
      const realCount = aLines.filter(l => l.trim() && !l.trim().startsWith("(")).length;
      if (realCount < 10) pairType = "empty_source";
    } catch { /* leave as-is if A-file unreadable */ }
    const record = {
      kind: "ab_pair",
      customer: pair.customer,
      part_num: pair.part_num,
      a_path: pair.a.full_path,
      b_path: pair.b.full_path,
      a_count_in_group: pair.a_count,
      b_count_in_group: pair.b_count,
      pair_type: pairType
    };
    if (SCORE_PAIRS && scored < SCORE_LIMIT) {
      try {
        const aText = fs.readFileSync(pair.a.full_path, "utf8");
        const bText = fs.readFileSync(pair.b.full_path, "utf8");
        const aBlocks = parseBlocks(aText);
        const bBlocks = parseBlocks(bText);
        const aThread = validateThreading(aText, { controller: "mazak", iso_group: "P" });
        const bThread = validateThreading(bText, { controller: "okuma", iso_group: "P" });
        record.score = {
          a_lines: aText.split(/\r?\n/).length,
          b_lines: bText.split(/\r?\n/).length,
          delta_lines: bText.split(/\r?\n/).length - aText.split(/\r?\n/).length,
          a_blocks: aBlocks.length,
          b_blocks: bBlocks.length,
          a_thread_issues: aThread.issues.length,
          b_thread_issues: bThread.issues.length,
          a_g_codes: [...new Set(aBlocks.filter(b => b.g).map(b => b.g))].sort(),
          b_g_codes: [...new Set(bBlocks.filter(b => b.g).map(b => b.g))].sort()
        };
        scored++;
      } catch (e) {
        record.score_error = e.message;
      }
    }
    out.write(JSON.stringify(record) + "\n");
  }
  if (SCORE_PAIRS) {
    process.stderr.write(`Scored ${scored}/${paired.length} pairs (limit ${SCORE_LIMIT})\n`);
  }
  if (UPGRADED_ONLY) {
    process.stderr.write(`Filtered out ${filteredOut} non-PRISM_UPGRADED pairs (--upgraded-only)\n`);
  }
  for (const single of unpaired) {
    out.write(JSON.stringify({
      kind: "unpaired",
      reason: single.unpaired_reason,
      customer: single.customer,
      part_num: single.unpaired_part_num,
      paths: (single.records || []).map(r => r.full_path)
    }) + "\n");
  }
  out.end();

  process.stderr.write(`\nWrote ${paired.length + unpaired.length} records to ${OUT_JSONL}\n`);

  // Summary by customer
  process.stderr.write(`\nSummary by customer:\n`);
  const byCust = {};
  for (const p of pairsAll) {
    const c = p.customer || "UNKNOWN";
    byCust[c] = byCust[c] || { paired: 0, unpaired: 0 };
    if (p.unpaired) byCust[c].unpaired++; else byCust[c].paired++;
  }
  const customers = Object.entries(byCust).sort((a, b) => (b[1].paired + b[1].unpaired) - (a[1].paired + a[1].unpaired));
  for (const [c, stats] of customers) {
    process.stderr.write(`  ${c}: ${stats.paired} paired, ${stats.unpaired} unpaired\n`);
  }
  process.stderr.write(`\nTotal: ${paired.length} paired, ${unpaired.length} unpaired across ${customers.length} customers\n`);
}

main();
