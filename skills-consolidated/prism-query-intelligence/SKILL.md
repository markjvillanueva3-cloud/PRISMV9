---
name: prism-query-intelligence
description: |
  Interprets manufacturing queries, resolves ambiguity, and routes to optimal
  dispatcher chains. The "brain" that makes PRISM feel intelligent.
  Turns "What speed should I use?" into a fully parameterized, multi-dispatcher
  workflow. Eliminates wasted calls from wrong interpretations.
  Use when: ANY user query about manufacturing, especially ambiguous ones.
  Integrates with: prism-dispatcher-composer for chain execution.
  Key insight: 80% of manufacturing queries are ambiguous. Resolving
  ambiguity BEFORE dispatching saves 3-5 wasted tool calls per query.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "query", "intelligence", "interprets", "manufacturing", "queries", "resolves", "ambiguity"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-query-intelligence")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-query-intelligence") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What query parameters for 316 stainless?"
→ Load skill: skill_content("prism-query-intelligence") → Extract relevant query data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot intelligence issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Query Intelligence
## From Ambiguous Intent to Optimal Dispatcher Chain

## THE COST OF AMBIGUITY

"Calculate speed for this material" is missing:
- WHICH material? (name, grade, or ID?)
- WHICH operation? (turning, milling, drilling?)
- WHICH tool? (HSS, carbide, ceramic? Diameter? Flutes?)
- WHAT machine? (constraints on RPM, power?)
- WHAT priority? (tool life, productivity, surface finish?)

Without resolution, the system either guesses wrong (dangerous in manufacturing)
or asks 5 clarification questions (frustrating). This skill resolves most
ambiguity automatically using context, then asks ONE targeted question if needed.

## INTENT CLASSIFICATION

### Category 1: PARAMETER_QUERY
**Signals:** "what speed", "what feed", "calculate", "how fast", "RPM for"
**Required context:** material, operation, tool (minimum)
**Dispatcher chain:** FULL_MACHINING_ANALYSIS (see dispatcher-composer)

### Category 2: ALARM_QUERY
**Signals:** "alarm", "error", "fault", "code", controller name
**Required context:** controller_family, alarm_code
**Dispatcher chain:** ALARM_DIAGNOSIS

### Category 3: MATERIAL_QUERY
**Signals:** "properties of", "what is", material grade names, "compare"
**Required context:** material_id or search terms
**Dispatcher chain:** material_get or material_compare

### Category 4: PROCESS_OPTIMIZATION
**Signals:** "optimize", "improve", "reduce cycle time", "better tool life"
**Required context:** current parameters, optimization objective
**Dispatcher chain:** PROCESS_OPTIMIZATION

### Category 5: THREADING_QUERY
**Signals:** "thread", "tap", "pitch", "M8", "UNC", "UNF"
**Required context:** thread standard, size
**Dispatcher chain:** THREADING_COMPLETE

### Category 6: TOOLPATH_QUERY
**Signals:** "toolpath", "strategy", "roughing", "finishing", "HSM"
**Required context:** feature type, material, machine
**Dispatcher chain:** strategy_select + params_calculate

### Category 7: SAFETY_QUERY
**Signals:** "safe", "collision", "clearance", "overload", "breakage"
**Required context:** operation context, parameters
**Dispatcher chain:** Relevant prism_safety actions

### Category 8: KNOWLEDGE_QUERY
**Signals:** "what do we know about", "find", "search", "show me"
**Required context:** search terms
**Dispatcher chain:** prism_knowledge→search or cross_query

## CONTEXT RESOLUTION ENGINE

Before dispatching, resolve missing parameters in this priority order:

### Priority 1: Session Context
Check `prism_session→memory_recall` for:
- Last material discussed → assume same material
- Last machine referenced → assume same machine
- Current project/operation context → infer operation type
- Recent calculation results → carry forward parameters

### Priority 2: Implicit Cues
Extract from the query itself:
- Material grade names: "4140", "6061-T6", "Ti-6Al-4V" → direct lookup
- Controller names: "Fanuc", "Siemens", "Haas" → controller family
- Thread specs: "M8x1.25", "1/4-20 UNC" → parse standard+size+pitch
- Operation keywords: "turning" "milling" "drilling" → operation type
- Tool mentions: "10mm endmill", "insert CNMG" → tool type+geometry

### Priority 3: Reasonable Defaults
When context and cues are insufficient:
- Operation: milling (most common in 5-axis shops)
- Tool: carbide endmill (most versatile)
- Priority: balanced (equal weight to tool life, productivity, finish)
- Machine: no constraint (use theoretical limits)
- Coolant: flood (safest default)

### Priority 4: Targeted Question (LAST RESORT)
If critical info can't be resolved, ask ONE question that resolves the MOST
ambiguity. Never ask multiple questions.

**Good:** "Are you milling or turning? That determines the entire parameter set."
**Bad:** "What material? What operation? What tool? What machine? What priority?"

## DISPATCHER ROUTING TABLE

| Resolved Intent | Primary Dispatcher | Secondary | Validation |
|----------------|-------------------|-----------|------------|
| Speed/feed calc | prism_calc→speed_feed | prism_safety | prism_validate |
| Force prediction | prism_calc→cutting_force | prism_safety | prism_validate |
| Material lookup | prism_data→material_get | prism_knowledge | — |
| Material compare | prism_data→material_compare | prism_calc | — |
| Machine check | prism_data→machine_get | prism_safety | — |
| Tool selection | prism_data→tool_recommend | prism_calc | prism_safety |
| Alarm decode | prism_data→alarm_decode | prism_data→alarm_fix | — |
| Thread calc | prism_thread→* | prism_safety | prism_validate |
| Toolpath | prism_toolpath→strategy_select | prism_calc | prism_safety |
| Optimization | prism_calc→multi_optimize | prism_safety | prism_omega |
| Stability | prism_calc→stability | prism_safety | prism_validate |
| Thermal | prism_calc→thermal | prism_safety | — |
| Surface finish | prism_calc→surface_finish | — | prism_validate |
| Knowledge search | prism_knowledge→search | prism_knowledge→cross_query | — |

## COMPOUND QUERY HANDLING

Users often ask compound questions:
"What speed for 4140 steel and will my machine handle it?"

**Decomposition:**
1. Identify sub-queries: [speed_calculation, machine_capability_check]
2. Identify shared context: material=4140
3. Order by dependency: speed first (machine check needs the force/power)
4. Execute as chain: speed_feed → cutting_force → check_spindle_power
5. Compose unified response

## CONFIDENCE SCORING

Every resolved query gets a confidence score:

| Resolution Source | Confidence |
|------------------|-----------|
| Explicit in query | 0.95 |
| Session context (recent) | 0.85 |
| Session context (old) | 0.70 |
| Implicit cues | 0.80 |
| Reasonable defaults | 0.50 |
| Combined sources | weighted average |

**Rule:** If overall confidence < 0.60, ask for clarification.
If confidence 0.60-0.80, proceed but flag assumptions.
If confidence > 0.80, proceed silently.
