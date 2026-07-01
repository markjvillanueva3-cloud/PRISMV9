# /welder-studio — Welding Studio Pipeline

Launch the Welding Studio wizard — full pipeline from joint geometry to optimized welding program with heat input optimization, distortion prediction, and weld quality assurance.

## Usage
```
/welder-studio [joint-path] [material]
```

## MCP Action
```
prism_welding:welder_studio_pipeline
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives full geometry-to-program welding pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after joint/material selection, (2) after weld parameter calculation, (3) after program generation — to validate distortion and HAZ predictions

## What it does
1. Import joint geometry + select material
2. Select welding process (MIG, TIG, laser, electron beam)
3. Calculate weld parameters (current, voltage, travel speed, wire feed)
4. Predict heat input and thermal cycle via WeldingThermalEngine
5. Check HAZ and distortion predictions
6. Generate weld sequence (minimize distortion)
7. Assemble welding program with inter-pass cooling
8. Post-process for robot/CNC controller

## Request Types
- `quick` — Fast parameter recommendation
- `full_program` — Complete program generation
- `process_select` — Process selection assistance
- `distortion_predict` — Distortion prediction
- `haz_analyze` — Heat affected zone analysis
- `deep_analyze` — Full AI analysis

## Related
- `/welder-validate` — Program validation
- `/welder-optimize` — Parameter optimization
- `/welder-learn` — Knowledge extraction
- `/welder-harden` — Machine-specific hardening
