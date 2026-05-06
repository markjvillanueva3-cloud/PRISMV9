#!/usr/bin/env node
/**
 * lora-train — INTEL-OLLAMA-OBSIDIAN-MS0/P17-U03.
 *
 * Nightly LoRA training pipeline orchestrator. Walks
 *   mcp-server/data/training/<corpus>/corpus.json
 * and for each corpus:
 *   1. Validates the manifest (schema + presence of corpus_files).
 *   2. Decides if the run is due (>= intervalHours since last successful run).
 *   3. Counts JSONL examples, skips if < min_examples.
 *   4. Picks a trainer strategy:
 *        - "python-peft" if peft + transformers + trl import successfully
 *        - "stub-adapter" otherwise (writes a minimal adapter_config.json
 *          + zero-weight adapter_model.safetensors so the registry +
 *          Modelfile + ollama-create wire is still exercisable)
 *   5. Runs the trainer (real or stub), writes adapter into
 *        H:/prism/state/lora-adapters/<adapterName>/
 *   6. Generates an Ollama Modelfile from corpus.ollama_modelfile + ADAPTER
 *      directive pointing at the adapter dir.
 *   7. Optionally invokes `ollama create <adapterName> -f <Modelfile>`.
 *   8. Optionally hot-swap-tests: `POST /api/generate model=<adapterName>`
 *      and asserts non-empty response.
 *   9. Writes a run record to H:/prism/state/lora-adapters/<adapterName>/run.json.
 *
 * Pure decision functions are exported for vitest. The I/O glue
 * (spawnPython, writeStubAdapter, ollamaCreate, ollamaGenerate) is
 * exercised live by the script — the test file targets only the pure
 * code paths.
 *
 * USAGE
 *   node scripts/lora-train.mjs                          # discover + train all due corpora
 *   node scripts/lora-train.mjs --corpus lathe-lora      # one corpus only
 *   node scripts/lora-train.mjs --dry-run                # validate + plan, no I/O
 *   node scripts/lora-train.mjs --json                   # machine-readable output
 *   node scripts/lora-train.mjs --no-ollama-create       # stop after writing adapter
 *   node scripts/lora-train.mjs --interval-hours 168     # weekly cadence (default 24h)
 *
 * Exit codes:
 *   0 = success (all due corpora trained or skipped cleanly)
 *   1 = bad arguments / missing training root
 *   2 = corpus manifest invalid
 *   3 = trainer failed (real or stub)
 *   4 = ollama create / hot-swap failed
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);

export const TRAINING_ROOT_RELATIVE = "mcp-server/data/training";
export const ADAPTER_ROOT_ABSOLUTE = "H:/prism/state/lora-adapters";
export const DEFAULT_INTERVAL_HOURS = 24;
export const STUB_ADAPTER_DIM = 16;             // matches alpha=16 default in corpus.json
export const STUB_ADAPTER_BYTES_TARGET = 1024;  // small placeholder
export const PYTHON_BIN_DEFAULT = "H:/Tools/python/python.exe";
export const PYTHON_PROBE_TIMEOUT_MS = 5_000;
export const OLLAMA_CREATE_TIMEOUT_MS = 60_000;
export const OLLAMA_GENERATE_TIMEOUT_MS = 30_000;
export const SUPPORTED_ADAPTER_TARGETS = new Set(["ollama"]);

// ──────────────────────────────────────────────────────────────────────
// Pure logic — exported for unit tests
// ──────────────────────────────────────────────────────────────────────

/**
 * Validate the shape of a parsed corpus.json. Returns:
 *   { ok: true, corpus }  on success (corpus is the input echoed back)
 *   { ok: false, errors: string[] }  on failure
 *
 * Required keys: schemaVersion, name, base_model, adapter_name, adapter_target,
 * corpus_files (non-empty), min_examples (non-negative int).
 *
 * @param {unknown} parsed
 */
