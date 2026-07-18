# /mill-harden — Mill AI Hardening

Harden AI models for specific milling machines, materials, or operations.

## Usage
```
/mill-harden [machine-id] [--focus material|operation|tooling]
```

## MCP Action
```
prism_ai:mill_harden_model
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs hardening pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after baseline assessment, (2) after hardening proposal, (3) after validation

## What it does
1. Profile target machine via MachineProfileEngine
2. Collect historical operation data
3. Identify model weaknesses via AIHardeningAnalysisEngine
4. Generate hardening dataset (edge cases, failures, successes)
5. Fine-tune model weights for target domain
6. Validate hardened model against holdout set
7. Deploy to machine-specific model registry

## Hardening Focus
- **material**: Specialize for specific material families (tool steel, titanium, aluminum)
- **operation**: Specialize for operation types (roughing, finishing, HSM)
- **tooling**: Specialize for tool types (carbide, ceramic, diamond)
- **all**: Full machine-specific hardening

## Output
- Hardened model checkpoint
- Accuracy improvement metrics
- Edge case coverage report
- Deployment manifest

## Related
- `/machine-harden` — Generic machine hardening
- `/lathe-harden` — Lathe-specific hardening
- `/grinder-harden` — Grinder-specific hardening
