---
policy:
  tier: 2
  triggers:
    - "lathe-harden"
---
# /lathe-harden — Lathe AI Hardening

Harden AI models for specific lathes, materials, or operations.

## Usage
```
/lathe-harden [machine-id] [--focus material|operation|tooling]
```

## MCP Action
```
prism_ai:lathe_harden_model
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs hardening pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Profile target lathe (Okuma, Mazak, DMG, Doosan)
2. Collect historical operation data from .MIN files
3. Identify model weaknesses
4. Generate hardening dataset (edge cases, failures, successes)
5. Fine-tune model weights for target domain
6. Validate against holdout set
7. Deploy to machine-specific model registry

## Hardening Focus
- **material**: Specialize for materials (tool steel, carbide, stainless)
- **operation**: Specialize for operations (OD, ID, threading, grooving)
- **tooling**: Specialize for tool types (carbide, ceramic, CBN)
- **all**: Full machine-specific hardening

## Output
- Hardened model checkpoint
- Accuracy improvement metrics
- Edge case coverage report
- Deployment manifest

## Related
- `/machine-harden` — Generic machine hardening
- `/mill-harden` — Mill-specific hardening
