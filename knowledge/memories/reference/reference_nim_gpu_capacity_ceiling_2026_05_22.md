---
name: nim-gpu-capacity-ceiling-2026-05-22
description: RTX 4080 SUPER 16GB VRAM cannot run all 4 PRISM NIM containers; trimmed to 3b+embed via compose profiles. NIM is GPU-VRAM-bound — system RAM does not help it.
aliases: reference_nim_gpu_capacity_ceiling_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.223Z
---


2026-05-22 (slot golf). Operator armed the local stack (ollama, docker, qdrant, NIM). Finding: `H:/Tools/nim/compose/rtx4080.yml` launches 4 NIM containers (llama32-3b, llama31-8b, llama32-vision-11b, nv-embedqa-e5-v5) needing ~30GB+ aggregate VRAM. The RTX 4080 SUPER has **16GB**.

- `nim-llama32-vision-11b` crash-looped 22× — explicit log: *"Could not find a profile runnable with the detected hardware — Free GPUs: `<None>`"*. Needs a ≥24GB GPU.
- `nim-llama31-8b` marginal; won't fit alongside 3b + embed.
- **Trim applied:** added `profiles: ["oversized-gpu"]` to the 8b + vision service blocks (disabled-not-deleted per [[feedback_never_delete_only_disable]]) so `docker compose up` launches only `nim-llama32-3b` (:8000) + `nim-embed-e5` (:8010). Re-enable: `docker compose --profile oversized-gpu up -d`.

**Key principle:** NIM = TRT-LLM = strictly GPU-VRAM-bound. It does NOT spill to system RAM. The operator's 128GB RAM upgrade does nothing for NIM. Ollama is the opposite — it offloads layers to system RAM, so the 128GB makes Ollama the right home for LLM inference. Optimal split on this hardware: **NIM → embeddings only** (`nv-embedqa-e5-v5`, GPU, fast); **Ollama → LLM inference** (exploits the 128GB RAM).

Related: [[reference_nvidia_nim_local_setup_2026_05_18]].
