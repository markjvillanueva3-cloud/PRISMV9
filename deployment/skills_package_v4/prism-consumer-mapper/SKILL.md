---
name: prism-consumer-mapper
description: Auto-generate consumer wiring for PRISM's 100% utilization requirement. Use when mapping database consumers, generating wiring code, verifying 6+ source calculations, or blocking incomplete modules. Critical for Stage 3 migration.
---

# PRISM Consumer Mapper

Auto-generates consumer wiring to achieve 100% utilization.

## Core Requirement

**NO module imported without ALL consumers wired.**

## Consumer Matrix

Every database has required consumers:

### PRISM_MATERIALS_MASTER (15 consumers)
| Consumer | Uses Fields |
|----------|-------------|
| SPEED_FEED_CALCULATOR | base_speed, machinability, hardness |
| FORCE_CALCULATOR | kc1_1, mc, yield_strength |
| THERMAL_ENGINE | conductivity, specific_heat, melting_point |
| TOOL_LIFE_ENGINE | taylor_n, taylor_C, abrasiveness |
| SURFACE_FINISH_ENGINE | elasticity, built_up_edge_tendency |
| CHATTER_PREDICTION | damping_ratio, elastic_modulus |
| CHIP_FORMATION_ENGINE | strain_hardening, chip_type |
| COOLANT_SELECTOR | reactivity, coolant_compatibility |
| COATING_OPTIMIZER | chemical_affinity, temperature_limit |
| COST_ESTIMATOR | material_cost, density |
| CYCLE_TIME_PREDICTOR | all cutting parameters |
| QUOTING_ENGINE | material_cost, machinability |
| AI_LEARNING_PIPELINE | ALL fields |
| BAYESIAN_OPTIMIZER | uncertainty in parameters |
| EXPLAINABLE_AI | ALL for explanation |

## Scripts

```python
# Map all consumers for a database
python scripts/map_consumers.py --module PRISM_MATERIALS_MASTER

# Generate wiring code
python scripts/generate_wiring.py --module PRISM_MATERIALS_MASTER --output wiring.js

# Verify calculation uses 6+ sources
python scripts/verify_6_sources.py --calc calculateOptimalSpeed

# Block incomplete module
python scripts/block_incomplete.py --module PRISM_TOOLS_DATABASE --consumers 8
```

## Wiring Code Template

```javascript
// Auto-generated wiring for PRISM_MATERIALS_MASTER
const PRISM_MATERIALS_WIRING = {
  module: 'PRISM_MATERIALS_MASTER',
  consumers: [
    {
      name: 'PRISM_SPEED_FEED_CALCULATOR',
      fields: ['base_speed', 'machinability', 'hardness'],
      gateway_route: '/api/speed-feed/calculate',
      priority: 'CRITICAL'
    },
    // ... 14 more consumers
  ],
  verification: {
    minConsumers: 15,
    allRequired: true,
    lastVerified: '2026-01-21'
  }
};
```

## 6-Source Calculation Requirement

Every calculation MUST include:
1. **Database source** - Material/tool/machine properties
2. **Physics model** - Force, thermal, dynamics
3. **AI/ML prediction** - Bayesian, neural, ensemble
4. **Historical data** - Past successful runs
5. **Manufacturer data** - Catalog specifications
6. **Empirical validation** - Validated against real cuts

## Output Format

```javascript
{
  value: optimal_speed,
  confidence: 0.87,
  range_95: [min, max],
  sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],
  explanation: PRISM_XAI.explain(calculation_trace)
}
```

See `references/consumer_matrix.md` for complete 62-database mapping.
