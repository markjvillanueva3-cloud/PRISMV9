#!/usr/bin/env node
// scripts/harvest-prints-to-training.mjs
//
// U-TDP02 — Batch print harvester CLI shell.
//
// Walks a directory of blueprint PDFs, runs the U-TDP01 training driver on each
// NEW print (skipping already-processed ones via path-id registry), persists the
// registry atomically after each pass.
//
// USAGE:
//   node scripts/harvest-prints-to-training.mjs --dir <root> [--default-part-class C] [--max N] [--stub-mode] [--force] [--json] [--dry-run]
//
// EXAMPLE (smoke-test against JM DIE corpus, capped to 5 prints):
//   node scripts/harvest-prints-to-training.mjs --dir "H:/prism/JM DIE" --max 5 --stub-mode --json
//
// REGISTRY: state/shared/print-harvester-registry.json (override via env)
// EVENTS:   state/shared/blueprint-accuracy-events.jsonl (feeds U-BPA-CONSUMER)
//
// EXIT CODES:
//   0 — all training-driver record stages succeeded (or no new files)
//   2 — at least one record stage failed (silent training-signal loss prevented)
//   3 — invalid args / fs error

import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { listCandidates, registerProcessed, summarizeRegistry } from "./lib/print-harvester-lib.mjs";
import { runPipeline, aggregateBatch } from "./lib/training-driver-lib.mjs";
import { appendAccuracyEvent } from "./lib/blueprint-accuracy-event-writer.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REGISTRY_FILE = env.PRISM_HARVESTER_REGISTRY || join(REPO_ROOT, "state", "shared", "print-harvester-registry.json");
const DEFAULT_EVENTS_FILE = env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");

// ── Arg parsing ────────────────────────────────────────────────────

function parseArgs(args) {
  const out = { dir: null, defaultPartClass: "general", max: null, stubMode: false, force: false, json: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dir") out.dir = args[++i];
    else if (a === "--default-part-class") out.defaultPartClass = args[++i];
    else if (a === "--max") out.max = parseInt(args[++i], 10);
    else if (a === "--stub-mode") out.stubMode = true;
    else if (a === "--force") out.force = true;
    else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

// ── fs helpers ─────────────────────────────────────────────────────

function walkPdfs(root, maxDepth = 6) {
  const out = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // permission denied / not-a-dir
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".pdf")) {
        out.push(full);
      }
    }
  }
  walk(root, 0);
  return out;
}

function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// ── Adapters (mirror training-driver-print-to-cam.mjs stub-mode) ────

