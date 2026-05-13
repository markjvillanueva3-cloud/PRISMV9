---
policy:
  tier: 1
  triggers:
    - "lathe-validate"
---
# /lathe-validate — Lathe Program Validation

Validate turning programs against physics constraints, machine limits, and safety rules.

## Usage
```
/lathe-validate [program-path]
```

## MCP Action
```
prism_turning:lathe_validate_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs validation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse turning program (.MIN, G-code)
2. Validate speed/feed against Kienzle force limits
3. Check tool deflection via BoringBarDeflectionEngine
4. Verify spindle power requirements
5. Run collision detection via LatheCollisionZoneEngine
6. Check chatter stability for boring operations
7. Validate surface finish predictions
8. Generate validation report

## Validation Checks
- **Physics**: Cutting forces, deflection, power, chatter
- **Machine**: Spindle limits, turret positions, axis limits
- **Safety**: Collision zones, tailstock, chuck clearance
- **Quality**: Surface finish, dimensional tolerance predictions

## Related
- `/lathe-studio` — Full programming pipeline
- `/lathe-optimize` — Optimization after validation
