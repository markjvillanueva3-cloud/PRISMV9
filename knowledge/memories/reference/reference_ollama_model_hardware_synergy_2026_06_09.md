---
name: reference_ollama_model_hardware_synergy_2026_06_09
description: "VERIFIED — the ollama model set is correctly pulled + wired to the RTX PRO 6000 Blackwell (96GB VRAM) + 128GB RAM. Live offload defaults route to PULLED models post-BLACKWELL-MODEL-UPGRADE; only residue is CLAUDE.md doc-drift (still says qwen2.5-coder:7b, code uses :32b)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.678Z
aliases: reference_ollama_model_hardware_synergy_2026_06_09
---


**2026-06-09 (slot golf, synergy /goal — ollama surface verification).** The `/goal` names "make sure we pulled correct models relative to gpu, cpu, nve ssd and 128 gb of ram" + "synergize the new llm to tasks." Verified the ollama surface is correctly synergized — evidence below.

**Hardware (live `nvidia-smi` + goal spec):** GPU = **NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97887 MiB (~96GB) VRAM** (38675 used / 57925 free at probe). 128GB system RAM. NVMe SSD.

**Models pulled (live `/api/tags`, 10):** `gpt-oss:120b` 65.4GB MXFP4 · `qwen2.5-coder:32b` 19.9GB Q4_K_M · `gpt-oss:20b` 13.8GB · `llama3.2-vision:11b` 7.8GB · `qwen3-vl:8b-instruct` + `qwen3-vl:8b` 6.1GB · `qwen2.5vl:7b` 6.0GB · `moondream:1.8b` 1.7GB · `qwen2.5-coder:1.5b` 1.0GB · `nomic-embed-text:latest` 0.3GB. This is a HARDWARE-EXPLOITING set: the 65GB `gpt-oss:120b` fits the 96GB Blackwell (heavy synthesis); 32b coder; a full vision/OCR ensemble (qwen3-vl + qwen2.5vl + llama3.2-vision + moondream — the multi-VLM OCR consensus, see [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]]); nomic embeddings; small-fast 1.5b/moondream for cheap tasks.

**Synergy VERIFIED (the load-bearing check — task→model routing):** grepped ALL ollama model refs across `.claude/hooks` + `.claude/scripts` + `scripts/ask-ollama.mjs` + `scripts/lib` + `mcp-server/src`, then grepped specifically for ACTIVE default-assignments (`DEFAULT_MODEL=`, `defaultModel:`, `PREWARM_MODEL`, `|| "..."`) pointing at UN-PULLED models — **returned EMPTY.** The live defaults are all pulled+matched:
- `scripts/ask-ollama.mjs:65` `DEFAULT_MODEL = "qwen2.5-coder:32b"` (comment: "smallest KEPT model after the [Blackwell upgrade]"; synthesis path → `gpt-oss:120b` via `resolveSynthesisModel`).
- `scripts/fleet-reaper-sweep.mjs:255` `DEFAULT_OLLAMA_PREWARM_MODEL = "qwen2.5-coder:32b"` (NOT the `:7b` the docs still name).
The `BLACKWELL-MODEL-UPGRADE` (slot:alpha 2026-06-04, commits `619ef1634`/`0615b476d` — "11 .ts engine DEFAULT/env-fallback models retired" + "OllamaHookBridgeEngine defaultModel upgraded") was applied correctly: tasks route to the big Blackwell-resident models, not the retired 7b/3b.

**Why the high un-pulled ref counts are NOT a break:** `qwen2.5-coder:7b` (19 refs), `qwen3-vl:30b` (19), `deepseek-r1:14b` (11), `qwen2.5-coder:3b` (9), `qwen2.5vl:32b` (10), etc. appear in COMMENTS, fallback-candidate arrays, model-VARIANT lists, and stale doc text — none is a live default. A task is never routed to an un-pulled model.

**THE ONE RESIDUE (doc-drift) — LOCATED PRECISELY 2026-06-09 (corrects an earlier mislocation in this memory):** the stale **`qwen2.5-coder:7b`** appears **0× in the git-tracked project `H:/prism/CLAUDE.md`** (grep-verified) — it is ONLY in the **global playbook**: `C:/Users/wompu/.claude/CLAUDE.md` (×2) + its H: mirrors (`H:/.claude/CLAUDE.md`, `H:/prism/.claude/CLAUDE.md`). That global file is the OPERATOR'S PRIVATE instructions (c-to-h-mirror replicates C:→H:; editing an H: mirror directly creates C:/H: drift). So the high-value 7b→32b doc-sync is **genuinely operator/doc-owner territory — NOT a clean in-lane edit** (don't touch the user's private global; don't drift the mirror). The project file's only stale ollama ref is line 502's `qwen2.5-coder:3b` (describing what OLLAMA-EXPAND *shipped* 2026-05-15 — ambiguously historical vs current-state; live ask-ollama now uses 32b). Lesson: I had earlier claimed "both project AND global CLAUDE.md say 7b" — WRONG, the project file has 0×; verify the file before asserting which carries a drift. [[feedback_reflect_all_changes_post_update]], [[feedback_all_slots_free_access]].

**Verdict: ollama surface = WIRED + correct models PULLED for the hardware + VALIDATED (live grep of active defaults). Synergy sound.** Only open item is the CLAUDE.md model-name doc-drift. This RE-CONFIRMS the prior optimization held: [[reference_blackwell_ollama_utilization_optimize_2026_06_03]] (golf 06-03 ran a 6-agent `blackwell-model-fit-assessment` workflow + applied infra fixes for "get ollama and my rtx utilization optimized") — 6 days later the model set + active routing are still correct, no drift in the CODE (only the docs lagged). Related: [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]] (the vision ensemble that consumes the VL models), [[reference_tribal_index_v8_string_cap_2026_06_08]] (nomic-embed-text is the embedding model behind tribal/wiki RAG).
