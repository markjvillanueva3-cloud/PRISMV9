# BLACKWELL qwen3 SYNC — INVESTIGATION BRIEF (slot golf, 2026-06-03)

> Source: Workflow `wf_ba53bcc8-f49` (`blackwell-sync-investigate`) — 5 parallel read-only recon agents + 1 synthesis (6 agents, 947K subagent tokens, 114 tool-uses, ~27 min). Run while the qwen3 pull was in flight ("investigate while we wait").
> Companion: [[LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03]] (the prior deep-research blueprint). This brief is the ACTION layer; the blueprint is the design layer.
> **VERIFIED** = an agent directly probed it; **INFERRED** = reasoned / another slot owns it. Pull-gated = wait for `/api/tags` presence.

## golf independent verification (post-synthesis, R8/R12)
- `f737e23661` exists = the qwen3 catalog commit (5 FLOOR ModelSpec entries in `ModelRoutingEngine.ts`).
- `grep -c qwen3` → **src=7, dist/index.js=0** → catalog is NOT compiled. **D1 premise CONFIRMED.**
- mtimes: `dist/index.js`=2026-06-03 **12:56**, `src/.../ModelRoutingEngine.ts`=2026-06-03 **13:27** → dist built 31 min BEFORE the catalog landed. (The synthesis said "dist 05-24" — wrong DATE, correct CONCLUSION. Corrected here.)

---

## 0. STATE SNAPSHOT (VERIFIED)

| Fact | Value |
|---|---|
| Resident now | `qwen2.5-coder:7b` + `nomic-embed-text` (+ `qwen3-vl:8b`/`:8b-instruct` on disk) |
| 5 targets present? | **NO** — coder:30b-a3b, next:80b-a3b, embedding:8b, dengcao/Qwen3-Reranker-4B, vl:30b all absent |
| Pull status | embedding:8b first layer ~11-12% of 2.9GB, 280KB–1.5MB/s, full ~106GB far off |
| Catalog `f737e23661` | 5 qwen3 FLOOR specs in src, +52 test, 0 routing change (R13-safe) — **NOT in dist** until D1 |
| GPU | RTX PRO 6000 Blackwell, 97887 MiB |
| MCP server | running pre-catalog dist — blind to qwen3 catalog + new Obsidian env until rebuilt+restarted (D1) |

## 1. PULL-SPEED VERDICT (VERIFIED)
**Root cause = degraded local egress (ISP/modem/Wi-Fi), NOT ollama/Cloudflare/disk/config.** Proof: unrelated CDNs slow too (CacheFly ~1.2MB/s, GitHub ~39KB/s), DNS 2–4s w/ timeouts, ollama log says "find a faster connection" (103 EOF/stall events). 16-way chunking + concurrent inference amplify. H: ruled out (local 4TB NTFS, 2.28TB free). Same registry gave ~28MB/s earlier → **transient**.
**ACTION: TRIM TO KEYSTONES** — embedding:8b (8GB) + coder:30b-a3b (20GB) FIRST (~28-40GB vs 106GB). They unblock the two highest-leverage tiers. Defer next:80b (42GB), vl:30b (20GB), reranker (4GB) until link recovers. (The live detached driver ALREADY front-loads embedding→coder, so it's correctly ordered — just don't wait for the full stack.) ollama resumes partial blobs — interrupting loses nothing.

