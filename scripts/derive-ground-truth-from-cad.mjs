#!/usr/bin/env node
// scripts/derive-ground-truth-from-cad.mjs
//
// U-TDP05 — CAD Ground Truth Derivation CLI.
//
// Reads `cad-corpus-step-geometry-report.json` (the per-class aggregate
// produced by mine-step-geometry-evidence.ts — already shipped + populated
// against 662/665 STEP files in the JM Die corpus) and emits one GT catalog
// per part_class to state/shared/ocr-ground-truth/.
//
// Each emitted catalog has ONE synthetic-prototype print per part_class
// listing the feature kinds the corpus aggregate shows (filtered by
// --min-evidence-ratio). This is "class-prototype GT" — answers the question
// "does the OCR extract the kinds the typical part of this class has?".
//
// Future U-TDP06 will add per-file GT via live STEP parsing through the
// MCP cad_step_parse_file dispatcher (which the mcp-server already exposes).
//
// USAGE:
//   node scripts/derive-ground-truth-from-cad.mjs              # default report path
//   node scripts/derive-ground-truth-from-cad.mjs --report <path>
//   node scripts/derive-ground-truth-from-cad.mjs --min-evidence-ratio 0.3
//   node scripts/derive-ground-truth-from-cad.mjs --json
//
// EXIT CODES:
//   0 — derivation complete
//   2 — report file missing
//   3 — args / fs error

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { groupRecordsByPartClass } from "./lib/cad-ground-truth-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REPORT_PATH = env.PRISM_CAD_CORPUS_REPORT || join(REPO_ROOT, "mcp-server", "data", "state", "cad-corpus-step-geometry-report.json");
const DEFAULT_GT_DIR = env.PRISM_OCR_GT_DIR || join(REPO_ROOT, "state", "shared", "ocr-ground-truth");

function parseArgs(args) {
  const out = { report: null, minEvidenceRatio: 0.30, json: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--report") out.report = args[++i];
    else if (a === "--min-evidence-ratio") out.minEvidenceRatio = parseFloat(args[++i]);
    else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

function main() {
  const args = parseArgs(argv.slice(2));
  const reportPath = args.report || DEFAULT_REPORT_PATH;
  if (!existsSync(reportPath)) {
    console.error("ERR: corpus report not found: " + reportPath);
    console.error("     run mcp-server/scripts/mine-step-geometry-evidence.ts first");
    exit(2);
  }

  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (e) {
    console.error("ERR: failed to parse report: " + (e instanceof Error ? e.message : String(e)));
    exit(3);
  }
  if (!report || !Array.isArray(report.per_class)) {
    console.error("ERR: invalid report shape (per_class array expected)");
    exit(3);
  }

  // Build per-class GT records. Each class becomes ONE catalog with ONE
  // synthetic "class-prototype" print listing the dominant feature kinds.
  const records = [];
  const classesWithFeatures = [];
  const minRatio = args.minEvidenceRatio;

  for (const cls of report.per_class) {
    const filesOk = Number(cls.files_parse_ok) || 0;
    if (filesOk === 0) continue;
    const counts = cls.feature_evidence_counts || {};
    const dominantKinds = [];
    for (const [kind, count] of Object.entries(counts)) {
      const ratio = Number(count) / filesOk;
      if (Number.isFinite(ratio) && ratio >= minRatio) {
        dominantKinds.push({ kind, evidence_count: Number(count), evidence_ratio: ratio });
      }
    }
    if (dominantKinds.length === 0) continue;
    dominantKinds.sort((a, b) => b.evidence_ratio - a.evidence_ratio);

    records.push({
      part_class: cls.part_class,
      pdf_path: "cad-corpus-prototype:" + cls.part_class,
      cad_source: "cad-corpus-step-geometry-report.json:per_class[" + cls.part_class + "]",
      dimensions: dominantKinds.map((dk) => ({
        kind: dk.kind,
        presence_only: true,
        evidence_count: dk.evidence_count,
        evidence_ratio: dk.evidence_ratio,
      })),
      derivation: {
        source: "cad-corpus-aggregate",
        files_parse_ok: filesOk,
        min_evidence_ratio_filter: minRatio,
      },
    });
    classesWithFeatures.push({ part_class: cls.part_class, kinds: dominantKinds.length, files_parse_ok: filesOk });
  }

  const groups = groupRecordsByPartClass(records);
  const date = new Date().toISOString().slice(0, 10);
  const written = [];

  if (!args.dryRun) {
    for (const group of groups) {
      const outPath = join(DEFAULT_GT_DIR, "cad-prototype-" + group.part_class + "-" + date + ".json");
      atomicWriteJson(outPath, {
        ...group,
        generatedAt: new Date().toISOString(),
        source_report: reportPath,
        min_evidence_ratio_filter: minRatio,
      });
      written.push(outPath);
    }
  }

  const result = {
    reportPath,
    minEvidenceRatio: minRatio,
    classes_total: report.per_class.length,
    classes_with_features: classesWithFeatures.length,
    classes_emitted: groups.length,
    written,
    dryRun: args.dryRun,
    perClass: classesWithFeatures,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[cad-gt] report=" + reportPath);
    console.log("[cad-gt] min_evidence_ratio=" + minRatio);
    console.log("[cad-gt] classes total=" + result.classes_total + " with_features=" + result.classes_with_features + " emitted=" + result.classes_emitted);
    for (const c of classesWithFeatures) {
      console.log("[cad-gt]   " + c.part_class + ": kinds=" + c.kinds + " (from " + c.files_parse_ok + " STEP files)");
    }
    if (!args.dryRun) console.log("[cad-gt] wrote " + written.length + " catalog file(s) to " + DEFAULT_GT_DIR);
    else console.log("[cad-gt] DRY-RUN — no files written");
  }

  exit(0);
}

main();
