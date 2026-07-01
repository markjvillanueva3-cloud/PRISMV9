# /grinder-validate — Grinding Program Validation

Validate grinding programs against thermal limits, wheel specifications, and surface integrity requirements.

## Usage
```
/grinder-validate [program-path]
```

## MCP Action
```
prism_grinding:grinder_validate_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs validation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse grinding program
2. Validate grinding parameters against wheel limits
3. Check thermal damage threshold (burn index)
4. Verify specific grinding energy within bounds
5. Validate dressing parameters
6. Check surface roughness predictions
7. Generate validation report

## Validation Checks
- **Thermal**: Burn index, temper risk, rehardening zones
- **Wheel**: Speed limits, grit load, bond breakdown
- **Surface**: Ra/Rz targets, roundness, cylindricity
- **Process**: Coolant adequacy, spark-out sufficiency

## Related
- `/grinder-studio` — Full programming pipeline
- `/grinder-optimize` — Optimization focus
