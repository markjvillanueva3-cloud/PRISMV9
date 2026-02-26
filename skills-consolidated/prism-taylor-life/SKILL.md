---
name: prism-taylor-life
description: |
  Taylor tool life equations from MIT 2.008/2.810. Extended Taylor (V*T^n*f^a*d^b=C) for 150 material/tool combos, economic speed optimization.

  MIT 2.008 (Design & Manufacturing), MIT 2.810 (Manufacturing Processes)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "tool life", "Taylor equation", "tool wear", "economic speed", "cutting speed", "VTn", "tool material", "flank wear"
- Source: `C:/PRISM/extracted/algorithms/PRISM_TAYLOR_TOOL_LIFE.js`
- Category: manufacturing

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-taylor-life")`
2. Functions available: calculateToolLife, calculateEconomicSpeed, getAvailableToolMaterials
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_manufacturing

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_TAYLOR_TOOL_LIFE.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply calculateToolLife() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Taylor Life

## Source
**MIT 2.008 (Design & Manufacturing), MIT 2.810 (Manufacturing Processes)**

## Functions
calculateToolLife, calculateEconomicSpeed, getAvailableToolMaterials

## Integration
- Extracted from: `PRISM_TAYLOR_TOOL_LIFE.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: tool life, Taylor equation, tool wear, economic speed, cutting speed
