# INDIA-TAKEOVER PLAN — xray executes the blueprint-vision LoRA fine-tune (india busy)

**Owner (acting):** slot:xray · **Normal owner:** slot:india (full-system training) · **Date:** 2026-06-04
**Trigger:** operator — "plan for taking over india's work since it's currently busy."
**Source of truth for the blockers:** workflow `wwvgyrm26` synthesis + `INDIA-HANDOFF-blueprint-lora.md`.

xray has already shipped everything up to the fine-tune boundary (closed-loop trainset → staged
`local-lora` bundle via the real bridge). This plan enumerates the ENTIRE remaining path to a
deployed blueprint-vision LoRA, dependency-ordered, flagging what xray can do solo vs what needs
operator approval. NO step is silently pruned.

## SESSION UPDATE — 2026-06-06 (slot:xray) — corpus closed-loop UNBLOCKED
- **KEYSTONE BUG FIXED (`e354869c93`).** The OCR closed-loop reported `0 models survived / all-failed`
  on EVERY print — the parser, not the VLM/GPU. `parseVisionResponse` lost a whole print's extraction
  over (1) a truncated response defeating the leading-dot repair (wrong compose order) and (2) a leading
  `+` in `±` tolerances. Fixed in `scripts/lib/ollama-vision-extract-lib.mjs` (61/61 tests, 2-reviewer
  PASS). LIVE: same print now 8–9 dims → 7/9 trainable, calibration 0→38. → [[reference_xray_ocr_parse_truncation_fix_2026_06_06]].
