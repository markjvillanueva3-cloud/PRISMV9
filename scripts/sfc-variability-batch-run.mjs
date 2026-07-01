#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 Stage 2 — Streaming batch worker.
 *
 * Reads the Stage 1 enumerator's combo stream, drives
 * SpeedFeedOrchestratorEngine.compute() on each cell, and persists
 * (input fingerprint, output, safety status) to chunked JSONL files
 * under state/shared/sfc-variability-results/<domain>/.
 *
 * Operator directive: "generate the billions". This worker is the
 * streaming pump — enumerator emits ~600K/s, orchestrator processes
 * ~5 ms/cell, so a single worker sustains ~200 cells/sec. We run multiple
 * workers in parallel (--workers N) and round-robin assign by combo index.
 *
 * Modes:
 *   --domain mill|lathe   (which enumerator to use, default mill;
 *                          lathe enumerator built separately as Stage 1B)
 *   --max-minutes N       (wall-clock cap; default 60)
 *   --max-cells N         (output count cap; default Infinity)
 *   --chunk N             (rows per output chunk file; default 5000)
 *   --workers N           (parallelism; default 1)
 *   --workerIdx I/N       (when invoked as a worker; takes every Nth combo)
 *   --skip N              (skip first N combos — resumable)
 *   --dry-run             (count cells, no orchestrator call)
 *   --out <dir>           (default state/shared/sfc-variability-results/<domain>)
 *
 * Tolerance: orchestrator may throw on adversarial inputs. We catch + record
 * the error class but never abort the run. Final summary reports
 * (ok, error) per worker.
 *
 * Resumability: each chunk file is named with starting combo index, so
 * restart with --skip <last-chunk-end> picks up cleanly.
 *
 * Output schema (per JSONL line):
 *   {
 *     fp: "<16-char input fingerprint>",
 *     idx: <0-based combo index>,
 *     in:  { ...slim OrchestratorInput keyed by 2-4 char codes },
 *     out: { rpm, vc, fz, vf, ap, ae, mrr, pkw, trq, fN, life, Ra,
 *            defl, conf, sz, pch, lim, safe, eng }   // null on error
 *     err: "<message>" | null
 *   }
 *
 * The slim input only keeps fields that affect orchestrator output —
 * dropping the redundant resolved-context fields cuts ~70% of disk bytes.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// ─── CONSTANTS ─────────────────────────────────────────────────────────
/** Milliseconds in a second (used for elapsed-time math). */
const MS_PER_SEC = 1000;
/** Milliseconds in a minute (deadline math: --max-minutes × MIN_TO_MS). */
const MIN_TO_MS = 60 * MS_PER_SEC;
/** Heartbeat cadence: log progress to stderr every N cells. */
const HEARTBEAT_EVERY = 1000;
/** Fingerprint length — 16 hex chars = 64 bits, collision-free at <1B inputs. */
const FP_LEN = 16;
/** Truncate orchestrator error messages to this many chars in chunk JSONL. */
const MAX_ERR_MSG_LEN = 200;
/** Limiting factors are noisy; keep at most this many per cell in the output. */
const MAX_LIM_FACTORS_PER_CELL = 5;
/** Zero-pad chunk-start idx in filenames to this width (supports up to 1T combos). */
const CHUNK_IDX_PAD = 12;
/** Default chunk size — balances disk IO against memory + write granularity. */
const DEFAULT_CHUNK_ROWS = 5000;
/** Default wall-clock budget per worker run (minutes). */
const DEFAULT_MAX_MINUTES = 60;
/** Default worker parallelism — single-process by default. */
const DEFAULT_WORKERS = 1;
/** Hash mix multiplier (FNV-style prime) — collision-resistant for short keys. */
const HASH_MULT = 31;
/** Rounding precision per output field (decimal places). */
const DP_VC      = 1;
const DP_FZ      = 4;
const DP_AP      = 2;
const DP_AE      = 2;
const DP_MRR     = 1;
const DP_POWER   = 2;
const DP_TORQUE  = 1;
const DP_FORCE   = 0;
const DP_LIFE    = 1;
const DP_RA      = 3;
const DP_DEFL    = 2;
const DP_CONF    = 3;
const DP_PCHAT   = 3;

// ─── DOMAIN ENUMERATOR REGISTRY (defer resolution to avoid static-import-check warnings) ─
const ENUMERATOR_BY_DOMAIN = {
  mill:  "./sfc-variability-enumerate.mjs",
  lathe: "./sfc-variability-enumerate-lathe.mjs", // Stage 1B — built after mill batch demonstrates pipeline
};

