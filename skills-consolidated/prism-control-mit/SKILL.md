---
name: prism-control-mit
description: |
  Control systems from MIT courses (2.004, 6.302). PID controllers, Ziegler-Nichols tuning, step response analysis, stability criteria.

  MIT 2.004 (Dynamics & Control II), MIT 6.302 (Feedback Systems)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "PID", "controller", "Ziegler-Nichols", "step response", "stability", "root locus", "Routh-Hurwitz", "pole placement", "observer"
- Source: `C:/PRISM/extracted/algorithms/PRISM_CONTROL_SYSTEMS_MIT.js`
- Category: control-systems

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-control-mit")`
2. Functions available: createPIDController, zieglerNicholsTuning, firstOrderStep, secondOrderStep, routhHurwitz, polePlacement, observerDesign
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_CONTROL_SYSTEMS_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply createPIDController() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Control Mit

## Source
**MIT 2.004 (Dynamics & Control II), MIT 6.302 (Feedback Systems)**

## Functions
createPIDController, zieglerNicholsTuning, firstOrderStep, secondOrderStep, routhHurwitz, polePlacement, observerDesign

## Integration
- Extracted from: `PRISM_CONTROL_SYSTEMS_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: PID, controller, Ziegler-Nichols, step response, stability
