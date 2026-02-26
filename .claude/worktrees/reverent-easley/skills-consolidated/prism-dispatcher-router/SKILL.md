---
name: prism-dispatcher-router
description: |
  Master routing skill. Maps ANY manufacturing query to optimal dispatcher chain.
  Entity extraction → intent classification → dispatcher selection → action sequencing.
  Eliminates wrong-tool usage. The single most important meta-skill.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "dispatcher", "router", "master", "routing", "maps", "manufacturing", "query"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-dispatcher-router")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-dispatcher-router") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What dispatcher parameters for 316 stainless?"
→ Load skill: skill_content("prism-dispatcher-router") → Extract relevant dispatcher data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot router issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Dispatcher Router
## Query → Optimal Dispatcher Chain

## Quick Reference: Keyword → Dispatcher

| Keywords in Query | Primary Dispatcher | Action |
|-------------------|-------------------|--------|
| speed, feed, SFM, IPM, Vc, fz | `prism_calc` | speed_feed |
| force, power, torque, Fc, kW | `prism_calc` | cutting_force, power |
| tool life, wear, Taylor | `prism_calc` | tool_life |
| surface finish, Ra, roughness | `prism_calc` | surface_finish |
| MRR, metal removal | `prism_calc` | mrr |
| deflection, runout | `prism_calc` | deflection |
| temperature, thermal | `prism_calc` | thermal |
| stability, chatter, lobes | `prism_calc` | stability |
| trochoidal, HSM, high speed | `prism_calc` | trochoidal, hsm |
| material, alloy, steel, aluminum | `prism_data` | material_get, material_search |
| compare materials | `prism_data` | material_compare |
| machine, CNC, VMC, lathe | `prism_data` | machine_get, machine_search |
| tool, endmill, insert, drill | `prism_data` | tool_get, tool_search, tool_recommend |
| alarm, error, fault, code | `prism_data` | alarm_decode, alarm_search, alarm_fix |
| thread, tap, pitch, engagement | `prism_thread` | (see threading-mastery) |
| toolpath, strategy, pocket, contour | `prism_toolpath` | strategy_select, params_calculate |
| collision, clearance, safe approach | `prism_safety` | check_toolpath_collision, validate_rapid_moves |
| spindle, torque limit, power limit | `prism_safety` | check_spindle_torque, check_spindle_power |
| coolant, MQL, chip evacuation | `prism_safety` | validate_coolant_flow, get_coolant_recommendations |
| clamp, fixture, workholding | `prism_safety` | calculate_clamp_force_required, validate_workholding |
| tool breakage, stress, fatigue | `prism_safety` | predict_tool_breakage, calculate_tool_stress |
| G-code, M-code, program | `prism_skill_script` | skill_search("gcode") |
| FANUC, Siemens, HAAS, Okuma | `prism_skill_script` | skill_search(controller name) |
| ISO, AS9100, ITAR, FDA, compliance | `prism_compliance` | apply_template, check_compliance |
| formula, equation, derivation | `prism_knowledge` | formula, search |
| hook, event, trigger | `prism_hook` | list, get, execute |
| validate, quality, omega, ralph | `prism_validate` / `prism_omega` / `prism_ralph` | (see validation-unified) |

## Multi-Dispatcher Chains

### "What parameters for [material] [operation]?"
```
1. prism_data→material_get(material)     // Get material properties
2. prism_data→tool_recommend(material, op) // Best tool for job
3. prism_calc→speed_feed(material, tool, op) // Calculate parameters
4. prism_safety→check_spindle_torque()    // Verify machine can handle it
```

### "Help me troubleshoot [problem]"
```
1. prism_data→alarm_decode(code)          // If alarm code given
   OR prism_knowledge→search(symptom)     // If description given
2. prism_data→alarm_fix(code)             // Get fix recommendations
3. prism_calc→[relevant calculation]      // Verify physics
4. prism_safety→[relevant check]          // Safety validation
```

### "Set up threading for [spec]"
```
1. prism_thread→get_thread_specifications(spec)
2. prism_thread→calculate_tap_drill(spec)
3. prism_thread→calculate_thread_cutting_params(spec)
4. prism_thread→generate_thread_gcode(spec, controller)
```

## Routing Decision Tree
```
Is it about CALCULATING something?
├── Yes → prism_calc (force, speed, life, finish, MRR, power, thermal, stability)
├── Is it about LOOKING UP data?
│   ├── Material/Machine/Tool/Alarm → prism_data
│   ├── Formula/Cross-domain → prism_knowledge
│   └── Skill/Script → prism_skill_script
├── Is it about THREADING?
│   └── Yes → prism_thread
├── Is it about TOOLPATH STRATEGY?
│   └── Yes → prism_toolpath
├── Is it about SAFETY/VALIDATION?
│   ├── Physical safety → prism_safety
│   ├── Data validation → prism_validate
│   ├── Quality score → prism_omega
│   └── Code review → prism_ralph
├── Is it about COMPLIANCE/REGULATORY?
│   └── Yes → prism_compliance
├── Is it about SESSION/CONTEXT?
│   ├── State/memory → prism_session
│   ├── Context management → prism_context
│   └── Cross-session → prism_memory
└── Is it about ORCHESTRATING multiple tasks?
    ├── Parallel agents → prism_orchestrate
    ├── Multi-session → prism_atcs
    └── Background → prism_autonomous
```
