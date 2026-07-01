---
name: embedding-and-rag-patterns
category: code-tribal
domain: backend-dev
tags: [embedding, rag, semantic-search, vector-index, nomic-embed, qdrant, ai-development]
last_updated: 2026-05-18
---

# Embedding + RAG Patterns in PRISM

PRISM has six embedding-driven RAG surfaces. Each picks a different point on the precision/latency/cost frontier. Knowing which to use is a high-frequency backend-dev judgment call.

## The six surfaces

| Surface | Index | Model | Dim | Latency | Use case |
|---------|-------|-------|-----|---------|----------|
| `tribal-embed-index.json` | JSONL | nomic-embed-text:latest | 768 | ~80 ms / query | Tribal-precontext injection (per-prompt top-K) |
| `wiki/_embeddings.jsonl` | JSONL (int8 quantized) | nomic-embed-text:latest | 768 | ~50 ms / query | Wiki-precheck-inject paraphrase fallback |
| Qdrant `memory-graph` | Qdrant | nomic-embed-text:latest | 768 | ~30 ms / query | Cross-session memory recall, semantic similarity at scale |
| `_leaf-index.jsonl` (BM25) | JSONL | — | — | ~10 ms / query | Wiki-precheck primary (keyword overlap) |
| `system-graph.json` text search | JSONL | — | — | ~5 ms / query | Symbol/path lookup (master-index pre-search) |
| MCP `semantic_search` action | Qdrant + reranker | nomic-embed-text + cohere-rerank-v2 | 768 | ~150 ms | Explicit operator queries via `/memory-search` |

## Embedding choice — nomic-embed-text is the PRISM default

768-d, 8k context, ~5 ms cpu-only embed per short input on this hardware. Two reasons it's standard:

1. **Local-only** — no Anthropic / OpenAI API calls, no per-token cost, no privacy concern.
2. **Quantization-friendly** — int8 reduces JSONL size 4×; the wiki `_embeddings.jsonl` 14,738-vector index fits in 30 MB instead of 120.

Larger models (e5-large, bge-large) gain 2-4% recall but pay 8× latency. The marginal recall isn't worth the latency for hot-path RAG.

## Cosine vs dot-product vs euclidean

Use cosine for normalized embeddings (nomic does this internally). Dot-product == cosine when both vectors are unit-normalized — equivalent results, slightly cheaper compute. Euclidean is wrong for semantic-similarity work; it punishes long-vector embeddings (high-information texts) which is the opposite of what you want.

## The 2× in-domain boost pattern

PRISM's tribal-rerank applies a 2× cosine boost to entries matching the active chat's domain. This is *not* a learned re-ranker — it's a deterministic boost on a tagged field (`e.domain === query.domain ? cos × 2 : cos`).

Why 2× specifically? Empirically the difference between top-K with vs without the boost is one-rank-position on average; 2× promotes domain-match entries from rank 2-3 to rank 1 reliably. Smaller boost (1.3×) was tested and didn't fire; larger boost (5×) over-rotated to domain match even when out-of-domain entries had higher base cosine.

## RAG vs fine-tuning vs in-context

PRISM uses all three at different points:

- **RAG** — domain knowledge that changes daily (tribal tips, wiki entries, recent regressions). Re-embed on change, no model retraining.
- **Fine-tuning (LoRA)** — domain knowledge with stable patterns (post-processor dialect generation, CAM strategy selection). PRISM has 200+ LoRA adapters across mill/lathe/wedm.
- **In-context** — the immediate prompt's CLAUDE.md + wiki precheck + tribal precheck. Fastest, costs ~3k tokens preamble.

**Rule of thumb:** if the data changes faster than fine-tuning cadence (weekly), RAG. If the pattern is stable but big (>10k examples), LoRA. If it's the current task's context, in-context.

## The bootstrap pattern (re-embed on schedule)

```bash
# Re-embed all wiki leaves + memory files into the tribal-embed-index
node H:/prism/.claude/scripts/tribal-embed-index.mjs --bootstrap
```

This walks `knowledge/memories/` + `knowledge/wiki/{code-tribal,software-engineering,architecture,lessons,patterns,trajectories}/` + curated state/shared files. Each leaf becomes one entry. **Frontmatter `domain:` field is honored** — set it on new wikis to pre-tag the entry without needing a retag pass.

## What NOT to do (caught in PRISM reviews)

- **Embedding short fragments** — passing single-line snippets to nomic-embed loses positional context. Embed at the paragraph level minimum.
- **Re-embed on every read** — cache the embedding alongside the source; only re-embed when source content (hashed) changes.
- **Mixing models in one index** — every entry MUST use the same model. The `model:` field in `tribal-embed-index.json` is the contract; tools refuse to mix-and-match.
- **Treating cosine score as probability** — 0.85 is "very relevant" for nomic-embed; 0.60 is "marginal"; 0.40 is noise. There's no probability semantics; calibrate against ground-truth examples.

## The conformal-prediction layer (uncertainty quantification on top of cosine)

PRISM wraps cosine top-K with conformal prediction (`xproc_conformal_*` actions in `prism_ai`) to produce calibrated prediction sets. When the cosine score is below the conformal threshold, the set widens; this is the "I don't know" surface. See [[conformal-prediction-uq]].

## Related

- [[tribal-precontext-architecture]] — the L1-L5 pipeline using `tribal-embed-index.json`
- [[deep-reasoning-doctrine]] — when LLM in-context beats RAG
- [[conformal-prediction-uq]] — calibrated UQ on top of cosine
- `.claude/scripts/tribal-rerank.mjs` — the in-domain-boost implementation
- CLAUDE.md §"OLLAMA-PIPELINE-MS0" + §"NN-GRAPH-MS0" — embedding infrastructure
