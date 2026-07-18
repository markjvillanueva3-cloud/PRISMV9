# PRISM LOCAL-LLM INTEGRATION BLUEPRINT — kimi2.6 + qwen3 on RTX PRO 6000 Blackwell (96GB)

**Generated:** 2026-06-03 · slot:golf · deep-research workflow `wf_197110bb-e66` (8 agents: 3 ground [web+code] → 4 subsystem research → synthesis). Advisory; build from this with per-file + 3-of-3 scrutiny. Verify every `ollama pull` manifest + every file:line before editing.

> ⚠️ **LIVE-CODE CORRECTIONS (golf, 2026-06-03, R8 read-before-write — verify code, not the recon):**
> 1. `ModelRoutingEngine.ts:44` ALREADY has `home_blackwell` in the HardwareProfile enum + a Blackwell catalog tier (qwen2.5-coder:32b/deepseek-r1:14b/qwen3-vl:8b on `home_blackwell`, added by a peer BLACKWELL-GPU-SWAP commit). The recon's "enum is stale, add `blackwell_96`" claim was WRONG — **use `home_blackwell`; do NOT add `blackwell_96` (it would duplicate).** TIER 0.1 enum step = ALREADY DONE.
> 2. TIER-0 catalog work = ADD the 5 NEW qwen3 models (qwen3-coder:30b-a3b, qwen3-embedding:8b, qwen3-reranker-4b, qwen3-next:80b-a3b, qwen3-vl:30b) AFTER pulls land — `qualityTier < 85` (safety invariant at ModelRoutingEngine.ts:131-134), real `vramGB` from `/api/tags`, `runsOn:["home_blackwell"]`.
> 3. Nearly ALL wiring gates on the ~106GB pull completing (bg). Runtime DEFAULT swaps (hook-bridge, octopus) must NOT point at a model before it is pulled (R13 — no consumer atop an unpulled dependency).
> 4. **SHIPPED `f737e23661` (3-of-3 PASS):** the 5 qwen3 models are now in `ModelRoutingEngine.ts` DEFAULT_MODEL_CATALOG as CONSERVATIVE FLOOR declarations (qwen3-coder 60/65, qwen3-next 62, qwen3-embedding 58, reranker 55, vl:30b 60) + 5 behavioral route() tests (50/50). They do NOT change default routing. **U-BW-CATALOG-REALIGN caveat (scrutiny arm C, P1):** ModelRoutingEngine has NO `/api/tags` presence gate — when realign promotes these to true tiers (coder ~88, next ~84, embedding ~70), it MUST either add a real presence check OR keep tiers below the proven defaults, because true codeTier 88 vs qwen2.5-coder:32b's 90 is only a 2-pt margin (a later adaptive-latency patch could flip the code default to a model that may not be resident). Embedder promotion stays gated on india's corpus re-embed regardless.

## 1. MODEL-ROLE MATRIX
| Model | Quant/size | Fits 96GB? | PRISM role(s) | Serve |
|---|---|---|---|---|
| **kimi2.6 (Kimi K2.6)** | ~247GB min (UD-TQ1_0) | **BLOCKED** (needs 256GB+ RAM, <2 tok/s) | deep-agentic orchestration (Hermes/Zulu), agentic-RAG, octopus ESCALATION voice only | **CLOUD** — Moonshot API or NIM `moonshotai/kimi-k2.6`. Local fallback: qwen3-coder-next 80B |
| **qwen3-coder:30b-a3b** Q8 | ~32GB | YES (resident) | mechanical-offload WORKHORSE (docstring/summarize/classify/lint/diff/G-code) · HyDE-draft · RAPTOR-leaf · system-viz narration · GNN rich-node-text · octopus secondary | Ollama |
| **qwen3-next:80b-a3b-instruct** Q4_K_M | ~42GB | YES (swap-in) | heavy reasoning · octopus PRIMARY · 256K long-ctx synthesis · local CAG host · injection/CLAUDE.md draft · RAPTOR upper-tree | vLLM (pref) or Ollama swap-in |
| **qwen3-embedding:8b** Q8 768-d MRL | ~8GB | YES (resident) | RAG/CAG/tribal/wiki/memory embeddings · GNN node features · NN trainer input (single source) | Ollama /api/embed |
| **dengcao/Qwen3-Reranker-4B** Q5_K_M | ~4GB | YES (resident) | NEW 2nd-stage rerank over top-100 dense (PRISM has none today) | Ollama |
| **qwen3-vl:8b** (installed) / **:30b** | ~7 / ~20GB | YES | blueprint/CAD OCR · visual-coding · image viz nodes | Ollama |
| qwen2.5-coder:32b/7b (existing) | ~20/5GB | YES | LEGACY offload fallback (superseded by qwen3-coder:30b-a3b) | Ollama |
| deepseek-r1:14b (existing) | ~9GB | YES | LEGACY octopus fallback | Ollama |
| nomic-embed-text (existing) | ~2GB | YES | LEGACY embedder — keep live until re-embed verified, then fallback | Ollama |
| qwen3-coder:480b-a35b · 235b-a22b · vl:235b | 120-250GB | **BLOCKED** | not needed; cloud tags if ever | Cloud/NIM |

