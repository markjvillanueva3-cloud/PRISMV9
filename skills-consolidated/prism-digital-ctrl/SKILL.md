---
name: prism-digital-ctrl
description: |
  Digital control systems from MIT (2.171). Tustin discretization, zero-order hold, digital PID with anti-windup.

  MIT 2.171 (Digital Control), MIT 6.302
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "digital control", "Tustin", "discretization", "z-transform", "zero-order hold", "digital PID", "discrete controller", "sampling rate"
- Source: `C:/PRISM/extracted/algorithms/PRISM_DIGITAL_CONTROL_MIT.js`
- Category: control-systems

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-digital-ctrl")`
2. Functions available: tustinDiscretize, zohDiscretize, createDigitalPID
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_DIGITAL_CONTROL_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply tustinDiscretize() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Digital Ctrl

## Source
**MIT 2.171 (Digital Control), MIT 6.302**

## Functions
tustinDiscretize, zohDiscretize, createDigitalPID

## Integration
- Extracted from: `PRISM_DIGITAL_CONTROL_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: digital control, Tustin, discretization, z-transform, zero-order hold
