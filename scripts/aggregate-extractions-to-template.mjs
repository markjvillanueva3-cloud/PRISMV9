#!/usr/bin/env node
// scripts/aggregate-extractions-to-template.mjs
//
// U-TDP03 — Extraction Aggregator CLI shell.
//
// Reads blueprint-accuracy-events.jsonl (the canonical bridge populated by
// U-TDP01/U-TDP02/the MS1 hook) and produces per-part_class LEARNED TEMPLATES
// with feature prevalence + dimension distribution + tolerance distribution.
//
// Output: state/shared/learned-templates/template-<part_class>-<YYYY-MM-DD>.json
// Index: state/shared/learned-templates/index-<YYYY-MM-DD>.json
//
// USAGE:
//   node scripts/aggregate-extractions-to-template.mjs              # default events file
//   node scripts/aggregate-extractions-to-template.mjs --json       # machine-readable
//   node scripts/aggregate-extractions-to-template.mjs --min-samples 5
//
// EXIT CODES:
//   0 — aggregation complete (even when no events)
//   2 — events file missing
//   3 — args / fs error

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { parseJsonl, aggregateExtractions } from "./lib/extraction-aggregator-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EVENTS_FILE = env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");
const DEFAULT_TEMPLATES_DIR = env.PRISM_LEARNED_TEMPLATES_DIR || join(REPO_ROOT, "state", "shared", "learned-templates");

function parseArgs(args) {
  const out = { json: false, minSamples: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") out.json = true;
    else if (a === "--min-samples") out.minSamples = parseInt(args[++i], 10);
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

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const args = parseArgs(argv.slice(2));

  if (!existsSync(DEFAULT_EVENTS_FILE)) {
    const msg = "events file does not exist: " + DEFAULT_EVENTS_FILE + " — run U-TDP02 harvester first";
    if (args.json) console.log(JSON.stringify({ error: msg, exitCode: 2 }, null, 2));
    else console.error("[aggregator] " + msg);
    exit(2);
  }

  const blob = readFileSync(DEFAULT_EVENTS_FILE, "utf8");
  const events = parseJsonl(blob);
  const aggregateOpts = {};
  if (args.minSamples != null && Number.isFinite(args.minSamples)) {
    aggregateOpts.minSamplesPerFeature = args.minSamples;
  }
  const report = aggregateExtractions(events, aggregateOpts);

  // Write one template file per class.
  const date = todayUtc();
  const written = [];
  for (const cls of report.classes) {
    const path = join(DEFAULT_TEMPLATES_DIR, "template-" + cls.part_class + "-" + date + ".json");
    atomicWriteJson(path, {
      schemaVersion: 1,
      part_class: cls.part_class,
      n_samples: cls.n_samples,
      features: cls.features,
      generatedAt: report.generatedAt,
      eventsConsumed: report.eventsConsumed,
    });
    written.push(path);
  }

  // Write an index file listing all template files + summary.
  const indexPath = join(DEFAULT_TEMPLATES_DIR, "index-" + date + ".json");
  atomicWriteJson(indexPath, {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    eventsConsumed: report.eventsConsumed,
    summary: report.summary,
    templates: report.classes.map((c) => ({
      part_class: c.part_class,
      n_samples: c.n_samples,
      feature_count: c.features.length,
      path: join(DEFAULT_TEMPLATES_DIR, "template-" + c.part_class + "-" + date + ".json"),
    })),
  });

  const result = {
    eventsFile: DEFAULT_EVENTS_FILE,
    templatesDir: DEFAULT_TEMPLATES_DIR,
    classCount: report.classes.length,
    eventsConsumed: report.eventsConsumed,
    skipped: report.summary.skipped,
    written: [...written, indexPath],
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[aggregator] events_file=" + DEFAULT_EVENTS_FILE);
    console.log("[aggregator] events_consumed=" + result.eventsConsumed + " classes=" + result.classCount);
    console.log("[aggregator] skipped: type=" + result.skipped.type + " no_payload=" + result.skipped.no_payload + " no_class=" + result.skipped.no_class + " no_extraction=" + result.skipped.no_extraction);
    for (const cls of report.classes) {
      console.log("[aggregator]   " + cls.part_class + ": n=" + cls.n_samples + " features=" + cls.features.length);
      for (const f of cls.features.slice(0, 5)) {
        const dim = f.dimension_distribution;
        console.log("[aggregator]     - " + f.kind + ": prev=" + f.prevalence.toFixed(3) + " evidence=" + f.evidence_count + " dim_mean=" + dim.mean.toFixed(3) + " ± " + dim.stddev.toFixed(3) + " mm (n=" + dim.n + ")");
      }
      if (cls.features.length > 5) console.log("[aggregator]     ... and " + (cls.features.length - 5) + " more");
    }
    console.log("[aggregator] wrote " + result.written.length + " file(s) to " + DEFAULT_TEMPLATES_DIR);
  }

  exit(0);
}

main();
