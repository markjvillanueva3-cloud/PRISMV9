---
name: reference_blackwell_ms0_foundation_pair_2026_06_03
description: BLACKWELL-AI-MS0 GPU-training foundation shipped (gpu_health gate + Node→Python bridge); the training-half unblocker
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.478Z
aliases: reference_blackwell_ms0_foundation_pair_2026_06_03
---


# BLACKWELL-AI-MS0 — GPU-training foundation pair (slot:india, 2026-06-03)

Shipped on `cad-fusion-live-ms0`: `f11efe4047` (5 files) + `9e5dcca6ad` (engine test). Pairs with the already-shipped keystone `U-CAP-PROBE` (`86716f4aaf`, `OllamaCapabilityProbeEngine` = inference/VRAM routing). This pair is the **training-stack** half.

**What it is** (RTX PRO 6000 Blackwell, 96GB, CUDA 13.2 / sm_120 — verified live, idle):
- `scripts/py/gpu_health.py` — FAIL-LOUD GPU readiness gate. Catches the #1 silent killer: a wrong-arch torch wheel reports `cuda.is_available()=true` then runs on CPU at ~1/50th. Hard gate = torch + cuda + device sm **covered** by `get_arch_list()` (tolerant of `sm_120a`/`compute_120`) + a REAL synchronized cuda matmul. `bnb_4bit_ok` is a SEPARATE tri-state (null/false/true) so a missing bnb wheel never reds the GNN gate. One full-schema JSON on EVERY path (incl bad-args via `_JsonArgumentParser`, top-level backstop), exit 0 iff ready.
- `scripts/lib/py-subprocess-bridge.mjs` (+23 node:test) — canonical Node→Python NDJSON spawn for ALL GPU training scripts. NEVER swallows a non-zero exit. Incremental line-parse (>4MB result never tail-cap-corrupted). **win32 `taskkill /T /F` tree-kill** so a timed-out QLoRA can't orphan a CUDA grandchild holding 30GB VRAM. `PRISM_PYTHON_GPU_PATH`→`PRISM_PYTHON_PATH`→`python` resolution; `TRAINING_PY_TIMEOUT_MS` (60min) for long jobs; frozen `PY_BRIDGE_ERRORS`.
- `mcp-server/src/engines/GpuStackHealthEngine.ts` (+17 vitest) — TS shim, wired **`prism_dev:gpu_stack_health`**. Fail-soft snapshot / fail-loud gate (`assertReady()` throws). `ready` derived ONLY from `torch_ready` (a buggy script's own `ready:true` can never produce a false GO). Short not-ready TTL (auto-lights-up seconds after golf's install); interpreter-keyed cache.

**Status: GREEN-WHEN-GOLF-LANDS-TORCH.** Live today = RED (`torch_not_importable`, exit 1) because golf hasn't installed the Python GPU stack yet. The gate flips GREEN automatically — no india code change — once golf installs torch cu129/sm_120 into a Python **3.13** venv (cp314 wheels are CPU-only) and exposes `PRISM_PYTHON_GPU_PATH`. Verify: `prism_dev:gpu_stack_health` → `ready:true`.

**Division of labor:** golf owns infra (torch/cu129/bitsandbytes/sentence-transformers, ollama model pulls, NIM); india owns the AI systems that consume it. This pair is non-overlapping with golf's ModelRoutingEngine/MultiModelConsensusEngine routing-lane edits (D5/D7/P-series in [[BLACKWELL-SYNC-INVESTIGATION]]).

**Unblocks:** MS3 GNN GPU retrain, MS4 LoRA trainer (+GalaxyAdapterFactory for the all-34-galaxy fan-out), MS6 reward model — every training script spawns via the bridge and gates on `gpuStackHealthEngine.assertReady()`.

Scrutiny: 10 review passes (6 per-file + 1 wiring + 3-of-3 formal arms), all PASS. Plan: [[BLACKWELL-AI-UPGRADE-PLAN]]. Related: [[reference_critical_resource_roots_2026_05_30]].
