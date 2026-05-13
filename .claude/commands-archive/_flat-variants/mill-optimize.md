---
policy:
  tier: 1
  triggers:
    - "mill-optimize"
---
# /mill-optimize — Mill Program Optimization

Optimize milling programs for cycle time, tool life, or surface quality.

## Usage
```
/mill-optimize [program-path] [--target cycle_time|tool_life|surface_quality]
```

## MCP Action
```
prism_cam:mill_optimize_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs optimization pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after parameter space analysis, (2) after optimization proposal, (3) before final recommendation

## What it does
1. Parse existing G-code program
2. Analyze current speed/feed parameters
3. Identify optimization opportunities via MillOptimizationEngine
4. Run Pareto optimization across objectives
5. Apply tribal knowledge constraints
6. Generate optimized program with delta report
7. Validate optimizations don't violate safety

## Optimization Targets
- **cycle_time**: Maximize MRR while respecting tool life
- **tool_life**: Extend tool life via conservative parameters
- **surface_quality**: Optimize for Ra/Rz targets
- **balanced**: Multi-objective Pareto optimization

## Output
- Optimized G-code program
- Parameter change summary
- Predicted improvements (%, confidence interval)
- Risk assessment

## Related
- `/mill-validate` — Validate after optimization
- `/auto-speed-feed` — Recalculate speed/feed
- `/cycle-time-crush` — Aggressive cycle time reduction
