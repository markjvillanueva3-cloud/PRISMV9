# INDIA HANDOFF — blueprint-vision LoRA fine-tune

**From:** slot:xray (blueprint-vision) · **To:** slot:india (full-system training) · **Date:** 2026-06-04
**Status:** dataset STAGED, fine-tune BLOCKED (3 dependencies india must clear)

xray has closed the OCR training loop (ensemble distillation → calibrated, quality-tiered pseudo-labels)
and STAGED a LoRA bundle through the real `BlueprintLoRABridgeEngine`. The actual gradient-descent
fine-tune is india's domain. This is the work order.

## What xray delivered (ready now)

- **Closed-loop training-data engine** — `scripts/blueprint-ocr-training-loop.mjs` + `scripts/lib/ocr-training-loop-lib.mjs`. Produces `state/shared/ocr-training-loop/trainset.jsonl` (gold/silver labels, agreement-fraction calibrated).
- **Staging seam** — `scripts/xray-trainset-to-lora.mjs` + `scripts/lib/trainset-to-lora-pairs.mjs`. Maps the trainset → `LoRATrainingPair[]` → routes through `BlueprintLoRABridgeEngine.prepareTrainingSet` → `exportBundle` → a `local-lora` bundle under `mcp-server/data/training/lora/staging/`. Summary at `state/shared/ocr-training-loop/lora-staging-summary.json`.
- **The dispatcher seam also works via MCP:** `prism_cad blueprint_lora_prepare_set` → `blueprint_lora_export` (identical path).

## Three blockers india MUST clear before ANY fine-tune (verified, not inferred — workflow `wwvgyrm26`)

1. **GPU is dead for compute.** RTX PRO 6000 Blackwell is `sm_120`; installed `torch 2.6.0+cu124` only ships kernels for `sm_50…sm_90`. `torch.cuda.is_available()` returns `True` but is a **FALSE POSITIVE** — `randn @ randn` on cuda throws `no kernel image is available`. **Fix:** install a `torch ≥2.7 / cu128 (sm_120)` wheel into the ML env (`WPy64-3.13`). Until then the 96 GB Blackwell cannot train.
2. **No trainer + no PEFT.** `mcp-server/scripts/wedm_train_lora.py` is a **simulation stub** (prints fake epoch losses; imports only argparse/json/os; text-only Mistral). The ML env is **missing `peft`, `datasets`, `trl`**. **Fix:** `pip install peft datasets trl` + write a real Qwen2.5-VL PEFT trainer (the Lathe `*TrainingScriptEngine.buildTrainingScript` shape ports, but must emit the VLM path: vision `from_pretrained`, image processor, VL collator, VL `target_modules`).
3. **Text/path bundle, not vision.** The whole LoRA stack (incl. `BlueprintLoRABridgeEngine`) is text-in/text-out — the bundle carries the image **PATH string, never pixels**. The staged prompt is `"Print: <pdfPath> Context: <ctx>"`. **Fix:** the VL trainer must load `pdfPath` → rasterize → feed pixels to the VLM; the JSONL bundle is the label/provenance carrier, not vision-ready data.

## Wiring india must add (the missing connective tissue)

- **Node→GPU edge (exists in NO engine yet):** `py-subprocess-bridge.runPythonJsonOrThrow(scriptPath, { cudaVisibleDevices:"0", timeoutMs: TRAINING_PY_TIMEOUT_MS, onProgress: m => monitor.recordStep(m) })`. `scripts/lib/py-subprocess-bridge.mjs` is real + GPU-ready but unused by the LoRA stack.
- **Detached run:** `DetachedLoRARunnerEngine` is a real lifecycle controller but needs a real `ProcessLauncher` injected + caller-side persistence to `data/lora/runner-state.json` (it is a controller, not a daemon out of the box).
- **DO NOT route through `prism_ml continual_lora_*` / `ContinualLoRAEngine`** — its numerics are stub `Math.random()` gradients/loss/Fisher. It does bookkeeping, not learning.

## The eval gate (NON-NEGOTIABLE — the labels are weak)

The labels are ensemble-distilled pseudo-labels: <50-sample calibration, 2-model consensus, synthetic→real OOD. Over-confident mis-calibrated pseudo-labels are the classic failure mode. The gate, in order of decisiveness:

1. **Brier ≤ 0.15 on `operator_verified` data — NOT pseudo-labels.** `LoRAAdapterSchema.training_brier` exists for this. Scoring `ensemble_consensus` against `ensemble_consensus` is circular (R9). **⚠ xray has NO operator_verified split yet — the gate CANNOT pass until one exists.** Building it is a prerequisite (operator confirms a sample of extracted dims against the real prints).
2. **Status ladder (`LoRAAdapterRegistryEngine`):** register at `shadow` (run parallel to live extraction, outputs logged-but-unused) → promote to `canary`/`active` ONLY when shadow logs match operator ground truth above threshold.
3. **`InferenceLoRAGateEngine` is NOT a quality gate** — it is serving/provenance (resolves the active adapter, stamps provenance, zero threshold checking). A bad adapter that reached `active` WILL be served. The real catch is #1 + #2.

## Next concrete steps (india)
1. Install cu128/sm_120 torch + peft/datasets/trl into WPy64-3.13; verify with a real `randn@randn` cuda op + `import peft`.
2. Write the Qwen2.5-VL PEFT trainer (`mcp-server/scripts/blueprint_vl_train_lora.py`) consuming the staged JSONL (resolve `pdfPath`→pixels).
3. Wire `py-subprocess-bridge` → `DetachedLoRARunnerEngine` → `LatheLoRATrainingMonitorEngine`-style monitor.
4. Build the `operator_verified` eval split (the Brier-gate prerequisite).
5. Grow the trainset: xray runs `blueprint-ocr-training-loop.mjs` daemon-quiet / pre-warmed so ≥2 models survive per print and calibration reaches `reliable` (≥50 samples).

Refs: workflow `wwvgyrm26` synthesis · wiki [[ocr-closed-loop-training-ensemble-distillation]] · [[vlm-ensemble-ocr-and-leading-dot-parse-fix]] · engines `BlueprintLoRABridgeEngine`, `DetachedLoRARunnerEngine`, `LoRAAdapterRegistryEngine`, `InferenceLoRAGateEngine`, `py-subprocess-bridge.mjs`.
