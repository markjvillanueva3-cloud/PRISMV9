# cag + rag

## cag + rag

### Source articles the operator submitted (URL + 1-line each)
Verified against transcripts (`C:/Users/wompu/.claude/projects/H--*/`) and memory corpus. Of the 5 seed tweets, only 2 are traceable to the operator's submissions; the other 3 (avichawla + 3 akshay IDs) appear **nowhere** in transcripts/memory/wiki — they are research seeds, not operator-pasted (R12: stated honestly).

- **https://x.com/akshay_pachaar/status/2056714042455343160** — "RAG vs. CAG, clearly explained" (2026-05-19). THE topic anchor. Cited in transcripts (2 hits), `cag-router.md`, and `reference_articles_memory_cag_2026_05_26.md`. Thesis: cache static knowledge in the model's KV (CAG), retrieve only dynamic data (RAG), hybrid = both; Claude Code hits 92% prompt-cache hit-rate.
- **https://x.com/akshay_pachaar/status/2064051835636498924** — "Your Agent Harness Should Repair Itself" (Opik). Operator-pasted 2026-06-09 (`reference_agentic_harness_articles_2026_06_09.md`). Self-repair/observability, not core retrieval — adjacent.
- **https://x.com/dunik_7/status/2058905748579418615** — "Give Your Claude Agent a Memory: The 4 Layers" (2026-05-25). The CAG/RAG **companion** article, ingested alongside akshay's by slot india. Still marked UNFETCHED (X auth-gated) in `reference_cag_injectors_consume_2026_05_27.md`.
- Adjacent retrieval-architecture URLs the operator pasted (memory-architecture, not RAG/CAG core): **x.com/KSimback/status/2058262328496554021** (Hermes Agent Memory 7-gaps guidebook), **x.com/TheAhmadOsman/status/2058745340895870985** (LLM curriculum), **x.com/0xCodez/status/2062127385923776831** (Dynamic Workflows).
- Seed authors **NOT found** anywhere in operator's transcripts/memory/wiki: `_avichawla` (status 2063210446686146750) and akshay IDs `2054564519280804028`, `2058976178908885210`. Did not surface these — flagging as absent, not fabricating.

### Key techniques / claims (the actual ideas, terse bullets)
- **CAG vs RAG split** (akshay): every vector-DB hit for *static* info is wasted cost. CAG caches static knowledge in the model's KV / Anthropic prompt-cache; RAG retrieves *dynamic* data. Hybrid = static→cache, dynamic→retrieve. "Be selective — caching everything hits context limits." Foundational paper: Chan et al. 2024 *"Don't Do RAG: When Cache-Augmented Generation Is All You Need"*; also arxiv 2511.02919 *Cache Mechanism for Agent RAG Systems*.
- **COLD / HOT / HYBRID query routing**: classify the query *before* any retrieval fires. COLD = static doctrine answers it (skip live retrieval, serve from prompt-cache); HOT = live state (skip doctrine inject); HYBRID = both.
- **Two-stage retrieval** (recall → precision): cheap cosine/BM25 fetch of STAGE1_K candidates, then a careful second rerank narrowing to TOP_K. Cross-encoder rerank is too heavy for a per-prompt hook; lexical rerank (exact-phrase/coverage/title/density) is the pure-fn substitute.
- **Hybrid BM25 + dense + RRF** (Reciprocal Rank Fusion, k=60): normalizes heterogeneous score scales (BM25 tf-idf vs cosine 0..1 vs token-overlap) to a rank scalar; cross-substrate agreement = trust. Anthropic Contextual Retrieval reports ~35-49% fewer failed retrievals from hybrid+RRF.
- **4-layer agent memory** (dunik): sticky-note → project (instructions not history) → living memory file (lean+structured+filtered) → consolidator/"dreaming" (write to NEW file, review before swap). Write-time filter: *"would this change how the agent acts next time?"*
- **Baseline-first RAG eval**: precision@k / recall@k / MRR / mAP make every later RAG change measurable.
- **Embedding discipline**: nomic-embed-text 768-d, local/free, int8-quantizable (4× smaller); cosine for normalized vectors; never mix models in one index; cosine ≠ probability (0.85 relevant, 0.40 noise).

### How PRISM already applies this (cite engine/hook/skill/doctrine file paths — all verified to exist on disk)
**CAG stack (cold-vs-hot caching), shipped PSN-SYNERGIZE / CAG-* units 2026-05-26..27:**
- `scripts/lib/cag-router.mjs` (+`cag-router.test.mjs`, 39 tests) — pure-fn COLD/HOT/HYBRID classifier; 7-entry curated `COLD_SOURCES` registry (CLAUDE.md, MEMORY.md, ENGINE_DIGEST, DISPATCHER_DIGEST, physics constants, wiki index, tribal tips). Wiki: `H:/prism/knowledge/wiki/architecture/cag-router.md`.
- `.claude/hooks/cag-router-inject.mjs` (UserPromptSubmit) — producer: classifies prompt, writes `state/shared/cag-route/latest-<sid>.json`.
- `.claude/hooks/cag-cold-cache-anchor.mjs` (SessionStart) — catalogs cold doctrine once/session for Anthropic `cache_control:ephemeral` anchoring (5-min TTL).
- `.claude/hooks/cag-soul-cache-block.mjs` — soul-block dedup (skips unchanged slot-soul re-inject). NOTE per `reference_cag_injectors_consume_2026_05_27.md`: this one was still **unwired in settings.json** at ship time — verify before relying.
- `.claude/helpers/cag-consume.mjs` — `shouldSkip()` consumer, fail-OPEN on every defect, 30s staleness guard; wired into `master-index-precheck-inject.mjs`, `memory-relevance-inject.mjs`, `tribal-by-domain-inject.mjs`. Knobs: `PRISM_CAG_ROUTER_INJECT_DISABLE`, `PRISM_CAG_COLD_ANCHOR_DISABLE`, `PRISM_CAG_CONSUME_DISABLE`.
- Memory: `reference_cag_router_2026_05_26.md`, `reference_alpha_cag_cold_cache_anchor.md`, `reference_cag_injectors_consume_2026_05_27.md`. Wiki synthesis mapping article→audit-gap: `knowledge/wiki/architecture/article-synthesis-memory-cag-2026-05-26.md`.

