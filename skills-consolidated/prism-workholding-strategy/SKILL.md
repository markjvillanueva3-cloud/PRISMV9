---
name: prism-workholding-strategy
description: |
  Fixture selection, clamping force, setup planning, datum strategy.
  Leverages prism_safety's 6 workholding actions. Process planning fundamentals.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "workholding", "strategy", "fixture", "selection", "clamping", "force", "setup"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-workholding-strategy")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-workholding-strategy") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What workholding parameters for 316 stainless?"
→ Load skill: skill_content("prism-workholding-strategy") → Extract relevant workholding data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot strategy issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Workholding Strategy
## Fixture Design + Setup Planning

## Workholding Selection

| Method | Best For | Max Force | Accuracy | prism_safety Action |
|--------|---------|-----------|----------|-------------------|
| Vise | Prismatic, small-medium | High | ±0.025mm | validate_workholding_setup |
| 3-jaw chuck | Round, turning | High | ±0.05mm | validate_workholding_setup |
| Collet | Round, tight tolerance | Medium | ±0.005mm | validate_workholding_setup |
| Fixture plate | Complex, production | High | ±0.01mm | calculate_clamp_force_required |
| Vacuum | Thin/flat, non-ferrous | Low | ±0.05mm | validate_vacuum_fixture |
| Magnetic | Ferrous, flat, grinding | Medium | ±0.02mm | validate_workholding_setup |
| Soft jaws | Irregular/finished surfaces | High | ±0.01mm | check_pullout_resistance |

## prism_safety Workholding Actions

| Action | Input | Output |
|--------|-------|--------|
| `calculate_clamp_force_required` | cutting forces, friction coeff | Required clamp force (N) |
| `validate_workholding_setup` | setup description, forces | Pass/fail with margins |
| `check_pullout_resistance` | grip area, friction, force | Pullout safety factor |
| `analyze_liftoff_moment` | forces, moment arms | Liftoff risk assessment |
| `calculate_part_deflection` | forces, support points, material | Deflection at cut point |
| `validate_vacuum_fixture` | area, vacuum level, forces | Vacuum holding adequacy |

## Setup Planning Principles

### Datum Strategy (3-2-1)
- **3 points** define primary plane (largest face)
- **2 points** define secondary plane (perpendicular edge)
- **1 point** defines tertiary (end stop)
- Always datum from finished/precision surfaces when possible

### Setup Sequencing
1. Machine datum features first (reference surfaces)
2. Roughing operations (highest forces, lowest accuracy needs)
3. Semi-finish (establish geometry)
4. Finish operations last (lowest forces, highest accuracy)
5. Deburr/chamfer as final passes

### Minimizing Setups
| Strategy | When |
|----------|------|
| 5-axis positioning | Complex geometry, multiple face access |
| Tombstone fixtures | Production, 4 parts per cycle |
| Trunnion/rotary | Wrap-around features, continuous 4th axis |
| Flip fixture | 2-setup with precision alignment pins |

## Workflow
```
1. Analyze part → identify features, surfaces, tolerances
2. Determine minimum setups → group by tool access direction
3. Select workholding per setup → vise/chuck/fixture
4. Calculate forces: prism_calc→cutting_force()
5. Validate: prism_safety→calculate_clamp_force_required(forces)
6. Check: prism_safety→analyze_liftoff_moment(forces, arms)
7. Verify: prism_safety→calculate_part_deflection(forces, supports)
```
