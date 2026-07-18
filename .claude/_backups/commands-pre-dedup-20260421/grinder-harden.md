# /grinder-harden — Grinding AI Hardening

Harden AI models for specific grinding machines, wheel types, or material classes.

## Usage
```
/grinder-harden [machine-id] [--focus wheel|material|process]
```

## MCP Action
```
prism_ai:grinder_harden_model
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs hardening pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Profile target machine (Studer, Kellenberger, Okamoto, etc.)
2. Collect historical operation data
3. Identify model weaknesses
4. Generate hardening dataset
5. Fine-tune for target domain
6. Validate against holdout set
7. Deploy to machine registry

## Hardening Focus
- **wheel**: Specialize for wheel types (CBN, diamond, conventional)
- **material**: Specialize for materials (hardened steel, carbide, ceramic)
- **process**: Specialize for processes (OD, ID, surface, centerless)
- **all**: Full machine-specific hardening

## Output
- Hardened model checkpoint
- Accuracy improvement metrics
- Thermal prediction improvements

## Related
- `/machine-harden` — Generic machine hardening
- `/mill-harden` — Mill-specific hardening
