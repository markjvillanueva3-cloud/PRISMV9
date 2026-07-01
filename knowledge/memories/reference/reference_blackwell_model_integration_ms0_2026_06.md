---
name: reference_blackwell_model_integration_ms0_2026_06
description: "BLACKWELL-MODEL-INTEGRATION-MS0 — wired gpt-oss:120b/20b + gemma4:31b across PRISM routing/octopus/catalog (install-gated, auto-activates on pull); shipped slot:alpha 2026-06-06."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.478Z
aliases: reference_blackwell_model_integration_ms0_2026_06
---


BLACKWELL-MODEL-INTEGRATION-MS0 (slot:alpha, 2026-06-06, branch cad-fusion-live-ms0). Integrates the new Blackwell local models (gpt-oss:120b BEST, gpt-oss:20b FAST, gemma4:31b CONSENSUS; qwen2.5-coder:32b floor) across PRISM. Everything **install-gated** — activates automatically as each model lands in `/api/tags`; no rewiring needed when the pull completes.

**Phase 0 — already wired (verify-only, no edits):** cost-router `TIER_PREFERENCES.best` + `BLACKWELL_CEILING.search_synthesis:"best"` (`.claude/hooks/lib/ollama-cost-router.mjs`), `resolveSynthesisModel` (`scripts/lib/host-aware-synthesis-model.mjs`), ask-ollama + galaxy-synthesis/meta/reflection scripts, `MultiModelConsensusEngine.resolveOllamaModels`. All install-gated + auto-promote. Verified green: cost-router 40/40, anti-revert 3/3. The "balanced→best" change was ALREADY shipped (line 124) — do not re-apply.

**Phase 1 — octopus diverse-panel (commit 0a86b1cf7d):** `MultiModelConsensusEngine.ts` — new `diverseLocalPanel`/`diverseLocalModels` ConsensusInput fields + exported `resolveDiverseOllamaPanel(requested, installed)` (install-gates each voice; vision/embed filtered via isEmbeddingOllamaModel/isVisionOllamaModel; all-absent→pickBestOllamaModel). `ask()` gates legacy dualOllama with `!diverseLocalPanel` + calls every Ollama voice SERIALLY (one Blackwell GPU serializes model loads — Promise.all thrashes VRAM). Default panel [gpt-oss:120b, gemma4:31b, qwen2.5-coder:32b] degrades to [32b] today, grows as pull lands. +12 reference-value tests; vitest 36/36.

**Phase 2 — catalog wiring (commit 348f97c0f8):** added gpt-oss:120b/20b + gemma4:31b to 4 routing engines, each runtime install-gated. ModelRoutingEngine: catalog entries at **FLOOR qualityTiers (<85)** — CRITICAL: `route()` is a pure scorer with NO `/api/tags` filter, so real tiers (88/91) would auto-route to the still-pulling 120b and cold-fail the dispatch; FLOOR keeps installed 32b the winner (promote via U-BW-CATALOG-REALIGN once `/api/tags` confirms). OllamaHookBridgeEngine: grep_index/mcp_route/general→gpt-oss:20b, install-gated via `cachedModels` (NOT `installedModels` — that field doesn't exist; null-cache→pass-through so the sub-500ms hook path never blocks on /api/tags). OllamaTaskOffloaderEngine: +3 OLLAMA_MODELS entries. AISystemRouterEngine (advisory-only): ml_inference `ollama-codellama`→`local-mcp`, drops stale `ollama-deepseek` fallback (enum left intact — still used by probe/healthReport). Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean. Also repaired 3 pre-existing red tests (stale 7b/14b from the 2026-06-04 retirement).

**PENDING / next:**
- **Phase 3 NIM/Docker — operator-gated.** NIM *client* fully wired (`.claude/hooks/lib/nim-hook-bridge.mjs`, 3-backend NIM→vLLM→Ollama cascade); `mcp-server/scripts/nim-docker-launcher.mjs` is feature-complete but needs `NGC_API_KEY` (operator: `setx NGC_API_KEY <key>`) + a running Docker daemon (currently NOT running). Next: wire the launcher into a SessionStart hook (graceful no-op without key/docker) + `docker run --gpus all --rm nvidia/cuda:12-runtime nvidia-smi` to confirm GPU passthrough.
- **Dead edges (low-pri follow-ups, enumeration-flagged):** system-viz `ghost.octopus_consensus` roost not yet seeded (`scripts/seed-ghost-nodes.mjs` doesn't read octopus-outcomes); PSN-leg feedback to octopus-corpus-loader is static; per-slot WeeklySynthesis pinning.
- **U-BW-CATALOG-REALIGN:** once gpt-oss:120b/gemma4:31b confirmed in `/api/tags`, promote ModelRoutingEngine FLOOR tiers to measured values + update vramGB/latency.

Pull discipline lesson: [[feedback_ollama_pull_monitoring_discipline]]. Plan source: `state/shared/specs/BLACKWELL-MODEL-UPGRADE-PLAN-2026-06-04.md` + enumeration workflow output. Kimi cloud verdict: [[reference_kimi_k26_ollama_cloud_free_verdict_2026_06]].
