---
name: prism-dispatcher-composer
description: |
  Transforms 31 isolated dispatchers (368 actions) into intelligent, chainable
  manufacturing workflows. The conductor that orchestrates the orchestra.
  Use when: Any multi-step manufacturing question, complex queries requiring
  data from multiple sources, end-to-end analysis, or when cadence hints
  suggest multiple dispatchers. Auto-composes chains from intent.
  Key insight: Cadence already RECOMMENDS agents/skills/ATCS — this skill
  makes those recommendations EXECUTABLE as dispatcher chains.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "dispatcher", "composer", "transforms", "isolated", "dispatchers", "actions", "intelligent"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-dispatcher-composer")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-dispatcher-composer") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What dispatcher parameters for 316 stainless?"
→ Load skill: skill_content("prism-dispatcher-composer") → Extract relevant dispatcher data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot composer issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Dispatcher Composer
## 31 Dispatchers → Intelligent Workflows

## THE PROBLEM THIS SOLVES

Current state: Each dispatcher is called in isolation. To answer "What cutting
parameters should I use for Inconel 718 on a DMG MORI DMU 50?", a developer must
manually know to call prism_data→material_get, then prism_data→machine_get, then
prism_calc→speed_feed, then prism_safety→check_spindle_torque, then
prism_toolpath→strategy_select. Five separate calls, correct ordering required.

This skill makes that ONE intent → ONE composed chain → ONE validated result.

## CHAIN TEMPLATES

### Template: FULL_MACHINING_ANALYSIS
**Intent patterns:** "What parameters for [material] on [machine]?",
"How should I machine [material]?", "Cutting data for [operation]"

```
Step 1: prism_data→material_get(material_id)
  → Extract: kc1_1, mc, hardness, thermal_conductivity, iso_group
Step 2: prism_data→machine_get(machine_id)  [if specified]
  → Extract: max_rpm, max_power_kw, max_torque_Nm, axis_config
Step 3: prism_calc→speed_feed(material, operation, tool_diameter, teeth)
  → Extract: Vc, fz, n, Vf
Step 4: prism_calc→cutting_force(material, Vc, fz, ap, ae, D, z)
  → Extract: Fc, power, torque
Step 5: prism_safety→check_spindle_power(power vs machine max)
  → Gate: PASS/FAIL — if FAIL, reduce ap/ae and loop Step 3-5
Step 6: prism_calc→tool_life(material, Vc, fz, operation)
  → Extract: T_minutes, confidence
Step 7: prism_toolpath→strategy_select(feature, material, machine)
  → Extract: recommended_strategy, params
Step 8: prism_calc→surface_finish(strategy, fz, tool_radius)
  → Extract: Ra_predicted, Rz_predicted
FINAL: Compose results into structured machining recommendation
```

### Template: ALARM_DIAGNOSIS
**Intent patterns:** "What does alarm [code] mean?", "Machine threw [alarm]",
"How do I fix [error] on [controller]?"

```
Step 1: prism_data→alarm_decode(controller, alarm_code)
  → Extract: description, severity, category
Step 2: prism_data→alarm_fix(controller, alarm_code)
  → Extract: fix_steps, common_causes
Step 3: prism_data→alarm_search(category=same, controller=same)
  → Extract: related_alarms (often appear together)
Step 4: prism_knowledge→cross_query(alarm + material + machine context)
  → Extract: historical patterns, known correlations
FINAL: Root cause analysis + fix procedure + prevention recommendations
```

### Template: MATERIAL_COMPARISON
**Intent patterns:** "Compare [mat_A] vs [mat_B]", "Should I use [material]?",
"What's the best material for [application]?"

```
Step 1: prism_data→material_compare(material_a, material_b)
  → Extract: property deltas, machinability_rating
Step 2: prism_calc→speed_feed(material_a...) + prism_calc→speed_feed(material_b...)
  → Extract: parameter differences
Step 3: prism_calc→tool_life(material_a...) + prism_calc→tool_life(material_b...)
  → Extract: tool life comparison
Step 4: prism_calc→cost_optimize(both materials, batch_size)
  → Extract: cost_per_part comparison
FINAL: Decision matrix with clear winner for specified criteria
```