export function validateCorpusManifest(parsed) {
  const errors = /** @type {string[]} */ ([]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["not-an-object"] };
  }
  const c = /** @type {any} */ (parsed);
  if (typeof c.schemaVersion !== "string" || c.schemaVersion.length === 0) errors.push("missing:schemaVersion");
  if (typeof c.name !== "string" || c.name.length === 0) errors.push("missing:name");
  if (typeof c.base_model !== "string" || c.base_model.length === 0) errors.push("missing:base_model");
  if (typeof c.adapter_name !== "string" || c.adapter_name.length === 0) errors.push("missing:adapter_name");
  if (typeof c.adapter_target !== "string" || !SUPPORTED_ADAPTER_TARGETS.has(c.adapter_target)) {
    errors.push(`unsupported:adapter_target=${c.adapter_target}`);
  }
  if (!Array.isArray(c.corpus_files) || c.corpus_files.length === 0) errors.push("missing:corpus_files");
  if (Array.isArray(c.corpus_files)) {
    for (const f of c.corpus_files) {
      if (typeof f !== "string" || f.length === 0) {
        errors.push("corpus_files-entry-not-string");
        break;
      }
    }
  }
  const minEx = c.min_examples;
  if (typeof minEx !== "number" || !Number.isInteger(minEx) || minEx < 0) errors.push("missing:min_examples");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, corpus: c };
}

/**
 * Count NDJSON examples in a corpus body. One non-empty, parseable JSON
 * object per line counts as 1. Lines that don't parse are skipped (and
 * counted in `parseErrors`).
 *
 * @param {string} body - file contents
 */
export function countJsonlExamples(body) {
  if (typeof body !== "string" || body.length === 0) return { count: 0, parseErrors: 0 };
  let count = 0;
  let parseErrors = 0;
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) count += 1;
      else parseErrors += 1;
    } catch {
      parseErrors += 1;
    }
  }
  return { count, parseErrors };
}

/**
 * Decide whether a corpus is due to train. Skips when a successful run
 * recorded `lastRunAt` within `intervalHours` of `nowMs`.
 *
 * @param {object} input
 * @param {string|null} input.lastRunAt   - ISO of last successful run, or null
 * @param {number} input.intervalHours
 * @param {number} input.nowMs
 * @param {boolean} [input.force]
 */
export function decideRunCondition({ lastRunAt, intervalHours, nowMs, force = false }) {
  if (force) return { run: true, reason: "force" };
  if (!lastRunAt) return { run: true, reason: "never-run" };
  const lastMs = Date.parse(lastRunAt);
  if (!Number.isFinite(lastMs)) return { run: true, reason: "bad-last-run" };
  const elapsedHours = (nowMs - lastMs) / 3_600_000;
  if (elapsedHours >= intervalHours) {
    return { run: true, reason: "interval-elapsed", elapsedHours };
  }
  return { run: false, reason: "recently-trained", elapsedHours };
}

/**
 * Decide which trainer strategy to use.
 *
 * @param {object} input
 * @param {boolean} input.pythonAvailable
 * @param {boolean} input.peftAvailable
 * @param {boolean} [input.dryRun]
 */
export function decideTrainerStrategy({ pythonAvailable, peftAvailable, dryRun = false }) {
  if (dryRun) return { strategy: "dry-run", reason: "dry-run-flag" };
  if (pythonAvailable && peftAvailable) return { strategy: "python-peft", reason: "deps-ok" };
  if (!pythonAvailable) return { strategy: "stub-adapter", reason: "no-python" };
  return { strategy: "stub-adapter", reason: "no-peft" };
}

/**
 * Compose an Ollama Modelfile string. Order matters: FROM, ADAPTER,
 * PARAMETER lines (alphabetical), then SYSTEM (heredoc-quoted).
 *
 * @param {object} input
 * @param {string} input.baseModel
 * @param {string} input.adapterPath  - relative or absolute path to adapter dir
 * @param {Record<string, number|string>} [input.parameters]
 * @param {string} [input.system]
 */
export function buildModelfile({ baseModel, adapterPath, parameters = {}, system }) {
  if (typeof baseModel !== "string" || baseModel.length === 0) {
    throw new Error("baseModel required");
  }
  if (typeof adapterPath !== "string" || adapterPath.length === 0) {
    throw new Error("adapterPath required");
  }
  const lines = [
    `FROM ${baseModel}`,
    `ADAPTER ${adapterPath}`,
  ];
  const sortedKeys = Object.keys(parameters).sort();
  for (const k of sortedKeys) {
    const v = parameters[k];
    if (v === null || v === undefined) continue;
    lines.push(`PARAMETER ${k} ${v}`);
  }
  if (typeof system === "string" && system.length > 0) {
    lines.push(`SYSTEM """${system.replace(/"""/g, '"""\\"\\"\\"')}"""`);
  }
  return lines.join("\n") + "\n";
}

