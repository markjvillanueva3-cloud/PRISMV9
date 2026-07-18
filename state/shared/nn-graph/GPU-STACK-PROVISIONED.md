# GPU Training Stack — PROVISIONED + VERIFIED (slot:india, 2026-06-06)

**Operator directive:** "bypass golf and do it yourself" — india provisioned the Python-GPU
training stack that the BLACKWELL-AI plan had handed to golf. Host: `DESKTOP-N7MI1VB`
(sole user of H:). RTX PRO 6000 Blackwell, 96GB, driver CUDA 13.2, sm_120.

## 🟢 GREEN — verified by the fail-loud gate (`scripts/py/gpu_health.py --require-bnb`)

Snapshot: `state/shared/nn-graph/GPU-STACK-HEALTH.json`

| gate | value |
|---|---|
| interpreter | `H:/Tools/python-gpu/Scripts/python.exe` (CPython **3.13.13**) |
| torch | **2.11.0+cu128** |
| device | RTX PRO 6000 Blackwell, capability [12,0], **sm_120** |
| arch_list | sm_75/80/86/90/100/**120** → `sm_supported: true` (NOT a silent-CPU wheel) |
| gpu_matmul_ok | **true** (512×512 cuda matmul, finite sum — real on-device op) |
| bitsandbytes | **0.49.2** — NF4 quantize/dequantize on GPU **ok** |
| **torch_ready** | **true** |
| **qlora_ready** | **true** |

**Wiring:** `PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe` added to
`settings.json` env (mirrored C→H). `py-subprocess-bridge.resolvePythonPath()` +
`GpuStackHealthEngine` now resolve to the GPU venv (verified: `source:"PRISM_PYTHON_GPU_PATH"`).

## Unblocked (need only `torch_ready` / `qlora_ready`)
- **GNN GPU retrain (MS3)** — torch present; PyG still pending (see below) but the torch core is the hard part.
- **QLoRA / LoRA trainer (MS4)** — torch + bitsandbytes(NF4) + peft + transformers + accelerate + datasets-core all import.
- **GPU reward modeling (MS6)** — torch.

Installed libs (venv): torch, transformers 5.10.2, peft, accelerate, datasets, bitsandbytes 0.49.2, numpy 2.4.6, pyarrow 24.0.0.

## ⚠ KNOWN FOLLOW-UPS (not blocking the keystone)
1. **sentence-transformers segfaults on import** — Windows fatal access-violation in
   `pyarrow`'s native module (`pyarrow/__init__.py:71`), reached via `datasets` → `pyarrow.dataset`.
   torch/bnb/transformers are unaffected. **RAG GPU-batch-embed (MS2) deferred** — RAG uses the
   existing **Ollama `nomic-embed-text` path** (running) meanwhile (the plan's parity fallback).
   Fix options to try: pin pyarrow to a Win/py3.13-stable build; OR lazy-import the
   `SentenceTransformer` class without `datasets`; OR embed via `transformers`+`torch` directly
   (AutoModel) bypassing sentence-transformers entirely.
2. **PyG** (`torch_geometric` + `torch_scatter`/`torch_sparse` matched to torch 2.11+cu128/sm_120)
   — for the GATv2/H2GCN GNN retrain. torch_geometric is pure-python; the scatter/sparse C++ ops
   need a version-matched wheel index (`data.pyg.org/whl/torch-2.11.0+cu128.html`) which may not
   exist yet for 2.11 — verify, else use PyG's pure-python fallback or DGL.
3. **llama.cpp cu128** (GGUF convert of trained LoRA adapters, MS4 deploy step).
4. **`ollama pull qwen2.5-coder:32b`** (~20GB) — octopus secondary voice + CAG (MS5/MS6); bravo's
   U-OCTOPUS-POWER already re-pointed octopus to gpt-oss:120b/qwen2.5-coder:32b floor.

## Reproduction (exact, idempotent-ish)
```bash
# uv + Python 3.13 (no admin)
H:/Tools/python/python.exe -m pip install uv
H:/Tools/python/python.exe -m uv python install 3.13
H:/Tools/python/python.exe -m uv venv H:/Tools/python-gpu --python 3.13
# torch cu128 (sm_120) — link-mode=copy because uv cache (C:) and venv (H:) are cross-filesystem
UV_LINK_MODE=copy H:/Tools/python/python.exe -m uv pip install --link-mode=copy \
  --python H:/Tools/python-gpu/Scripts/python.exe torch --index-url https://download.pytorch.org/whl/cu128
# LoRA + RAG libs
UV_LINK_MODE=copy H:/Tools/python/python.exe -m uv pip install --link-mode=copy \
  --python H:/Tools/python-gpu/Scripts/python.exe sentence-transformers transformers accelerate peft bitsandbytes datasets
# VERIFY (the gate that catches silent-CPU + bad bnb)
H:/Tools/python-gpu/Scripts/python.exe scripts/py/gpu_health.py --require-bnb   # exit 0 == qlora_ready
```

Memory: [[reference_gpu_stack_provisioned_2026_06_06]]. Supersedes the BLACKWELL-AI plan's
"golf must provision the Python-GPU stack" blocker for items 1–4 (torch/bnb/peft/ST core);
PyG + llama.cpp + 32b pull remain.
