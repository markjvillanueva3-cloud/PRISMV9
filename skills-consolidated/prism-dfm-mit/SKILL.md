---
name: prism-dfm-mit
description: |
  Design for Manufacturing from MIT courses (2.008, 2.810). Tolerance stackup analysis, process capability (Cp/Cpk/Cpm), defect rate estimation.

  MIT 2.008 (Design & Manufacturing), MIT 2.810 (Manufacturing Processes)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "DFM", "design for manufacturing", "tolerance stackup", "process capability", "Cpk", "Cp", "Cpm", "defect rate", "RSS tolerance"
- Source: `C:/PRISM/extracted/algorithms/PRISM_DFM_MIT.js`
- Category: manufacturing

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-dfm-mit")`
2. Functions available: toleranceStackup, processCapability, estimateDefectRate
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_manufacturing

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_DFM_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply toleranceStackup() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Dfm Mit

## Source
**MIT 2.008 (Design & Manufacturing), MIT 2.810 (Manufacturing Processes)**

## Functions
toleranceStackup, processCapability, estimateDefectRate

## Integration
- Extracted from: `PRISM_DFM_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: DFM, design for manufacturing, tolerance stackup, process capability, Cpk
