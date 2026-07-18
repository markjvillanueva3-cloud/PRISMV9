// scripts/lib/blueprint-vl-train-runner.test.mjs — hermetic tests for the T3.2 Node→GPU
// LoRA runner. NO GPU / Python: the two py-bridge calls (gpu_health + trainer) are
// dependency-injected (_runPythonJson / _runTrainer) with canned PyBridgeResult objects.
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assertGpuTrainable, buildTrainerArgs, runBlueprintVlLoRATrain, makeBlueprintVlInnerTrain,
  GpuNotTrainableError, BundleUnusableError, TrainerFailedError, DEFAULT_VL_HYPERPARAMETERS,
} from "./blueprint-vl-train-runner.mjs";
import { trainOnce } from "./lora-training-pipeline.mjs";

// ── canned gpu_health reports ───────────────────────────────────────────────
const HEALTH_READY = { torch_ready: true, qlora_ready: false, gpu_matmul_ok: true, sm_supported: true, errors: [] };
const HEALTH_QLORA = { torch_ready: true, qlora_ready: true, gpu_matmul_ok: true, sm_supported: true, errors: [] };
const HEALTH_BAD_SM = { torch_ready: false, qlora_ready: false, sm_supported: false, errors: ["sm_not_in_arch_list: device needs sm_120 but torch built for sm_50..sm_90"] };

/** Fake _runPythonJson (gpu_health) returning a canned report as a PyBridgeResult. */
const fakeHealth = (report, { exitCode = report.torch_ready ? 0 : 1 } = {}) =>
  async () => ({ ok: exitCode === 0, exitCode, result: report, error: exitCode === 0 ? null : "nonzero_exit" });

/** Fake _runTrainer FAITHFUL to runPythonJsonOrThrow: fires onProgress, then — exactly like
 *  the real bridge (py-subprocess-bridge.mjs:356-363) — THROWS on any non-ok outcome (a trainer
 *  handled-failure emits ok:false WITH a non-zero exit, so runPythonJsonOrThrow throws an Error
 *  carrying `.bridge`). A success returns the PyBridgeResult. `throwBridge` overrides for explicit
 *  spawn/timeout shapes. */
function fakeTrainer({ result, progress = [], durationMs = 1234, throwBridge = null }) {
  return async (_script, opts) => {
    for (const ev of progress) { if (typeof opts.onProgress === "function") opts.onProgress(ev); }
    if (throwBridge) { const e = new Error(throwBridge.message || "trainer threw"); e.bridge = throwBridge.bridge; throw e; }
    if (result.ok === true) return { ok: true, exitCode: 0, result, durationMs };
    // Real bridge behavior: trainer emit_result(False,...) + non-zero exit → ok:false → THROW.
    const e = new Error(`python job failed (nonzero_exit; exit 3)`);
    e.bridge = { ok: false, exitCode: 3, error: "nonzero_exit", result, durationMs };
    throw e;
  };
}

const TRAINER_OK = {
  ok: true, base_model: "Qwen/Qwen2.5-VL-7B-Instruct", adapter_dir: "/out/adapter",
  epochs: 3, lora_r: 16, training_brier: 0.12, brier_n: 8,
};
const TRAIN_PROGRESS = [
  { event: "progress", stage: "preflight", gpu: {} },
  { event: "progress", stage: "data", train: 6, val: 2 },
  { event: "progress", stage: "train", step: 1, logs: { loss: 2.1 } },
  { event: "progress", stage: "train", step: 2, logs: { loss: 1.4 } },
  { event: "progress", stage: "train", step: 3, logs: { loss: 0.9 } },
];

function makeBundle(rows = 6) {
  const dir = mkdtempSync(join(tmpdir(), "vl-bundle-"));
  const path = join(dir, "staged.jsonl");
  const lines = Array.from({ length: rows }, (_, i) =>
    JSON.stringify({ prompt: `Print: /p/${i}.pdf Context: ctx`, completion: String(1.5 + i) }));
  writeFileSync(path, lines.join("\n") + "\n");
  return { dir, path };
}

// ── assertGpuTrainable ──────────────────────────────────────────────────────
test("assertGpuTrainable: passes on a torch_ready report", async () => {
  const report = await assertGpuTrainable({ _runPythonJson: fakeHealth(HEALTH_READY) });
  assert.equal(report.torch_ready, true);
});

test("assertGpuTrainable: THROWS on sm_not_in_arch_list (the silent-CPU wheel) — fail-loud", async () => {
  await assert.rejects(
    () => assertGpuTrainable({ _runPythonJson: fakeHealth(HEALTH_BAD_SM) }),
    (e) => e instanceof GpuNotTrainableError && /sm_not_in_arch_list/.test(e.message) && e.health.sm_supported === false,
  );
});

