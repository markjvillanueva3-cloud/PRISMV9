---
name: reference_bravo_qdrant_down_fallback
description: qdrant down → prism_memory:semantic_search fails; fall back to memory-relevance Write-hook index + master MEMORY.md
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.035Z
aliases: reference_bravo_qdrant_down_fallback
---


Observed 2026-05-28: `prism_memory:semantic_search` returns `{ok:false,error:"qdrant not connected"}` when the vector store is down. The Workflow-tool StructuredOutput path was ALSO degraded (4 subagents returned 0 tokens).

Reliable fallbacks for memory inventory when qdrant is down:
- The **memory-relevance Write hook** — fires on every Write/Edit, surfaces score-ranked relevant memories (its own index, independent of qdrant).
- The master `MEMORY.md` `## Indexed memories` section (read directly).
- Narrow path-scoped Globs + `dispatcher_map_compact` for structural inventory.

Don't retry the failing mechanism — pivot to inline reliable tools.
