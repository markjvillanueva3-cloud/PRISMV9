# /welder-validate — Welding Program Validation

Validate welding programs against heat input limits, distortion constraints, and weld quality requirements.

## Usage
```
/welder-validate [program-path]
```

## MCP Action
```
prism_welding:welder_validate_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs validation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse welding program
2. Validate weld parameters against process limits
3. Check heat input per AWS/ISO standards
4. Verify HAZ width predictions
5. Validate distortion within tolerance
6. Check inter-pass temperature requirements
7. Generate validation report

## Validation Checks
- **Thermal**: Heat input, cooling rate, HAZ extent
- **Mechanical**: Distortion, residual stress predictions
- **Quality**: Penetration, fusion, porosity risk
- **Process**: Wire feed, shielding gas, preheat

## Related
- `/welder-studio` — Full programming pipeline
- `/welder-optimize` — Optimization focus
