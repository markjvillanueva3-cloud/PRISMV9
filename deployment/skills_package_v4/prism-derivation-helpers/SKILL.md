---
name: prism-derivation-helpers
description: |
  Helper functions for deriving material properties from base data.
  DEPRECATED - merged into prism-physics-formulas.
  
  Status: DEPRECATED (Use prism-physics-formulas instead)
---

# PRISM Derivation Helpers (DEPRECATED)

> ⚠️ **DEPRECATED:** This skill has been merged into `prism-physics-formulas`
> Use `prism-physics-formulas` for all property derivations

---

## Migration Guide

### Old Usage (Deprecated)
```javascript
// DON'T USE THIS
const kc = deriveKienzle(material);
const toolLife = deriveTaylor(params);
```

### New Usage (Use This)
```javascript
// USE prism-physics-formulas instead
view("/mnt/skills/user/prism-physics-formulas/SKILL.md")
// Contains all derivation formulas with MIT course foundations
```

---

## Why Deprecated

1. **Consolidation:** All physics derivations now in one skill
2. **MIT Foundation:** prism-physics-formulas includes academic backing
3. **Complete Coverage:** 127 parameters all derivable from one skill

---

## Derivations Now In prism-physics-formulas

| Derivation | Formula Section |
|------------|-----------------|
| Kienzle kc1.1 | Cutting Force Models |
| Taylor tool life | Tool Life Equations |
| Johnson-Cook | Constitutive Models |
| Thermal conductivity | Material Properties |
| Yield strength | Mechanical Properties |

---

## Consumers (Historical)

These modules previously used derivation-helpers:
- PRISM_MATERIALS_MASTER → Now uses physics-formulas
- Material creation workflow → Uses templates + formulas
- PRISM_AI_LEARNING_PIPELINE → Direct formula access

---

**Status:** DEPRECATED | **Replaced By:** prism-physics-formulas | **Version:** 1.0 (Final)