## 2. VRAM BUDGET (soft ceiling ~88GB, ≥8GB headroom)
**RESIDENT-A (~51GB, ~45GB free):** qwen3-coder:30b-a3b Q8 (32) + qwen3-embedding:8b (8) + qwen3-reranker-4b Q5 (4) + qwen3-vl:8b Q4 (7).
**LOAD-ON-DEMAND:** qwen3-next:80b-a3b Q4 (42) · qwen3-vl:30b (20) · deepseek-r1:14b (9).
**CONTENTION FLAG:** 80B (42) + full RESIDENT-A (51) = ~93GB > 88 ceiling w/ KV. Resolve: (a) run 80B on vLLM (time-slices) keeping Ollama resident; OR (b) 80B as Ollama swap-in + drop vl:8b to on-demand (→44GB). NEVER both. Octopus dual-voice (80B+coder30b ≈74GB) fine standalone, evict embed/rerank/vl during octopus runs.

## 3. PER-SUBSYSTEM WIRING (dependency order)
### TIER 0 — SERVING FOUNDATION
- **0.1 (lowest-risk foundation edit):** `mcp-server/src/engines/ModelRoutingEngine.ts:43` HardwareProfile enum `home_4080|work_3080|cloud_only` → add `"blackwell_96"`. Then `:121` DEFAULT_MODEL_CATALOG add qwen3-coder:30b-a3b (vramGB 32), qwen3-embedding:8b (8, tags [embed]), qwen3-vl:8b (7), qwen3-next:80b-a3b (42), all `runsOn:["blackwell_96"]`. Verify: `isModelEligible` (:469) admits blackwell_96 model that home_4080 rejects (unit test both).
- **0.2 Ollama env:** OLLAMA_KEEP_ALIVE=-1, OLLAMA_MAX_LOADED_MODELS=4, OLLAMA_GPU_OVERHEAD=0, OLLAMA_FLASH_ATTENTION=1. Verify `/api/ps` keeps 4 warm.
- **0.3 (only if 80B on vLLM):** new `docker-compose.local-llm.yml` vLLM `vllm-qwen3next` on 8020:8000 (matches local-llm-bridge.mjs:113) `--model Qwen/Qwen3-Next-80B-A3B-Instruct --quantization fp8 --max-model-len 262144 --gpu-memory-utilization 0.45`.

### TIER 1 — EMBEDDINGS / RAG / CAG
- **1.1 (HIGHEST-LEVERAGE, STAGED):** `scripts/lib/tribal-graph-embedding.mjs:19` DEFAULT_MODEL nomic-embed-text → qwen3-embedding:8b. Keep `:20 EMBEDDING_DIM=768` (MRL-truncate). Cascades to GNN (`graph-node-embedding-bridge.mjs:552`) + NN trainer. **BLAST-RADIUS — batch, not hot edit:** pull → re-embed to NEW index → verify recall@10 ≥ nomic on holdout → atomic-swap → re-run node-embedding-bridge + graphsage-trainer. Live flip = stale vs new vectors = silent garbage retrieval.
- **1.2 NEW reranker:** new `scripts/lib/qwen3-rerank.mjs` shared helper → TribalRAGEngine.ts (~:230/:322) + CAMTribalRAGEngine + WikiRAGFeatureEngine + JMDieProgramRAGEngine + BlueprintExtractionRAGEngine + SFCRAGWarmStartEngine (ONE helper — avoid N-divergent drift, R7). GOTCHA: Ollama reranker needs manual `<|endoftext|>` + normalization; fail-loud score-spread assert.
- **1.3 hook offload chokepoint:** `.claude/hooks/lib/ollama-hook-bridge.mjs:16` DEFAULT_MODEL qwen2.5-coder:7b → qwen3-coder:30b-a3b; update HOOK_MODELS :19; `ollama-cost-router.mjs` add as default code tier.
- **1.4 CAG host (optional):** cag-router.mjs is model-agnostic (no edit); host cold-tier in qwen3-next:80b 256K ctx via octopus voice.

