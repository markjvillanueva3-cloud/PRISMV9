---
name: feedback_build_for_blackwell_hardware
description: "Standing operator directive (2026-06-09): build all AI-systems/fleet work targeting the upgraded hardware — RTX PRO 6000 Blackwell 96GB + Ryzen 9 9950X3D 32T + 136GB RAM + NVMe. GPU torch stack is LIVE; the gap is utilization, not capacity."
type: feedback
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.416Z
aliases: feedback_build_for_blackwell_hardware
---


# Build with the Blackwell hardware in mind (operator directive, 2026-06-09)

Operator: *"make sure we're building with an RTX blackwell 6000, new cpu, new ram and new nvme ssd in mind."* This is a standing build constraint for all AI-systems and fleet work, not a one-off.

**The hardware (live-measured, do NOT re-state specs that rot — read the canonical refs):**
- GPU: **NVIDIA RTX PRO 6000 Blackwell Workstation Edition — 96GB VRAM**, sm_120, driver 596.59
- CPU: **AMD Ryzen 9 9950X3D**, 16C/32T
- RAM: **136GB** · NVMe SSD (H:/Tools is the fast tier)
- Canonical live spec: [[reference_local_compute_synergy_state_2026_06_09]] · GPU train stack: [[reference_gpu_stack_provisioned_2026_06_06]] · shipped retunes: BLACKWELL-HW-SYNC-MS0 (commit e5ad4ea80, [[reference_post_ship_blackwell-hw-sync-ms0-u-alpha-hwsync-retunes]]).

**Why:** the upgrade removes the compute ceiling that gated heavy AI work (GNN GPU retrain, QLoRA, GPU batch-embed, H2GCN re-embed, frontier local LLM). Builds that still assume the old machine (CPU-only, small VRAM, conservative heap/parallelism, "GPU is golf's pending install") under-use the hardware and propagate stale blockers. The earlier "torch ABSENT" premise was a probe against the wrong (3.14 non-GPU) interpreter — the 3.13 GPU venv torch stack is LIVE.

**How to apply (per build):**
- **GPU is compute-unblocked NOW.** `PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe` (Python 3.13) → torch 2.11.0+cu128, sm_120, qlora-ready; verify with `H:/Tools/python-gpu/Scripts/python.exe scripts/py/gpu_health.py` (expect `ready:true`). NEVER probe via the 3.14 portable python — it's the non-GPU fallback and reports `ready:false` falsely.
- **96GB VRAM** fits frontier local models (gpt-oss:120b 65GB) → route best-tier synthesis local, not just to Claude.
- **136GB RAM + 32T CPU** → big graph/embedding loads (548–676MB system-graph, 768d re-embed) and parallel pipelines can assume headroom; don't artificially cap NODE heap or worker counts for the old machine.
- **NVMe** → seekable offset-index + large-file I/O patterns are cheap; favor them.
- **The real gap is UTILIZATION, not capacity** — GPU ~5% idle, ollama-offload ~6–9% vs 30% target. Prefer moving work ONTO the local GPU/Ollama, not avoiding it. (Contention caveat is now narrow: only NIM-alongside-Ollama VRAM saturation, per [[reference_local_compute_synergy_state_2026_06_09]].)
- Concrete india next step this unblocks: the **H2GCN-feature re-embed** (the embedding-degeneracy fix) — see [[reference_gnn_edge_predict_foundation_2026_06_08]] §GPU-UNBLOCKED.
