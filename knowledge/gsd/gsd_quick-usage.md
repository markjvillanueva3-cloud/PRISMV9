---
source: gsd_quick
section: USAGE
slug: usage
indexed_at: 2026-04-28T02:50:03.661Z
---

## USAGE

```typescript
// Via MCP
mcp__prism__prism_gsd({ action: "quick" })
mcp__prism__prism_gsd({ action: "get", section: "laws" })
mcp__prism__prism_gsd({ action: "dev_protocol" })

// Semantic memory (INTEL milestone)
mcp__prism__prism_memory({ action: "semantic_search", params: { query: "...", kind: "engine", limit: 5 } })
mcp__prism__prism_memory({ action: "remember", params: { kind: "tip", id: "...", text: "..." } })
mcp__prism__prism_memory({ action: "record_session_end", params: { session_id: "..." } })

// Error ledger (INTEL P2)
mcp__prism__prism_guard({ action: "error_ledger_append", params: { source: "hook_block", message: "..." } })
mcp__prism__prism_guard({ action: "error_ledger_recall_similar", params: { signature: "...", limit: 3 } })

// GSD section retrieval (INTEL P4)
mcp__prism__prism_memory({ action: "semantic_search", params: { query: "buffer equation", kind: "gsd" } })
```
