---
policy:
  tier: 1
  triggers:
    - "welder-optimize"
---
# /welder-optimize — Welding Program Optimization

Optimize welding programs for cycle time, distortion, or weld quality.

## Usage
```
/welder-optimize [program-path] [--target cycle_time|distortion|quality]
```

## MCP Action
```
prism_welding:welder_optimize_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs optimization pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse existing program
2. Analyze current weld parameters
3. Identify optimization opportunities
4. Run Pareto optimization across objectives
5. Check thermal constraints
6. Generate optimized program with delta report

## Optimization Targets
- **cycle_time**: Maximize deposition rate while maintaining quality
- **distortion**: Minimize distortion via sequence optimization
- **quality**: Optimize for penetration and fusion
- **balanced**: Multi-objective Pareto optimization

## Output
- Optimized welding program
- Parameter change summary
- Predicted improvements (%, CI)
- Distortion impact analysis

## Related
- `/welder-validate` — Validate after optimization
- `/welder-studio` — Full pipeline
