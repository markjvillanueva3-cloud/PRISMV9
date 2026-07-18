// scripts/lib/blueprint-vl-train-runner.mjs
//
// T3.2 (INDIA-TAKEOVER-PLAN-blueprint-lora) — the Node→GPU runner: the missing
// connective tissue between the .mjs orchestration layer and the real Qwen2.5-VL
// PEFT trainer `mcp-server/scripts/blueprint_vl_train_lora.py` (T3.1, shipped
// b121b19f7b). NO current engine owns this edge.
//
// WHAT IT DOES (in dependency order, fail-loud at every gate):
//   1. PRE-GATE on the STRONG GPU health check — `scripts/py/gpu_health.py` via the
//      canonical py-subprocess-bridge. This is the arch_list + real-matmul probe
//      (catches the silent-CPU sm_120 wheel), STRONGER than the trainer's own inline
//      `preflight_gpu()` (which only does is_available()+matmul, no arch_list). We
//      refuse to spawn a multi-minute training run on a GPU that would silently run on
//      CPU at 1/50th speed. (This folds in T1.3's residual: the trainer's weaker inline
//      preflight is now front-run by the strong gate — see the plan's SESSION UPDATE.)
//   2. Validate the staged `local-lora` bundle file exists + is non-empty (the trainer
//      reads `--bundle <staged.jsonl>`; a missing/empty bundle is a loud refusal, never
//      a silent zero-row train).
//   3. Spawn the trainer via `runPythonJsonOrThrow` with CUDA_VISIBLE_DEVICES=0 and the
//      named long-job timeout `TRAINING_PY_TIMEOUT_MS`, streaming `{event:"progress"}`
//      to an optional monitor callback (so a LatheLoRATrainingMonitor-style consumer
//      sees live step/loss without re-implementing the spawn).
//   4. Map the trainer's structured result → the shape the generic LoRA pipeline's
//      `trainOnce()` requires (a finite `loss`), carrying `training_brier`/`adapter_dir`.
//
// HONESTY (R12): a live train still cannot RUN until the operator lands torch≥2.7/cu128
// (sm_120) + peft/datasets/trl — `gpu_health.py` will (correctly) make assertGpuTrainable
// THROW until then, and that is the whole point. This module is hermetically testable
// today via DI (`_runPythonJson` / `_runTrainer`) without any GPU or Python.
//
// COMPOSES WITH:
//   - scripts/lib/py-subprocess-bridge.mjs   (the ONE Node→Python spawn primitive)
//   - scripts/lib/lora-training-pipeline.mjs (generic skeleton; `makeBlueprintVlInnerTrain(ctx)`
//     builds the 2-arg `innerTrain` its `trainOnce()` delegates to — trainOnce passes only
//     (dataset.train, hyperparameters), so the bundle/output context is closed over, not a 3rd arg)
//   - scripts/py/gpu_health.py + mcp-server/scripts/blueprint_vl_train_lora.py
//
// @module scripts/lib/blueprint-vl-train-runner

import { existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runPythonJson,
  runPythonJsonOrThrow,
  TRAINING_PY_TIMEOUT_MS,
} from "./py-subprocess-bridge.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The STRONG GPU readiness gate (arch_list + real matmul). */
export const GPU_HEALTH_SCRIPT = join(REPO_ROOT, "scripts", "py", "gpu_health.py");
/** The real Qwen2.5-VL PEFT trainer (T3.1). */
export const TRAINER_SCRIPT = join(REPO_ROOT, "mcp-server", "scripts", "blueprint_vl_train_lora.py");

/** Sensible defaults mirroring the trainer's argparse defaults; a caller's
 *  hyperparameters override per-field. Kept here so a runner never silently
 *  diverges from the trainer's own defaults. */
export const DEFAULT_VL_HYPERPARAMETERS = Object.freeze({
  baseModel: "Qwen/Qwen2.5-VL-7B-Instruct",
  epochs: 3,
  loraR: 16,
  loraAlpha: 32,
  loraDropout: 0.05,
  valFrac: 0.2,
  seed: 42,
  dpi: 150,
  batchSize: 1,
  gradAccum: 8,
  lr: 1e-4,
});

/** Thrown by assertGpuTrainable when the GPU stack is not genuinely training-capable.
 *  Carries the structured health report so a caller sees the real reason (e.g.
 *  sm_not_in_arch_list, torch_not_importable) rather than a bare string. */
export class GpuNotTrainableError extends Error {
  constructor(message, health) {
    super(message);
    this.name = "GpuNotTrainableError";
    this.health = health ?? null;
  }
}

