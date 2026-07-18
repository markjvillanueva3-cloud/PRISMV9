# /grinder-studio — Grinding Studio Pipeline

Launch the Grinding Studio wizard — full pipeline from part geometry to optimized grinding program with wheel selection, dressing cycles, and surface integrity prediction.

## Usage
```
/grinder-studio [part-path] [material]
```

## MCP Action
```
prism_grinding:grinder_studio_pipeline
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives full geometry-to-program grinding pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after wheel/material selection, (2) after grinding parameter calculation, (3) after program generation — to validate thermal damage risk

## What it does
1. Import part geometry + select material
2. Select grinding wheel (type, grit, bond, grade)
3. Calculate grinding parameters (wheel speed, work speed, depth of cut, cross feed)
4. Predict specific grinding energy via GrindingEnergyEngine
5. Check thermal damage threshold (burn, temper, rehardening)
6. Generate dressing cycle parameters
7. Assemble grinding program with spark-out passes
8. Post-process for target controller

## Request Types
- `quick` — Fast parameter recommendation
- `full_program` — Complete program generation
- `wheel_select` — Wheel selection assistance
- `thermal_check` — Thermal damage prediction
- `dress_cycle` — Dressing parameter optimization
- `deep_analyze` — Full AI analysis

## Related
- `/grinder-validate` — Program validation
- `/grinder-optimize` — Parameter optimization
- `/grinder-learn` — Knowledge extraction
- `/grinder-harden` — Machine-specific hardening
