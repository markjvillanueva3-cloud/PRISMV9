---
policy:
  tier: 1
  triggers:
    - "sinker-optimize"
---
# /sinker-optimize — Sinker EDM Program Optimization

Optimize sinker EDM programs for MRR, electrode wear, or surface quality.

## Usage
```
/sinker-optimize [program-path] [--target mrr|wear|surface]
```

## MCP Action
```
prism_edm:sinker_optimize_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs optimization pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse existing program
2. Analyze current discharge parameters
3. Identify optimization opportunities
4. Run Pareto optimization across objectives
5. Apply electrode material constraints
6. Generate optimized program with delta report

## Optimization Targets
- **mrr**: Maximize material removal rate
- **wear**: Minimize electrode wear ratio
- **surface**: Optimize for VDI/Ra targets
- **balanced**: Multi-objective Pareto optimization

## Output
- Optimized EDM program
- Parameter change summary
- Predicted improvements (%, CI)
- Electrode life impact

## Related
- `/sinker-validate` — Validate after optimization
- `/sinker-studio` — Full pipeline
