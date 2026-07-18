#!/usr/bin/env node
/**
 * build-machine-lora-datasets.mjs -- producer: per-machine RawJobs -> Alpaca LoRA datasets
 * (U-LORA-MACHINE-CORPUS-PRODUCER, slot:india 2026-06-18).
 *
 * THE REACH-DESTINATION CLOSURE for the MachineLoRABaseEngine family. The 8
 * BaseLoRADatasetBuilder wrappers (milling/5axis/millturn/wedm/sinker/laser/waterjet/
 * grinding) are dispatcher-reachable (`*_lora_build_dataset`), but nothing wrote their
 * buildDataset() output to a registered corpus file -- so it never reached
 * state/shared/lora/fleet-lora-combined.jsonl (the GPU fine-tune corpus). This producer
 * is the missing pipe: read REAL per-machine jobs -> route to the machine's builder ->
 * write state/shared/lora/machine-<type>-dataset.jsonl. The outputs are registered as
 * lora-training-jsonl sources in build-fleet-training-corpus-inventory.mjs so
 * assemble-fleet-lora-corpus.mjs folds them in automatically (manifest-driven).
 *
 * HONESTY CONTRACT (R12): per-machine REAL job collection is the OWNING galaxy slot's
 * job (whiskey=lathe, oscar=speed-feed, mike=wedm, foxtrot=mill, etc.). A slot drops its
 * real shop actuals at state/shared/training/machine-jobs/<type>.jsonl (one RawJob per
 * line). This producer NEVER synthesizes jobs -- a machine with no job file is reported
 * "0 jobs -- awaiting real actuals" and SKIPPED (a synthetic row would poison the
 * fine-tune). So a freshly-cloned repo produces 0 rows and that is CORRECT, not a bug.
 *
 * RawJob (per scripts ../mcp-server/src/engines/MachineLoRABaseEngine.ts):
 *   { id, fingerprint:{}, features:{}, actual:{}, weight?, labels?[] }
 *
 * Usage:
 *   node scripts/build-machine-lora-datasets.mjs            # dry-run: counts only
 *   node scripts/build-machine-lora-datasets.mjs --out      # write the per-machine jsonls
 *   node scripts/build-machine-lora-datasets.mjs --json     # machine-readable summary
 *
 * NOTE on the engine import: the builders are TS engines compiled to mcp-server/dist.
 * The default resolver imports from dist; if dist is absent/stale it FAILS LOUD (R12)
 * telling the operator to run `npm run build`. The pure core (buildMachineDatasets) takes
 * an injected `resolveBuilder` so the routing/IO is hermetically testable WITHOUT dist.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JOBS_DIR = path.join(ROOT, "state", "shared", "training", "machine-jobs");
const OUT_DIR = path.join(ROOT, "state", "shared", "lora");
const DIST_ENGINES = path.join(ROOT, "mcp-server", "dist", "engines");

/**
 * The machine LoRA dataset-builder family (the 8 BaseLoRADatasetBuilder wrappers).
 * Lathe is EXCLUDED on purpose: LatheLoRADatasetBuilderEngine is a different shape
 * (a 716-line async archive-scanner that builds from JM DIE/CNC LATHE, not from passed
 * RawJobs) -- it has its own corpus path. owner = the slot that supplies real jobs.
 */
export const MACHINES = [
  { type: "milling",  engineFile: "MillingLoRADatasetBuilderEngine.js",   singleton: "millingLoRADatasetBuilderEngine",   owner: "foxtrot", domains: ["mill"] },
  { type: "5axis",    engineFile: "FiveAxisLoRADatasetBuilderEngine.js",  singleton: "fiveAxisLoRADatasetBuilderEngine",  owner: "foxtrot", domains: ["mill", "5axis"] },
  { type: "millturn", engineFile: "MillTurnLoRADatasetBuilderEngine.js",  singleton: "millTurnLoRADatasetBuilderEngine",  owner: "whiskey", domains: ["lathe", "mill"] },
  { type: "wedm",     engineFile: "WEDMLoRADatasetBuilderEngine.js",      singleton: "wedmLoRADatasetBuilderEngine",      owner: "mike",    domains: ["wedm"] },
  { type: "sinker",   engineFile: "SinkerEDMLoRADatasetBuilderEngine.js", singleton: "sinkerEDMLoRADatasetBuilderEngine", owner: "mike",    domains: ["wedm", "edm"] },
  { type: "laser",    engineFile: "LaserLoRADatasetBuilderEngine.js",     singleton: "laserLoRADatasetBuilderEngine",     owner: "mike",    domains: ["laser"] },
  { type: "waterjet", engineFile: "WaterjetLoRADatasetBuilderEngine.js",  singleton: "waterjetLoRADatasetBuilderEngine",  owner: "mike",    domains: ["waterjet"] },
  { type: "grinding", engineFile: "GrindingLoRADatasetBuilderEngine.js",  singleton: "grindingLoRADatasetBuilderEngine",  owner: "foxtrot", domains: ["grinding"] },
];

/** Canonical per-machine output path. Single-sourced so the inventory SOURCES entries match. */
export function outPathFor(type, outDir = OUT_DIR) {
  return path.join(outDir, `machine-${type}-dataset.jsonl`);
}

/**
 * Parse a machine-jobs jsonl into RawJob[]. One JSON object per non-empty line.
 * Malformed lines are COUNTED, never silently dropped into the dataset (R12). A job
 * missing the basic RawJob shape (object with features+actual) is counted malformed too
 * -- the engine does the domain validation, but a non-object line can never be a job.
 */
