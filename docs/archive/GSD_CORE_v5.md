# PRISM GSD CORE v5.0
## MCP-First | Token-Optimized | Context-Aware
---

## PRIORITY 1: MCP SERVER

```
ALL resource access through MCP tools. Never read files directly when MCP exists.

MCP SERVER: 89 tools | 17 categories | C:\PRISM\scripts\prism_mcp_server.py

USAGE: from prism_mcp_server import PRISMMCPServer; mcp = PRISMMCPServer()
       result = mcp.call("prism_[tool]", {params})
```

## MCP TOOL QUICK REFERENCE

| Need | MCP Tool | Params |
|------|----------|--------|
| Context status | `prism_context_size` | `{}` |
| Compress context | `prism_context_compress` | `{target: 60}` |
| Load skill | `prism_skill_read` | `{skill_id: "name"}` |
| Search skills | `prism_skill_search` | `{query: "term"}` |
| Get material | `prism_material_get` | `{id: "AL-6061"}` |
| Batch execute | `prism_batch_execute` | `{ops: [...]}` |
| Checkpoint | `prism_checkpoint_create` | `{reason: "..."}` |
| Quality check | `prism_quality_omega` | `{output: {...}}` |
| Validate gates | `prism_validate_gates` | `{output: {...}}` |

## CONTEXT PRESSURE PROTOCOL

```
CHECK: prism_context_size() → Returns level + recommendation

GREEN  (0-60%)   → Normal ops
YELLOW (60-75%)  → Start batching, plan compression
ORANGE (75-85%)  → prism_context_compress() NOW
RED    (85-92%)  → prism_checkpoint_create() + prepare handoff
CRITICAL (>92%)  → STOP, prism_session_end(), handoff
```

## SESSION PROTOCOL (MCP-First)

```
START:
  1. mcp.call("prism_context_size", {})           # Check budget
  2. mcp.call("prism_state_get", {})              # Load state
  3. mcp.call("prism_skill_relevance", {task})    # Find skills
  4. mcp.call("prism_batch_execute", {skills})    # Batch load

DURING (every 5-8 ops):
  5. mcp.call("prism_context_size", {})           # Monitor
  6. mcp.call("prism_checkpoint_create", {})      # Save progress

END:
  7. mcp.call("prism_state_update", {summary})    # Update state
  8. mcp.call("prism_session_end", {})            # Clean shutdown
```

## BATCH EVERYTHING (2+ ops)

```
NEVER sequential when batchable:

BAD:  material_get("A"); material_get("B"); material_get("C")
GOOD: batch_execute([{op:"material_get",id:"A"},{...B},{...C}])

Speedup: ~5x for n=5 operations
```

## THE 4 LAWS

```
1. SAFETY     → S(x) ≥ 0.70 or BLOCKED
2. COMPLETE   → No placeholders, 100% done
3. NO REGRESS → New ≥ Old always
4. PREDICT    → 3 failure modes first
```

## QUALITY GATE

```
Ω = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L ≥ 0.70
    R=Reasoning C=Code P=Process S=Safety L=Learning

Validate: mcp.call("prism_quality_omega", {output})
```

## KEY PATHS (when MCP unavailable)

```
State:    C:\PRISM\state\CURRENT_STATE.json
Roadmap:  C:\PRISM\state\ROADMAP_TRACKER.json  
MCP:      C:\PRISM\scripts\prism_mcp_server.py
Skills:   /mnt/skills/user/prism-*/SKILL.md
```

## ANTI-REGRESSION

```
BEFORE replace: count_old → create_new → verify new ≥ old
IF smaller: STOP, investigate, never ship
```

## RESOURCES (via MCP)

```
89 MCP tools | 151 skills | 64 agents | 490 formulas | 6815 hooks
All accessible: mcp.call("prism_resource_list", {type: "..."})
```

---
**v5.0 | MCP-First | ~1.5KB | Replaces 45KB prompt**
