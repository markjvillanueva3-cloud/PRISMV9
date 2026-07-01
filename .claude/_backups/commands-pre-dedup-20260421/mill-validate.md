# /mill-validate — Mill Program Validation

Validate milling programs against physics constraints, machine limits, and safety rules.

## Usage
```
/mill-validate [program-path]
```

## MCP Action
```
prism_cam:mill_validate_program
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs validation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after physics validation, (2) if safety concerns detected

## What it does
1. Parse G-code program
2. Validate speed/feed against Kienzle force limits
3. Check tool deflection via ToolDeflectionEngine
4. Verify machine envelope limits
5. Run collision detection via MillCollisionDetectionEngine
6. Check chatter stability via ChatterStabilityLobeEngine
7. Validate surface finish predictions
8. Generate validation report with pass/fail and recommendations

## Validation Checks
- **Physics**: Force limits, deflection, chatter stability
- **Machine**: Envelope, spindle limits, axis acceleration
- **Safety**: Collision zones, rapid traverse safety
- **Quality**: Surface finish, dimensional tolerance predictions

## Related
- `/mill-studio` — Full programming pipeline
- `/mill-optimize` — Optimization after validation
- `/physics-verify` — Deep physics verification
