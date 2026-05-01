---
name: prism-workflow-chains
description: |
  20 pre-built multi-dispatcher workflows for common manufacturing tasks.
  Each chain: trigger → step sequence → data flow → error handling.
  Eliminates reinventing dispatcher sequences every session.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "workflow", "chains", "built", "multi", "dispatcher", "workflows", "common"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-workflow-chains")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-workflow-chains") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What workflow parameters for 316 stainless?"
→ Load skill: skill_content("prism-workflow-chains") → Extract relevant workflow data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot chains issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Workflow Chains
## Pre-Built Multi-Dispatcher Sequences

## Chain 1: New Job Setup
**Trigger:** "Set up parameters for [material] [operation]"
```
prism_data→material_get(name) → material_props
prism_data→tool_recommend(material, operation) → tool_spec
prism_calc→speed_feed(material, tool, operation) → Vc, fz, ap, ae
prism_calc→cutting_force(material, Vc, fz, ap, ae, tool) → Fc, power
prism_safety→check_spindle_torque(required, machine_max) → OK/WARN
prism_safety→check_spindle_power(required, machine_max) → OK/WARN
OUTPUT: Complete parameter sheet with safety validation
```

## Chain 2: Material Comparison
**Trigger:** "Compare [mat_A] vs [mat_B] for [operation]"
```
prism_data→material_compare(mat_A, mat_B) → property diff
prism_calc→speed_feed(mat_A, tool, op) → params_A
prism_calc→speed_feed(mat_B, tool, op) → params_B
prism_calc→tool_life(mat_A, params_A) → life_A
prism_calc→tool_life(mat_B, params_B) → life_B
prism_calc→mrr(params_A) vs mrr(params_B) → productivity comparison
OUTPUT: Side-by-side comparison with cost/productivity analysis
```

## Chain 3: Threading Setup
**Trigger:** "Thread [spec] on [controller]"
```
prism_thread→get_thread_specifications(spec) → thread_data
prism_thread→calculate_tap_drill(spec) → drill_size
prism_thread→calculate_engagement_percent(spec) → engagement%
prism_thread→calculate_thread_cutting_params(spec, material) → speed/feed
prism_thread→get_go_nogo_gauges(spec) → gauge_specs
prism_thread→generate_thread_gcode(spec, controller) → program
OUTPUT: Complete threading package: drill, params, gauges, G-code
```

## Chain 4: Alarm Troubleshooting
**Trigger:** "Getting alarm [code] on [controller]"
```
prism_data→alarm_decode(code, controller) → meaning, severity
prism_data→alarm_fix(code, controller) → fix_steps
prism_knowledge→search(alarm description) → related knowledge
IF mechanical: prism_safety→[relevant check] → verify limits
IF parameter: prism_calc→[recalculate] → corrected values
OUTPUT: Root cause + fix steps + corrected parameters if applicable
```

## Chain 5: Toolpath Optimization
**Trigger:** "Best strategy for [feature] in [material]"
```
prism_toolpath→strategy_select(feature, material) → strategy
prism_toolpath→params_calculate(strategy, material, tool) → toolpath_params
prism_calc→speed_feed(material, tool, operation) → cutting_params
prism_calc→mrr(params) → productivity
prism_calc→surface_finish(params) → predicted Ra
prism_safety→check_toolpath_collision(toolpath) → clearance OK
OUTPUT: Strategy + params + predicted performance
```

## Chain 6: Tool Selection
**Trigger:** "What tool for [material] [operation] [constraints]"
```
prism_data→tool_search(operation, material) → candidates
prism_data→tool_recommend(material, operation, constraints) → top picks
FOR each candidate:
  prism_calc→speed_feed(material, tool) → params
  prism_calc→tool_life(material, params) → life
  prism_calc→mrr(params) → productivity
OUTPUT: Ranked tool recommendations with performance predictions
```

## Chain 7: Safety Audit
**Trigger:** "Verify safety for [operation setup]"
```
prism_safety→check_spindle_torque(required, max) → torque OK
prism_safety→check_spindle_power(required, max) → power OK
prism_safety→validate_spindle_speed(rpm, max_rpm) → speed OK
prism_safety→calculate_clamp_force_required(forces) → clamp force
prism_safety→validate_workholding_setup(setup) → holding OK
prism_safety→check_chip_load_limits(fz, material, tool) → chip OK
prism_safety→predict_tool_breakage(stress, limits) → breakage risk
OUTPUT: Safety checklist with pass/fail for each check
```

## Chain 8: Compliance Setup
**Trigger:** "Set up [framework] compliance"
```
prism_compliance→list_templates() → available frameworks
prism_compliance→apply_template(framework) → hooks provisioned
prism_compliance→gap_analysis(framework) → gaps found
prism_compliance→check_compliance(framework) → current status
OUTPUT: Compliance status + gaps + remediation steps
```

## Chain 9: Cost Optimization
**Trigger:** "Optimize cost per part for [setup]"
```
prism_calc→speed_feed(material, tool, op) → baseline params
prism_calc→tool_life(material, params) → baseline life
prism_calc→cost_optimize(material, tool, machine, constraints) → optimized
prism_calc→cycle_time(toolpath, params) → time per part
OUTPUT: Optimized params + cost breakdown + sensitivity analysis
```

## Chain 10: Process Validation
**Trigger:** "Validate my process parameters"
```
prism_validate→material(material_data) → material OK
prism_calc→cutting_force(params) → forces
prism_safety→check_spindle_torque(force_torque, limit) → torque OK
prism_safety→check_chip_load_limits(fz, material, tool) → chip OK
prism_calc→stability(params) → chatter risk
prism_calc→deflection(force, tool, stickout) → deflection
prism_calc→surface_finish(params) → predicted Ra vs target
OUTPUT: Process validation report with pass/fail per check
```

## Chains 11-20 (Quick Reference)

| # | Chain | Key Dispatchers |
|---|-------|----------------|
| 11 | Machine Capability Check | data→machine_get + machine_capabilities |
| 12 | Formula Lookup & Calculate | knowledge→formula + data→formula_calculate |
| 13 | Multi-Objective Optimization | calc→multi_optimize (speed+life+finish) |
| 14 | Fixture Design Validation | safety→clamp_force + pullout + liftoff + deflection |
| 15 | New Material Onboarding | data→material_get + validate→material + knowledge→cross_query |
| 16 | Predictive Maintenance Check | pfp→get_dashboard + assess_risk + get_patterns |
| 17 | Session Boot Workflow | dev→session_boot + context→todo_read + session→state_load |
| 18 | Build & Validate | dev→build + dev→test_smoke + guard→pattern_scan |
| 19 | Skill Creation Pipeline | sp→brainstorm + sp→plan + sp→execute + sp→review_quality |
| 20 | Emergency Recovery | session→state_load + context→memory_restore + session→quick_resume |