test("assertGpuTrainable: FAIL-CLOSED on a missing/unparseable report (never silently ready)", async () => {
  const noReport = async () => ({ ok: false, exitCode: null, result: null, error: "no_json_output" });
  await assert.rejects(() => assertGpuTrainable({ _runPythonJson: noReport }), GpuNotTrainableError);
});

test("assertGpuTrainable: requireBnb gates on qlora_ready (torch_ready alone is not enough)", async () => {
  await assert.rejects(
    () => assertGpuTrainable({ requireBnb: true, _runPythonJson: fakeHealth(HEALTH_READY) }),
    GpuNotTrainableError, "torch_ready but not qlora_ready must reject under requireBnb",
  );
  const ok = await assertGpuTrainable({ requireBnb: true, _runPythonJson: fakeHealth(HEALTH_QLORA) });
  assert.equal(ok.qlora_ready, true);
});

// ── buildTrainerArgs ────────────────────────────────────────────────────────
test("buildTrainerArgs: maps every hyperparameter 1:1 to the trainer CLI", () => {
  const args = buildTrainerArgs({ bundlePath: "/b.jsonl", outputDir: "/o", hyperparameters: { epochs: 5, loraR: 8, lr: 2e-4 } });
  const flag = (f) => args[args.indexOf(f) + 1];
  assert.equal(flag("--bundle"), "/b.jsonl");
  assert.equal(flag("--output"), "/o");
  assert.equal(flag("--epochs"), "5");      // override applied
  assert.equal(flag("--lora-r"), "8");
  assert.equal(flag("--lr"), "0.0002");
  assert.equal(flag("--lora-alpha"), String(DEFAULT_VL_HYPERPARAMETERS.loraAlpha)); // default kept
});

test("buildTrainerArgs: target-modules are SPACE-separated tokens (nargs='*'), not comma-joined", () => {
  const args = buildTrainerArgs({ bundlePath: "/b", outputDir: "/o", hyperparameters: { targetModules: ["q_proj", "v_proj"] } });
  const i = args.indexOf("--target-modules");
  assert.equal(args[i + 1], "q_proj");
  assert.equal(args[i + 2], "v_proj"); // each module its own arg — a comma-join would make PEFT match nothing
  assert.throws(() => buildTrainerArgs({ outputDir: "/o" }), /bundlePath required/);
  assert.throws(() => buildTrainerArgs({ bundlePath: "/b" }), /outputDir required/);
});