## 2. DO-NOW ACTION LIST (pull-independent, dependency order)
| # | Action | File:line | Change | Owner | Status |
|---|---|---|---|---|---|
| **D1** | Rebuild dist + restart MCP (KEYSTONE) | `mcp-server/` | `npm run build`, restart; verify `grep -c qwen3 dist` >0 + `home_blackwell` >0 | golf | **IN PROGRESS this session** |
| **D2** | NIM GPU regex Blackwell-blind → over-conservative profile | `H:/Tools/nim/start.ps1:60` | add `\|RTX PRO 6000\|Blackwell\|PRO 6000` to `4080\|4090\|5080\|5090` | golf | staged |
| **D3** | Re-arm dormant consensus drain (50 queued, octopus auto-fire dead ~12d) | `.claude/scripts/consensus-queue-drain.mjs` | recurring drain trigger; verify processed.jsonl advances. **depends on D1** | golf | staged |
| **D4** | ollama env (blueprint §0.2) | ollama service env | `OLLAMA_MAX_LOADED_MODELS=4`, `KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`. **Don't restart ollama mid-pull** | golf | staged (post-pull) |
| **D5** | Presence-gate (ADDITIVE, back-compat) — BEFORE any tier promotion | `ModelRoutingEngine.ts` RoutingContext ~:96 + `canServe()` ~:626 | `installedOllamaModels?: ReadonlySet<string>`; ollama-backend disqualify when set given & id absent; absent set = assume-present | golf | staged (next unit) |
| **D6** | hook-bridge per-model gate (degrade to qwen2.5-coder:7b) | `.claude/hooks/lib/ollama-hook-bridge.mjs` ~:40 + :121 | `getInstalledModels()`/`isModelAvailable()` (`/api/tags`, 60s cache) + presence-gated promote; no-op until qwen3-coder present | golf | staged (next unit) |
| **D7** | consensus context bump (no model dep, no OOM) | `MultiModelConsensusEngine.ts:194` | `ollama …?? 24_000` → `131_072` | golf | staged (next unit) |
| **D8** | NIM larger-model (Blackwell fits 8b/11b that OOM'd on 16GB) | `compose/rtx4080.yml:60,:91` | remove `profiles:["oversized-gpu"]`; `NIM_MAX_MODEL_LEN: 131072` on 8b+11b (NIM_GPU_MEMORY_UTILIZATION ignored by :latest) | golf | staged |
| **D9** | Kimi K2.6 CLOUD (NO local pull — 247GB) | env only | `MOONSHOT_API_KEY`+`PRISM_MOONSHOT_MODEL=kimi-k2.6`, or NIM cloud `MOONSHOT_BASE_URL=https://integrate.api.nvidia.com/v1`. Reuses `MoonshotClientEngine`+`moonshot_invoke`, fails loud | golf/bravo | staged |

**Critical chain:** D1 first (dist-side gates on it, incl. D3). **D5 before any tier-promotion edit.** D6/D7 self-contained safe-degrade.

## 3. PULL-GATED APPLY QUEUE (apply WHEN each model lands)
| Order | Edit | File:line | Presence-guard | Unblocked by |
|---|---|---|---|---|
| P1 | hook-bridge reasoning-promote default ON | `ollama-hook-bridge.mjs` (D6 ships gate) | `isModelAvailable('qwen3-coder:30b-a3b')` | coder:30b |
| P2 | TS hook-bridge `defaultModel`→qwen3-coder | `OllamaHookBridgeEngine.ts:84` | D5 presence path | coder:30b |
| P3 | Task-offloader +qwen3-coder, latency 15000→3500 | `OllamaTaskOffloaderEngine.ts:62-91,:80` | **MUST add /api/tags gate first** (none today) | coder:30b |
| P4 | Context-floor default→qwen3-coder | `OllamaContextFloorEngine.ts:66` | D5 path | coder:30b |
| P5 | Backend-router local ceiling 32000→131072 | `BackendRouterEngine.ts:91,:88` | qwen3 long-ctx present | coder:30b/next:80b |
| P6 | Consensus model flip behind env knobs | `MultiModelConsensusEngine.ts:163,:168` | `PRISM_CONSENSUS_OLLAMA_PRIMARY/_SECONDARY` (default deepseek/qwen2.5 until tags) | next:80b+coder:30b |
| P7 | Consensus de-OOM (parallel Promise.all) | `MultiModelConsensusEngine.ts:259-272` | safe on 96GB; pairs w/ P6 | next:80b+coder:30b |
| P8 | U-BW-CATALOG-REALIGN: FLOOR→true tiers + vramGB | `ModelRoutingEngine.ts:202-264` | **D5 gate MUST be live** (codeTier 88 vs 32b 90 = 2pt) | all 5 |
| P9 | Reranker = ADAPTER over existing `rag-llm-rerank.mjs`, NOT a 3rd | set `PRISM_RAG_LLM_RERANK_MODEL=dengcao/Qwen3-Reranker-4B:Q5_K_M` OR thin adapter | `isRerankerAvailable()` exact tag incl `dengcao/` | reranker |
| P10 | Embedder staged re-index → NEW index + atomic re-point 10+ consumers + dim/schema bump | `tribal-graph-embedding.mjs:19,:20` | **NEVER live-flip**; loadCheckpoint guards fail loud; india | embedding:8b |
| P11 | GNN node-text pre-pass (synth desc→embed) + re-eval | `graph-node-embedding-bridge.mjs ~:552` | downstream of P10 | coder:30b+embedding:8b |

**Model → unblocks:** coder:30b → P1-P5,P8 · next:80b → P6,P7,P8 · embedding:8b → P10,P11 (highest cascade) · reranker → P9 · vl:30b → vision (lowest).

## 4. SYNERGY MAP
| Substrate | Seam | qwen3-leverage | Owner | Pull-gated? |
|---|---|---|---|---|
| Octopus | `MultiModelConsensusEngine.ts:163/168/194/259-272`; `aiReasoningDispatcher.ts:2865 consensus_decide` | primary→next:80b, secondary→coder:30b, ctx→131072, de-OOM, +Kimi cloud escalation | golf | P6/P7 yes; ctx+drain no |
| RAG/CAG | `cag-router.mjs` (model-agnostic), dense `tribal-graph-embedding.mjs:19`; NO 2nd-stage reranker today (`TribalRAGEngine.ts:327-373` BM25) | embed→qwen3-embedding (staged); reranker adapter over top-100 → 6 RAG engines; COLD-tier in next:80b | india(re-index), golf(adapter) | yes |
| NN/GNN (#10) | `NN-EVAL.json` AUROC 0.5 constant-vote degenerate, holdoutN 62; reader `classifyGnn` | coder:30b synth node desc → embedding:8b embeds (fix frozen-feature collapse) → re-seed refpool + re-eval | **india** | yes |
| Obsidian | `settings.json PRISM_OBSIDIAN_API_KEY/_URL` (verified 200, C:/H: mirrored) | none; consumes octopus/RAG. Live on D1 restart | golf | no |
| Hermes/Zulu | consumes `consensus_decide` + Kimi escalation | Kimi as NIM-cloud escalation voice only | bravo | cloud-gated |
| prism-os/routers | `OllamaTaskOffloaderEngine.ts:62-91`, `BackendRouterEngine.ts:91`, `OllamaContextFloorEngine.ts:66`, `AISystemRouterEngine.ts:139-141` | swap defaults→coder:30b; offload take-rate 11%→30% | golf | yes |

## 5. CONFLICTS / CORRECTIONS
- **C1** Handoff "rtx3080.yml nonexistent" → **WRONG**: it exists (10GB Ampere). Failure = wrong/over-conservative profile, not crash.
- **C2** Blueprint "Kimi as 3rd consensus voice" stated current → **FUTURE**: vendor union (:133 `anthropic|openai|ollama|xai|google`) excludes Kimi; reached only via `moonshot_invoke` tentacle (`aiReasoningDispatcher.ts:2817`).
- **C3** "Build new qwen3 reranker" → **R8 DEDUP**: `rag-llm-rerank.mjs` (LLM, DI'd model) + `ReRankerEngine.ts` (pure-JS) already exist. Adapter or env only. Do NOT create a 3rd.
- **C4** `U-NN-TRAINER-EXPORT-RESTORE` → **STALE** (exports present, 154/154 pass, resolved 2026-06-02). No action.
- **C5** Catalog "live on restart" → needs `npm run build` THEN restart (today's restart was on pre-catalog dist).
- **C6** rabitq HARVEST "wired" → NOT in live code (doctrine + profile-selector citation only). 96GB removes its motivation → low priority.
- **C7** embed dim: Report-5 "keep 768 MRL-truncate" vs Report-2 "1024 breaking" → **CONFLICT**. qwen3-embedding:8b native=1024; MRL can truncate to 768. Either way: NEW index + dim/schema bump + atomic re-point, never live-flip. india decides 768-vs-1024 at re-index.
- **C8** NIM 3b "starting" → now **"unhealthy"** (regression). `NIM_FALLBACK_TO_OLLAMA=1` keeps it non-blocking; flag it.

## 6. TOP 3 RISKS
1. **Tier-promotion before presence-gate → routes to absent models (P8/P3).** qwen3-coder codeTier 88 vs qwen2.5-coder:32b 90 = 2pt margin; without D5's gate, `route()` returns an unpulled model → code routes 404. **The FLOOR tiers (`f737e23661`) are the ONLY thing preventing this today. Ship D5 first; add the same gate to `OllamaTaskOffloaderEngine` (P3).**
2. **Embedder live-flip = silent garbage retrieval fleet-wide.** Flipping dim 768→1024 against the ~200MB nomic index (14.7K vectors) throws RangeError or returns garbage; cascades into GNN + NN trainer. **Staged india re-index to a NEW file + atomic re-point + schema bump in one commit; loadCheckpoint guards are the fail-loud net — never bypass.**
3. **VRAM contention at full stack (96GB ceiling).** resident-A (~51GB) + next:80b (42GB) = ~93GB > 88GB safe. **next:80b on vLLM time-slice OR ollama swap-in; never both co-resident. Keystone-trim (embedding+coder ≈40GB) sidesteps until link recovers.**
