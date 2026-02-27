---
name: prism-hierarchy-manager
description: |
  4-layer database hierarchy management.
---

Manages the 4-layer database inheritance system.

## Layer Architecture

```
┌─────────────────────────────────────┐
│ LAYER 4: LEARNED (AI-generated)    │ ← Highest priority (with confidence)
│ - Auto-derived optimizations       │
│ - Can override USER/ENHANCED/CORE  │
├─────────────────────────────────────┤
│ LAYER 3: USER (Shop-specific)      │
│ - Custom configurations            │
│ - Can override ENHANCED/CORE       │
├─────────────────────────────────────┤
│ LAYER 2: ENHANCED (Manufacturer)   │ ← 33 manufacturers complete
│ - Full kinematic specs             │
│ - Can override CORE                │
├─────────────────────────────────────┤
│ LAYER 1: CORE (Infrastructure)     │ ← Foundation, cannot be overridden
│ - Base schemas, defaults           │
│ - Universal constants              │
└─────────────────────────────────────┘
```

## Propagation Rules

| When This Changes | These Inherit |
|-------------------|---------------|
| CORE | ENHANCED → USER → LEARNED |
| ENHANCED | USER → LEARNED |
| USER | LEARNED |
| LEARNED | Nothing (top level) |

## Scripts

```python
# Propagate changes from ENHANCED to higher layers
python scripts/propagate_changes.py --layer ENHANCED --module PRISM_HAAS_MACHINES

# Resolve inheritance for a specific machine
python scripts/resolve_inheritance.py --machine "HAAS VF-2" --property maxRpm

# Validate layer rules (no deletions, proper overrides)
python scripts/validate_layers.py --full

# Generate diff between layers
python scripts/generate_layer_diff.py --base ENHANCED --compare USER
```

## Inheritance Resolution

```javascript
// When requesting data, resolve through layers:
function getMachineData(machineId, property) {
  // 1. Check LEARNED (highest priority if confident)
  if (LEARNED[machineId]?.[property] && confidence > 0.8) {
    return { value: LEARNED[...], source: 'LEARNED' };
  }
  // 2. Check USER
  if (USER[machineId]?.[property]) {
    return { value: USER[...], source: 'USER' };
  }
  // 3. Check ENHANCED
  if (ENHANCED[machineId]?.[property]) {
    return { value: ENHANCED[...], source: 'ENHANCED' };
  }
  // 4. Fall back to CORE
  return { value: CORE[...], source: 'CORE' };
}
```

## Path Structure

```
EXTRACTED/databases/machines/
├── CORE/           ← 7 infrastructure DBs
├── ENHANCED/       ← 33 manufacturer DBs
├── USER/           ← Shop-specific (future)
└── LEARNED/        ← AI-derived (future)
```

## Validation Rules

1. **CORE cannot be overridden** - Only extended
2. **Lower layers can override** - But not delete
3. **LEARNED requires confidence** - Threshold 0.8
4. **Schema must match** - Same field names across layers

See `references/layer_rules.md` for complete rules.