// ── runBlueprintVlLoRATrain: happy path ─────────────────────────────────────
test("runBlueprintVlLoRATrain: gates GPU → trains → returns finite loss + brier + adapterDir", async () => {
  const { dir, path } = makeBundle(6);
  try {
    const seen = [];
    const out = await runBlueprintVlLoRATrain({
      bundlePath: path, outputDir: "/out/adapter",
      _runPythonJson: fakeHealth(HEALTH_READY),
      _runTrainer: fakeTrainer({ result: TRAINER_OK, progress: TRAIN_PROGRESS }),
      onProgress: (e) => seen.push(e),
    });
    assert.equal(out.ok, true);
    assert.equal(out.adapterDir, "/out/adapter");
    assert.equal(out.loss, 0.9, "loss = last train-step loss");
    assert.equal(out.trainingBrier, 0.12);
    assert.equal(out.brierN, 8);
    assert.equal(out.progressCount, TRAIN_PROGRESS.length);
    assert.equal(seen.length, TRAIN_PROGRESS.length, "onProgress forwarded every event");
    assert.equal(out.health.torch_ready, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ── runBlueprintVlLoRATrain: gates refuse BEFORE spawning the trainer ────────
test("runBlueprintVlLoRATrain: GPU-not-ready REFUSES — trainer is never spawned", async () => {
  const { dir, path } = makeBundle();
  let trainerCalled = false;
  try {
    await assert.rejects(
      () => runBlueprintVlLoRATrain({
        bundlePath: path, outputDir: "/o",
        _runPythonJson: fakeHealth(HEALTH_BAD_SM),
        _runTrainer: async () => { trainerCalled = true; return {}; },
      }),
      GpuNotTrainableError,
    );
    assert.equal(trainerCalled, false, "must not spawn the trainer on a dead GPU");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runBlueprintVlLoRATrain: missing bundle REFUSES (loud, no zero-row train)", async () => {
  let trainerCalled = false;
  await assert.rejects(
    () => runBlueprintVlLoRATrain({
      bundlePath: join(tmpdir(), "does-not-exist-xyz.jsonl"), outputDir: "/o", skipGpuGate: true,
      _runTrainer: async () => { trainerCalled = true; return {}; },
    }),
    (e) => e instanceof BundleUnusableError && /not found/.test(e.message),
  );
  assert.equal(trainerCalled, false);
});

test("runBlueprintVlLoRATrain: empty bundle file REFUSES", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vl-empty-"));
  const path = join(dir, "empty.jsonl");
  writeFileSync(path, "");
  try {
    await assert.rejects(
      () => runBlueprintVlLoRATrain({ bundlePath: path, outputDir: "/o", skipGpuGate: true, _runTrainer: async () => ({}) }),
      (e) => e instanceof BundleUnusableError && /empty/.test(e.message),
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ── runBlueprintVlLoRATrain: trainer failure paths (R12 fail-loud) ───────────
test("runBlueprintVlLoRATrain: trainer ok:false surfaces its error code", async () => {
  const { dir, path } = makeBundle();
  try {
    await assert.rejects(
      () => runBlueprintVlLoRATrain({
        bundlePath: path, outputDir: "/o", skipGpuGate: true,
        _runTrainer: fakeTrainer({ result: { ok: false, error: "missing_dependency", missing: ["peft"] } }),
      }),
      (e) => e instanceof TrainerFailedError && e.code === "missing_dependency",
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runBlueprintVlLoRATrain: trainer throw (spawn/timeout) carries the bridge error code", async () => {
  const { dir, path } = makeBundle();
  try {
    await assert.rejects(
      () => runBlueprintVlLoRATrain({
        bundlePath: path, outputDir: "/o", skipGpuGate: true,
        _runTrainer: fakeTrainer({ result: {}, throwBridge: { message: "timeout", bridge: { error: "timeout", result: { error: "gpu_unusable" } } } }),
      }),
      (e) => e instanceof TrainerFailedError && e.code === "gpu_unusable",
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runBlueprintVlLoRATrain: no finite loss AND no brier → fail loud (can't certify a train)", async () => {
  const { dir, path } = makeBundle();
  try {
    await assert.rejects(
      () => runBlueprintVlLoRATrain({
        bundlePath: path, outputDir: "/o", skipGpuGate: true,
        // ok:true but no training_brier and progress carries no train-step loss
        _runTrainer: fakeTrainer({ result: { ok: true, adapter_dir: "/a" }, progress: [{ event: "progress", stage: "data" }] }),
      }),
      (e) => e instanceof TrainerFailedError && e.code === "no_metric",
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runBlueprintVlLoRATrain: falls back to brier as loss when no train-step loss emitted", async () => {
  const { dir, path } = makeBundle();
  try {
    const out = await runBlueprintVlLoRATrain({
      bundlePath: path, outputDir: "/o", skipGpuGate: true,
      _runTrainer: fakeTrainer({ result: { ok: true, adapter_dir: "/a", training_brier: 0.2 }, progress: [] }),
    });
    assert.equal(out.loss, 0.2, "brier used as the finite scalar when no step loss");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ── makeBlueprintVlInnerTrain (generic-pipeline adapter, factory form) ───────
test("makeBlueprintVlInnerTrain: factory validates ctx; empty trainData throws", async () => {
  assert.throws(() => makeBlueprintVlInnerTrain({}), /bundlePath/);
  assert.throws(() => makeBlueprintVlInnerTrain({ bundlePath: "/b" }), /outputDir/);
  const fn = makeBlueprintVlInnerTrain({ bundlePath: "/b", outputDir: "/o", skipGpuGate: true, _runTrainer: fakeTrainer({ result: TRAINER_OK }) });
  await assert.rejects(() => fn([], {}), /non-empty array/);
});

test("makeBlueprintVlInnerTrain: ROUND-TRIPS through trainOnce's 2-arg innerTrain call (P0 fix)", async () => {
  const { dir, path } = makeBundle(6);
  try {
    const innerTrain = makeBlueprintVlInnerTrain({
      bundlePath: path, outputDir: "/out/adapter", skipGpuGate: true,
      _runTrainer: fakeTrainer({ result: TRAINER_OK, progress: TRAIN_PROGRESS }),
    });
    // trainOnce calls innerTrain(dataset.train, hyperparameters) — EXACTLY 2 args. The factory's
    // closed-over ctx is what makes that work (the P0 the reviewer caught: a 3-arg innerTrain
    // could never receive its bundle/output context from trainOnce).
    const out = await trainOnce({
      dataset: { train: [{ prompt: "a", completion: "1" }, { prompt: "b", completion: "2" }] },
      hyperparameters: { epochs: 2 },
      innerTrain,
    });
    assert.ok(Number.isFinite(out.loss), "trainOnce accepted the finite loss from the VL runner");
    assert.equal(out.loss, 0.9);
    assert.equal(out.weights.adapterDir, "/out/adapter");
    assert.equal(out.brier, 0.12);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