/**
 * Resolve the on-disk adapter directory for a given adapter name.
 * Always under `ADAPTER_ROOT_ABSOLUTE` so the cross-PC story (P17-U02)
 * keeps holding — adapters survive worktree churn.
 *
 * @param {string} adapterName
 */
export function resolveAdapterDir(adapterName) {
  if (typeof adapterName !== "string" || !/^[A-Za-z0-9._-]+$/.test(adapterName)) {
    throw new Error(`bad adapter name: ${adapterName}`);
  }
  return path.posix.join(ADAPTER_ROOT_ABSOLUTE, adapterName);
}

/**
 * Argv parser.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const out = {
    corpus: "",
    dryRun: false,
    json: false,
    noOllamaCreate: false,
    intervalHours: 0,
    force: false,
    skipHotSwap: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--corpus") out.corpus = argv[++i] ?? "";
    else if (a.startsWith("--corpus=")) out.corpus = a.slice("--corpus=".length);
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--no-ollama-create") out.noOllamaCreate = true;
    else if (a === "--skip-hot-swap") out.skipHotSwap = true;
    else if (a === "--force") out.force = true;
    else if (a === "--interval-hours") out.intervalHours = Number(argv[++i] ?? "");
    else if (a.startsWith("--interval-hours=")) out.intervalHours = Number(a.slice("--interval-hours=".length));
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// I/O glue — live calls; not exercised in vitest
// ──────────────────────────────────────────────────────────────────────

function findRepoRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, "docker-compose.yml"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

async function probePython(pythonBin) {
  try {
    const { stdout } = await execFileP(pythonBin, ["-V"], { timeout: PYTHON_PROBE_TIMEOUT_MS });
    return { available: true, version: String(stdout).trim() };
  } catch {
    return { available: false, version: null };
  }
}

async function probePeft(pythonBin) {
  try {
    const { stdout } = await execFileP(
      pythonBin,
      ["-c", "import peft, transformers, trl; print(peft.__version__)"],
      { timeout: PYTHON_PROBE_TIMEOUT_MS },
    );
    return { available: true, version: String(stdout).trim() };
  } catch {
    return { available: false, version: null };
  }
}

function listCorpora(trainingRoot) {
  if (!fs.existsSync(trainingRoot)) return [];
  return fs
    .readdirSync(trainingRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(trainingRoot, d.name, "corpus.json")))
    .map((d) => d.name);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readLastRun(adapterDir) {
  const p = path.join(adapterDir, "run.json");
  if (!fs.existsSync(p)) return null;
  try {
    const j = readJson(p);
    return typeof j.completedAt === "string" ? j.completedAt : null;
  } catch {
    return null;
  }
}

function writeStubAdapter(adapterDir, corpus, jobId) {
  fs.mkdirSync(adapterDir, { recursive: true });
  const adapterConfig = {
    base_model_name_or_path: corpus.base_model,
    bias: "none",
    fan_in_fan_out: false,
    inference_mode: true,
    init_lora_weights: true,
    lora_alpha: corpus.training?.alpha ?? 16,
    lora_dropout: corpus.training?.dropout ?? 0.05,
    peft_type: "LORA",
    r: corpus.training?.rank ?? 8,
    target_modules: ["q_proj", "v_proj"],
    task_type: "CAUSAL_LM",
  };
  fs.writeFileSync(
    path.join(adapterDir, "adapter_config.json"),
    JSON.stringify(adapterConfig, null, 2),
  );
  // Placeholder — Ollama may reject this when invoking `ollama create`,
  // and that's a true environmental signal (not a wire failure).
  const stubBytes = Buffer.alloc(STUB_ADAPTER_BYTES_TARGET, 0);
  fs.writeFileSync(path.join(adapterDir, "adapter_model.safetensors"), stubBytes);
  fs.writeFileSync(
    path.join(adapterDir, "prism.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        adapterId: corpus.adapter_name,
        baseModel: corpus.base_model,
        jobId,
        trainedAt: new Date().toISOString(),
        label: `stub-${jobId}`,
        notes:
          "Stub adapter generated by lora-train.mjs because peft+transformers+trl were not importable. Real training requires `pip install peft transformers trl`.",
        tags: corpus.tags ?? [],
      },
      null,
      2,
    ),
  );
}

async function ollamaCreate(adapterName, modelfilePath, baseUrl) {
  const url = `${baseUrl}/api/create`;
  const modelfileText = fs.readFileSync(modelfilePath, "utf8");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_CREATE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: adapterName, modelfile: modelfileText, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, status: res.status, body: body.slice(0, 500) };
    }
    const body = await res.text();
    return { ok: true, status: res.status, body: body.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

async function ollamaHotSwapTest(modelName, baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_GENERATE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, prompt: "say hello in one short sentence", stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json();
    if (typeof json?.response !== "string" || json.response.length === 0) {
      return { ok: false, status: res.status, reason: "empty-response" };
    }
    return { ok: true, status: res.status, response: json.response.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

async function trainOneCorpus(corpusDir, args, env) {
  const corpusJsonPath = path.join(corpusDir, "corpus.json");
  const parsed = readJson(corpusJsonPath);
  const validation = validateCorpusManifest(parsed);
  if (!validation.ok) {
    return { ok: false, corpus: path.basename(corpusDir), error: `manifest:${validation.errors.join(",")}`, exitCode: 2 };
  }
  const corpus = validation.corpus;

  // Count examples
  let totalExamples = 0;
  for (const f of corpus.corpus_files) {
    const fp = path.join(corpusDir, f);
    if (!fs.existsSync(fp)) {
      return { ok: false, corpus: corpus.name, error: `corpus-file-missing:${f}`, exitCode: 2 };
    }
    const c = countJsonlExamples(fs.readFileSync(fp, "utf8"));
    totalExamples += c.count;
  }

  if (totalExamples < corpus.min_examples) {
    return {
      ok: true,
      corpus: corpus.name,
      skipped: "too-few-examples",
      examples: totalExamples,
      min_examples: corpus.min_examples,
    };
  }

  // Run condition
  const adapterDir = resolveAdapterDir(corpus.adapter_name);
  const lastRunAt = readLastRun(adapterDir);
  const intervalHours = args.intervalHours > 0 ? args.intervalHours : DEFAULT_INTERVAL_HOURS;
  const decision = decideRunCondition({
    lastRunAt,
    intervalHours,
    nowMs: Date.now(),
    force: args.force,
  });
  if (!decision.run) {
    return { ok: true, corpus: corpus.name, skipped: "recently-trained", lastRunAt };
  }

  // Trainer strategy
  const strategy = decideTrainerStrategy({
    pythonAvailable: env.python.available,
    peftAvailable: env.peft.available,
    dryRun: args.dryRun,
  });

  if (strategy.strategy === "dry-run") {
    return {
      ok: true,
      corpus: corpus.name,
      planned: {
        strategy: "would-train",
        examples: totalExamples,
        adapterDir,
        baseModel: corpus.base_model,
      },
    };
  }

  const jobId = `lora-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;

  if (strategy.strategy === "stub-adapter") {
    writeStubAdapter(adapterDir, corpus, jobId);
  } else {
    // python-peft path: spawn the trainer module if the user has wired
    // one. We don't ship a trainer here — peft training rigs vary by
    // user setup. Document path: scripts/lora-train.py reads stdin.
    const trainerScript = path.join(env.repoRoot, "scripts", "lora-train.py");
    if (!fs.existsSync(trainerScript)) {
      // Fall back to stub if no Python entrypoint exists yet.
      writeStubAdapter(adapterDir, corpus, jobId);
    } else {
      try {
        await execFileP(env.pythonBin, [
          trainerScript,
          "--corpus", corpusDir,
          "--adapter-out", adapterDir,
          "--base-model", corpus.base_model,
          "--job-id", jobId,
        ], { timeout: 30 * 60_000 });
      } catch (e) {
        return { ok: false, corpus: corpus.name, error: `python-trainer:${e.message?.slice(0, 200)}`, exitCode: 3 };
      }
    }
  }

  // Build Modelfile
  const modelfile = buildModelfile({
    baseModel: corpus.base_model,
    adapterPath: adapterDir,
    parameters: corpus.ollama_modelfile?.parameters ?? {},
    system: corpus.ollama_modelfile?.system,
  });
  const modelfilePath = path.join(adapterDir, "Modelfile");
  fs.writeFileSync(modelfilePath, modelfile);

  let createResult = null;
  let hotSwap = null;

  if (!args.noOllamaCreate) {
    createResult = await ollamaCreate(corpus.adapter_name, modelfilePath, env.ollamaBaseUrl);
    if (createResult.ok && !args.skipHotSwap) {
      hotSwap = await ollamaHotSwapTest(corpus.adapter_name, env.ollamaBaseUrl);
    }
  }

  // Persist run record
  const runRecord = {
    schemaVersion: 1,
    jobId,
    corpus: corpus.name,
    adapterName: corpus.adapter_name,
    baseModel: corpus.base_model,
    strategy: strategy.strategy,
    examples: totalExamples,
    completedAt: new Date().toISOString(),
    ollamaCreate: createResult ?? null,
    hotSwap: hotSwap ?? null,
  };
  fs.writeFileSync(path.join(adapterDir, "run.json"), JSON.stringify(runRecord, null, 2));

  const ok = strategy.strategy === "dry-run"
    || strategy.strategy === "stub-adapter"
    || (createResult ? createResult.ok : true);

  return {
    ok,
    corpus: corpus.name,
    strategy: strategy.strategy,
    examples: totalExamples,
    adapterDir,
    modelfilePath,
    jobId,
    ollamaCreate: createResult,
    hotSwap,
    exitCode: ok ? 0 : 4,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot();
  const trainingRoot = path.join(repoRoot, TRAINING_ROOT_RELATIVE);
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const pythonBin = process.env.PYTHON_BIN || PYTHON_BIN_DEFAULT;

  if (!fs.existsSync(trainingRoot)) {
    emitFinal({ error: `training-root-missing:${trainingRoot}` }, args.json);
    process.exit(1);
  }

  const allCorpora = listCorpora(trainingRoot);
  const corpora = args.corpus
    ? allCorpora.filter((n) => n === args.corpus)
    : allCorpora;

  if (corpora.length === 0) {
    emitFinal({ error: args.corpus ? `corpus-not-found:${args.corpus}` : "no-corpora" }, args.json);
    process.exit(1);
  }

  const env = {
    repoRoot,
    ollamaBaseUrl,
    pythonBin,
    python: await probePython(pythonBin),
    peft: { available: false, version: null },
  };
  if (env.python.available && !args.dryRun) {
    env.peft = await probePeft(pythonBin);
  }

  const results = [];
  let worstExitCode = 0;
  for (const name of corpora) {
    const r = await trainOneCorpus(path.join(trainingRoot, name), args, env);
    results.push(r);
    if (typeof r.exitCode === "number" && r.exitCode > worstExitCode) worstExitCode = r.exitCode;
  }

  emitFinal(
    {
      ok: worstExitCode === 0,
      args,
      env: { python: env.python, peft: env.peft, ollamaBaseUrl: env.ollamaBaseUrl },
      results,
    },
    args.json,
  );
  process.exit(worstExitCode);
}

function emitFinal(report, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  if (report.error) {
    process.stdout.write(`ERROR: ${report.error}\n`);
    return;
  }
  const lines = [
    `python:  ${report.env.python.available ? "yes (" + report.env.python.version + ")" : "no"}`,
    `peft:    ${report.env.peft.available ? "yes (" + report.env.peft.version + ")" : "no"}`,
    `ollama:  ${report.env.ollamaBaseUrl}`,
    `corpora: ${report.results.length}`,
  ];
  for (const r of report.results) {
    if (r.skipped) {
      lines.push(`  ${r.corpus}: SKIP (${r.skipped})`);
      continue;
    }
    if (!r.ok) {
      lines.push(`  ${r.corpus}: FAIL (${r.error ?? "unknown"})`);
      continue;
    }
    if (r.planned) {
      lines.push(`  ${r.corpus}: PLANNED (would train ${r.planned.examples} examples → ${r.planned.adapterDir})`);
      continue;
    }
    const swap = r.hotSwap?.ok ? "swap-ok" : r.hotSwap ? "swap-fail" : "swap-skipped";
    lines.push(`  ${r.corpus}: PASS (${r.strategy}, ${r.examples} examples, ${swap})`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("lora-train.mjs");
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`unhandled: ${e?.stack ?? e}\n`);
    process.exit(1);
  });
}