// Same recipes as training-driver-print-to-cam.mjs — keeps stub-mode output
// aligned across both CLIs so U-TDP03 aggregator sees consistent shape.
const STUB_DIM_RECIPES = {
  extrude_punch: () => [
    { kind: "central_oil_hole", nominal: 1.27 + (Math.random() - 0.5) * 0.05, tolerance: { upper: 0.025, lower: -0.025 } },
    { kind: "stepped_revolved_axis", nominal: 6.35 + (Math.random() - 0.5) * 0.5, tolerance: { upper: 0.013, lower: -0.013 } },
    { kind: "bevel_face_chamfer", nominal: 0.5, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
  die: () => [
    { kind: "ejector_pin_hole", nominal: 4.76 + (Math.random() - 0.5) * 0.05, tolerance: { upper: 0.025, lower: -0.025 } },
    { kind: "stepped_revolved_axis", nominal: 12.7 + (Math.random() - 0.5) * 0.5, tolerance: { upper: 0.05, lower: -0.05 } },
    { kind: "datum_relief", nominal: 1.0, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
  shaft: () => [
    { kind: "stepped_revolved_axis", nominal: 25.4 + (Math.random() - 0.5) * 1.0, tolerance: { upper: 0.013, lower: -0.013 } },
    { kind: "datum_relief", nominal: 0.5, tolerance: { upper: 0.05, lower: -0.05 } },
    { kind: "bevel_face_chamfer", nominal: 0.5, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
};

function makeStubAdapters(eventsFile) {
  return {
    extract: async ({ pdf_path, part_class }) => {
      const recipe = STUB_DIM_RECIPES[part_class] || (() => [{ kind: "unspecified_dim", nominal: 10.0 }]);
      return {
        success: true,
        extraction: { pdf_path, part_class, confidence: 0.85, dimensions: recipe() },
      };
    },
    driveCad: async ({ part_class, built_kinds, use_corpus_evidence }) => ({
      success: true,
      setup_id: "stub-setup-" + part_class + "-" + Date.now(),
      dispatched: [{ kind: "central_oil_hole", ok: true }, { kind: "bevel_face_chamfer", ok: true }],
      skipped: [],
      use_corpus_evidence,
    }),
    driveCam: async ({ part_class, cad_setup_id }) => ({
      success: true,
      nc_output: "; STUB " + part_class + " from " + cad_setup_id + "\nO0001\nM30",
    }),
    // Canonical appender (U-BPA-EVENT-WRITER-LIB) -- consolidates the two
    // byte-identical inline impls that used to live here + makeLiveAdapters.
    // Adds a fail-loud type guard: a typeless event now throws (caught by the
    // pipeline's recordEvent try/catch -> record stage FAILED -> exit 2),
    // which is the intended "silent training-signal loss prevented" contract.
    recordEvent: async (event) => appendAccuracyEvent(event, { path: eventsFile }),
  };
}

function makeLiveAdapters(eventsFile) {
  const gate = (stage) => async () => ({
    success: false,
    error: stage + " live adapter requires operator-gated credentials — use --stub-mode for smoke-test",
  });
  return {
    extract: gate("extract"),
    driveCad: gate("driveCad"),
    driveCam: gate("driveCam"),
    // Canonical appender (U-BPA-EVENT-WRITER-LIB) -- consolidates the two
    // byte-identical inline impls that used to live here + makeLiveAdapters.
    // Adds a fail-loud type guard: a typeless event now throws (caught by the
    // pipeline's recordEvent try/catch -> record stage FAILED -> exit 2),
    // which is the intended "silent training-signal loss prevented" contract.
    recordEvent: async (event) => appendAccuracyEvent(event, { path: eventsFile }),
  };
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.dir) {
    console.error("ERR: --dir <root> is required");
    exit(3);
  }
  if (!existsSync(args.dir)) {
    console.error("ERR: --dir does not exist: " + args.dir);
    exit(3);
  }

  const registry = readJsonIfExists(DEFAULT_REGISTRY_FILE);
  const walked = walkPdfs(args.dir);

  const candidates = listCandidates(walked, registry, {
    default_part_class: args.defaultPartClass,
    max: args.max ?? undefined,
    force: args.force,
  });

  const result = {
    dir: args.dir,
    registryFile: DEFAULT_REGISTRY_FILE,
    eventsFile: DEFAULT_EVENTS_FILE,
    walked: candidates.summary.walked,
    new: candidates.summary.new,
    skipped: candidates.summary.skipped,
    capped: candidates.summary.capped,
    errors: candidates.summary.errors,
    stubMode: args.stubMode,
    dryRun: args.dryRun,
    jobs: candidates.newJobs,
    runs: [],
    aggregate: null,
    registrySummary: null,
  };

  if (args.dryRun) {
    result.note = "dry-run: no driver invocations, no registry updates";
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("[harvester] dir=" + args.dir);
      console.log("[harvester] walked=" + result.walked + " new=" + result.new + " skipped=" + result.skipped);
      console.log("[harvester] DRY-RUN — would run driver on " + result.new + " new prints");
    }
    exit(0);
  }

  const adapters = args.stubMode ? makeStubAdapters(DEFAULT_EVENTS_FILE) : makeLiveAdapters(DEFAULT_EVENTS_FILE);

  for (const job of candidates.newJobs) {
    const r = await runPipeline({
      pdf_path: job.pdf_path,
      part_class: job.part_class,
      built_kinds: [],
      use_corpus_evidence: true,
    }, adapters);
    result.runs.push(r);
  }

  result.aggregate = aggregateBatch(result.runs);

  // Update registry: mark every job's outcome (record-status-derived).
  const processedJobs = candidates.newJobs.map((j, idx) => {
    const run = result.runs[idx];
    const status = run?.stages?.record?.status === "ok" ? "ok" : "failed";
    return { ...j, status };
  });
  const newRegistry = registerProcessed(registry, processedJobs);
  atomicWriteJson(DEFAULT_REGISTRY_FILE, newRegistry);
  result.registrySummary = summarizeRegistry(newRegistry);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[harvester] dir=" + args.dir);
    console.log("[harvester] walked=" + result.walked + " new=" + result.new + " skipped=" + result.skipped + (result.capped ? " (capped)" : ""));
    console.log("[harvester] stages: extract.ok=" + result.aggregate.byStageStatus.extract.ok + " cad.ok=" + result.aggregate.byStageStatus.cad.ok + " cam.ok=" + result.aggregate.byStageStatus.cam.ok + " record.ok=" + result.aggregate.byStageStatus.record.ok);
    console.log("[harvester] happy_path=" + result.aggregate.fullyHappyPathCount + "/" + result.aggregate.runCount);
    console.log("[harvester] registry: " + result.registrySummary.totalProcessed + " total processed across " + result.registrySummary.totalRuns + " runs");
    console.log("[harvester] events appended to: " + DEFAULT_EVENTS_FILE);
  }

  if (result.aggregate.byStageStatus.record.failed > 0) exit(2);
  exit(0);
}

main().catch((e) => {
  console.error("[harvester] FATAL: " + (e instanceof Error ? e.message : String(e)));
  exit(3);
});
