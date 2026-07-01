#!/usr/bin/env node
// scripts/batch-ollama-vision-extract.mjs
//
// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
//
// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
// saturation — see BLUEPRINT-VISION-OCR-UPGRADE-ROADMAP-2026-05-30.md).
//
// Layers:
//   1. GPU-claim — unload the fleet coder model(s), warm the VL model (num_ctx 8192,
//      long keep_alive) so it stays GPU-resident for the whole run. Default VL is
//      qwen3-vl:8b-instruct (8.1GB resident → fits CONCURRENT with the chat fleet).
//   2. Checkpoint/resume — keyed on source-PDF SHA-256 (the same print lives at
//      multiple paths in the JM corpus; SHA dedups them). A crash/restart resumes
//      where it left off; re-runs skip done prints.
//   3. Time budget — stop cleanly after --time-budget-min so an overnight window
//      processes as many as fit, then resumes next run.
//   4. Per-print isolation — spawns the proven single-print runner (R8: reuse, do
//      not reimplement); one bad print cannot kill the batch.
//
// USAGE:
//   node scripts/batch-ollama-vision-extract.mjs --worklist <paths.txt> [--part-class electrode]
//     [--preprocess] [--assume-units in] [--max-pages 8] [--limit N] [--time-budget-min 360]
//     [--checkpoint <f>] [--summary <f>] [--no-gpu-claim] [--dry-run]
//
// EXIT: 0 = ran (see summary); 2 = worklist missing/empty; 3 = arg error.

import { spawn } from "node:child_process";
import { readFileSync, appendFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, env, exit } from "node:process";
// BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY (slot:romeo, 2026-06-04): the host GPU profile
// is the single source of truth for how many vision-OCR workers run in parallel. On the
// RTX PRO 6000 Blackwell (96GB) the 8.1GB VL model leaves ~70GB headroom → ×3 concurrent;
// a 16GB host stays ×1 (byte-equivalent to the original serial loop). Fail-soft: never throws.
import { detectGpuTier, describeProfile } from "./lib/catalog-gpu-profile.mjs";
// Single source of truth for the default OCR vision model (was hardcoded here -> drift hazard).
import { DEFAULT_VISION_MODEL } from "./lib/ollama-vision-extract-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_NODE = process.execPath;
const SINGLE_RUNNER = join(REPO_ROOT, "scripts", "run-ollama-vision-extract.mjs");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_CHECKPOINT = join(REPO_ROOT, "state", "shared", "blueprint-ocr-checkpoint.jsonl");
const CODER_MODELS = ["qwen2.5-coder:32b", "nomic-embed-text"];
// qwen3-vl:8b-instruct — 8.1GB GPU-resident, fits CONCURRENT with the chat fleet
// (qwen2.5vl:7b was 15.3GB → CPU-spill → >180s/page timeout). INSTRUCT variant is
// mandatory (bare qwen3-vl:8b is a thinking model that never emits the JSON). See
// reference_xray_ocr_gpu_concurrency_2026_05_31. Override via PRISM_VISION_MODEL.
const VL_MODEL = env.PRISM_VISION_MODEL || DEFAULT_VISION_MODEL;

// ── pure helpers (exported for tests) ──────────────────────────────

/** SHA-256 hex of a buffer/string. */
export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** Parse a checkpoint JSONL into a Set of completed source SHAs. Tolerant of bad lines. */
export function parseCheckpoint(text) {
  const done = new Set();
  if (typeof text !== "string" || !text) return done;
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      if (o && typeof o.sha === "string" && o.sha) done.add(o.sha);
    } catch { /* skip malformed line */ }
  }
  return done;
}