### Template: THREADING_COMPLETE
**Intent patterns:** "Thread specs for [size]", "Tap drill for [thread]",
"Mill thread [specification]"

```
Step 1: prism_thread→get_thread_specifications(thread_standard, size, pitch)
  → Extract: full spec, tolerances, class
Step 2: prism_thread→calculate_tap_drill(thread_spec)
  → Extract: drill_size, percent_engagement
Step 3: prism_thread→calculate_thread_cutting_params(material, method)
  → Extract: speed, feed, passes
Step 4: prism_safety→check_chip_load_limits(params vs tool limits)
  → Gate: PASS/FAIL
Step 5: prism_thread→generate_thread_gcode(controller, params)
  → Extract: executable G-code
FINAL: Complete threading package ready for production
```

### Template: PROCESS_OPTIMIZATION
**Intent patterns:** "Optimize [operation]", "Reduce cycle time",
"Improve tool life for [process]"

```
Step 1: prism_calc→multi_optimize(objectives=[cycle_time, tool_life, cost])
  → Extract: pareto_front, recommended_point
Step 2: prism_calc→stability(rpm, depth, material, tool)
  → Extract: stability_lobe, safe_zone
Step 3: prism_safety→predict_tool_breakage(params, material)
  → Gate: breakage_risk < threshold
Step 4: prism_calc→thermal(params, material)
  → Extract: max_temp, thermal_damage_risk
Step 5: prism_toolpath→prism_novel(feature, constraints)
  → Extract: novel_strategy if applicable
FINAL: Optimized parameters with safety validation
```

## CHAIN COMPOSITION RULES

1. **Safety gates are non-negotiable.** Every chain with physical parameters MUST
   include at least one prism_safety check. Failed gates trigger parameter reduction
   and re-execution, never bypass.

2. **Data dependencies flow forward.** Step N uses outputs from Steps 1..N-1.
   Never call a step that needs data from a later step.

3. **Knowledge enrichment is optional but valuable.** prism_knowledge→cross_query
   can be added to ANY chain to surface historical patterns and correlations.

4. **Validation closes every chain.** Final step validates the composed result
   against known bounds: prism_validate→safety for S(x)≥0.70.

5. **Failed steps don't kill chains.** If prism_data→machine_get returns nothing
   (machine not in registry), continue with conservative defaults and flag it.

## DYNAMIC COMPOSITION

For queries that don't match templates, compose chains dynamically:

```
1. Parse intent → identify required data domains
2. Map domains to dispatchers:
   - Material data → prism_data
   - Machine capabilities → prism_data  
   - Physics/calculations → prism_calc
   - Safety validation → prism_safety
   - Toolpath selection → prism_toolpath
   - Threading → prism_thread
   - Knowledge correlation → prism_knowledge
   - Quality validation → prism_validate, prism_omega
3. Order by data dependency (inputs before consumers)
4. Insert safety gates after every calculation step
5. Execute sequentially, passing outputs forward
6. Validate composed result
```

## INTEGRATION WITH CADENCE

The cadence system (auto-fire at call intervals) already generates:
- 🤖 AGENT_REC: Suggested agent and tier
- 💡 SKILL_HINTS: Relevant skills
- 🔄 ATCS: Task decomposition suggestions

**This skill makes those recommendations actionable:**
- AGENT_REC suggests opus tier → escalate safety-critical steps
- SKILL_HINTS → load referenced skills for domain knowledge
- ATCS recommended → decompose into autonomous units

## ANTI-PATTERNS

- ❌ Calling dispatchers in parallel when outputs depend on each other
- ❌ Skipping safety gates to "save calls"
- ❌ Hardcoding values instead of querying registries
- ❌ Ignoring uncertainty bounds from calculation steps
- ❌ Chains longer than 10 steps without intermediate validation
