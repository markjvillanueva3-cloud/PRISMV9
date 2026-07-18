# BLACKWELL-AI-MS0/U-XRAY-VL-TRAIN-RUNNER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-XRAY-VL-TRAIN-RUNNER (slot:xray, acting for india): T3.2 — the Node→GPU LoRA runner (the missing connective tissue)

**Commit:** `d22a207781ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:38:04-05:00
**Tags:** blackwell-ai-ms0, u-xray-vl-train-runner, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-XRAY-VL-TRAIN-RUNNER (slot:xray, acting for india): T3.2 — the Node→GPU LoRA runner (the missing connective tissue)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-XRAY-VL-TRAIN-RUNNER (slot:xray, acting for india): T3.2 — the Node→GPU LoRA runner (the missing connective tissue)

Closes T3.2 of INDIA-TAKEOVER-PLAN-blueprint-lora.md: the Node→GPU edge between the
.mjs orchestration layer and the real Qwen2.5-VL PEFT trainer (T3.1, b121b19f7b) that
NO engine owned. scripts/lib/blueprint-vl-train-runner.mjs:

  1. PRE-GATES on the STRONG gpu_health.py (arch_list + real matmul — folds in T1.3's
     residual; the trainer's own inline preflight is weaker, no arch_list). Refuses to
     spawn a multi-minute train on a GPU that would silently run on CPU. FAIL-CLOSED:
     a missing/unparseable health report is NOT-ready.
  2. Validates the staged local-lora bundle exists + is non-empty (no zero-row train).
  3. Spawns blueprint_vl_train_lora.py via the canonical py-subprocess-bridge
     (runPythonJsonOrThrow, CUDA_VISIBLE_DEVICES=0, TRAINING_PY_TIMEOUT_MS), streaming
     {event:progress} to an optional monitor.
  4. Maps the trainer result → the generic lora-training-pipeline.mjs trainOnce() contract
     (finite loss + weights handle), carrying training_brier/adapter_dir + a lossBasis
     discriminator (train_step vs brier_fallback — never trend across bases).

makeBlueprintVlInnerTrain(ctx) is the FACTORY form: trainOnce calls innerTrain with EXACTLY
2 args (dataset.train, hyperparameters), so the bundle/output context is CLOSED OVER, not a
3rd call-time arg (the P0 a reviewer caught — a 3-arg innerTrain could never receive it).

16 hermetic tests (DI on both py-bridge calls — no GPU/Python needed): GPU-gate fail-closed +
refuses-before-spawn, bundle guards, every trainer failure path fail-loud, arg contract 1:1 vs
the trainer's argparse, target-modules nargs="*" (separate args not comma-join), and a REAL
round-trip THROUGH trainOnce proving the 2-arg integration. Per-file 2-reviewer scrutiny:
reviewer-A PASS; reviewer-B caught the P0 → fixed (factory) → independent re-review PASS (0 P0/P1).

ENV UNBLOCKED THIS SESSION: PRISM_PYTHON_GPU_PATH (H:/Tools/python-gpu) now has
torch 2.11.0+cu128 (sm_120) + peft/datasets/transformers/bitsandbytes/accelerate — gpu_health
LIVE returns torch_ready:true, qlora_ready:true. Remaining for a live train (T4.1): python-gpu
lacks pip + 4 trainer deps (trl, qwen-vl-utils, pillow, pymupdf); + a staged bundle; + operator
eval split (T2.2) before deploy.
```

## Files touched (3)
- scripts/lib/blueprint-vl-train-runner.mjs      | 328 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/blueprint-vl-train-runner.test.mjs | 253 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 581 insertions(+)

## Lessons surfaced in commit body
- tils, pillow, pymupdf); + a staged bundle; + operator

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d22a207781ac`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._