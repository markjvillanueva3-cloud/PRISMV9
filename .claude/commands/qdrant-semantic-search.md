---
policy:
  tier: 1
  triggers:
    - "qdrant-semantic-search"
    - "search memory"
    - "find similar"
    - "have we seen"
    - "any prior"
---
# Qdrant Semantic Search — Replaces /memory-search

Direct semantic search against PRISM's Qdrant vector store, with full control over the embedder, collection routing, payload filters, and score thresholds. Replaces the older `/memory-search` skill — this version exposes the full `prism_memory:semantic_search` surface and supports the new `wiki` collection (P4-U04).

## Args: $ARGUMENTS
- `<query>`: natural-language or keyword query (embedded via nomic-embed-text 768-dim)
- `--kind=<kind>`: collection to search — one of `program | outcome | tip | formula | rule | playbook | note | wiki | all` (default: `all`)
- `--limit=<n>`: max hits per collection (default: 10)
- `--score-min=<f>`: drop hits below this score (default: 0.55)
- `--filter='<json>'`: Qdrant payload filter (e.g., `{"machineId": "okuma-lt-3"}`)
- `--explain`: include per-hit reason (which payload field matched, which dimension dominated)

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"search memory"
    - keyword:"find similar"
    - keyword:"have we seen"
    - keyword:"any prior"
```

## Why this replaces /memory-search
- Single dispatcher action, single embedder, single score normalisation across all collections
- New `wiki` collection (727 entries from H:/prism/knowledge/wiki/index.md) included in `--kind=all`
- `--explain` exposes which payload field matched, removing the black-box feel of the older skill
- `--filter` accepts arbitrary Qdrant payload predicates (older skill only allowed `machineId`)

## Pipeline
1. **Embed** query via Ollama nomic-embed-text (768-dim)
2. **Search** dispatch to `prism_memory_<kind>` collection(s) via QdrantMemoryEngine
3. **Filter** by `--score-min` and `--filter` payload predicate
4. **Merge** + sort across collections; tag each hit with its source collection
5. **Explain** (optional) — annotate which field matched

## MCP action
```
prism_memory:semantic_search { query, kind?, limit?, score_min?, filter? }
```

## Engines
- `QdrantMemoryEngine` — kind routing + embedder glue
- `QdrantVectorStoreEngine` — REST client to Qdrant
- `WikiIndexQueryEngine` — wiki-specific TF-IDF fallback (used when `kind:"wiki"` and Qdrant unreachable)

## Migration from /memory-search
- Replace `/memory-search foo` → `/qdrant-semantic-search foo`
- Replace `/memory-search foo --kind=tip` → unchanged (same flag)
- The old `/memory-search` skill remains as an alias for one milestone, then deprecates

## Related
- `/wiki-query` — wiki-only search with markdown rendering
- `/optimize-context` — caller often follows search with context slim if results are large
