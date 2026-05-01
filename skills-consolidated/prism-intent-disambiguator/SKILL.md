---
name: prism-intent-disambiguator
description: |
  Pre-dispatch query resolution. Parses ambiguous user requests into structured
  intents before routing to dispatchers. Reduces wasted calls and wrong-tool usage.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "intent", "disambiguator", "dispatch", "query", "resolution", "parses", "ambiguous"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-intent-disambiguator")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-intent-disambiguator") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What intent parameters for 316 stainless?"
→ Load skill: skill_content("prism-intent-disambiguator") → Extract relevant intent data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot disambiguator issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Intent Disambiguator
## Resolve Ambiguity Before Dispatching

## Problem
"What speed should I use for 4140?" could mean:
- Cutting speed (Vc) for a specific operation → prism_calc:speed_feed
- Spindle RPM for a specific tool diameter → prism_calc:speed_feed + tool context
- Feed rate recommendation → prism_data:tool_recommend
- Complete parameter set → orchestrated multi-call workflow

Wrong dispatch = wasted tokens, wrong answer, frustrated user.

## Intent Classification

### Step 1: Extract Entities
| Entity Type | Examples | Extraction |
|-------------|----------|------------|
| Material | "4140", "aluminum 6061", "titanium" | Match against material database |
| Operation | "milling", "turning", "drilling", "threading" | Operation keyword list |
| Parameter | "speed", "feed", "depth", "force", "power" | Parameter keyword list |
| Tool | "1/2 inch endmill", "insert CNMG", "drill" | Tool pattern matching |
| Machine | "HAAS VF-2", "DMG MORI", "Mazak" | Machine database match |
| Constraint | "surface finish Ra 0.8", "tolerance ±0.01" | Constraint patterns |

### Step 2: Classify Intent
```
Entities found → Intent → Primary Dispatcher
─────────────────────────────────────────────
material + "speed/feed"        → param_lookup    → prism_calc:speed_feed
material + operation + tool    → full_setup      → orchestrated chain
alarm code pattern             → alarm_decode    → prism_data:alarm_decode
"compare" + 2+ materials       → comparison      → prism_data:material_compare
tool + "recommend"             → tool_select     → prism_data:tool_recommend
"thread" + size                → threading       → prism_thread:calculate_*
G/M code question              → gcode_help      → skill lookup
"why" + problem description    → troubleshoot    → causal reasoning chain
```

### Step 3: Fill Gaps
If critical entities missing, ask ONE targeted question:
- Missing material: "Which material are you cutting?"
- Missing operation: "Is this milling, turning, or drilling?"
- Ambiguous parameter: "Do you need cutting speed (m/min) or spindle RPM?"

**Rule:** Never ask more than 1 clarifying question. Infer from context when possible.

## Confidence Scoring
- High (>0.8): Clear intent, all entities present → dispatch immediately
- Medium (0.5-0.8): Likely intent, minor gaps → dispatch with reasonable defaults, note assumptions
- Low (<0.5): Ambiguous → ask ONE clarifying question

## Integration
- Runs BEFORE dispatcher routing (pre-dispatch hook)
- Uses `prism_context→relevance_filter` to check conversation history for missing entities
- Feeds resolved intent to `prism_skill_script→skill_find_for_task` for skill selection
