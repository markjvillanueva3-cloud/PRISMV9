# BLACKWELL-AI-MS0/U-GPU-STACK-PROVISION — [MAIN] [BLACKWELL-AI-MS0]/U-GPU-STACK-PROVISION (slot:india, operator "bypass golf and do it yourself"): Blackwell Python-GPU training stack PROVISIONED + verified — torch+bnb GREEN, unblocks GNN-GPU-retrain + QLoRA

**Commit:** `fb3062febbba` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:30:50-05:00
**Tags:** blackwell-ai-ms0, u-gpu-stack-provision, auto-distilled

## Subject
[MAIN] [BLACKWELL-AI-MS0]/U-GPU-STACK-PROVISION (slot:india, operator "bypass golf and do it yourself"): Blackwell Python-GPU training stack PROVISIONED + verified — torch+bnb GREEN, unblocks GNN-GPU-retrain + QLoRA

## Body
```
[MAIN] [BLACKWELL-AI-MS0]/U-GPU-STACK-PROVISION (slot:india, operator "bypass golf and do it yourself"): Blackwell Python-GPU training stack PROVISIONED + verified — torch+bnb GREEN, unblocks GNN-GPU-retrain + QLoRA

Operator overrode the plan's "golf owns infra" division. India provisioned the Python-GPU stack on DESKTOP-N7MI1VB (RTX PRO 6000 Blackwell, sm_120).

Root blocker was exactly as the plan's P0-2 predicted: only Python 3.14.5 existed and PyTorch has no cu128/sm_120 wheels for cp314. Fix: dedicated Python 3.13 venv.

SHIPPED (verified by the fail-loud gate scripts/py/gpu_health.py --require-bnb, exit 0):
- uv -> CPython 3.13.13 -> venv H:/Tools/python-gpu
- torch 2.11.0+cu128: arch_list has sm_120, real 512x512 cuda matmul ok -> torch_ready:true (NOT a silent-CPU wheel)
- bitsandbytes 0.49.2: NF4 quant/dequant on GPU ok -> qlora_ready:true
- transformers 5.10.2, peft, accelerate, datasets, numpy 2.4.6
- WIRED PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe in settings.json (mirrored C->H); py-subprocess-bridge.resolvePythonPath resolves it.

UNBLOCKS: GNN GPU retrain (MS3), QLoRA/LoRA trainer (MS4), GPU reward modeling (MS6).

Repro lesson: uv cache (C:) vs venv (H:) is cross-filesystem -> hardlink fails (exit 255); use UV_LINK_MODE=copy.

KNOWN FOLLOW-UP (documented, NOT a keystone blocker): sentence-transformers segfaults on import via datasets->pyarrow native access-violation (Win/py3.13). RAG GPU-batch-embed (MS2) deferred -> uses the running Ollama nomic-embed fallback. Also pending: PyG (torch2.11+cu128 scatter/sparse), llama.cpp cu128, ollama pull qwen2.5-coder:32b.

Record: state/shared/nn-graph/GPU-STACK-PROVISIONED.md + GPU-STACK-HEALTH.json. Memory: reference_gpu_stack_provisioned_2026_06_06.
```

## Files touched (3)
- state/shared/nn-graph/GPU-STACK-HEALTH.json    |  1 +
- state/shared/nn-graph/GPU-STACK-PROVISIONED.md | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 68 insertions(+)

## Lessons surfaced in commit body
- lesson: uv cache (C:) vs venv (H:) is cross-filesystem -> hardlink fails (exit 255); use UV_LINK_MODE=copy.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fb3062febbba`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._