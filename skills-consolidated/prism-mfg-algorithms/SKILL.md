---
name: prism-mfg-algorithms
description: |
  Core manufacturing algorithms from MIT 2.008/2.810/2.830. Merchant cutting force model, MRR, extended Taylor, SPC control charts.

  MIT 2.008, MIT 2.810, MIT 2.830, Georgia Tech CNC Pathways
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cutting force", "Merchant", "MRR", "material removal rate", "chip formation", "specific energy", "power", "SPC", "control chart"
- Source: `C:/PRISM/extracted/algorithms/PRISM_MANUFACTURING_ALGORITHMS.js`
- Category: manufacturing

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-mfg-algorithms")`
2. Functions available: taylorToolLife, extendedTaylorToolLife, merchantCuttingForce
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_manufacturing

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_MANUFACTURING_ALGORITHMS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply taylorToolLife() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Mfg Algorithms

## Source
**MIT 2.008, MIT 2.810, MIT 2.830, Georgia Tech CNC Pathways**

## Functions
taylorToolLife, extendedTaylorToolLife, merchantCuttingForce

## Integration
- Extracted from: `PRISM_MANUFACTURING_ALGORITHMS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: cutting force, Merchant, MRR, material removal rate, chip formation
