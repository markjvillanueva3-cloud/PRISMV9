---
name: prism-token-density
description: |
  Maximize information per token. Compression patterns, structure over prose,
  incremental loading, reference deduplication. Use when context pressure rises.
  
  INTEGRATES WITH: prism_context_size, prism_context_compress, prism_batch_execute
  KEY METRIC: Information_Value / Token_Count
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "token", "density", "maximize", "information", "compression", "patterns", "structure"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-token-density")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-token-density") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about token
→ Load skill: skill_content("prism-token-density") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires density guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Token Density Optimization
## Maximize Information Per Token
### Integration: MCP Context & Batch Tools

## CORE PRINCIPLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOKEN DENSITY = Information_Delivered / Tokens_Used                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ GOAL: Maximize density while maintaining comprehension                      │
│                                                                             │
│ LOW DENSITY (avoid):                                                        │
│   "I would be happy to help you with that request. Let me explain          │
│    that the concept you're asking about is..."  (25 tokens, ~0 info)       │
│                                                                             │
│ HIGH DENSITY (target):                                                      │
│   "Key: X causes Y via mechanism Z"  (8 tokens, 3 facts)                   │
│   Density = 3/8 = 0.375 facts/token                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## COMPRESSION PATTERNS

### Pattern 1: Structure Over Prose
```
PROSE (low density):
"The system supports three types of materials: aluminum which is
commonly used for lightweight parts, steel which provides strength,
and titanium which offers the best strength-to-weight ratio."
→ 35 tokens, 3 facts = 0.086 density

STRUCTURE (high density):
Materials: AL(light), Steel(strong), Ti(strength/weight)
→ 8 tokens, 3 facts = 0.375 density (4.4x improvement)
```

### Pattern 2: Reference Compression
```
FIRST USE: Define with full content
  [REF-001]: Kienzle force model Fc = kc1.1 × h^(-mc) × b × Kγ × Kv

SUBSEQUENT USES: Reference only
  "Apply [REF-001] with h=0.15mm" → 7 tokens vs 15+ tokens
```

### Pattern 3: Tabular Compression
```
PROSE: "Aluminum 6061 has a Brinell hardness of 95, tensile strength
of 310 MPa, and density of 2.70 g/cm³. Aluminum 7075 has..."
→ 50+ tokens for 2 materials

TABLE:
| Mat    | HB  | UTS   | ρ     |
|--------|-----|-------|-------|
| AL6061 | 95  | 310   | 2.70  |
| AL7075 | 150 | 572   | 2.81  |
→ 25 tokens for same info (2x improvement)
```

### Pattern 4: Incremental Loading
```
LEVEL 1 (summary): Material: AL-6061-T6, machinability: Good
LEVEL 2 (+detail): + HB=95, UTS=310MPa, speeds: 300-600 SFM
LEVEL 3 (+full): + all 127 parameters

RULE: Start at Level 1, expand only if needed
MCP: Use prism_material_property(id, property) not prism_material_get(id)
```

## MCP TOOL INTEGRATION

### Check Budget Before Loading
```python
# ALWAYS check context before large operations
pressure = prism_context_pressure()  # Returns GREEN/YELLOW/ORANGE/RED

if pressure == "GREEN":
    # Full content OK
    result = prism_material_get(material_id)  
elif pressure == "YELLOW":
    # Summary only
    result = prism_material_property(material_id, "summary")
elif pressure in ["ORANGE", "RED"]:
    # Minimal - specific property only
    result = prism_material_property(material_id, needed_property)
```

### Batch Similar Operations
```python
# INSTEAD OF (3 calls, 3x overhead):
a = prism_material_get("AL-6061")
b = prism_material_get("AL-7075") 
c = prism_material_get("AL-2024")

# USE (1 call, batched):
results = prism_batch_execute([
    {"op": "material_get", "id": "AL-6061"},
    {"op": "material_get", "id": "AL-7075"},
    {"op": "material_get", "id": "AL-2024"}
], parallel=True)
```

## DENSITY METRICS

### Token Budget Allocation
```
Total Context: 200,000 tokens (example)
Reserved:
  - System prompt: 15,000 (fixed)
  - Response buffer: 30,000 (15%)
  - Working: 155,000

Working Budget Allocation:
  40% (62,000) - Current task
  30% (46,500) - Skills/knowledge
  20% (31,000) - State/history  
  10% (15,500) - Tool results buffer
```

### Density Targets
| Content Type | Target Density | Tokens/Fact |
|--------------|----------------|-------------|
| Technical data | 0.30+ | <3.3 |
| Explanations | 0.15+ | <6.7 |
| Code | 0.25+ | <4.0 |
| Lists/Tables | 0.40+ | <2.5 |

## ANTI-PATTERNS

### Avoid These Token Wasters
| Anti-Pattern | Waste | Fix |
|--------------|-------|-----|
| "I'd be happy to..." | 5-10 tokens | Skip, start with content |
| Repeated context | 50+ tokens | Use references |
| Verbose explanations | 20+ tokens | Use bullet structure |
| Full reloads | 500+ tokens | Incremental loading |
| Sequential calls | 3x overhead | Batch operations |

## DECISION TREE

```
START: Need to include content?
  │
  ├─ Is it already loaded? ─── YES ─→ Reference it [REF-xxx]
  │                           NO
  │                            │
  ├─ Is it large (>100 tokens)? 
  │    YES: Check prism_context_pressure()
  │         GREEN → Load full
  │         YELLOW → Load summary
  │         ORANGE/RED → Load minimal property
  │    NO: Load directly
  │
  ├─ Are there 2+ similar operations?
  │    YES → Batch with prism_batch_execute()
  │    NO → Direct call
  │
  └─ Can it be structured?
       YES → Table/list format
       NO → Compressed prose
```

## HOOKS

```
TOKEN-001  content:loading     Check density before including
TOKEN-002  context:yellow      Switch to summary mode
TOKEN-003  context:orange      Switch to minimal mode
TOKEN-004  operation:similar   Trigger batching
TOKEN-005  reference:repeated  Apply reference compression
```

## QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOKEN DENSITY CHECKLIST                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Check prism_context_pressure() before large loads                        │
│ □ Use prism_batch_execute() for 2+ similar operations                      │
│ □ Structure > Prose (tables, lists, code blocks)                           │
│ □ Reference repeated content [REF-xxx]                                     │
│ □ Incremental loading (summary → detail → full)                            │
│ □ Skip verbose acknowledgments                                             │
│ □ Specific property lookups vs full object loads                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

*PRISM Token Density v1.0 | Integrates: context_pressure, batch_execute, material_property*
