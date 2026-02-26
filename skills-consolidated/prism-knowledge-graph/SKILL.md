---
name: prism-knowledge-graph
description: |
  Semantic entity relationships across PRISM's knowledge domains.
  Maps connections between materials, tools, machines, operations, and parameters
  to enable intelligent cross-domain reasoning and recommendation.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "knowledge", "graph", "semantic", "entity", "relationships", "across", "domains"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-knowledge-graph")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-knowledge-graph") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What knowledge parameters for 316 stainless?"
→ Load skill: skill_content("prism-knowledge-graph") → Extract relevant knowledge data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot graph issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Knowledge Graph
## Semantic Relationships for Manufacturing Intelligence

## Entity Types & Relationships

```
Material ──[cuts_with]──→ Tool
Material ──[runs_on]───→ Machine
Material ──[has_property]→ PhysicalProperty
Tool ─────[requires]───→ Holder
Tool ─────[supports]───→ Operation
Machine ──[has_capability]→ Capability
Operation ─[produces]──→ Feature
Feature ──[requires]───→ Tolerance
Parameter ─[affects]───→ Parameter (causal chain)
Alarm ────[indicates]──→ RootCause
```

## Relationship Types

| Relationship | From | To | Example |
|-------------|------|-----|---------|
| cuts_with | Material | Tool | "Ti-6Al-4V cuts_with carbide_endmill" |
| incompatible | Material | Tool | "Aluminum incompatible cobalt_drill" |
| optimal_for | Machine | Operation | "5-axis optimal_for impeller_milling" |
| causes | Parameter↑ | Parameter↓ | "speed↑ causes tool_life↓" |
| requires_coolant | Material+Op | CoolantType | "titanium+milling requires_coolant high_pressure" |
| triggers | AlarmCode | RootCause | "FANUC 410 triggers axis_overtravel" |

## Query Patterns

### "What tool for this material?"
```
Material("4140") → cuts_with → Tool[filter: operation=milling] → rank by tool_life
```

### "Why is my surface finish bad?"
```
SurfaceFinish(poor) ← affects ← [speed, feed, tool_wear, vibration, runout]
→ Check each: which is out of spec? → Root cause
```

### "Can this machine do this part?"
```
Part.features → each requires → Capability
Machine.capabilities → covers? → Gap analysis
```

## Implementation
- `prism_knowledge→relations` for relationship queries
- `prism_knowledge→cross_query` for multi-domain lookups
- `prism_memory→trace_decision` for causal chain traversal
- Graph stored in: `prism_knowledge` registry system

## Building the Graph
- Auto-extract from material database (3,518+ materials)
- Auto-extract from tool database (1,944+ tools)
- Auto-extract from machine database (824+ machines)
- Causal relationships from physics formulas
- Alarm→cause mappings from alarm database (9,200+ codes)
