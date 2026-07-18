# /sinker-harden — Sinker EDM AI Hardening

Harden AI models for specific sinker EDM machines, electrode materials, or workpiece types.

## Usage
```
/sinker-harden [machine-id] [--focus electrode|workpiece|process]
```

## MCP Action
```
prism_ai:sinker_harden_model
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs hardening pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Profile target machine (Mitsubishi, Sodick, Makino, etc.)
2. Collect historical operation data
3. Identify model weaknesses
4. Generate hardening dataset
5. Fine-tune for target domain
6. Validate against holdout set
7. Deploy to machine registry

## Hardening Focus
- **electrode**: Specialize for electrode materials (graphite, copper, copper-tungsten)
- **workpiece**: Specialize for workpiece materials (tool steel, carbide, PCD)
- **process**: Specialize for process types (cavity, rib, thread)
- **all**: Full machine-specific hardening

## Output
- Hardened model checkpoint
- Accuracy improvement metrics
- Edge case coverage report

## Related
- `/machine-harden` — Generic machine hardening
- `/wire-edm-studio` — Wire EDM pipeline
