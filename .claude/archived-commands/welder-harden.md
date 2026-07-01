# /welder-harden — Welding AI Hardening

Harden AI models for specific welding machines, processes, or material classes.

## Usage
```
/welder-harden [machine-id] [--focus process|material|joint]
```

## MCP Action
```
prism_ai:welder_harden_model
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs hardening pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Profile target machine (Fronius, Lincoln, Miller, robot cell)
2. Collect historical operation data
3. Identify model weaknesses
4. Generate hardening dataset
5. Fine-tune for target domain
6. Validate against holdout set
7. Deploy to machine registry

## Hardening Focus
- **process**: Specialize for processes (MIG, TIG, laser, EB)
- **material**: Specialize for materials (steel, aluminum, stainless, nickel alloys)
- **joint**: Specialize for joint types (butt, fillet, lap, groove)
- **all**: Full machine-specific hardening

## Output
- Hardened model checkpoint
- Accuracy improvement metrics
- Distortion prediction improvements

## Related
- `/machine-harden` — Generic machine hardening
- `/grinder-harden` — Grinder-specific hardening
