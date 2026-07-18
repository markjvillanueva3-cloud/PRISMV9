# /lathe-optimize — Lathe Program Optimization

Optimize turning programs for cycle time, tool life, or surface quality.

## Usage
```
/lathe-optimize [program-path] [--target cycle_time|tool_life|surface_quality]
```

## MCP Action
```
prism_turning:lathe_optimize_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs optimization pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse existing turning program
2. Analyze current speed/feed parameters
3. Identify optimization opportunities
4. Run Pareto optimization across objectives
5. Apply tribal knowledge constraints
6. Generate optimized program with delta report

## Optimization Targets
- **cycle_time**: Maximize MRR while respecting tool life
- **tool_life**: Extend tool life via conservative parameters
- **surface_quality**: Optimize for Ra/Rz targets
- **balanced**: Multi-objective Pareto optimization

## Output
- Optimized turning program
- Parameter change summary
- Predicted improvements (%, CI)
- Risk assessment

## Related
- `/lathe-validate` — Validate after optimization
- `/auto-speed-feed-lathe` — Lathe-specific speed/feed
