---
name: prism-utilization
description: |
  Database and module utilization tracking.
---

Ensures 100% utilization of all PRISM databases and engines.

## Core Principle

**NO MODULE WITHOUT CONSUMERS. NO CALCULATION WITH <6 SOURCES.**

## Utilization Requirements

### Databases
| Database | Min Consumers |
|----------|---------------|
| PRISM_MATERIALS_MASTER | 15 |
| PRISM_MACHINES_DATABASE | 12 |
| PRISM_TOOLS_DATABASE | 10 |
| All other databases | 8 |

### Calculations
Every calculation MUST use 6+ sources:
1. Database source (material/tool/machine properties)
2. Physics model (force, thermal, dynamics)
3. AI/ML prediction (Bayesian, neural, ensemble)
4. Historical data (past successful runs)
5. Manufacturer data (catalog specifications)
6. Empirical validation (validated against real cuts)

## Verification Scripts

```python
# Verify module before import
python scripts/verify_before_import.py --module PRISM_MATERIALS_MASTER --consumers 15

# Verify calculation sources
python scripts/verify_calculation.py --calc calculateOptimalSpeed --sources 6

# Generate utilization report
python scripts/utilization_report.py --output report.md
```

## Block Incomplete Imports

```python
# This will FAIL if requirements not met
python scripts/verify_before_import.py --module PRISM_MATERIALS_MASTER --consumers 10
# ERROR: BLOCKED - Requires 15 consumers, only 10 provided
```

## Required Consumers Matrix

See `references/consumer_matrix.md` for complete database→consumer mapping.

## Output Requirements

Every calculation output MUST include:
```javascript
{
  value: optimal_speed,
  confidence: 0.87,
  range_95: [min, max],
  sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],
  explanation: PRISM_XAI.explain(calculation_trace)
}
```

## Integration

Updates CURRENT_STATE.json with utilization metrics:
```json
{
  "migrationProgress": {
    "modulesImported": 50,
    "utilizationVerified": 50,
    "avgConsumers": 12.3
  }
}
```