/** Thrown when the staged training bundle is missing/empty — a loud refusal so a
 *  zero-row "successful" train can never happen (R9 — circular/empty data is the
 *  toBeDefined() of training). */
export class BundleUnusableError extends Error {
  constructor(message, bundlePath) {
    super(message);
    this.name = "BundleUnusableError";
    this.bundlePath = bundlePath ?? null;
  }
}

/** Thrown when the trainer itself returns a structured failure (missing_dependency,
 *  gpu_unusable, insufficient_data, train_failed, ...). Carries the trainer's error
 *  code + the full bridge result. */
export class TrainerFailedError extends Error {
  constructor(message, code, bridge) {
    super(message);
    this.name = "TrainerFailedError";
    this.code = code ?? null;
    this.bridge = bridge ?? null;
  }
}

/**
 * Run the STRONG GPU health gate (`gpu_health.py`) and THROW unless the stack is
 * genuinely training-capable. Never silently passes a CPU-only/sm-mismatched wheel.
 *
 * @param {object} [opts]
 * @param {string} [opts.pythonPath]   interpreter override (else PRISM_PYTHON_GPU_PATH…).
 * @param {boolean} [opts.requireBnb]  also require a working bitsandbytes 4-bit op (QLoRA gate).
 * @param {number}  [opts.timeoutMs]   gpu_health timeout (default 120s — cold torch import).
 * @param {(s:string,o:object)=>Promise<object>} [opts._runPythonJson] DI for tests (defaults to the real bridge call).
 * @returns {Promise<object>} the parsed gpu_health report (when ready).
 * @throws {GpuNotTrainableError} when not torch_ready (or not qlora_ready with requireBnb).
 */
export async function assertGpuTrainable(opts = {}) {
  const run = typeof opts._runPythonJson === "function" ? opts._runPythonJson : runPythonJson;
  const args = opts.requireBnb ? ["--require-bnb"] : [];
  const res = await run(GPU_HEALTH_SCRIPT, {
    args,
    pythonPath: opts.pythonPath,
    cudaVisibleDevices: "0",
    timeoutMs: Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 120_000,
  });
  const report = res && res.result && typeof res.result === "object" ? res.result : null;
  // FAIL-CLOSED: a missing/unparseable report is NOT-ready, never silently ready.
  const torchReady = report?.torch_ready === true;
  const ok = opts.requireBnb ? report?.qlora_ready === true && torchReady : torchReady;
  if (!ok) {
    const reason =
      (report && Array.isArray(report.errors) && report.errors[0]) ||
      (res && res.error) ||
      "gpu_health produced no usable report";
    throw new GpuNotTrainableError(
      `GPU stack not ${opts.requireBnb ? "QLoRA-" : ""}training-ready (exit ${res ? res.exitCode : "n/a"}): ${reason}`,
      report,
    );
  }
  return report;
}

/**
 * Build the `blueprint_vl_train_lora.py` CLI args from a bundle path + output dir +
 * hyperparameters. Pure + testable; every flag maps 1:1 to the trainer's argparse so
 * a hyperparameter can never silently fail to reach the trainer.
 *
 * @param {object} p
 * @param {string} p.bundlePath  staged local-lora JSONL ({prompt,completion}).
 * @param {string} p.outputDir   adapter output directory.
 * @param {object} [p.hyperparameters] overrides over {@link DEFAULT_VL_HYPERPARAMETERS}.
 * @returns {string[]}
 */
export function buildTrainerArgs({ bundlePath, outputDir, hyperparameters = {} }) {
  if (typeof bundlePath !== "string" || !bundlePath) throw new Error("buildTrainerArgs: bundlePath required");
  if (typeof outputDir !== "string" || !outputDir) throw new Error("buildTrainerArgs: outputDir required");
  const h = { ...DEFAULT_VL_HYPERPARAMETERS, ...hyperparameters };
  const args = [
    "--bundle", bundlePath,
    "--output", outputDir,
    "--base-model", String(h.baseModel),
    "--epochs", String(h.epochs),
    "--lora-r", String(h.loraR),
    "--lora-alpha", String(h.loraAlpha),
    "--lora-dropout", String(h.loraDropout),
    "--val-frac", String(h.valFrac),
    "--seed", String(h.seed),
    "--dpi", String(h.dpi),
    "--batch-size", String(h.batchSize),
    "--grad-accum", String(h.gradAccum),
    "--lr", String(h.lr),
  ];
  if (Array.isArray(h.targetModules) && h.targetModules.length) {
    // The trainer declares `--target-modules nargs="*"` → SPACE-separated tokens. A comma-join
    // (`q_proj,v_proj`) would be captured as ONE element and PEFT would match no module → a
    // silently-wrong (empty-target) adapter. Push each module as its own arg.
    args.push("--target-modules", ...h.targetModules.map(String));
  }
  return args;
}

