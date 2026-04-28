---
source: gsd_micro
section: Session-End Consolidation (INTEL P1-U02)
slug: session-end-consolidation-intel-p1-u02
indexed_at: 2026-04-28T02:39:36.888Z
---

## Session-End Consolidation (INTEL P1-U02)

```
session-consolidate-graph.mjs (Stop hook)
  → POST prism_memory:record_session_end
  → MemoryConsolidationEngine.recordSessionEnd()
     increments sessionsSinceLastConsolidation

When sessionsSinceLast >= 5 AND auto_consolidate=true:
  → MemoryConsolidationEngine.consolidate()
     Phase 1: Collect raw graph nodes
     Phase 2: Cluster by similarity
     Phase 3: Distill recurring → ConsolidatedPattern
     Phase 4: Prune CONTEXT > 168h, cap PATTERN at 200
  → patterns written to consolidated_patterns.json
  → hook mirrors patterns to knowledge/tribal/pattern-<id>.md
  → 10K decision nodes compress to ≤1K patterns

Counter file (deliverable mirror):
  mcp-server/data/state/consolidation-counter.json
```
