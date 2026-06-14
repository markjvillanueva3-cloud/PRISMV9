---
name: reference_gpu_stack_provisioned_2026_06_06
description: "India provisioned the Blackwell Python-GPU training stack (operator \"bypass golf\") — torch 2.11+cu128 sm_120 + bitsandbytes NF4 GREEN; unblocks GNN-GPU-retrain + QLoRA. pyarrow/sentence-transformers segfault is a documented follow-up."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.134Z
aliases: reference_gpu_stack_provisioned_2026_06_06
---


# Blackwell GPU training stack PROVISIONED (slot:india, 2026-06-06, operator "bypass golf and do it yourself")

The BLACKWELL-AI plan handed the Python-GPU stack to golf; the operator overrode that ("bypass golf and do it yourself") so india provisioned it. Host `DESKTOP-N7MI1VB`, RTX PRO 6000 Blackwell (96GB, driver CUDA 13.2, sm_120).

**What was the blocker:** only Python **3.14.5** existed (portable `H:/Tools/python`), and PyTorch has **no cu128/sm_120 wheels for cp314** (3.14 too new). The fix is a dedicated **Python 3.13** venv (exactly as the plan's P0-2 predicted).

**What shipped (all verified by the fail-loud gate `scripts/py/gpu_health.py --require-bnb`):**
- `uv` (pip-installed into the 3.14 env) → `uv python install 3.13` (CPython 3.13.13) → `uv venv H:/Tools/python-gpu`.
- **torch 2.11.0+cu128** — `arch_list` includes `sm_120`, `gpu_matmul_ok:true` (real 512×512 cuda matmul) → **torch_ready:true** (NOT a silent-CPU wheel — the #1 danger the gate exists to catch).
- **bitsandbytes 0.49.2** — NF4 quantize/dequantize on GPU ok → **qlora_ready:true**.
- libs: transformers 5.10.2, peft, accelerate, datasets, numpy 2.4.6.
- **Wiring:** `PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe` added to `settings.json` env (mirrored C→H); `py-subprocess-bridge.resolvePythonPath()` resolves it (`source:"PRISM_PYTHON_GPU_PATH"`). `PRISM_PYTHON_PATH` also set to the 3.14 env as the non-GPU fallback.

**Unblocked (need only torch_ready/qlora_ready):** GNN GPU retrain (MS3), QLoRA/LoRA trainer (MS4), GPU reward modeling (MS6).

**Gotcha that bit (reproduction lesson):** uv's cache lives on **C:** but the venv is on **H:** → uv's default hardlink mode fails cross-filesystem (exit 255 mid-install). Fix: `UV_LINK_MODE=copy` + `--link-mode=copy`. torch cu128 is a ~2.6GB download then a multi-GB copy (~9 min with copy mode).

**KNOWN FOLLOW-UP (documented, not a keystone blocker):** `sentence-transformers` segfaults on import — Windows access-violation in **pyarrow's native module** (`pyarrow/__init__.py:71`), reached via `datasets`→`pyarrow.dataset`. torch/bnb/transformers unaffected. RAG GPU-batch-embed (MS2) deferred → use the running **Ollama nomic-embed** path (the plan's parity fallback). Fix options: pin pyarrow to a Win/py3.13-stable build, lazy-import SentenceTransformer without datasets, or embed via transformers+torch directly. Also pending: PyG (torch_scatter/sparse for torch2.11+cu128), llama.cpp cu128, `ollama pull qwen2.5-coder:32b`.

Full record + exact repro commands: `state/shared/nn-graph/GPU-STACK-PROVISIONED.md`. Gate snapshot: `state/shared/nn-graph/GPU-STACK-HEALTH.json`. Related: [[reference_gnn_selective_deploy_2026_06_06]] (the GNN leg this GPU stack now lets us actually retrain toward full-coverage). Supersedes the "golf must provision" line in the BLACKWELL-AI plan for the torch/bnb/peft core.
