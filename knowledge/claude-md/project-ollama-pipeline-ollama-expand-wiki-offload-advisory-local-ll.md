---
source: project
section: OLLAMA-PIPELINE + OLLAMA-EXPAND + WIKI-OFFLOAD-ADVISORY — local-LLM offload surface
slug: ollama-pipeline-ollama-expand-wiki-offload-advisory-local-ll
indexed_at: 2026-06-21T04:20:36.222Z
---

## OLLAMA-PIPELINE + OLLAMA-EXPAND + WIKI-OFFLOAD-ADVISORY — local-LLM offload surface

Three pipeline artifacts close the audit gap (offload ratio 13.8% → 30% target): `scripts/ollama-docker-health.mjs` CLI probe · `ollama-pipeline-injector.mjs` UserPromptSubmit hook (matches `/forge-audit`, `/rgs`, `/scrutinize`, `/dedup`, `/precompact`, `/deep-search`, `/pdf-learn`, `/close-out-audit`, `/forge-triple` → injects phase→model routing) · `ollama-prewarm-on-pipeline.mjs` (detached `/api/generate` warm-up). **OLLAMA-EXPAND** ships `scripts/ask-ollama.mjs` (modes: viz/rerank/summarize/explain/triage/ask; single warm qwen2.5-coder:32b + keep_alive; the :3b tag was retired 2026-06-04 Blackwell migration) + `ollama-prism-bridge.mjs` L2 agent-loop (3 read-only tools). **WIKI-OFFLOAD-ADVISORY** (HIGH-ROI-TOKEN-SAVINGS/U-WIKI-OFFLOAD-ADVISORY, slot:golf, 2026-05-20, commit `6853d35257`): `wiki-read-offload-advisory.mjs` PreToolUse:Read hook surfaces `/route-to-obsidian` for wiki entries ≥500 lines; bumps `ollama-offload-stats.json byHook.wiki-read-offload-advisory.suggested`. Knobs: `PRISM_OLLAMA_PIPELINE_INJECT`, `PRISM_OLLAMA_PREWARM_DISABLE`, `PRISM_WIKI_OFFLOAD_{ADVISORY_DISABLE,MIN_LINES,VERBOSE}`. Wiki: [[ollama-pipeline-ms0]] · [[ollama-expand-ms0]] · [[ollama-prism-bridge]]. Memory: [[reference_ollama_pipeline_ms0_2026_05_15]] · [[reference_ollama_expand_ms0]] · [[reference_ollama_prism_bridge_l2]].

<!-- merged into ## OLLAMA-PIPELINE + OLLAMA-EXPAND + WIKI-OFFLOAD-ADVISORY above -->