### TIER 2 — KNOWLEDGE / INJECTION / CLAUDE.md / GSD
- **2.1:** memory/wiki/tribal maintenance ride the 1.3 chokepoint → qwen3-coder:30b-a3b (≥70% Ollama-owned). Contradiction-resolution/schema stays Claude.
- **2.2 injection/CLAUDE.md/GSD drafts:** `.claude/hooks/lib/prompt-rewriter-ollama.mjs:83` MODEL_PREFERENCE reorder → [qwen3-coder:30b-a3b, qwen2.5-coder:32b, ...]; 80B-Next for genuine draft-synthesis; Claude owns final.
- **2.3 NIM tiny tier + Kimi-cloud door:** nim-hook-bridge.mjs:24 keep llama-3.1-8b default (sub-sec classify); add Kimi as NIM-cloud catalog entry consumed by hermes ONLY (not per-hook). :139 404→degrade already protects.

### TIER 3 — REASONING / OCTOPUS / GNN / SYSTEM-VIZ
- **3.1 octopus dual local voices:** `MultiModelConsensusEngine.ts:163` DEFAULT_OLLAMA_MODEL deepseek-r1:14b → qwen3-next:80b-a3b-instruct; `:168` secondary qwen2.5-coder:14b → qwen3-coder:30b-a3b; delete :164-167 OOM comment; `:194` budgets.ollama 24000→131072. Kimi as 3rd escalation voice via vendor union :133. Verify both voices parallel, no HTTP 500, ~74GB peak.
- **3.2 GNN feature-collapse fix (AUROC 0.5):** root cause `graphsage-trainer.mjs:404` features frozen → features are the only lever. Stage 1: NEW pre-pass in graph-node-embedding-bridge.mjs upstream of :552 — qwen3-coder:30b-a3b emits 2-4 sentence functional node description, embed THAT. Stage 2: qwen3-embedding:8b (Step 1.1). Then re-seed ≥2-ref-pool holdout → re-eval classifyGnn (reads metrics.auroc). Owner coordination: india.
- **3.3 system-viz narration:** ollama-hook-bridge.mjs add `system_viz_narrate` → qwen3-coder:30b-a3b (per-roost 1-2 line); cross-galaxy Q&A → 80B; image nodes → qwen3-vl. FLAG: per-roost ONLY, NEVER feed the 548MB graph to any model.

## 4. BLOCKERS
1. kimi2.6 247GB+ → cloud only (Moonshot API / NIM moonshotai/kimi-k2.6). DO NOT pull locally.
2. qwen3-reranker-4b is community ns: `dengcao/Qwen3-Reranker-4B:Q5_K_M`. `<|endoftext|>`/normalize gotcha.
3. qwen3-next:80b Q8 (~85GB) starves KV → use Q4_K_M (~42GB).
4. embedder swap = corpus-wide blast radius (re-index batch, keep nomic live until verified).
5. VRAM: full RESIDENT-A + vLLM-80B = ~94GB > 88; never both.
6. 480B/235B blocked → cloud.
7. verify each `ollama pull` manifest before wiring (ollama v0.30.3 ok).

## 5. HIGHEST-LEVERAGE FIRST MOVE
Adopt qwen3-embedding:8b @768-d (`tribal-graph-embedding.mjs:19`) — cascades to RAG + GNN + NN; half the GNN-collapse fix; multilingual (JM Polish/Spanish floor) where nomic underperforms; dim stays 768 (zero downstream shape change). Execute as the staged re-index (decision = high-leverage; execution = controlled batch). Zero-risk warm-up: the `blackwell_96` enum edit (ModelRoutingEngine.ts:43, no corpus blast radius).

## 6. PULL TONIGHT (fit 96GB + reachable; kimi excluded)
```
ollama pull qwen3-coder:30b-a3b                  # ~32GB Q8 — offload workhorse
ollama pull qwen3-embedding:8b                    # ~8GB — RAG/GNN/NN embedder 768-d MRL
ollama pull dengcao/Qwen3-Reranker-4B:Q5_K_M      # ~4GB — NEW 2nd-stage reranker
ollama pull qwen3-vl:30b                          # ~20GB — hard blueprint OCR (have :8b)
ollama pull qwen3-next:80b-a3b-instruct-q4_K_M    # ~42GB — reasoning/octopus/CAG swap-in
```
Already present: qwen3-vl:8b, qwen2.5-coder 7b/14b/32b, deepseek-r1:14b, nomic-embed-text.
