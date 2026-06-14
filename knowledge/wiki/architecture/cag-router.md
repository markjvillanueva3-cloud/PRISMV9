---
name: cag-router
category: architecture
domain: backend-dev
tags: [cag, cache-augmented-generation, rag, prompt-cache, query-routing, token-economy]
last_invoked: 2026-05-26
last_updated: 2026-05-26
status: implemented
ms: PSN-SYNERGIZE
unit: U-CAG-ROUTER-PURE-FN
---

# CAG-Router — Cache-Augmented Generation query classifier

PRISM auto-injects ~92KB of static doctrine (CLAUDE.md + MEMORY.md + ENGINE_DIGEST.md + DISPATCHER_DIGEST.md) on **every** UserPromptSubmit, plus master-index + wiki + tribal + memory injections behind keyword gates. The cost compounds on every chat and every /loop iteration.

CAG-router classifies the user's query before any injection fires and tells the downstream hook whether the doctrine layer is needed at all. Inspired by [akshay_pachaar's RAG-vs-CAG tweet](https://x.com/akshay_pachaar/status/2056714042455343160) (2026-05-19) and the foundational paper *"Don't Do RAG: When Cache-Augmented Generation is All You Need"* (Chan et al., 2024).

## The classification

| Tier | Meaning | Sources |
|------|---------|---------|
| **COLD** | Static doctrine answers the query. Skip live retrieval. | CLAUDE.md, MEMORY.md, ENGINE_DIGEST.md, DISPATCHER_DIGEST.md, physics constants, wiki index, tribal tips |
| **HOT** | Live state answers the query. Skip doctrine inject. | chat-slots.json, slot-task-claims.json, BUILD_STATE.json, MILESTONE_PROGRESS.json, AGENT_CHAT.jsonl, git log, qdrant |
| **HYBRID** | Both layers needed. Prepend cold slice, then hit hot sources. | Both |

## Why this matters

- **Token economy**: cold-only queries can be served entirely from prompt-cache when the doctrine block is wrapped in `cache_control: ephemeral` — Anthropic API hit-rate goes up, every chat after the first /compact pays nothing for the same 92KB.
- **Latency**: hot queries skip the master-index + RAG + tribal-by-domain inject chain (~400ms saved per call).
- **Reliability**: akshay's caveat — "if you cache everything, you'll hit context limits" — is solved by the COLD_SOURCES registry being curated, not auto-expanded.

## Library

`scripts/lib/cag-router.mjs` — pure-fn, 0 I/O, sub-millisecond classification on typical queries. Composes with `scripts/lib/master-index-search-lib.mjs` (same keyword vocabulary).

```javascript
import { classifyQuery, summarize, estimateSavings } from "scripts/lib/cag-router.mjs";

const result = classifyQuery("what does CLAUDE.md say about the scrutiny gate?");
// { tier: "COLD", confidence: 0.4, coldSources: ["H:/prism/CLAUDE.md"], hotSources: [], ... }

summarize(result);
// "CAG-route: COLD (conf 40%) → H:/prism/CLAUDE.md"

estimateSavings(result);
// { estimatedTokensSaved: 12000, estimatedLatencyMsSaved: 400, rationale: "..." }
```

## Tier resolution rules

1. **Hybrid markers force HYBRID** — phrases like "applied to", "per the doctrine", "wiki says" always engage both layers.
2. **Both-tier non-zero forces HYBRID** — if any cold AND any hot keyword fire, the query needs both.
3. **Zero-zero forces HYBRID with low confidence** — fail loud per R12; caller falls back to existing PRISM behavior.
4. **Winner-take-all otherwise** — pure-cold or pure-hot.

The previous explicit tie-break branch (`coldScore === hotScore`) was unreachable in production (caught by rule 2 or 3) and was removed per reviewer P2 finding 2026-05-26.

## Cold-source registry — curation discipline

Each `COLD_SOURCES` entry has a `coldRationale` field explaining why the source is stable enough to cache. **Add deliberately** — every entry costs context budget on every cold-hit query.

Current registry (7 entries): `claude-md`, `memory-md`, `engine-digest`, `dispatcher-digest`, `physics-constants`, `wiki-index`, `tribal-tips`.

## Latency bound

`MAX_QUERY_BYTES = 64KB`. Queries above the cap are truncated (head preserved, evidence cites the truncation) so worst-case classification stays well under the UserPromptSubmit hook budget (~100ms). Without the cap, a 10MB query measured ~2.8s.

## What CAG-router is NOT

- Not an **output cache** — `output_cache_*` actions in `prism_dev` handle response-side caching of expensive computations. CAG-router is input-side query classification.
- Not an **embed cache** — `cad_embed_cache_clear`, `cam_cache_clear` etc. cache embedding lookups. CAG-router operates one layer up, deciding whether to compute embeddings at all.
- Not an **AI system router** — `aiSystemRouterEngine.route()` (ai-system-router-inject) decides Claude vs Ollama for a *task*. CAG-router decides cold-vs-hot for a *query*.

## Wiring (follow-up units)

- **U-CAG-HOOK-INJECT** — UserPromptSubmit hook calls `classifyQuery(prompt)`; on COLD-tier high-confidence, sets `PRISM_SKIP_MASTER_INDEX_INJECT=1` and `PRISM_SKIP_RAG_INJECT=1` for the rest of the chain. Estimated savings: 12k tokens × cold-hit rate per prompt.
- **U-CAG-CACHE-CONTROL** — wrap the doctrine injection block in `cache_control: { type: "ephemeral" }` headers; downstream API client uses Anthropic prompt-cache.
- **U-CAG-DASHBOARD** — telemetry counter for hit-rate, surface in `/system-viz` as `ghost.cag_router` roost (cold-hit vs hot-hit vs hybrid-hit rates by hour).

## Tests

`scripts/lib/cag-router.test.mjs` — 39 tests covering tier resolution, edge cases (empty/null/unicode), word-boundary correctness (ragout ≠ rag), regex-metachar safety, determinism, confidence bounds, truncation, and registry shape.

```bash
cd H:/prism && node --test scripts/lib/cag-router.test.mjs
```

## Memory pointers

- [[reference_cag_router_2026_05_26]] — implementation notes
- [[feedback_obsidian_brain]] — adjacent: Obsidian is one of the COLD sources today

## References

- akshay_pachaar X tweet 2056714042455343160 — "RAG vs CAG, clearly explained" (2026-05-19)
- Chan et al. 2024 — *Don't Do RAG: When Cache-Augmented Generation is All You Need*
- arxiv 2511.02919 — *Cache Mechanism for Agent RAG Systems*
- [[prompt-engineering-rails]] — adjacent doctrine on subagent prompt structure
