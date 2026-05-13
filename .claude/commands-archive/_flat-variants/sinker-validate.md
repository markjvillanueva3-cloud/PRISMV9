---
policy:
  tier: 1
  triggers:
    - "sinker-validate"
---
# /sinker-validate — Sinker EDM Program Validation

Validate sinker EDM programs against discharge physics, electrode wear limits, and surface integrity requirements.

## Usage
```
/sinker-validate [program-path]
```

## MCP Action
```
prism_edm:sinker_validate_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs validation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse EDM program
2. Validate discharge parameters against physics limits
3. Check electrode wear ratio predictions
4. Verify surface roughness targets achievable
5. Validate flushing adequacy
6. Check recast layer thickness predictions
7. Generate validation report

## Validation Checks
- **Physics**: Discharge energy, MRR limits, gap voltage stability
- **Electrode**: Wear ratio, corner retention, redress requirements
- **Surface**: VDI/Ra targets, recast layer, HAZ depth
- **Process**: Flushing pressure, duty cycle, thermal stability

## Related
- `/sinker-studio` — Full programming pipeline
- `/sinker-optimize` — Optimization focus
