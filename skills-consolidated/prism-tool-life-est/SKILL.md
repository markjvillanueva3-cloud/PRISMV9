---
name: prism-tool-life-est
description: |
  Tool life estimation engine. Multi-factor tool life prediction with material, speed, feed, DOC, coolant variables.
  Source: C:/PRISM/extracted/formulas/PRISM_TOOL_LIFE_ESTIMATOR.js
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "tool life estimation", "tool life prediction", "remaining life", "tool change", "wear prediction"
- Source: `C:/PRISM/extracted/formulas/PRISM_TOOL_LIFE_ESTIMATOR.js`
- Category: manufacturing
- Auto-triggered by: AUTO_SKILL_HOOKS.json

### How To Use
1. Load via: `prism_skill_script->skill_content(id="prism-tool-life-est")`
2. Or auto-loaded when context matches trigger keywords
3. Cross-reference with prism_calc dispatcher for computations

### What It Returns
- **Format**: Calculation results with formulas, parameters, and units
- **Source Code**: `C:/PRISM/extracted/formulas/PRISM_TOOL_LIFE_ESTIMATOR.js`
