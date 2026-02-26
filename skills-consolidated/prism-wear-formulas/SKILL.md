---
name: prism-wear-formulas
description: |
  Tool wear lookup tables. Flank wear, crater wear, notch wear rates by material/speed/feed combinations.
  Source: C:/PRISM/extracted/formulas/PRISM_WEAR_LOOKUP.js
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "wear rate", "flank wear", "crater wear", "notch wear", "wear lookup", "wear prediction"
- Source: `C:/PRISM/extracted/formulas/PRISM_WEAR_LOOKUP.js`
- Category: manufacturing
- Auto-triggered by: AUTO_SKILL_HOOKS.json

### How To Use
1. Load via: `prism_skill_script->skill_content(id="prism-wear-formulas")`
2. Or auto-loaded when context matches trigger keywords
3. Cross-reference with prism_calc dispatcher for computations

### What It Returns
- **Format**: Calculation results with formulas, parameters, and units
- **Source Code**: `C:/PRISM/extracted/formulas/PRISM_WEAR_LOOKUP.js`