async function loadEnumerator(domain) {
  const path = ENUMERATOR_BY_DOMAIN[domain];
  if (!path) throw new Error(`unknown domain: ${domain}. Known: ${Object.keys(ENUMERATOR_BY_DOMAIN).join(", ")}`);
  // Dynamic import — caller might invoke before all domain enumerators exist.
  try {
    const m = await import(path);
    return m.enumerate;
  } catch (e) {
    throw new Error(`enumerator for domain "${domain}" not loadable: ${e.message}. Build ${path} first.`);
  }
}

// ─── ORCHESTRATOR (lazy import) ─────────────────────────────────────────
/** Candidate import paths — preference order is the array index (src wins over dist on tie). */
const ORCHESTRATOR_PATHS = [
  "../mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts",
  "../mcp-server/dist/index.js",
];

let _orchestrator = null;

/** Attempt one import path; never throws — returns {engine, error}. */
async function tryImportOrchestrator(path) {
  try {
    const m = await import(path);
    const engine = m.speedFeedOrchestratorEngine ?? m.default?.speedFeedOrchestratorEngine ?? null;
    return { engine, error: engine ? null : "speedFeedOrchestratorEngine export missing" };
  } catch (e) {
    return { engine: null, error: e.message };
  }
}

async function getOrchestrator() {
  if (_orchestrator) return _orchestrator;
  // Parallel-attempt both paths; pick the first index that succeeded
  // (preserves src > dist preference without a sequential await chain).
  const results = await Promise.all(ORCHESTRATOR_PATHS.map(tryImportOrchestrator));
  const winnerIdx = results.findIndex((r) => r.engine !== null);
  if (winnerIdx >= 0) {
    _orchestrator = results[winnerIdx].engine;
    return _orchestrator;
  }
  const errors = results.map((r, i) => `${ORCHESTRATOR_PATHS[i]}: ${r.error}`);
  throw new Error(
    `orchestrator import failed.\n  ${errors.join("\n  ")}\n` +
    "Either run this script under tsx " +
    "(`node_modules/.bin/tsx scripts/sfc-variability-batch-run.mjs ...`) " +
    "or `cd mcp-server && npm run build` first.",
  );
}

// ─── SLIM SERIALIZERS ─────────────────────────────────────────────────
function slimInput(input) {
  return {
    m:   input.machine_name,
    mt:  input.machine_type,
    mpk: input.machine_power_kw,
    mrr: input.machine_max_rpm,
    rig: input.machine_rigidity,
    gw:  input.machine_guideway,
    age: input.machine_age_years,
    aax: input.machine_axis_accel_m_s2,
    ajx: input.machine_axis_jerk_m_s3,
    tap: input.spindle_taper,
    spr: input.spindle_bearing_preload,
    ctl: input.controller,
    cool: input.coolant_type,
    cpr:  input.coolant_pressure_bar,
    cc:   input.coolant_concentration_pct,
    mat:  input.material,
    iso:  input.iso_group,
    hb:   input.hardness_hb,
    op:   input.operation,
    cut:  input.cut_type,
    str:  input.strategy,
    hldr: input.holder_type,
    hgl:  input.holder_gauge_length_mm,
    htir: input.holder_tir_mm,
    hbal: input.holder_balanced_g,
    td:   input.tool_diameter_mm,
    fl:   input.flutes,
    tmat: input.tool_material,
    tc:   input.tool_coating,
    hel:  input.helix_angle_deg,
    cr:   input.corner_radius_mm,
    ts:   input.tool_stickout_mm,
    ig:   input.insert_grade,
    is_:  input.insert_shape,
    nr:   input.nose_radius_mm,
    wh:   input.workholding_type,
    whs:  input.workholding_stiffness,
    cf:   input.clamping_force_kN,
    tqc:  input.spindle_torque_curve_archetype,
    obj:  input.optimize_for,
  };
}