export function parseJobsJsonl(text) {
  const jobs = [];
  let malformed = 0;
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { malformed++; continue; }
    if (!o || typeof o !== "object" || typeof o.features !== "object" || typeof o.actual !== "object") {
      malformed++;
      continue;
    }
    jobs.push(o);
  }
  return { jobs, malformed };
}

/** Flatten a builder DatasetBuildResult's train/val/test examples into a flat Alpaca row list. */
export function flattenExamples(result) {
  const ex = (result && result.examples) || {};
  return [...(ex.train || []), ...(ex.val || []), ...(ex.test || [])];
}

/**
 * Build per-machine datasets. PURE w.r.t. the injected deps so routing/IO is testable
 * without dist or real engines. `resolveBuilder(machine)` returns the builder singleton
 * (with a `buildDataset(jobs, split?)` method) or throws; a throw is recorded as that
 * machine's error and never aborts the whole run.
 *
 * Returns { machines: [{type, jobs, malformed, examples, skipped?, error?, out?}], totalExamples }.
 */
export async function buildMachineDatasets({
  machines = MACHINES,
  jobsDir = JOBS_DIR,
  outDir = OUT_DIR,
  write = false,
  resolveBuilder,
  readFileImpl = fs.readFileSync,
  existsImpl = fs.existsSync,
  writeImpl = writeJsonlAtomic,
} = {}) {
  if (typeof resolveBuilder !== "function") {
    throw new Error("buildMachineDatasets requires a resolveBuilder(machine) function");
  }
  const out = [];
  let totalExamples = 0;
  for (const m of machines) {
    const jobsPath = path.join(jobsDir, `${m.type}.jsonl`);
    const rec = { type: m.type, owner: m.owner, jobsPath, jobs: 0, malformed: 0, examples: 0 };
    if (!existsImpl(jobsPath)) {
      rec.skipped = "no-jobs-file";
      out.push(rec);
      continue;
    }
    let text = "";
    try { text = readFileImpl(jobsPath, "utf8"); } catch { rec.error = "read-failed"; out.push(rec); continue; }
    const { jobs, malformed } = parseJobsJsonl(text);
    rec.jobs = jobs.length;
    rec.malformed = malformed;
    if (jobs.length === 0) {
      // Distinct honest reasons (R12 observability): a corrupt jobs file (all lines
      // malformed) reads differently from a genuinely empty/whitespace file.
      rec.skipped = malformed > 0 ? "all-malformed" : "empty-after-parse";
      out.push(rec);
      continue;
    }
    let builder;
    try { builder = await resolveBuilder(m); } catch (e) { rec.error = `resolve-failed: ${e.message}`; out.push(rec); continue; }
    if (!builder || typeof builder.buildDataset !== "function") {
      rec.error = "builder-has-no-buildDataset";
      out.push(rec);
      continue;
    }
    let result;
    try { result = await builder.buildDataset(jobs); } catch (e) { rec.error = `buildDataset-threw: ${e.message}`; out.push(rec); continue; }
    const rows = flattenExamples(result);
    rec.examples = rows.length;
    rec.validJobs = result && result.stats ? result.stats.validJobs : undefined;
    if (rows.length === 0) {
      // Had jobs, but the engine's validate() dropped them all -- do NOT write an empty
      // file that reads as a successful run; surface a distinct honest skip (R12). This is
      // a real signal: the slot's actuals don't meet the builder's required schema.
      rec.skipped = "all-jobs-invalid";
      out.push(rec);
      continue;
    }
    totalExamples += rows.length;
    if (write) {
      const outPath = outPathFor(m.type, outDir);
      writeImpl(outPath, rows);
      rec.out = outPath;
    }
    out.push(rec);
  }
  return { machines: out, totalExamples };
}

export function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

/**
 * Default builder resolver -- imports the compiled engine from mcp-server/dist. FAILS
 * LOUD (R12) if dist is missing so the operator runs `npm run build` rather than the
 * producer silently emitting nothing. The pure core injects its own resolver in tests.
 */
async function distResolver(m) {
  const file = path.join(DIST_ENGINES, m.engineFile);
  if (!fs.existsSync(file)) {
    throw new Error(`dist engine missing: ${file} -- run: (cd mcp-server && npm run build)`);
  }
  const mod = await import(pathToFileURL(file).href);
  const eng = mod[m.singleton];
  if (!eng) throw new Error(`dist engine ${m.engineFile} has no export '${m.singleton}'`);
  return eng;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");

  const res = await buildMachineDatasets({ write, resolveBuilder: distResolver });

  if (asJson) {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    return;
  }
  process.stdout.write(`machine LoRA datasets: ${res.totalExamples} total examples across ${res.machines.length} machine type(s)\n`);
  for (const r of res.machines) {
    if (r.skipped) {
      process.stdout.write(`  - ${r.type} (owner:${r.owner}): SKIP (${r.skipped}) -- awaiting real actuals at ${r.jobsPath}\n`);
    } else if (r.error) {
      process.stdout.write(`  - ${r.type}: ERROR ${r.error}\n`);
    } else {
      const w = r.out ? ` -> ${path.relative(ROOT, r.out)}` : "";
      process.stdout.write(`  - ${r.type}: ${r.examples} examples from ${r.jobs} jobs (${r.malformed} malformed)${w}\n`);
    }
  }
  if (!write) process.stdout.write(`(dry-run; pass --out to write the per-machine jsonls)\n`);
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__isMain) {
  // R12: a thrown error (e.g. dist missing) must exit non-zero, not become a silent
  // unhandled rejection that looks like a clean run.
  main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
}

export { JOBS_DIR, OUT_DIR, DIST_ENGINES, distResolver };
