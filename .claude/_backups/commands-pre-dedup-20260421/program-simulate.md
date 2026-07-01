# /program-simulate — Universal CNC Program Simulation

Simulate CNC programs across all machine types with physics-based validation, collision detection, and cycle time prediction.

## Usage
```
/program-simulate [program-path] [--machine machine-id]
```

## MCP Action
```
prism_cam:program_simulate
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs simulation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse program and detect machine type
2. Load machine kinematics model
3. Simulate toolpath with physics
4. Detect collisions (tool-fixture, tool-part, rapid moves)
5. Predict cycle time with acceleration profiles
6. Calculate material removal and forces
7. Generate simulation report

## Machine Types
- **Mill**: 3-axis, 4-axis, 5-axis
- **Lathe**: 2-axis, live tooling, mill-turn
- **Wire EDM**: 2-axis, 4-axis taper
- **Sinker EDM**: Orbital, vector motion
- **Grinder**: OD, ID, surface, centerless

## Output
- Collision report (pass/fail)
- Cycle time estimate (with confidence)
- Force/power profile
- Material removal visualization

## Related
- `/mill-validate` — Mill-specific validation
- `/lathe-validate` — Lathe-specific validation
- `/cnc-simulate` — Legacy simulation command
