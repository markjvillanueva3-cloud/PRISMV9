---
name: prism-cross-domain-synthesizer
description: |
  Connects knowledge across all 9 PRISM registries to find non-obvious solutions.
  Discovers material↔machine↔tool↔process↔alarm↔formula relationships that
  no single dispatcher reveals. Uses prism_knowledge→cross_query as the engine.
  Use when: Complex "what if" questions, troubleshooting with no obvious cause,
  optimizing processes across constraints, finding alternative approaches,
  or whenever a single-domain answer feels incomplete.
  Key insight: 9 registries × cross-referencing = combinatorial intelligence.
  521 materials × 402 machines × 515 formulas = solutions that DON'T require
  an expert with 30 years of experience to see.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cross", "domain", "synthesizer", "connects", "knowledge", "across", "registries", "find"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cross-domain-synthesizer")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cross-domain-synthesizer") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cross parameters for 316 stainless?"
→ Load skill: skill_content("prism-cross-domain-synthesizer") → Extract relevant cross data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot domain issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Cross-Domain Synthesizer
## 9 Registries → Combinatorial Manufacturing Intelligence

## THE INSIGHT

A master machinist with 30 years of experience knows that:
- Inconel 718 on a machine with weak spindle → use ceramic inserts at high speed
- Aluminum 7075 chattering → probably a harmonics issue, not a feed issue
- Surface finish degrading mid-run → thermal drift affecting machine geometry

This knowledge comes from CROSS-DOMAIN experience: connecting material behavior
to machine dynamics to tool characteristics to process physics. PRISM has all
this data in separate registries. This skill connects them.

## THE 9 REGISTRIES

| Registry | Entries | Contains |
|----------|---------|----------|
| Materials | 521 | Properties, machinability, thermal behavior |
| Machines | 402 | Capabilities, limits, axis configs |
| Tools | 0* | Geometries, coatings, manufacturers |
| Alarms | 10,033 | Codes, causes, fixes per controller |
| Formulas | 515 | Physics models, coefficients, domains |
| Skills | 131 | Manufacturing knowledge, procedures |
| Scripts | 161 | Automation, validation, analysis |
| Agents | 75 | AI capabilities, tier assignments |
| Hooks | 25 | Enforcement rules, triggers |

*Tools registry needs hydration — see prism-registry-hydrator

## SYNTHESIS PATTERNS

### Pattern 1: MATERIAL→MACHINE COMPATIBILITY
**Question:** "Can machine X handle material Y?"

```
1. prism_knowledge→cross_query("material [Y] machine requirements")
   → Surface: power needs, speed range, thermal demands
2. prism_data→material_get(Y) → specific cutting force, hardness
3. prism_data→machine_get(X) → max power, max speed, rigidity
4. SYNTHESIZE: 
   - Required power = kc × fz × ap × ae × Vc / (60000 × η)
   - Machine has power? Speed range covers required Vc?
   - If NO: suggest alternative machines OR modified parameters
   - If YES: calculate optimal operating point
```

### Pattern 2: ALARM→ROOT_CAUSE→PREVENTION
**Question:** "Why does this alarm keep happening?"

```
1. prism_data→alarm_decode(controller, code) → description
2. prism_data→alarm_search(related alarms) → co-occurring alarms
3. prism_knowledge→cross_query("alarm [code] causes material machine")
   → Surface: known correlations with materials/machines/processes
4. SYNTHESIZE:
   - Is this alarm material-dependent? (harder materials → more force alarms)
   - Is this alarm machine-dependent? (certain machines have known issues)
   - Is this alarm process-dependent? (certain operations trigger it)
   - PREVENTION: Address the root domain, not just the symptom
```

### Pattern 3: FORMULA→LIMITATION→ALTERNATIVE
**Question:** "This formula gives weird results for my case"

```
1. prism_knowledge→formula(formula_id) → domain, assumptions, limits
2. prism_knowledge→cross_query("alternative formulas for [domain]")
   → Surface: other formulas covering same domain
3. SYNTHESIZE:
   - Does the material fall outside formula assumptions?
     (e.g., Kienzle model assumes ductile material — fails on ceramics)
   - Is the speed range outside formula validity?
     (e.g., Taylor equation breaks down at very low speeds)
   - ALTERNATIVE: Suggest formula that covers this edge case
```

### Pattern 4: PROCESS→ANALOGY→INNOVATION
**Question:** "How can I improve [specific process]?"

```
1. prism_knowledge→cross_query("[process] optimization techniques")
   → Surface: known optimization approaches
2. prism_knowledge→search("similar process different material")
   → Surface: analogous processes in different domains
3. prism_toolpath→prism_novel(feature, constraints)
   → Surface: PRISM-novel strategies (34 available)
4. SYNTHESIZE:
   - Transfer techniques from analogous processes
   - Example: Trochoidal milling (designed for slots) applied to
     full-width cuts in hard materials → 3x tool life improvement
   - Example: Thermal management from grinding applied to
     hard turning → better white layer control
```

### Pattern 5: MULTI-CONSTRAINT OPTIMIZATION
**Question:** "I need [surface finish] AND [cycle time] AND [tool life]"

```
1. For each constraint, identify the governing formula:
   - Surface finish → Ra = f(fz, tool_radius, strategy)
   - Cycle time → T_cycle = f(Vc, fz, ap, ae, path_length)
   - Tool life → TL = f(Vc, fz, material, coating)
2. prism_knowledge→cross_query("tradeoff [constraints]")
   → Surface: known tradeoff relationships
3. prism_calc→multi_optimize(objectives, constraints)
   → Compute: Pareto front
4. SYNTHESIZE:
   - Where on the Pareto front does the user's priority lie?
   - Are there non-obvious solutions that satisfy all constraints?
     (e.g., switching to a different toolpath strategy can improve
     BOTH surface finish AND cycle time by reducing vibration)
```

## CROSS-REFERENCE DISCOVERY

When answering ANY manufacturing question, scan for cross-domain relevance:

| If discussing... | Also check... | Because... |
|-----------------|--------------|-----------|
| Material properties | Machine thermal limits | Hot material + cold machine = distortion |
| Cutting parameters | Alarm history | Parameters near limits trigger alarms |
| Tool selection | Machine rigidity | Stiff tools need stiff machines |
| Surface finish | Vibration modes | Chatter is the #1 finish killer |
| Tool life | Coolant type | Wrong coolant halves tool life |
| Cycle time | Tool change time | Often 20-40% of total |
| Cost per part | Scrap rate | One scrapped part = 10 good parts' profit |

## INTEGRATION

- **Primary engine:** prism_knowledge→cross_query (crosses all 9 registries)
- **Data access:** prism_data for specific lookups
- **Calculation:** prism_calc for quantitative analysis
- **Safety:** prism_safety for constraint checking
- **Learning:** Discovered cross-domain patterns → prism_guard→learning_save
  for future reuse
