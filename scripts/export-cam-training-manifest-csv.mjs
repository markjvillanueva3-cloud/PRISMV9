#!/usr/bin/env node
/**
 * scripts/export-cam-training-manifest-csv.mjs — CAM-AI-TRAINING-MS0/U-CAMT-MANIFEST-CSV
 *
 * Emit a CSV view of the unified training manifest for operator
 * spreadsheet review. Walks cam-training-manifest.json + per-system
 * aggregates + per-corpus counts → flat CSV.
 *
 * Output: state/shared/corpus/cam-training-manifest.csv
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const manifest = JSON.parse(readFileSync(join(CORPUS, "cam-training-manifest.json"), "utf8"));

const rows = [];
rows.push("system,templates,clickSequences,wikiEntries,tribalTips,loraTuples,ragRecords,total");
let totals = { templates: 0, clickSequences: 0, wikiEntries: 0, tribalTips: 0, loraTuples: 0, ragRecords: 0 };
for (const [sys, agg] of Object.entries(manifest.perSystem)) {
  const t = agg.templates + agg.clickSequences + agg.wikiEntries + agg.tribalTips + agg.loraTuples + agg.ragRecords;
  rows.push(`${sys},${agg.templates},${agg.clickSequences},${agg.wikiEntries},${agg.tribalTips},${agg.loraTuples},${agg.ragRecords},${t}`);
  totals.templates += agg.templates;
  totals.clickSequences += agg.clickSequences;
  totals.wikiEntries += agg.wikiEntries;
  totals.tribalTips += agg.tribalTips;
  totals.loraTuples += agg.loraTuples;
  totals.ragRecords += agg.ragRecords;
}
const grand = totals.templates + totals.clickSequences + totals.wikiEntries + totals.tribalTips + totals.loraTuples + totals.ragRecords;
rows.push(`TOTAL,${totals.templates},${totals.clickSequences},${totals.wikiEntries},${totals.tribalTips},${totals.loraTuples},${totals.ragRecords},${grand}`);

const outFile = join(CORPUS, "cam-training-manifest.csv");
writeFileSync(outFile, rows.join("\n") + "\n");
console.log(`CSV manifest → ${outFile}`);
console.log(rows.join("\n"));