/** Parse a worklist file body → array of PDF paths (skip blanks + '#' comments), de-duplicated, order-preserving. */
export function parseWorklist(text) {
  const seen = new Set();
  const out = [];
  if (typeof text !== "string") return out;
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim();
    if (!p || p.startsWith("#")) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** True while the elapsed time is within budget. budgetMin<=0 → unlimited. */
export function withinBudget(startMs, nowMs, budgetMin) {
  if (!Number.isFinite(budgetMin) || budgetMin <= 0) return true;
  return (nowMs - startMs) < budgetMin * 60 * 1000;
}

// ── GPU claim (fail-soft: a claim failure NEVER aborts the run) ────

async function postOllama(path, body, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(OLLAMA_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(t);
    return r.ok ? await r.json() : null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function getOllama(path, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(OLLAMA_URL + path, { signal: controller.signal });
    clearTimeout(t);
    return r.ok ? await r.json() : null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Unload fleet models, warm the VL model, report GPU residency. Returns {resident, vramGB, note}. */
async function claimGpu(numCtx, keepAlive) {
  for (const m of CODER_MODELS) {
    await postOllama("/api/generate", { model: m, keep_alive: 0, prompt: "" }, 8000);
  }
  // warm VL (cold load can exceed 90s under any residual load — generous timeout)
  await postOllama("/api/generate", { model: VL_MODEL, prompt: "ready", keep_alive: keepAlive, stream: false, options: { num_predict: 2, num_ctx: numCtx } }, 200000);
  const ps = await getOllama("/api/ps", 8000);
  // match the configured VL_MODEL (exact tag, or its base before ':') — NOT a hard-coded
  // model name, so a PRISM_VISION_MODEL override still finds its /api/ps residency entry.
  const vlBase = VL_MODEL.split(":")[0];
  const vl = ps && Array.isArray(ps.models) ? ps.models.find((m) => String(m.name) === VL_MODEL || String(m.name).includes(vlBase)) : null;
  if (vl && vl.size_vram > 0) return { resident: true, vramGB: +(vl.size_vram / 1e9).toFixed(1), note: "GPU-resident" };
  if (vl) return { resident: false, vramGB: 0, note: "loaded to CPU (size_vram=0) — contention; will be slow" };
  return { resident: false, vramGB: 0, note: "VL not loaded (warm failed)" };
}

// ── single-print spawn ─────────────────────────────────────────────

/**
 * Pure: build the single-print runner argv. Exported so the flag-forwarding is
 * UNIT-TESTED (the first cut silently dropped --grayscale — a reviewer-caught
 * installer↔runner contract break). Render-tier precedence MIRRORS the single
 * runner's buildRenderArgs: --preprocess wins over --grayscale (preprocess
 * includes a grayscale base); --deskew only with --preprocess.
 */
export function buildPrintArgs(runner, pdfPath, opts = {}) {
  const a = [runner, "--pdf", pdfPath, "--part-class", opts.partClass || "unknown", "--json", "--emit-event"];
  if (opts.assumeUnits) a.push("--assume-units", opts.assumeUnits);
  if (opts.preprocess) { a.push("--preprocess"); if (opts.deskew) a.push("--deskew"); }
  else if (opts.grayscale) a.push("--grayscale");
  if (Number.isFinite(opts.maxPages) && opts.maxPages > 0) a.push("--max-pages", String(opts.maxPages));
  if (Number.isFinite(opts.dpi) && opts.dpi > 0) a.push("--dpi", String(opts.dpi));
  if (Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0) a.push("--timeout-ms", String(opts.timeoutMs));
  return a;
}

/**
 * Async single-print spawn (replaces the blocking spawnSync so the worker pool can run
 * `concurrency` prints in parallel). Resolves {exit, summary, stderr, killed}; NEVER rejects
 * — a bad print resolves with a non-zero/null exit so it counts as a failed print, never a
 * pool abort. The wall ceiling MIRRORS the original: per-page timeout × maxPages + render
 * headroom; on timeout the child is SIGKILLed and the result is marked killed.
 */
export function runOnePrintAsync(pdfPath, opts = {}, deps = {}) {
  const spawnImpl = deps.spawnImpl || spawn;
  return new Promise((resolveP) => {
    const a = buildPrintArgs(SINGLE_RUNNER, pdfPath, opts);
    const pages = Number.isFinite(opts.maxPages) && opts.maxPages > 0 ? opts.maxPages : 8;
    // deps.spawnTimeoutMs lets tests exercise the SIGKILL/timeout branch deterministically
    // (the production ceiling is per-page timeout × maxPages + render headroom, min ~6min).
    const spawnTimeout = Number.isFinite(deps.spawnTimeoutMs) && deps.spawnTimeoutMs > 0
      ? deps.spawnTimeoutMs
      : (opts.timeoutMs || 200000) * pages + 180000;
    let child;
    try {
      child = spawnImpl(DEFAULT_NODE, a, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      resolveP({ exit: null, summary: null, stderr: ("spawn failed: " + e.message).slice(0, 300), killed: false });
      return;
    }
    let stdout = "", stderr = "", settled = false;
    const finish = (r) => { if (settled) return; settled = true; clearTimeout(timer); resolveP(r); };
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      finish({ exit: null, summary: null, stderr: `timeout after ${spawnTimeout}ms`, killed: true });
    }, spawnTimeout);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("error", (e) => finish({ exit: null, summary: null, stderr: ("spawn error: " + e.message).slice(0, 300), killed: false }));
    child.on("close", (code) => {
      let summary = null;
      if (stdout) { try { summary = JSON.parse(stdout); } catch { /* non-json stdout */ } }
      finish({ exit: code, summary, stderr: stderr.trim().slice(0, 300), killed: false });
    });
  });
}

/**
 * Resolve worker concurrency. Explicit --concurrency (≥1) wins; else the host GPU profile's
 * concurrency (detectGpuTier); else 1. Clamped to [1,8] — beyond ~4 Ollama's parallel-request
 * slots saturate even on a 96GB card, and an unbounded value would only thrash. Pure.
 * @param {number|string} cliConcurrency  raw --concurrency arg (0/NaN = "use profile")
 * @param {number} profileConcurrency     profile.concurrency from detectGpuTier()
 */
export function resolveConcurrency(cliConcurrency, profileConcurrency) {
  const cli = Number(cliConcurrency);
  if (Number.isFinite(cli) && cli >= 1) return Math.min(8, Math.floor(cli));
  const prof = Number(profileConcurrency);
  if (Number.isFinite(prof) && prof >= 1) return Math.min(8, Math.floor(prof));
  return 1;
}

/**
 * Resolve the Ollama server's parallel-request slot count from the environment — the REAL
 * ceiling on INFERENCE parallelism. Ollama serializes concurrent /api/generate calls against
 * one loaded model beyond OLLAMA_NUM_PARALLEL slots (a server-START env the client cannot
 * raise mid-run), so worker concurrency is only true GPU parallelism up to this many slots.
 * Returns the integer when set (≥1), else null (unset/unparseable). We deliberately do NOT
 * assume a default: modern Ollama auto-selects 1–4 by VRAM and the fleet's system-health
 * script pins small hosts to 1 — a hard default would either falsely warn or falsely promise.
 * null = "unverified — depends on the live server". Pure.
 * @param {Record<string,string>} [env]
 */
export function resolveOllamaParallel(env = process.env) {
  const raw = env.OLLAMA_NUM_PARALLEL;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

/**
 * Bounded-concurrency worker pool over a worklist — the Blackwell efficiency lever. Runs
 * `concurrency` print extractions in parallel instead of one-at-a-time; concurrency=1
 * reproduces the original serial behavior exactly (same stats, same checkpoint records).
 *
 * CLAIM ATOMICITY: claimNext() advances the shared cursor, dedups by SHA, and increments
 * `attempted` with NO `await` in between — so in single-threaded JS two workers can never
 * claim the same item. `doneSet` is BOTH the persistent-done set (rebuilt from the checkpoint
 * file on restart) AND the in-flight-claim set; a print is written to the checkpoint file
 * only on COMPLETION, so a crash mid-extraction re-attempts that print on the next run.
 *
 * FAIL-SOFT + bounded memory: only `concurrency` extractions are ever in flight (NOT a naive
 * Promise.all over every path). runImpl never rejects, so one bad print can't abort the pool.
 * All I/O is injectable (runImpl/now/existsImpl/readImpl/appendImpl/logImpl) for hermetic tests.
 *
 * @returns {Promise<{attempted:number,ok:number,failed:number,skipped_done:number,skipped_missing:number,budget_hit:boolean}>}
 */
export async function runExtractionPool(paths, args, opts = {}) {
  const now = opts.now || Date.now;
  const existsImpl = opts.existsImpl || existsSync;
  const readImpl = opts.readImpl || readFileSync;
  const appendImpl = opts.appendImpl || appendFileSync;
  const runImpl = opts.runImpl || runOnePrintAsync;
  const logImpl = opts.logImpl || console.log;
  const errImpl = opts.errImpl || console.error;
  const doneSet = opts.doneSet || new Set();
  const concurrency = Math.max(1, Number.isFinite(opts.concurrency) ? Math.floor(opts.concurrency) : 1);
  const startMs = Number.isFinite(opts.startMs) ? opts.startMs : now();
  const list = Array.isArray(paths) ? paths : [];
  const stats = { attempted: 0, ok: 0, failed: 0, skipped_done: 0, skipped_missing: 0, budget_hit: false };

  let idx = 0;
  // Claim the next eligible {sha,path} synchronously. Returns null when the worklist is
  // exhausted OR a global gate (limit / time-budget) trips. NO await inside → claim is atomic.
  function claimNext() {
    if (stats.budget_hit) return null;
    while (idx < list.length) {
      if (args.limit > 0 && stats.attempted >= args.limit) return null;
      if (!withinBudget(startMs, now(), args.timeBudgetMin)) { stats.budget_hit = true; return null; }
      const cand = list[idx++];
      if (!existsImpl(cand)) { stats.skipped_missing++; logImpl(`[batch] SKIP missing: ${cand}`); continue; }
      let sha;
      try { sha = sha256(readImpl(cand)); } catch { stats.skipped_missing++; logImpl(`[batch] SKIP unreadable: ${cand}`); continue; }
      if (doneSet.has(sha)) { stats.skipped_done++; continue; }
      doneSet.add(sha);     // claim now (in-flight) — blocks a sibling worker + in-run SHA dupes
      stats.attempted++;
      return { sha, path: cand };
    }
    return null;
  }

  async function worker() {
    for (;;) {
      const item = claimNext();
      if (!item) return;
      if (args.dryRun) { logImpl(`[batch] (dry-run) would extract: ${item.path}`); continue; }
      // structural fail-soft: the real runImpl (runOnePrintAsync) never rejects, but a future
      // refactor / custom injected impl that DID reject must NOT abort the whole pool — treat
      // a throw as a failed print so in-flight progress is checkpointed, not lost.
      let r;
      try {
        r = await runImpl(item.path, args);
      } catch (e) {
        r = { exit: null, summary: null, stderr: ("runImpl threw: " + (e && e.message ? e.message : String(e))).slice(0, 300) };
      }
      const pagesOk = r && r.summary && Number.isFinite(r.summary.pages_ok) ? r.summary.pages_ok : 0;
      const ok = !!r && r.exit === 0 && pagesOk > 0;
      if (ok) stats.ok++; else stats.failed++;
      const rec = { sha: item.sha, path: item.path, ts: new Date(now()).toISOString(), exit: r ? r.exit : null, pages_ok: pagesOk, pages_processed: r && r.summary ? (r.summary.pages_processed ?? null) : null, ok, err: ok ? null : (r ? r.stderr : "no result") };
      try { appendImpl(args.checkpoint, JSON.stringify(rec) + "\n"); } catch (e) { errImpl(`[batch] checkpoint write failed: ${e.message}`); }
      logImpl(`[batch] ${ok ? "OK " : "FAIL"} (${stats.attempted}) pages_ok=${pagesOk} ${item.path}${ok ? "" : " :: " + String(r ? r.stderr : "").slice(0, 120)}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return stats;
}

function parseArgs(args) {
  const out = { worklist: null, partClass: "unknown", grayscale: false, preprocess: false, deskew: false, assumeUnits: null, maxPages: 8, dpi: 200, limit: 0, timeBudgetMin: 0, timeoutMs: 200000, checkpoint: DEFAULT_CHECKPOINT, summary: null, noGpuClaim: false, numCtx: 8192, keepAlive: "8h", dryRun: false, concurrency: 0 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--worklist") out.worklist = args[++i];
    else if (a === "--part-class") out.partClass = args[++i];
    else if (a === "--grayscale") out.grayscale = true;
    else if (a === "--preprocess") out.preprocess = true;
    else if (a === "--deskew") out.deskew = true;
    else if (a === "--assume-units") out.assumeUnits = args[++i];
    else if (a === "--max-pages") out.maxPages = parseInt(args[++i], 10);
    else if (a === "--dpi") out.dpi = parseInt(args[++i], 10);
    else if (a === "--limit") out.limit = parseInt(args[++i], 10);
    else if (a === "--time-budget-min") out.timeBudgetMin = parseInt(args[++i], 10);
    else if (a === "--timeout-ms") out.timeoutMs = parseInt(args[++i], 10);
    else if (a === "--checkpoint") out.checkpoint = args[++i];
    else if (a === "--summary") out.summary = args[++i];
    else if (a === "--no-gpu-claim") out.noGpuClaim = true;
    else if (a === "--keep-alive") out.keepAlive = args[++i];
    else if (a === "--concurrency") out.concurrency = parseInt(args[++i], 10); // 0 = use host GPU profile
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.worklist) { console.error("ERR: --worklist <file> required"); exit(3); }
  if (!existsSync(args.worklist)) { console.error("ERR: worklist not found: " + args.worklist); exit(2); }
  const paths = parseWorklist(readFileSync(args.worklist, "utf8"));
  if (paths.length === 0) { console.error("ERR: worklist empty: " + args.worklist); exit(2); }

  const doneSet = existsSync(args.checkpoint) ? parseCheckpoint(readFileSync(args.checkpoint, "utf8")) : new Set();
  mkdirSync(dirname(args.checkpoint), { recursive: true });

  const renderTier = args.preprocess ? "preprocess(binarize+despeckle" + (args.deskew ? "+deskew" : "") + ")" : (args.grayscale ? "grayscale" : "rgb(full-color)");
  console.log(`[batch] worklist=${paths.length} already-done(sha)=${doneSet.size} limit=${args.limit || "∞"} budget=${args.timeBudgetMin || "∞"}min render=${renderTier} dpi=${args.dpi} maxPages=${args.maxPages}`);

  // BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY: drive worker concurrency from the LIVE host GPU
  // profile (single source of truth) — a 96GB Blackwell extracts ×N in parallel; a 16GB host
  // stays ×1 (behaviorally identical to the original serial loop). --concurrency overrides.
  const gpuProfile = detectGpuTier();
  let concurrency = resolveConcurrency(args.concurrency, gpuProfile.concurrency);
  const ollamaParallel = resolveOllamaParallel(env); // number | null (null = unset/unverified)

  let claim = null;
  if (!args.noGpuClaim && !args.dryRun) {
    claim = await claimGpu(args.numCtx, args.keepAlive);
    console.log(`[batch] GPU-claim: ${claim.note}${claim.vramGB ? " (" + claim.vramGB + "GB)" : ""}`);
  }

  // CONTENTION GATE (scrutiny P1): a VL model that CPU-spilled (not GPU-resident) thrashes
  // under parallel load — ×N only helps when the model is GPU-resident. Force serial otherwise.
  if (claim && !claim.resident && concurrency > 1) {
    console.log(`[batch] ⚠ VL NOT GPU-resident (host contention) → forcing serial (was ×${concurrency}); ×N needs a resident model.`);
    concurrency = 1;
  }

  // HONEST INFERENCE BOUND (scrutiny P0, R12): worker concurrency overlaps CPU render/IO for
  // free, but GPU INFERENCE only parallelizes up to the Ollama server's OLLAMA_NUM_PARALLEL
  // slots (a server-START env the client can't raise). Never advertise a ×N inference win the
  // live server can't deliver — report the real, slot-bounded picture.
  const infMsg = concurrency <= 1
    ? "serial"
    : ollamaParallel == null
      ? `workers=${concurrency} · OLLAMA_NUM_PARALLEL unset → inference parallelism UNVERIFIED (depends on the live server; CPU render/IO overlaps regardless)`
      : ollamaParallel >= concurrency
        ? `workers=${concurrency} · OLLAMA_NUM_PARALLEL=${ollamaParallel} → true ×${concurrency} inference`
        : `workers=${concurrency} · OLLAMA_NUM_PARALLEL=${ollamaParallel}<${concurrency} → inference SERIALIZES to ×${ollamaParallel} (only CPU render/IO overlaps; set OLLAMA_NUM_PARALLEL≥${concurrency} on the server for true ×${concurrency})`;
  console.log(`[batch] ${describeProfile(gpuProfile)} → ${infMsg}`);

  const startMs = Date.now();
  const stats = await runExtractionPool(paths, args, { doneSet, concurrency, startMs });

  const summary = { tool: "batch-ollama-vision-extract", started: new Date(startMs).toISOString(), ended: new Date().toISOString(), elapsed_min: +((Date.now() - startMs) / 60000).toFixed(1), worklist_total: paths.length, ...stats, checkpoint: args.checkpoint };
  console.log(`[batch] DONE: attempted=${stats.attempted} ok=${stats.ok} failed=${stats.failed} skipped(done)=${stats.skipped_done} skipped(missing)=${stats.skipped_missing} budget_hit=${stats.budget_hit} elapsed=${summary.elapsed_min}min`);
  if (args.summary) {
    try { mkdirSync(dirname(args.summary), { recursive: true }); writeFileSync(args.summary, JSON.stringify(summary, null, 2)); console.log(`[batch] summary → ${args.summary}`); }
    catch (e) { console.error(`[batch] summary write failed: ${e.message}`); }
  }
  exit(0);
}

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) {
  main().catch((e) => { console.error("[batch] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
}
