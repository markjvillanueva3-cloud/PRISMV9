---
name: prism-force-formulas
description: |
  Cutting force lookup tables and formulas. Specific cutting force (Kc) by material, force components for turning/milling/drilling.
  Source: C:/PRISM/extracted/formulas/PRISM_FORCE_LOOKUP.js
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cutting force", "Kc", "specific cutting force", "force lookup", "tangential force", "feed force"
- Source: `C:/PRISM/extracted/formulas/PRISM_FORCE_LOOKUP.js`
- Category: manufacturing
- Auto-triggered by: AUTO_SKILL_HOOKS.json

### How To Use
1. Load via: `prism_skill_script->skill_content(id="prism-force-formulas")`
2. Or auto-loaded when context matches trigger keywords
3. Cross-reference with prism_calc dispatcher for computations

### What It Returns
- **Format**: Calculation results with formulas, parameters, and units
- **Source Code**: `C:/PRISM/extracted/formulas/PRISM_FORCE_LOOKUP.js`
