---
name: prism-cost-optimizer
description: |
  Tool life vs productivity balancing. Cost-per-part calculations.
  Tool change optimization. Uses prism_calc cost_optimize and multi_optimize.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cost", "optimizer", "tool", "life", "productivity", "balancing", "calculations"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cost-optimizer")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cost-optimizer") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cost parameters for 316 stainless?"
→ Load skill: skill_content("prism-cost-optimizer") → Extract relevant cost data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot optimizer issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Cost Optimizer
## Economics of Machining

## Cost-Per-Part Breakdown
```
C_part = C_machining + C_tool + C_setup + C_material + C_overhead

Where:
C_machining = (cycle_time / 60) × machine_rate_per_hour
C_tool = (tool_cost / tool_life_parts)
C_setup = (setup_time / 60) × labor_rate / batch_size
C_material = raw_material_cost × (1 + scrap_rate)
C_overhead = C_machining × overhead_multiplier
```

## Optimization Strategies

### Strategy 1: Maximum Production Rate
- Higher speeds → shorter cycle time but lower tool life
- Optimal: minimize (cycle_time + tool_change_time/parts_per_tool)
- Use: `prism_calc→cost_optimize({objective: "max_production"})`

### Strategy 2: Minimum Cost Per Part
- Moderate speeds → balance cycle time and tool life
- Optimal: minimize total C_part
- Use: `prism_calc→cost_optimize({objective: "min_cost"})`

### Strategy 3: Multi-Objective (Pareto)
- Balance speed, cost, finish, tool life simultaneously
- Use: `prism_calc→multi_optimize({objectives: ["cost", "productivity", "finish"]})`
- Returns Pareto front: set of non-dominated solutions

## Key Trade-offs

| Increase | Effect on Cost | Effect on Time | Effect on Quality |
|----------|---------------|----------------|-------------------|
| Cutting speed +20% | Tool cost ↑↑, machine cost ↓ | Cycle ↓ 15% | Finish may degrade |
| Feed rate +20% | Tool cost ↑, machine cost ↓ | Cycle ↓ 18% | Finish degrades |
| Depth of cut +50% | Tool cost ↑, passes ↓↓ | Cycle ↓ 30% | Force ↑, deflection ↑ |
| Better tool grade | Tool cost ↑↑ | Often ↓ (higher speed) | Usually neutral/better |

## Tool Life Economics
```
Taylor: VT^n = C → T = (C/V)^(1/n)

Parts per tool = T / cycle_time_per_part
Cost per part (tool) = tool_cost / parts_per_tool

Sweet spot: where d(C_total)/d(V) = 0
  V_opt = C × [(1-n)/(n × (tool_cost/machine_rate + change_time))]^n
```

## Batch Size Impact
| Batch | Setup amortization | Strategy |
|-------|-------------------|----------|
| 1-5 | High per-part | Minimize setup, use general-purpose tools |
| 6-50 | Moderate | Balance setup vs cycle time |
| 50-500 | Low | Optimize cycle time, dedicated fixtures worth it |
| 500+ | Negligible | Maximum production rate, dedicated tooling |

## Workflow
```
1. prism_calc→speed_feed(material, tool) → baseline params
2. prism_calc→tool_life(material, baseline) → baseline life
3. prism_calc→cycle_time(toolpath, baseline) → baseline time
4. prism_calc→cost_optimize({
     material, tool, machine,
     machine_rate: 85,      // $/hour
     tool_cost: 25,         // $ per insert/tool
     change_time: 2,        // minutes per tool change
     batch_size: 100,
     objective: "min_cost"
   }) → optimized params + cost breakdown
5. Compare: baseline cost vs optimized cost → savings per part
```
