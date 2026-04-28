---
source: gsd_micro
section: Semantic Memory Stack (INTEL milestone)
slug: semantic-memory-stack-intel-milestone
indexed_at: 2026-04-28T02:50:03.683Z
---

## Semantic Memory Stack (INTEL milestone)

```
Layer            File / Engine                               Population
─────────────────────────────────────────────────────────────────────
Embedder         QdrantMemoryEngineSingleton                 Ollama
                 createOllamaEmbedder({nomic-embed-text})    /api/embed
                                                              768-dim
Vector store     QdrantMemoryEngine (kind-keyed)             Qdrant
                                                              localhost:6333

Memory kinds (14):
  program / outcome / tip / formula / rule / playbook / note /
  error / skill / engine / action / gsd / directive / wiki

Embed scripts (one-shot, idempotent — re-runnable):
  scripts/populate-tribal-vault.mjs            4245 tips
  scripts/chunk-claudemd-vault.mjs             ~30 CLAUDE.md sections
  scripts/chunk-gsd-vault.mjs                  ~50 GSD sections
  scripts/embed-all-skills.mjs                 503 skills
  scripts/embed-all-engines.mjs                3013 engines (5 noDocstring)
  scripts/embed-all-actions.mjs                6346 actions
  scripts/mirror-memories-bootstrap.mjs        MEMORY.md mirror
  scripts/summarize-all-scripts-via-ollama.mjs 364 scripts

Retrieval surface:
  prism_memory:semantic_search { query, kind, limit, threshold }
  prism_memory:remember { kind, id, text, metadata }
  prism_memory:record_session_end { session_id, auto_consolidate }
  prism_guard:error_ledger_recall_similar { signature, limit }
```