function slimOutput(rawOut) {
  if (!rawOut || typeof rawOut !== "object") return null;
  // SpeedFeedOrchestrator wraps results in an AtomicValue<OrchestratorResult>
  // envelope: {value, confidence, source}. Unwrap if the top-level lacks
  // the canonical fields and a `.value` object is present.
  const out = (rawOut.cutting_speed_mpm == null && rawOut.value && typeof rawOut.value === "object")
    ? rawOut.value
    : rawOut;
  // Capture the envelope's confidence/source for traceability when present.
  const envelopeConf = (out !== rawOut && typeof rawOut.confidence === "number") ? rawOut.confidence : null;
  const envelopeSrc  = (out !== rawOut && typeof rawOut.source === "string") ? rawOut.source : null;
  return {
    vc:    round(out.cutting_speed_mpm, DP_VC),
    rpm:   Math.round(out.spindle_rpm ?? 0),
    fz:    round(out.feed_per_tooth_mm, DP_FZ),
    vf:    Math.round(out.feed_rate_mmmin ?? 0),
    ap:    round(out.axial_depth_mm, DP_AP),
    ae:    round(out.radial_depth_mm, DP_AE),
    mrr:   round(out.mrr_cm3min, DP_MRR),
    pkw:   round(out.power_kw, DP_POWER),
    trq:   round(out.torque_Nm, DP_TORQUE),
    fN:    round(out.tangential_force_N, DP_FORCE),
    life:  round(out.tool_life_min, DP_LIFE),
    Ra:    round(out.surface_finish_Ra_um, DP_RA),
    defl:  round(out.deflection_um, DP_DEFL),
    conf:  round(out.overall_confidence, DP_CONF),
    sz:    out.stability_assessment?.zone ?? "unknown",
    pch:   round(out.stability_assessment?.p_chatter, DP_PCHAT),
    lim:   (out.limiting_factors ?? [])
            .filter((l) => l.severity === "warning" || l.severity === "critical")
            .map((l) => `${l.parameter}:${l.severity}`)
            .slice(0, MAX_LIM_FACTORS_PER_CELL),
    safe:  (out.safety_checks ?? []).every((c) => c.passed !== false),
    eng:   (out.engines_called ?? []).length,
    envConf: envelopeConf,
    envSrc:  envelopeSrc,
  };
}

function round(v, dp) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const m = Math.pow(10, dp);
  return Math.round(v * m) / m;
}

// Lightweight non-crypto fingerprint — fast enough for 1B+ calls.
// 16 hex chars from FNV-style rolling hash over sorted-key JSON.
function fingerprint(slim) {
  const fpRaw = JSON.stringify(slim, Object.keys(slim).sort());
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < fpRaw.length; i++) {
    const c = fpRaw.charCodeAt(i);
    h1 = ((h1 * HASH_MULT) ^ c) >>> 0;
    h2 = ((h2 * (HASH_MULT + 2)) ^ c) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, FP_LEN);
}

// ─── ARG PARSING ──────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    domain: "mill",
    maxMinutes: DEFAULT_MAX_MINUTES,
    maxCells: Infinity,
    chunkSize: DEFAULT_CHUNK_ROWS,
    workers: DEFAULT_WORKERS,
    workerIdx: 0,
    workerN: 1,
    skip: 0,
    dryRun: false,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--domain")           args.domain = argv[++i];
    else if (a === "--max-minutes") args.maxMinutes = Number(argv[++i]);
    else if (a === "--max-cells")   args.maxCells = Number(argv[++i]);
    else if (a === "--chunk")       args.chunkSize = Number(argv[++i]);
    else if (a === "--workers")     args.workers = Number(argv[++i]);
    else if (a === "--workerIdx") {
      const [idx, n] = argv[++i].split("/");
      args.workerIdx = Number(idx);
      args.workerN   = Number(n);
    }
    else if (a === "--skip")        args.skip = Number(argv[++i]);
    else if (a === "--dry-run")     args.dryRun = true;
    else if (a === "--out")         args.out = argv[++i];
  }
  if (!args.out) args.out = `state/shared/sfc-variability-results/${args.domain}`;
  return args;
}

