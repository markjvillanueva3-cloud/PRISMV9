---
name: prism-category-defaults
description: |
  Default parameter values for material categories. Provides baseline values when 
  specific material data is unavailable. DEPRECATED - merged into prism-material-templates.
  
  Status: DEPRECATED (Use prism-material-templates instead)
---

# PRISM Category Defaults (DEPRECATED)

> ⚠️ **DEPRECATED:** This skill has been merged into `prism-material-templates`
> Use `prism-material-templates` for all material category defaults

---

## Migration Guide

### Old Usage (Deprecated)
```javascript
// DON'T USE THIS
const defaults = PRISM_CATEGORY_DEFAULTS.get('carbon_steel');
```

### New Usage (Use This)
```javascript
// USE prism-material-templates instead
view("/mnt/skills/user/prism-material-templates/SKILL.md")
// Templates include category defaults built-in
```

---

## Why Deprecated

1. **Redundancy:** Category defaults are now embedded in material templates
2. **Better Structure:** Templates include defaults + validation in one place
3. **Maintenance:** Single source of truth easier to maintain

---

## Consumers (Historical)

These modules previously used category-defaults:
- PRISM_MATERIALS_MASTER → Now uses prism-material-templates
- PRISM_SPEED_FEED_CALCULATOR → Direct material lookups
- PRISM_COST_ESTIMATOR → Uses material database

---

## Replacement Skill

| Feature | Now In |
|---------|--------|
| Carbon steel defaults | prism-material-templates (LOW_CARBON_STEEL_TEMPLATE) |
| Aluminum defaults | prism-material-templates (ALUMINUM_ALLOY_TEMPLATE) |
| Titanium defaults | prism-material-templates (TITANIUM_ALLOY_TEMPLATE) |
| Stainless defaults | prism-material-templates (STAINLESS_STEEL_TEMPLATE) |

---

**Status:** DEPRECATED | **Replaced By:** prism-material-templates | **Version:** 1.0 (Final)
