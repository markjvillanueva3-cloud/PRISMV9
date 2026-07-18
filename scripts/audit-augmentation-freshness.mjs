#!/usr/bin/env node
// audit-augmentation-freshness.mjs -- surface system-viz augmentations that the MERGE
// folds into the live graph but that have gone STALE (a failed/retired producer).
//
// The GREEN graph-health badge means "system-graph.json was re-merged recently" -- NOT
// "its augmentation inputs are fresh". This audit closes that gap: it parses the
// authoritative set of merged augmentations from merge-augmentations.mjs, ages each by
// file mtime, and LOUDLY flags any "stale-orphan" (merged + stale + not a HEAVY/--full
// generator) -- the class where stale data silently folds into the canonical graph every
// regen. See reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21.
//
// Writes a sidecar (state/shared/system-viz/.augmentation-freshness.json) that
// sierra-graph-health-inject.mjs reads, so the badge can no longer hide a 43-day orphan.
//
//   node scripts/audit-augmentation-freshness.mjs            # human report + sidecar
//   node scripts/audit-augmentation-freshness.mjs --json     # machine report
//   node scripts/audit-augmentation-freshness.mjs --strict   # exit 2 on any stale-orphan
// Knobs: PRISM_AUG_FRESH_HR / PRISM_AUG_STALE_HR / PRISM_AUG_SLOW_HR (hours).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMergedAugmentations,
  classifyAugmentationFreshness,
  buildFreshnessReport,
  freshnessThresholdsFromEnv,
} from "./lib/augmentation-freshness.mjs";
import { atomicWriteText } from "./lib/atomic-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const MERGE_SRC = path.join(ROOT, "scripts", "merge-augmentations.mjs");
const SIDECAR = path.join(VIZ_DIR, ".augmentation-freshness.json");

const argv = new Set(process.argv.slice(2));
// PRISM_AUG_{FRESH,STALE,SLOW}_HR -> defaults. Shared single source with the regen-viz postflight
// (U-VIZ-POSTFLIGHT-PARITY) so both classify with identical thresholds.
const thresholds = freshnessThresholdsFromEnv();

let mergeSource = "";
try {
  mergeSource = fs.readFileSync(MERGE_SRC, "utf8");
} catch (e) {
  console.error(`[aug-freshness] cannot read ${path.relative(ROOT, MERGE_SRC)}: ${e.message}`);
  process.exit(1);
}

const files = parseMergedAugmentations(mergeSource);
const now = Date.now();
const rows = classifyAugmentationFreshness(files, { dir: VIZ_DIR, now, ...thresholds });
const report = buildFreshnessReport(rows, {
  now,
  vizDirRel: path.relative(ROOT, VIZ_DIR).replace(/\\/g, "/"),
  thresholds,
});
const summary = report.summary;

// sidecar is best-effort -- a write failure must never fail the audit signal itself.
try {
  atomicWriteText(SIDECAR, JSON.stringify(report));
} catch (e) {
  console.error(`[aug-freshness] sidecar write failed: ${e.message}`);
}

if (argv.has("--json")) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(
    `augmentation-freshness: ${summary.total} merged · ${summary.fresh} fresh · ` +
      `${summary.staleWarn} warn · ${summary.staleExpected} slow-expected · ` +
      `${summary.staleManual ?? 0} stale-manual · ` +
      `${summary.absent} absent · ${summary.staleOrphan} STALE-ORPHAN`,
  );
  if (summary.alarm) {
    console.error(
      `AUG-STALE-ORPHAN: ${summary.staleOrphan} merged augmentation(s) are stale with no ` +
        `fresh producer -- their stale data folds into the live graph every regen:`,
    );
    for (const o of summary.orphanList) console.error(`  - ${o}`);
    console.error(
      "  Fix: re-wire the generator into regen-viz FAST[]/HEAVY[], OR remove its " +
        "loadOptional() from merge-augmentations.mjs (stop folding stale data).",
    );
  }
}

process.exit(summary.alarm && argv.has("--strict") ? 2 : 0);
