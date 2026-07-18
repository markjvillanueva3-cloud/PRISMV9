# PRISM GSD CORE v6.0
## MCP-First | Master Orchestrator | Full Resource Utilization
---

## RULE 1: MCP FIRST (PRIORITY 1)

```
NEVER read files directly when MCP tool exists.
ALWAYS use prism_master_call() for single operations.
ALWAYS use prism_master_batch() for 2+ similar operations.

MCP SERVER: 112 tools | 21 categories | v2.4
```

## QUICK REFERENCE - KEY MCP TOOLS

| Operation | MCP Tool | Example |
|-----------|----------|---------|
| Context check | `prism_master_context` | Check pressure level |
| Batch execute | `prism_master_batch` | 2+ similar operations |
| Multi-agent | `prism_master_swarm` | Complex tasks |
| Checkpoint | `prism_master_checkpoint` | Save progress |
| Get material | `prism_material_get` | `{id: "AL-6061"}` |
| Search hooks | `prism_hook_search` | `{query: "safety"}` |
| Apply formula | `prism_formula_apply` | Kienzle, Taylor |
| Load skill | `prism_skill_read` | `{skill_id: "..."}` |

## CONTEXT PRESSURE PROTOCOL

```
prism_master_context() → Returns level + action

GREEN  (0-60%)   → Normal operations
YELLOW (60-75%)  → Start batching, plan ahead
ORANGE (75-85%)  → prism_master_checkpoint() NOW
RED    (85-92%)  → Prepare handoff, checkpoint
CRITICAL (>92%)  → STOP, handoff immediately
```

## BATCH EVERYTHING (2+ ops)

```python
# BAD - Sequential calls
mcp.call("prism_material_get", {"id": "AL-6061"})
mcp.call("prism_material_get", {"id": "STEEL-1045"})
mcp.call("prism_material_get", {"id": "TI-6AL4V"})

# GOOD - Batch execution (5x faster)
mcp.call("prism_master_batch", {"operations": [
    {"tool": "prism_material_get", "params": {"id": "AL-6061"}},
    {"tool": "prism_material_get", "params": {"id": "STEEL-1045"}},
    {"tool": "prism_material_get", "params": {"id": "TI-6AL4V"}}
]})
```

## SWARM FOR COMPLEX TASKS

```python
# Multi-agent execution
mcp.call("prism_master_swarm", {
    "task": "Analyze thermal effects on cutting",
    "agent_count": 3,
    "tier": "SONNET"  # or OPUS for complex, HAIKU for simple
})
```

## SESSION PROTOCOL

```
START:
  1. prism_master_context()           # Check budget
  2. Read ROADMAP_TRACKER.json        # Via Desktop Commander
  3. Read CURRENT_STATE.json          # Via Desktop Commander
  4. prism_skill_search({task})       # Find relevant skills

DURING (every 5-8 ops):
  5. prism_master_context()           # Monitor pressure
  6. prism_master_checkpoint()        # Save progress

END:
  7. Update state files               # Via Desktop Commander
  8. Update memories if changed       # memory_user_edits
```

## RESOURCES AVAILABLE (via MCP)

```
├── 112 MCP tools (21 categories)
├── 6,797 hooks (64 domains)
│   └── prism_hook_get/search/by_domain/stats
├── 490 formulas (27 categories)
│   └── prism_formula_get/search/apply/dependencies
├── 64 agents (OPUS/SONNET/HAIKU)
│   └── prism_agent_list/select/spawn/status
├── 153 skills (146 real)
│   └── prism_skill_read/search/list
├── 1,047 materials (127 params each)
│   └── prism_material_get/search/property
└── 824 machines (43 manufacturers)
    └── prism_machine_get/search/capabilities
```

## THE 4 LAWS

```
1. SAFETY     → S(x) ≥ 0.70 or BLOCKED
2. COMPLETE   → No placeholders, 100% done
3. NO REGRESS → New ≥ Old always
4. MCP FIRST  → Use tools, not file reads
```

## QUALITY GATE

```
Ω = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L ≥ 0.70
Validate: prism_quality_omega({output})
```

## KEY PATHS (only when MCP unavailable)

```
State:    C:\PRISM\state\CURRENT_STATE.json
Roadmap:  C:\PRISM\state\ROADMAP_TRACKER.json
Skills:   /mnt/skills/user/prism-*/SKILL.md
MCP:      C:\PRISM\scripts\prism_mcp_server.py
```

## ANTI-REGRESSION BEFORE ANY REPLACEMENT

```
1. Count items in old version
2. Create new version
3. Verify: new_count >= old_count
4. If smaller → STOP, investigate
```

---
**v6.0 | 112 MCP tools | Master Orchestrator | ~1.5KB**
