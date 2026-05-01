---
name: prism-toolpath-strategy
description: |
  Deep guide to all 8 prism_toolpath actions. Feature-to-strategy mapping.
  Material-specific strategies. Novel PRISM strategies. Parameter calculation.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "toolpath", "strategy", "deep", "guide", "actions", "feature", "mapping"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-toolpath-strategy")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-toolpath-strategy") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What toolpath parameters for 316 stainless?"
→ Load skill: skill_content("prism-toolpath-strategy") → Extract relevant toolpath data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot strategy issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Toolpath Strategy
## All 8 prism_toolpath Actions

## Action Reference

| Action | Purpose | When |
|--------|---------|------|
| `strategy_select` | Pick best strategy for feature+material | Starting any new feature |
| `params_calculate` | Calculate strategy-specific parameters | After strategy selection |
| `strategy_search` | Find strategies by keyword | Exploring options |
| `strategy_list` | List all available strategies | Overview/comparison |
| `strategy_info` | Detailed info on specific strategy | Deep-dive on one strategy |
| `stats` | Strategy database statistics | System health check |
| `material_strategies` | Strategies optimized for a material | Material-first planning |
| `prism_novel` | PRISM-invented novel strategies | Pushing boundaries |

## Feature → Strategy Matrix

| Feature | Primary Strategy | Alternative | Hard Material |
|---------|-----------------|-------------|---------------|
| 2D Pocket | Trochoidal/Adaptive | Contour parallel | HSM adaptive |
| 3D Pocket | Adaptive clearing | Plunge roughing | Rest machining |
| Face | Face mill, fly cut | Shoulder stepping | Light passes |
| Slot | Trochoidal | Plunge + side mill | Peel milling |
| Contour (2D) | Profile with spring pass | Climb milling | Light radial DOC |
| 3D Surface | Scallop/Z-level | Pencil + flat finish | Constant engagement |
| Thread | Helical interpolation | Single-point | Thread milling |
| Hole (small) | Drill, peck drill | Helical interpolation | Carbide drill |
| Hole (large) | Helical bore | Circular interpolation | Ramping entry |
| Chamfer | Chamfer mill | Ball nose trace | Spot drill |
| Deburr | Ball nose trace | Chamfer pass | Manual |

## Material-Specific Rules

| Material Class | Strategy Bias | Why |
|---------------|--------------|-----|
| Aluminum | High speed, large engagement | Soft, low forces, clear chips fast |
| Steel (<30 HRC) | Adaptive/trochoidal, moderate | Balance productivity and life |
| Steel (>45 HRC) | HSM, light DOC, high speed | Minimize heat, avoid shock |
| Stainless | Constant engagement, avoid dwelling | Work hardening risk |
| Titanium | Low speed, high feed, heavy coolant | Heat management critical |
| Inconel/Super alloys | Ceramic at speed OR carbide slow | Extreme heat, rapid wear |
| Plastics | Sharp tools, low heat, air blast | Melting risk, burr control |

## Workflow
```
1. strategy_select(feature="pocket", material="Ti-6Al-4V", constraints={finish: "Ra 1.6"})
   → Returns: "adaptive_clearing" with confidence score

2. params_calculate(strategy="adaptive_clearing", material="Ti-6Al-4V", tool={D:12, z:4})
   → Returns: stepover, DOC, entry method, toolpath params

3. Validate with prism_calc→cutting_force() and prism_safety→check_spindle_torque()

4. If novel approach wanted: prism_novel(feature, material, objective)
   → Returns PRISM-invented strategies with physics validation
```

## Key Principles
- **Constant chip load:** Vary engagement angle, not feed rate
- **Avoid full slotting:** Radial engagement <50% when possible
- **Entry method matters:** Helical/ramp entry, never plunge into pocket
- **Rest machining:** Always clean up what larger tools missed
- **Climb milling preferred:** Better finish, lower heat, longer tool life