/** Validate the staged bundle file exists + is non-empty. THROWS BundleUnusableError. */
function assertBundleUsable(bundlePath) {
  if (typeof bundlePath !== "string" || !bundlePath) {
    throw new BundleUnusableError("bundlePath (non-empty string) is required", bundlePath);
  }
  if (!existsSync(bundlePath)) {
    throw new BundleUnusableError(`staged bundle not found: ${bundlePath}`, bundlePath);
  }
  let size = 0;
  try { size = statSync(bundlePath).size; } catch { /* treated as 0 below */ }
  if (size <= 0) {
    throw new BundleUnusableError(`staged bundle is empty: ${bundlePath}`, bundlePath);
  }
}

/**
 * Run a blueprint-VL LoRA fine-tune end-to-end: GPU pre-gate → bundle check → spawn the
 * trainer (streaming progress) → structured result. The standalone entry; the generic
 * pipeline integration is {@link blueprintVlInnerTrain}.
 *
 * @param {object} p
 * @param {string} p.bundlePath           staged local-lora JSONL.
 * @param {string} p.outputDir            adapter output dir.
 * @param {object} [p.hyperparameters]
 * @param {string} [p.pythonPath]         GPU interpreter override.
 * @param {boolean} [p.requireBnb=false]  gate on QLoRA (bnb 4-bit) readiness too.
 * @param {boolean} [p.skipGpuGate=false] TEST/diagnostic only — skip the GPU pre-gate.
 * @param {number}  [p.timeoutMs]         trainer timeout (default {@link TRAINING_PY_TIMEOUT_MS}).
 * @param {(p:object)=>void} [p.onProgress] called per trainer progress event.
 * @param {Function} [p._runPythonJson]   DI: gpu_health runner (tests).
 * @param {Function} [p._runTrainer]      DI: trainer runner (tests), shape of runPythonJsonOrThrow.
 * @returns {Promise<object>} { ok:true, adapterDir, trainingBrier, brierN, loss, baseModel, epochs, durationMs, health, progressCount }
 * @throws {GpuNotTrainableError|BundleUnusableError|TrainerFailedError}
 */
