# /grinder-optimize — Grinding Program Optimization

Optimize grinding programs for cycle time, wheel life, or surface quality.

## Usage
```
/grinder-optimize [program-path] [--target cycle_time|wheel_life|surface]
```

## MCP Action
```
prism_grinding:grinder_optimize_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs optimization pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse existing program
2. Analyze current grinding parameters
3. Identify optimization opportunities
4. Run Pareto optimization across objectives
5. Check thermal constraints
6. Generate optimized program with delta report

## Optimization Targets
- **cycle_time**: Maximize MRR while avoiding thermal damage
- **wheel_life**: Minimize wheel wear and dressing frequency
- **surface**: Optimize for Ra/Rz and integrity targets
- **balanced**: Multi-objective Pareto optimization

## Output
- Optimized grinding program
- Parameter change summary
- Predicted improvements (%, CI)
- Thermal margin analysis

## Related
- `/grinder-validate` — Validate after optimization
- `/grinder-studio` — Full pipeline