**RAG stack (retrieval), shipped RAG-UPGRADE-MS0 (slot golf, 2026-05-22):**
- `scripts/embed-all-wiki.mjs` — U-RAG-1, embed clamp + skip-on-oversize backfill.
- `.claude/hooks/tribal-by-domain-inject.mjs` — U-RAG-2, two-stage retrieval: cosine recall (STAGE1_K) → `scripts/lib/lexical-rerank.mjs` precision rerank (TOP_K). 47 tests.
- `mcp-server/src/engines/RetrievalEvalEngine.ts` (+test) — U-RAG-5, precision@k/recall@k/MRR/mAP harness wired to `prism_dev` as `rag_eval_score`/`rag_eval_run`.
- `scripts/lib/memory-index-search-lib.mjs` — A6 (2026-05-29): hybrid BM25+dense(nomic)+RRF inside `runMemoryIndexSearch`, sync curl embed, strictly-additive fail-safe to BM25. Sidecar `state/shared/memory-embeddings-sidecar.json` (10,892 int8 768-d vectors). Knob `PRISM_MEMORY_HYBRID_DISABLE=1`. Memory: `reference_alpha_hybrid_memory_retrieval_a6_2026_05_29.md`.
- Tribal embed/rerank: `scripts/lib/load-tribal-index.mjs`, `.claude/scripts/tribal-rerank.mjs` (2× in-domain cosine boost). Wiki: `knowledge/wiki/code-tribal/embedding-and-rag-patterns.md` (the canonical 6-surface RAG map: tribal-index / wiki `_embeddings.jsonl` int8 / Qdrant memory-graph / BM25 leaf-index / system-graph text / MCP `semantic_search`+cohere-rerank).
- Hybrid 4-substrate fusion: `scripts/prism-hybrid.mjs` + `prism_session:hybrid_search` MCP action + `/hybrid` skill (RRF k=60 over memory/master-graph/episode/Qdrant). Doctrine: `feedback_when_to_use_hybrid_retrieval.md`.
- Domain RAG engines (exist, wired): `ppgragdialectmatchengine`, `sfcragwarmstartengine`, `wikiragfeatureengine`, `camtribalragengine`, `blueprintextractionragengine`, `jmdieprogramragengine`, `ideablockragengine`, `inferenceloragateengine` (per wiki `architecture/engines/`).

**Doctrine layer:** `feedback_obsidian_low_token_2nd_brain_protocol.md`, `feedback_domains_own_ai_training_systems.md`; CLAUDE.md §"Embedding + RAG Patterns" / §NN-GRAPH (GraphSAGE tier-5 reads `node-embeddings-768d.jsonl`).

### Gaps / highest-ROI opportunities to ingest more deeply
1. **The akshay/Chan CAG cache_control wiring is the biggest open lever.** `PromptCachingEngine` (AGENT-MS5 U-AGT19, 28 tests) wraps Anthropic `cache_control` + break-even, but the 8 per-turn injectors **do not call `buildCachedSystem()`** — they still re-emit static doctrine every turn, churning the message-level cache. Audit findings F1 (move static→SessionStart) + F6 (cache-hit-rate telemetry) remain **open**; closing them targets Claude Code's cited 92% hit-rate. This is wiring, not building (R8). Source: `article-synthesis-memory-cag-2026-05-26.md`, `reference_articles_memory_cag_2026_05_26.md`.
2. **CAG-skip telemetry missing** — the 3 CAG consumers increment their feature counter *after* the skip return, so CAG-skipped fires read as 0-fire in the utilization dashboard (candidate `U-CAG-SKIP-TELEMETRY`). No way to MEASURE actual cold-hit rate today.
3. **`cag-soul-cache-block.mjs` unwired** in settings.json despite its header claiming SessionStart wiring — a one-line bundle insertion closes it.
4. **Deeper-ingest candidates not yet fetched/synthesized:** the dunik_7 4-layer-memory tweet (2058905748579418615) is still UNFETCHED; the operator now has the **fxtwitter embed API** (`https://api.fxtwitter.com/<user>/status/<id>`) workaround proven in `reference_agentic_harness_articles_2026_06_09.md` — use it to finally capture dunik + the 3 missing akshay tweets + the avichawla seed. The avichawla and 3 akshay seed articles named in this task are **genuinely absent** from the corpus and would be net-new ingestion.
5. **Layer-4 consolidation safety-gate unverified** — dunik's "write to NEW file, review before swap" rule: `stop-obsidian-memory-feed.mjs` writes auto-feed in place; needs `<file>.new.md` staging + review advisory (mistake #4 risk).
6. **Cross-encoder rerank ceiling** — current per-hook rerank is pure-lexical (safe but lossy); the MCP `semantic_search` path has cohere-rerank-v2 but it's only on explicit operator queries. Reranker-in-the-hot-path is gated by latency budget — a Blackwell-local rerank model would unblock it.