export async function runBlueprintVlLoRATrain(p = {}) {
  const {
    bundlePath, outputDir, hyperparameters = {}, pythonPath,
    requireBnb = false, skipGpuGate = false, timeoutMs, onProgress,
  } = p;
  // 1. STRONG GPU pre-gate (unless explicitly skipped for a hermetic/diagnostic run).
  let health = null;
  if (!skipGpuGate) {
    health = await assertGpuTrainable({ pythonPath, requireBnb, _runPythonJson: p._runPythonJson });
  }
  // 2. Bundle must be real (loud refusal on missing/empty — no zero-row train).
  assertBundleUsable(bundlePath);
  if (typeof outputDir !== "string" || !outputDir) throw new Error("runBlueprintVlLoRATrain: outputDir required");

  // 3. Spawn the trainer, streaming progress (last train-step loss captured for the
  //    finite-loss contract that the generic pipeline's trainOnce() requires).
  const args = buildTrainerArgs({ bundlePath, outputDir, hyperparameters });
  const progress = [];
  let lastTrainLoss = null;
  const onProg = (ev) => {
    progress.push(ev);
    if (ev && ev.stage === "train" && ev.logs && Number.isFinite(ev.logs.loss)) lastTrainLoss = ev.logs.loss;
    if (typeof onProgress === "function") { try { onProgress(ev); } catch { /* a sink must not break the run */ } }
  };
  const runTrainer = typeof p._runTrainer === "function" ? p._runTrainer : runPythonJsonOrThrow;

  let bridge;
  try {
    bridge = await runTrainer(TRAINER_SCRIPT, {
      args,
      pythonPath,
      cudaVisibleDevices: "0",
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TRAINING_PY_TIMEOUT_MS,
      onProgress: onProg,
    });
  } catch (err) {
    // runPythonJsonOrThrow throws on spawn/timeout/non-zero; the trainer emits a
    // structured result even on its failure paths, so surface its error code if present.
    const b = err && err.bridge;
    const code = b && b.result && typeof b.result.error === "string" ? b.result.error : (b && b.error) || "spawn_or_timeout";
    throw new TrainerFailedError(`blueprint VL trainer failed (${code}): ${err.message}`, code, b || null);
  }

  const result = bridge && bridge.result && typeof bridge.result === "object" ? bridge.result : null;
  // 4. The trainer emits ok:false WITH a structured error on its handled failure paths.
  if (!result || result.ok !== true) {
    const code = (result && typeof result.error === "string" && result.error) || "no_result";
    throw new TrainerFailedError(`blueprint VL trainer reported failure (${code})`, code, bridge);
  }

  // Map to a stable contract. `loss`: prefer the last observed train-step loss; the
  // trainer optimizes against it. If the trainer never emitted a step loss (degenerate
  // tiny run), fall back to training_brier so downstream still gets a finite scalar —
  // but NEVER fabricate: if both are absent, fail loud.
  const trainingBrier = Number.isFinite(result.training_brier) ? result.training_brier : null;
  const loss = Number.isFinite(lastTrainLoss) ? lastTrainLoss : trainingBrier;
  if (!Number.isFinite(loss)) {
    throw new TrainerFailedError("trainer returned no finite train loss or brier (cannot certify a train happened)", "no_metric", bridge);
  }
  // `lossBasis` disambiguates the scalar: a train-step cross-entropy loss (unbounded) is NOT
  // comparable to a calibration brier in [0,1]. A downstream that trends/ranks `loss` across
  // runs MUST NOT mix bases — read lossBasis to gate that (the brier fallback only fires on a
  // degenerate run that emitted no train-step loss).
  const lossBasis = Number.isFinite(lastTrainLoss) ? "train_step" : "brier_fallback";
  return {
    ok: true,
    adapterDir: result.adapter_dir ?? outputDir,
    trainingBrier,
    brierN: Number.isFinite(result.brier_n) ? result.brier_n : null,
    loss,
    lossBasis,
    baseModel: result.base_model ?? (hyperparameters.baseModel ?? DEFAULT_VL_HYPERPARAMETERS.baseModel),
    epochs: Number.isFinite(result.epochs) ? result.epochs : null,
    durationMs: bridge.durationMs ?? null,
    progressCount: progress.length,
    health,
    raw: result,
  };
}

/**
 * Build the `innerTrain` for `lora-training-pipeline.mjs#trainOnce()`. CRITICAL: trainOnce
 * calls its injected innerTrain with EXACTLY TWO args — `innerTrain(dataset.train, hyperparameters)`
 * (lora-training-pipeline.mjs:243) — so the bundle/output CONTEXT the VL trainer needs cannot be a
 * third call-time argument; it MUST be closed over. This factory takes that context and returns the
 * 2-arg function trainOnce expects, whose result carries the FINITE `loss` (+ `weights` adapter
 * handle that trainOnce forwards to ewcConsolidate/evalHoldout).
 *
 * NOTE (R7/R12 — scope honesty): this is the single-train EDGE. The pipeline's `ensembleVote`/`deploy`
 * stages need a registered domain adapter (VALID_DOMAINS is lathe/mill/wedm — there is NO `blueprint`
 * adapter yet), so this runner does NOT claim that integration; it provides the `innerTrain` only.
 *
 * @param {object} ctx  MUST carry { bundlePath, outputDir }; may carry { pythonPath, requireBnb,
 *                      timeoutMs, onProgress, skipGpuGate, _runPythonJson, _runTrainer }.
 * @returns {(trainData:Array, hyperparameters:object)=>Promise<object>} the 2-arg trainOnce innerTrain.
 */
export function makeBlueprintVlInnerTrain(ctx = {}) {
  if (!ctx || typeof ctx.bundlePath !== "string" || !ctx.bundlePath) {
    throw new Error("makeBlueprintVlInnerTrain: ctx.bundlePath (staged bundle) required");
  }
  if (typeof ctx.outputDir !== "string" || !ctx.outputDir) {
    throw new Error("makeBlueprintVlInnerTrain: ctx.outputDir required");
  }
  return async function blueprintVlInnerTrain(trainData, hyperparameters) {
    if (!Array.isArray(trainData) || trainData.length === 0) {
      throw new Error("blueprintVlInnerTrain: trainData must be a non-empty array (no zero-row train)");
    }
    const out = await runBlueprintVlLoRATrain({ ...ctx, hyperparameters });
    // trainOnce() requires result.loss finite; weights is the adapter handle it forwards downstream.
    return { ...out, loss: out.loss, weights: { adapterDir: out.adapterDir }, brier: out.trainingBrier };
  };
}
