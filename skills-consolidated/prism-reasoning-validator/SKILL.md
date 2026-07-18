---
name: prism-reasoning-validator
description: |
  Validates multi-step manufacturing reasoning chains BEFORE outputs reach users.
  Catches wrong intermediate values that produce plausible but deadly final answers.
  Covers: dimensional analysis, bound propagation, physical plausibility, circular
  reasoning detection, and chain completeness. Safety-critical — S(x)≥0.70 enforced.
  Use when: ANY multi-step calculation chain, parameter recommendations, process
  optimization results, or whenever prism_calc is called more than once in sequence.
  Key insight: Current validation checks OUTPUTS. This checks REASONING.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "reasoning", "validator", "validates", "multi", "step", "manufacturing", "chains"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-reasoning-validator")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-reasoning-validator") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What reasoning parameters for 316 stainless?"
→ Load skill: skill_content("prism-reasoning-validator") → Extract relevant reasoning data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot validator issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Reasoning Chain Validator
## Validate the Reasoning, Not Just the Answer
## ⚠️ SAFETY-CRITICAL: Lives depend on correct intermediate steps

## THE PROBLEM

A cutting force calculation chains through 5+ steps:
  Speed → Force → Power → Torque → Deflection → Surface Finish

If Step 2 uses the wrong Kienzle exponent (mc), Steps 3-5 produce values
that LOOK reasonable but are WRONG. Current validation only checks if the
final surface finish is in a plausible range. This skill catches the error
at Step 2, where it actually happened.

## VALIDATION CHECKS

### Check 1: DIMENSIONAL ANALYSIS
Every intermediate value must have correct units.

| Chain Step | Expected Units | Common Error |
|-----------|---------------|-------------|
| Cutting speed Vc | m/min | Confusing with mm/min (1000x error) |
| Feed per tooth fz | mm/tooth | Confusing with mm/rev (z× error) |
| Cutting force Fc | N | Confusing with kN (1000x error) |
| Power P | kW | Confusing with W (1000x error) |
| Torque T | N·m | Confusing with N·mm (1000x error) |
| Temperature | °C | Confusing with K (273 offset) |
| Surface roughness Ra | μm | Confusing with mm (1000x error) |

**Rule:** At every step, verify: output_units = f(input_units) dimensionally.
If units don't resolve, the formula application is WRONG.

### Check 2: PHYSICAL PLAUSIBILITY BOUNDS
Every intermediate value must be physically possible.

| Parameter | Absolute Min | Absolute Max | If Violated |
|-----------|-------------|-------------|-------------|
| Cutting speed Vc | 1 m/min | 2000 m/min | Formula error or wrong material |
| Feed per tooth fz | 0.001 mm | 2.0 mm | Unit confusion or wrong tool |
| Depth of cut ap | 0.01 mm | 50 mm | Likely unit error |
| Cutting force Fc | 1 N | 50,000 N | Exponent or coefficient error |
| Power P | 0.001 kW | 200 kW | Chain propagation error |
| Torque T | 0.001 N·m | 5,000 N·m | Power/speed ratio error |
| Temperature T | 20°C | 1,500°C | Model breakdown |
| Tool life T | 0.1 min | 10,000 min | Taylor coefficient error |
| Surface roughness Ra | 0.01 μm | 100 μm | Feed/geometry error |
| Deflection | 0 mm | 5 mm | Stiffness/force error |
| MRR | 0.01 cm³/min | 5,000 cm³/min | Parameter product error |

**Rule:** ANY value outside these bounds is a CHAIN ERROR, not just an outlier.
Trace back to find which step introduced the violation.

### Check 3: MONOTONICITY AND DIRECTION
Physical relationships have known directions.

| If This Increases... | This Must... | If Not: |
|---------------------|-------------|---------|
| Cutting speed | Force decreases (slightly) | Model error |
| Feed rate | Force increases | Coefficient sign error |
| Depth of cut | Force increases linearly | Exponent error |
| Hardness | Force increases | Material data error |
| Cutting speed | Temperature increases | Thermal model error |
| Cutting speed | Tool life decreases | Taylor exponent sign |
| Feed rate | Surface roughness increases | Geometry error |

**Rule:** If a relationship violates known monotonicity, the intermediate
step that broke it contains the error.

### Check 4: ENERGY CONSERVATION
Power relationships must be internally consistent.

```
P_cutting = Fc × Vc / (60 × 1000)  [kW]
T_spindle = P × 60 / (2π × n)       [N·m]
P_spindle ≥ P_cutting / η            (η = efficiency, 0.7-0.9)
```

**Rule:** If calculated spindle power < cutting power, the chain has an
energy conservation violation. Something is wrong upstream.

### Check 5: UNCERTAINTY PROPAGATION
Uncertainty must grow or stay constant through a chain, never shrink.

```
Step 1: Vc = 200 ± 10 m/min  (5% uncertainty)
Step 2: Fc = f(Vc) → Fc ± δFc  (uncertainty ≥ 5%)
Step 3: P = f(Fc, Vc) → P ± δP  (uncertainty ≥ max(δFc%, δVc%))
```

**Rule:** If a later step claims lower uncertainty than its inputs,
the uncertainty calculation is wrong. This is a SILENT DANGER because
the answer looks more confident than it should be.

### Check 6: CHAIN COMPLETENESS
Critical steps must not be skipped.

| If Calculating... | Must Also Check... | Why |
|------------------|-------------------|-----|
| Cutting parameters | Spindle power limit | Machine may not handle it |
| Tool life | Minimum depth of cut | Tool won't cut below threshold |
| Surface finish | Vibration stability | Chatter ruins finish |
| Cycle time | Tool change time | Often 20-40% of total |
| Cost per part | Setup time allocation | Dominates small batches |

**Rule:** A chain that skips a critical dependency is INCOMPLETE, even
if every present step is correct.

### Check 7: CIRCULAR REASONING DETECTION
Output must not feed back into its own input.

**Common traps:**
- Using "recommended Vc" to validate "calculated Vc" (comparing to self)
- Using tool life to select speed, then using that speed to calculate tool life
- Using surface finish to choose feed, then calculating finish from that feed

**Rule:** Track the provenance of every value. If a value's ancestry
includes itself, the chain contains circular reasoning.

## VALIDATION PROTOCOL

For any multi-step chain, execute in order:

```
1. LIST all intermediate values with units
2. RUN Check 1 (dimensional analysis) — BLOCKS on failure
3. RUN Check 2 (plausibility bounds) — BLOCKS on failure
4. RUN Check 3 (monotonicity) — WARNS, traces error source
5. RUN Check 4 (energy conservation) — BLOCKS on violation
6. RUN Check 5 (uncertainty propagation) — WARNS if shrinking
7. RUN Check 6 (completeness) — WARNS on missing dependencies
8. RUN Check 7 (circular reasoning) — BLOCKS on detection
9. IF all passed: prism_validate→safety to confirm S(x)≥0.70
```

## INTEGRATION

- **Hooks:** Fires on `calc:postCalc` for every prism_calc action
- **Chain detection:** If 2+ prism_calc calls occur in sequence,
  automatically trigger chain validation
- **Output gate:** Results must pass validation before reaching user
- **Learning:** Failed validations → prism_guard→learning_save for
  pattern accumulation and future prevention