- **T1.3 = ALREADY SHIPPED (stale in this plan).** `scripts/py/gpu_health.py` already does the real cuda
  matmul + arch_list-coverage probe (STRONGER than the trainer's inline preflight). Live-validated on the
  Blackwell: torch **2.6.0+cu124** (arch_list sm_50..sm_90, **no sm_120**) → gate correctly REFUSES with
  `sm_not_in_arch_list`, `torch_ready:false`. The residual (trainer's weaker inline preflight) folds into
  T3.2 = the runner should gate on `gpuStackHealthEngine.assertReady()` before spawning.
- **T2.1 BEGUN.** Corpus batch (`batch-ollama-vision-extract.mjs`, fixed parser, 3× qwen3-vl concurrent on
  the 96GB Blackwell) launched over a fresh 1000-print JM worklist + fresh checkpoint
  (`state/shared/ocr-training-loop/jm-corpus-{worklist,checkpoint}-fixed.*`). NOTE: the prior May-31
  `blueprint-ocr-worklist-clean.txt` 285 prints were checkpointed `done` BUT processed with the broken
  parser — their extractions are suspect; re-process with a fresh checkpoint. The durable "PRISM Blueprint
  OCR Batch" scheduled task (State:Ready) should be re-pointed at the fixed worklist for the full 85,346-PDF corpus.
- **T1.1 ENV — NOW LANDED (2026-06-06).** `PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu` has **torch 2.11.0+cu128
  (sm_120)** + peft/datasets/transformers/bitsandbytes/accelerate/numpy. `gpu_health.py` LIVE returns
  `torch_ready:true, qlora_ready:true`. The Blackwell is training-capable.
- **T3.2 — SHIPPED `U-XRAY-VL-TRAIN-RUNNER` (2026-06-06).** `scripts/lib/blueprint-vl-train-runner.mjs` — the
  Node→GPU edge: strong `gpu_health.py` pre-gate (folds in T1.3's residual) → bundle check → spawn
  `blueprint_vl_train_lora.py` via the py-bridge (streaming progress) → map to `trainOnce()`'s contract.
  `makeBlueprintVlInnerTrain(ctx)` is the factory (trainOnce calls innerTrain with 2 args, so context is
  closed over). 16 hermetic tests + LIVE end-to-end validation (real gpu_health passes → real trainer reached
  → `missing_dependency` fail-loud propagated). Per-file 2-reviewer PASS (P0 factory refix re-reviewed).
- **T4.1 (run the fine-tune) — remaining blockers (small):** `python-gpu` lacks `pip` + 4 trainer deps
  (`trl`, `qwen-vl-utils`, `pillow`, `pymupdf`) — operator: `python-gpu -m ensurepip` then pip-install those.
  Plus a staged `local-lora` bundle (BlueprintLoRABridgeEngine) + the operator_verified eval split (T2.2)
  before any deploy. Once the 4 deps land, `runBlueprintVlLoRATrain({bundlePath, outputDir})` runs the real train.

## Legend
- **[SOLO]** xray can do now without operator/india (code only — runs later).
- **[OPERATOR]** needs operator approval/input (shared-env mutation, ground-truth labeling).
- **[GATED]** depends on an upstream step; do not start atop an unproven dependency (R13).

---

## Phase 0 — Coordination + safety (do FIRST)

- **T0.1 [OPERATOR] Shared ML-env decision.** The trainer needs `peft/datasets/trl` + a Blackwell
  torch. The ML env `WPy64-3.13` is **shared** — mutating it can break india/other slots mid-train.
  Decision needed: (a) install into the shared env, or (b) **create a dedicated venv** for
  blueprint-vision training (recommended — isolates risk). *Why:* env mutation is the one
  irreversible, cross-slot-blast-radius action here. *Blocks:* T1.1, T1.2.
- **T0.2 [SOLO] Chat-bus claim.** Post to `AGENT_CHAT` that xray is acting-owner of the
  blueprint-LoRA fine-tune so india doesn't collide on resume; co-own/hand back when india returns.
  *Blocks:* nothing — pure coordination hygiene.

## Phase 1 — Environment (clears blockers #1 + #2)

- **T1.1 [OPERATOR][GATED on T0.1] Blackwell-compatible torch.** Install `torch ≥2.7 / cu128`
  (sm_120) into the chosen env. **Verify with a REAL compute op** (`torch.randn(8,8,device='cuda') @
  torch.randn(8,8,device='cuda')`) — NOT `is_available()` (false-positive on this card). *Why:* the
  96GB Blackwell is idle for compute until this lands. *Risk:* ~2.5GB wheel; confirm a cu128 wheel
  exists for the env's python (3.13). *Blocks:* T3.x run, T4.1.
- **T1.2 [OPERATOR][GATED on T1.1] PEFT stack.** `pip install peft datasets trl pillow qwen-vl-utils`.
  *Why:* no LoRA without peft; vision needs pillow + qwen-vl-utils. *Blocks:* T3.1 run.
- **T1.3 [SOLO] Harden GpuStackHealthEngine.** Add a real-compute probe (small cuda matmul) so the
  health gate reports the sm_120/kernel mismatch instead of the `is_available()` false positive.
  *Why:* the gate currently green-lights a dead GPU. *Depends:* none (code). *Blocks:* nothing
  (prevents a future silent "training started on a dead GPU").

## Phase 2 — Data (grow + verify; the corpus is 1 print today)

- **T2.1 [SOLO] Grow the trainset.** Run `scripts/blueprint-ocr-training-loop.mjs` pre-warmed
  (≥2 VLMs resident) / daemon-quiet over a bounded sample of `blueprint-trainset-clean.jsonl`
  print_docs (rasterize via `scripts/lib/pdf-to-png.py`) so ≥2 models survive per print → calibration
  reaches `reliable:true` (≥50 samples) + a real multi-print corpus. *Why:* 8 pairs/1 print proves
  wiring, not a trainable corpus. *Depends:* closed-loop engine (shipped) + a quiet Ollama window.
  *Blocks:* a meaningful fine-tune (T4.1).
- **T2.2 [OPERATOR] Build the `operator_verified` eval split.** Operator confirms a held-out sample
  of extracted dims against the real prints → gold labels. *Why:* the deploy gate (Brier ≤0.15) MUST
  score against operator-verified data, NOT the pseudo-labels (circular — R9). **This is the hard
  prerequisite for ANY deployment.** *Depends:* extraction (shipped). *Blocks:* T4.2.
- **T2.3 [SOLO][GATED on T2.1] Re-stage the grown trainset.** `scripts/xray-trainset-to-lora.mjs`
  → larger staged bundle. *Depends:* T2.1. *Blocks:* T4.1.

## Phase 3 — The real VL trainer (code; runnable once Phase 1 lands)

- **T3.1 ✅ SHIPPED `b121b19f7b` (slot:xray, 2026-06-04) — `mcp-server/scripts/blueprint_vl_train_lora.py` + `.test.mjs`.** A REAL Qwen2.5-VL PEFT
  trainer: read the staged JSONL, **resolve `pdfPath` → pixels** (PIL/qwen-vl-utils), VLM
  `from_pretrained` + processor + image collator + VL `target_modules`, LoRA config, train, write
  `adapter_model.safetensors` + a `training_brier` computed on a held-out split. Port the
  `LatheLoRATrainingScriptEngine.buildTrainingScript` SHAPE but emit the VLM code path. *Why:*
  `wedm_train_lora.py` is a text-only simulation stub — useless for vision. *Depends:* T1.2 to RUN
  (but the .py can be WRITTEN solo now). *Blocks:* T4.1.
- **T3.2 [SOLO] Node→GPU runner.** Wire `scripts/lib/py-subprocess-bridge.mjs`
  `runPythonJsonOrThrow(blueprint_vl_train_lora.py, {cudaVisibleDevices:"0", timeoutMs:
  TRAINING_PY_TIMEOUT_MS, onProgress: m=>monitor.recordStep(m)})`, driven by `DetachedLoRARunnerEngine`
  (detached, survives /compact) + a `LatheLoRATrainingMonitorEngine`-style monitor. *Why:* this
  Node→GPU edge exists in NO current engine — the missing connective tissue. *Depends:* T3.1.
  *Blocks:* T4.1.

## Phase 4 — Train → gate → deploy

- **T4.1 [GATED on T1.1,T1.2,T2.3,T3.1,T3.2] Run the fine-tune** (detached, monitored).
- **T4.2 [GATED on T4.1,T2.2] Eval gate: Brier ≤0.15 on the operator_verified split** (AUROC ≥0.78 /
  macro-F1 ≥0.55 where classification applies). Scoring pseudo-labels against pseudo-labels is
  forbidden (R9). *Blocks:* deploy.
- **T4.3 [GATED on T4.2] Register at `shadow`** via `LoRAAdapterRegistryEngine` (carry `training_brier`);
  run parallel to live extraction, outputs logged-but-unused; promote `canary`→`active` only when
  shadow logs match operator GT above threshold.
- **T4.4 [GATED on T4.3] Serve.** Register endpoint via `prism_cad blueprint_lora_register_endpoint`;
  `InferenceLoRAGateEngine` resolves the active adapter (serving/provenance only — NOT a quality gate;
  the quality catch is T4.2 + T4.3).

## Guardrails (do NOT violate)
- **NEVER route through `ContinualLoRAEngine` / `prism_ml continual_lora_*`** — stub `Math.random()`
  numerics; it does bookkeeping, not learning.
- **The eval gate scores operator_verified, never pseudo-labels** (circularity = the `toBeDefined()`
  of eval).
- **`InferenceLoRAGate` is NOT a quality gate** — a bad adapter that reached `active` WILL be served.
- **Dedicated venv over shared-env mutation** unless operator says otherwise (T0.1).

## The xray-executable slice for the NEXT session (no operator/india needed)
In dependency order, all CODE that runs once the env lands:
1. ~~**T3.1** write `blueprint_vl_train_lora.py` (Qwen2.5-VL PEFT, pdfPath→pixels).~~ ✅ SHIPPED `b121b19f7b`
   (2026-06-04) — real VL-SFT trainer + 4-test bridge E2E; correct expanded-prompt loss masking;
   structured fail-loud on every exit path; pseudo-Brier fenced from the deploy gate. Validated live
   (self-test 13/13, missing_dependency exit 3, 4/4 tests). 2-reviewer + 3-of-3 ALL PASS.
2. **T3.2** the py-subprocess-bridge → DetachedLoRARunner → monitor runner (NEXT — consumes T3.1).
3. **T1.3** harden GpuStackHealth real-compute probe (the trainer already does this preflight inline
   via `preflight_gpu()` — lift that real-matmul check into `GpuStackHealthEngine` so the health gate
   stops green-lighting the dead sm_120 GPU).
4. **T2.1** grow the trainset (needs a quiet Ollama window — schedule it).
Then STOP at T1.1/T1.2/T2.2 (operator-gated) and check in: "trainer + (T3.2) wiring written, env install +
operator eval split needed to run."

Refs: `INDIA-HANDOFF-blueprint-lora.md` · workflow `wwvgyrm26` · wiki [[ocr-closed-loop-training-ensemble-distillation]] · engines `BlueprintLoRABridgeEngine`, `DetachedLoRARunnerEngine`, `LoRAAdapterRegistryEngine`, `LatheLoRATrainingScriptEngine`, `py-subprocess-bridge.mjs`.
