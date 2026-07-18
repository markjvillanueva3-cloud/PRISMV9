---
name: reference_ollama_blackwell_vram_constraints_2026_06_09
description: Verified KV-cache + resident-set constraints for the 96GB Blackwell Ollama box — the synthesis fabricated VRAM math 8-32x low; these are the adversarially-corrected numbers
type: reference
galaxy: hermes-zulu
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_blackwell_vram_constraints_2026_06_09
---


# Ollama VRAM/KV constraints on the 96GB Blackwell (verified 2026-06-09, slot:bravo)

Assessment workflow `wf_6909faea-a97` synthesis proposed pinning 4 big models at CTX=32768/MAX_LOADED=6. Two adversarial verifiers **REFUTED it** — the synthesis used `ollama list` *disk* sizes as *resident* sizes and undercounted KV-cache 8-32× per model. The corrected, live-measured reality (from `/api/show model_info` + `/api/ps`):

**The non-obvious killer — qwen2's KV geometry:**
- `qwen2.5-coder:32b` = **~37 GB resident at 16K ctx** (NOT its 19.9 GB disk size). KV ≈ 17 GB ALONE — qwen2's 64-layer / 8-KV-head / head_dim-128 geometry makes KV nearly as large as the weights. NP=4 doubles it.
- `gpt-oss:120b` ≈ 66 GB (MoE + 8-KV-head GQA → KV genuinely small relative to weights — the ONE model where "KV tiny" holds).
- `qwen3-vl:8b-instruct` ≈ 8.1 GB at num_ctx **8192** (the OCR lib pins 8192, not 32K).
- `qwen2.5vl:7b` ≈ 15.3 GB resident (spills a 16GB card). `nomic-embed-text` 0.3 GB at ctx 2048 (its native max — never assign it 32K).

**Hard constraints (do NOT repeat the synthesis's mistakes):**
- **120b + 32b CANNOT co-reside** (66+37 = 103 > 95.6 GB usable). The 32b is an on-demand swap that evicts the 120b.
- Fit-able pinned warm set ≈ **{gpt-oss:120b + qwen3-vl:8b-instruct + nomic-embed} ≈ 76 GB**, ~19 GB headroom for ONE LRU coder.
- **CTX stays 16384** — 32768 is unaffordable for any multi-model pinned set.
- **MAX_LOADED ≤ 4 (consider 3); NEVER 6** — raising it invites OOM/eviction thrash (lowers util, the opposite of intent). Independently corroborated by the same-day NIM-drop fix which already walked docker MAX_LOADED 6→4 ([[reference_infra_nim_drop_ollama_2026_06_09]]).
- **KEEP_ALIVE=30m already set** (the -1 commit-leak fix `cebde4fd9` / `reference_ollama_keepalive_commit_leak_2026_06_08`) — do not re-touch.
- The only safe immediate config delta = **NUM_PARALLEL 4→2** (halves KV) in `scripts/system-health/05-soft-config-tweaks.ps1:43`.

**Lesson:** never compute Ollama VRAM from `ollama list` disk size — the resident footprint = weights + KV + compute buffers + projector, and KV is workload-geometry-dependent (qwen2 brutal, MoE cheap). Read `/api/show model_info` (block_count, head_count_kv, key_length) and live `/api/ps` `size_vram`. The box state is volatile (models cold-load per request) — a single `/api/ps` snapshot is not the steady state. Full plan: `state/shared/specs/OLLAMA-AUTORUN-BUILDLOOP-PLAN-2026-06-09.md` (slot/bravo `822c48c55`).