// ─── WORKER ───────────────────────────────────────────────────────────
async function runWorker(args) {
  const enumerate = await loadEnumerator(args.domain);
  const orchestrator = args.dryRun ? null : await getOrchestrator();
  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const startMs = Date.now();
  const deadlineMs = startMs + args.maxMinutes * MIN_TO_MS;
  let idx = 0;
  let processedThisWorker = 0;
  let okCount = 0;
  let errCount = 0;
  let chunkBuf = [];
  let chunkStartIdx = args.skip;

  const writeChunk = async () => {
    if (chunkBuf.length === 0) return;
    const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUNK_IDX_PAD, "0")}.jsonl`;
    const fpath = resolve(outDir, fname);
    await writeFile(fpath, chunkBuf.join("\n") + "\n", "utf8");
    chunkStartIdx = idx + 1;
    chunkBuf = [];
  };

  for (const input of enumerate()) {
    idx++;
    if (idx <= args.skip) continue;
    if (args.workerN > 1 && ((idx - 1) % args.workerN) !== args.workerIdx) continue;
    if (processedThisWorker >= args.maxCells) break;
    if (Date.now() >= deadlineMs) break;

    const slim = slimInput(input);
    const fp = fingerprint(slim);

    let out = null;
    let err = null;
    if (orchestrator) {
      try {
        const computed = orchestrator.compute(input);
        out = slimOutput(computed);
        okCount++;
      } catch (e) {
        err = String(e?.message ?? e).slice(0, MAX_ERR_MSG_LEN);
        errCount++;
      }
    } else {
      okCount++;
    }

    chunkBuf.push(JSON.stringify({ fp, idx, in: slim, out, err }));
    processedThisWorker++;

    if (chunkBuf.length >= args.chunkSize) {
      await writeChunk();
    }

    if (processedThisWorker % HEARTBEAT_EVERY === 0) {
      const elapsedSec = (Date.now() - startMs) / MS_PER_SEC;
      const rate = Math.round(processedThisWorker / elapsedSec);
      process.stderr.write(
        `[batch-w${args.workerIdx}] processed=${processedThisWorker.toLocaleString()} ` +
        `ok=${okCount} err=${errCount} rate=${rate}/s elapsed=${elapsedSec.toFixed(0)}s\n`,
      );
    }
  }
  await writeChunk();
  const elapsedMs = Date.now() - startMs;
  return {
    domain: args.domain,
    worker: `${args.workerIdx}/${args.workerN}`,
    processed: processedThisWorker,
    ok: okCount,
    err: errCount,
    elapsed_sec: Math.round(elapsedMs / MS_PER_SEC),
    rate_per_sec: Math.round(processedThisWorker / (elapsedMs / MS_PER_SEC)),
    out_dir: outDir,
    dry_run: args.dryRun,
  };
}

// ─── MULTI-WORKER ORCHESTRATOR ───────────────────────────────────────
async function runOrchestrator(args) {
  const procs = [];
  const results = [];
  for (let i = 0; i < args.workers; i++) {
    const childArgs = [
      "--domain", args.domain,
      "--max-minutes", String(args.maxMinutes),
      "--max-cells", String(args.maxCells),
      "--chunk", String(args.chunkSize),
      "--workerIdx", `${i}/${args.workers}`,
      "--skip", String(args.skip),
      "--out", args.out,
    ];
    if (args.dryRun) childArgs.push("--dry-run");
    // tsx is consumed via its CJS .mjs CLI (not the .bin shim — the shim
    // is a bash script that node refuses to load as a module).
    const tsxCli = resolve("mcp-server/node_modules/tsx/dist/cli.mjs");
    // Heap bump: tsx runs the worker script in a worker_thread, and the heavy
    // SpeedFeedOrchestratorEngine (41K-tool catalog + material DB + registries)
    // exceeds the default worker heap at init -> ERR_WORKER_OUT_OF_MEMORY before
    // a single cell processes. Pass --max-old-space-size both as a node execArg
    // (raises the main thread) AND via NODE_OPTIONS (inherited by the tsx
    // worker_thread). Per-worker MB is knob PRISM_SFC_WORKER_HEAP_MB (default
    // 3072); on the 127GB host that is safe up to ~32 workers.
    const workerHeapMb = Number(process.env.PRISM_SFC_WORKER_HEAP_MB) || 3072;
    const heapFlag = `--max-old-space-size=${workerHeapMb}`;
    const child = spawn(
      process.execPath,
      [heapFlag, tsxCli, resolve("scripts/sfc-variability-batch-run.mjs"), ...childArgs],
      {
        stdio: ["ignore", "pipe", "inherit"],
        cwd: resolve("."),
        windowsHide: true,
        env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} ${heapFlag}`.trim() },
      },
    );
    let stdoutBuf = "";
    child.stdout.on("data", (chunk) => { stdoutBuf += chunk.toString("utf8"); });
    procs.push(new Promise((res) => {
      child.on("close", () => {
        try {
          const lastLine = stdoutBuf.trim().split("\n").pop();
          if (lastLine) results.push(JSON.parse(lastLine));
        } catch { /* worker emitted non-JSON tail; aggregate count covers it */ }
        res();
      });
    }));
  }
  await Promise.all(procs);
  return {
    workers: args.workers,
    results,
    total_processed: results.reduce((s, r) => s + (r?.processed ?? 0), 0),
    total_ok: results.reduce((s, r) => s + (r?.ok ?? 0), 0),
    total_err: results.reduce((s, r) => s + (r?.err ?? 0), 0),
  };
}

// ─── ENTRY ────────────────────────────────────────────────────────────
// ESM entry-point detection — Windows-safe via fileURLToPath.
const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  const args = parseArgs(process.argv.slice(2));
  const runFn = (args.workers > 1 && args.workerN === 1) ? runOrchestrator : runWorker;
  // Top-of-script fire-and-forget — process keeps running until the promise
  // settles. `void` makes the discard explicit for static analyzers.
  void runFn(args)
    .then((res) => { console.log(JSON.stringify(res, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}

export { runWorker, runOrchestrator, slimInput, slimOutput, loadEnumerator, fingerprint };
