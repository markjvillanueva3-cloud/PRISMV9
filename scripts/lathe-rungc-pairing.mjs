#!/usr/bin/env node
/**
 * lathe-rungc-pairing.mjs -- slot:whiskey  [Rung C: comparison-set coverage]
 * ==========================================================================
 * Groups the JM lathe .MIN corpus by part number (parsePartNumber/groupByPart)
 * to measure the COMPARABLE set: parts with >=2 revisions are the
 * generated-vs-source pairs the closed loop scores in Rung C (and exactly the
 * human->AI A/B upgrade pairs JMDieLatheProgramUpgrader works on).
 *
 * Deterministic (R5: code, not a model). Ground truth = .MIN per decision D3.
 *
 * Usage:  node scripts/lathe-rungc-pairing.mjs
 * Output: state/shared/dashboards/lathe-rungc-pairing.json
 */
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { groupByPart } from "./lib/lathe-part-number.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const ROOT = "H:/PRISM/JM DIE";
const DASH = join(REPO, "state", "shared", "dashboards");

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) walk(fp, acc);
    else if (/\.min$/i.test(e.name)) acc.push(fp);
  }
}

const files = [];
walk(ROOT, files);
const groups = groupByPart(files);
let multiRev = 0, comparablePrograms = 0;
const examples = [];
for (const [part, paths] of groups) {
  if (paths.length >= 2) {
    multiRev++;
    comparablePrograms += paths.length;
    if (examples.length < 12) examples.push({ part, revisions: paths.length });
  }
}
examples.sort((a, b) => b.revisions - a.revisions);

const report = {
  schemaVersion: "1.0.0",
  rung: "C -- comparison-set coverage (part-number pairing)",
  ground_truth_ext: ".MIN (decision D3)",
  total_programs: files.length,
  unique_parts: groups.size,
  parts_with_multiple_revisions: multiRev,
  comparable_programs: comparablePrograms,
  comparable_pct: files.length ? Math.round((comparablePrograms / files.length) * 1000) / 10 : 0,
  note: "parts_with_multiple_revisions is the count of part numbers for which the closed loop has >=2 programs to compare (PRISM-generated vs JM-source, or rev-over-rev).",
  top_multi_revision_parts: examples.slice(0, 12),
};
mkdirSync(DASH, { recursive: true });
writeFileSync(join(DASH, "lathe-rungc-pairing.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: true,
  total_programs: files.length,
  unique_parts: groups.size,
  multi_rev_parts: multiRev,
  comparable_programs: comparablePrograms,
  comparable_pct: report.comparable_pct,
}));
