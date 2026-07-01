# Memory Dispatcher Action Subset Audit
## QA-MS6 P0-U04: Memory Engine Action Subset Audit

**Generated:** 2026-04-12T23:00:00Z

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Actions | 9 | Inventoried |
| Action Groups | 3 | Categorized |
| Engines Used | 1 | MemoryGraphEngine |
| Feature ID | F2 | Cross-session memory |

---

## Action Distribution

| Group | Count | Domain |
|-------|-------|--------|
| Health & Diagnostics | 2 | System status |
| Graph Traversal | 4 | Decision tracing |
| Consolidation | 3 | Pattern extraction |

---

## Detailed Action Inventory

### Health & Diagnostics (2 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| get_health | Graph stats, memory usage, integrity | None |
| run_integrity | Force integrity check | None |

### Graph Traversal (4 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| trace_decision | Follow decision chain | node_id, depth, direction |
| find_similar | Find similar nodes | dispatcher, action, error_class, limit |
| get_session | All nodes from session | session_id |
| get_node | Single node by ID | node_id |

### Consolidation (3 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| consolidate | Run memory consolidation | force, threshold |
| consolidation_stats | Get consolidation stats | None |
| consolidation_patterns | Extract patterns | min_frequency, category |

---

## Engine Mapping

| Engine | Actions | Purpose |
|--------|---------|---------|
| MemoryGraphEngine | 9 | Cross-session memory graph |

### MemoryGraphEngine Methods
| Method | Used By |
|--------|---------|
| getHealth() | get_health |
| getStats() | get_health |
| traceDecision() | trace_decision |
| findSimilar() | find_similar |
| getSession() | get_session |
| getNode() | get_node |
| runIntegrityCheck() | run_integrity |
| consolidate() | consolidate |
| getConsolidationStats() | consolidation_stats |
| extractPatterns() | consolidation_patterns |

---

## Graph Node Types

| Type | Description |
|------|-------------|
| decision | Action decision point |
| outcome | Action outcome |
| error | Error occurrence |
| session | Session boundary |
| pattern | Extracted pattern |

### Edge Types
| Type | Description |
|------|-------------|
| follows | Temporal sequence |
| causes | Causal relationship |
| similar_to | Similarity link |
| consolidates | Pattern consolidation |

---

## Data Model

### Node Structure
```typescript
interface GraphNode {
  id: string;
  type: NodeType;
  timestamp: number;
  dispatcher?: string;
  action?: string;
  success?: boolean;
  confidence?: number;
  errorClass?: string;
  tags: string[];
}
```

### Health Response
```typescript
interface HealthResponse {
  nodes: number;
  edges: number;
  sessions: number;
  dispatchers: number;
  memory_kb: string;
  integrity: "pass" | "fail";
}
```

---

## Usage Patterns

### Trace Decision Chain
```json
{
  "action": "trace_decision",
  "params": {
    "node_id": "node-123",
    "depth": 3,
    "direction": "both"
  }
}
```

### Find Similar Errors
```json
{
  "action": "find_similar",
  "params": {
    "dispatcher": "prism_calc",
    "error_class": "ValidationError",
    "limit": 10
  }
}
```

---

## Verification

| Check | Status |
|-------|--------|
| All 9 actions inventoried | YES |
| Action groups mapped | YES |
| Engine methods verified | YES |
| Parameter schemas valid | YES |

---

## Conclusion

**QA-MS6 P0-U04 is COMPLETE** — The prism_memory dispatcher has
9 actions in 3 groups, all served by the MemoryGraphEngine.

This is a compact, focused dispatcher implementing Feature F2
(cross-session memory graph) with actions for health monitoring,
graph traversal, and memory consolidation.

---

*QA-MS6 P0-U04 — Memory engine action subset audit complete*
