# /lathe-studio — Lathe Programming Studio Pipeline

Launch the Lathe Studio wizard — full pipeline from part geometry to optimized turning G-code with tribal knowledge injection, collision checking, and physics-validated speed/feed.

## Usage
```
/lathe-studio [material] [machine]
```

## MCP Action
```
prism_turning:lathe_orchestrate_facade
```

## Advisor Strategy (`advisor_20260416`)
- **Executor**: Sonnet 4.6 (drives full geometry-to-G-code turning pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after material/machine selection, (2) after speed/feed computation, (3) after G-code generation — to validate safety and tribal knowledge alignment

## What it does
1. Select material + machine (default: 4140 on LB3000 / OSP-P300)
2. Route through LatheMasterOrchestratorFacadeEngine (E106)
3. Compute Kienzle forces + Taylor tool life via SpeedFeedOrchestratorEngine
4. Inject tribal tips via TribalKnowledgeActivationEngine
5. Check collision zones via LatheCollisionZoneEngine
6. Generate turning program via TurningProgramAssemblerEngine
7. Post-process with LathePostProcessor

## Request Types
- `quick` — Fast speed/feed recommendation
- `turning_program` — Full program generation
- `speedfeed` — Physics-based speed/feed calculation
- `collision_check` — Safety collision zone analysis
- `tribal_activate` — Tribal knowledge tip injection
- `deep_analyze` — Deep AI analysis (all engines)
- `validate` — Full validation pipeline
- `awareness_snapshot` — Domain readiness check

## Related
- `/auto-speed-feed` — Speed/feed calculations
- `/machine-harden` — Machine-specific AI hardening
- LATHE-AWARE-HARDEN — Lathe hardening roadmap track
