# PRISM PROJECT INSTRUCTIONS
## Token-Optimized Development Protocol | Put in Claude Project Settings
---

## MCP-FIRST ARCHITECTURE (PRIORITY 1)

**MCP Server v2.4: 112 tools, 21 categories**

NEVER read files directly when MCP exists. ALWAYS batch 2+ similar ops.

```
Key Tools:
  prism_master_context  → Check context pressure
  prism_master_batch    → Batch 2+ operations (5x faster)
  prism_master_swarm    → Multi-agent for complex tasks
  prism_master_checkpoint → Save progress every 5-8 ops
  prism_formula_apply   → Physics calculations (Kienzle, Taylor)
  prism_hook_search     → Find hooks by domain/query
  prism_skill_read      → Load skill content
  prism_material_get    → Get material data (127 params)
```

## SESSION PROTOCOL

```
START:
  Desktop Commander:read_file "C:\PRISM\state\ROADMAP_TRACKER.json"
  Desktop Commander:read_file "C:\PRISM\state\CURRENT_STATE.json"

DURING (every 5-8 operations):
  Check: prism_master_context (monitor pressure)
  Save:  prism_master_checkpoint (if pressure > 60%)

END:
  Update: CURRENT_STATE.json, ROADMAP_TRACKER.json
  Update: memories if versions/tools changed
```

## CONTEXT PRESSURE LEVELS

```
GREEN  (0-60%)   → Normal
YELLOW (60-75%)  → Batch ops, plan compression
ORANGE (75-85%)  → Checkpoint NOW
RED    (85-92%)  → Prepare handoff
CRITICAL (>92%)  → STOP immediately
```

## RESOURCES ACCESSIBLE VIA MCP

```
112 MCP tools | 6,797 hooks | 490 formulas | 64 agents
153 skills | 1,047 materials | 824 machines | 44 registries
```

## THE 4 LAWS (Non-Negotiable)

```
1. SAFETY     → S(x) ≥ 0.70 or OUTPUT BLOCKED
2. COMPLETE   → No placeholders, no TODOs, 100% done
3. NO REGRESS → New version ≥ Old version always
4. MCP FIRST  → Use tools over file reads
```

## QUALITY EQUATION

```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L ≥ 0.70
R=Reasoning C=Code P=Process S=Safety L=Learning
```

## BATCH PATTERN (Always use for 2+ ops)

```
prism_master_batch({operations: [
  {tool: "prism_material_get", params: {id: "AL-6061"}},
  {tool: "prism_material_get", params: {id: "STEEL-1045"}}
]})
```

## SWARM PATTERN (Complex multi-agent tasks)

```
prism_master_swarm({
  task: "description",
  agent_count: 3,
  tier: "SONNET"  // OPUS=complex, SONNET=standard, HAIKU=simple
})
```

## ANTI-REGRESSION (Before ANY replacement)

```
count_old → create_new → verify new ≥ old → if smaller STOP
```

## KEY STATE FILES

```
C:\PRISM\state\CURRENT_STATE.json    → Session state
C:\PRISM\state\ROADMAP_TRACKER.json  → Progress tracking
/mnt/skills/user/prism-*/SKILL.md    → Skills (fast access)
```

---
**PRISM Manufacturing Intelligence | Safety-Critical CNC Software**
**Wrong calculations = Tool explosions, operator injury, death**
**Mathematical certainty required. NO shortcuts. NO placeholders.**
