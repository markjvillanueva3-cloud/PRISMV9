# /mill-studio — Milling Studio Pipeline

Launch the Mill Studio wizard — full pipeline from part geometry to optimized milling G-code with toolpath optimization, collision checking, and physics-validated speed/feed.

## Usage
```
/mill-studio [material] [machine]
```

## MCP Action
```
prism_cam:mill_orchestrate_facade
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives full geometry-to-G-code milling pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after material/machine selection, (2) after toolpath strategy selection, (3) after G-code generation — to validate safety and tribal knowledge alignment

## What it does
1. Select material + machine (default: 4140 on VTC-800 / OSP-P300)
2. Route through MillMasterOrchestratorFacadeEngine
3. Compute Kienzle forces + Taylor tool life via SpeedFeedOrchestratorEngine
4. Select toolpath strategy via ToolpathStrategyEngine
5. Inject tribal tips via TribalKnowledgeActivationEngine
6. Check collision zones via MillCollisionDetectionEngine
7. Generate milling program via MillProgramAssemblerEngine
8. Post-process with MillPostProcessor

## Request Types
- `quick` — Fast speed/feed recommendation
- `milling_program` — Full program generation
- `speedfeed` — Physics-based speed/feed calculation
- `toolpath_optimize` — Toolpath strategy optimization
- `collision_check` — Safety collision zone analysis
- `tribal_activate` — Tribal knowledge tip injection
- `deep_analyze` — Deep AI analysis (all engines)
- `validate` — Full validation pipeline

## Related
- `/mill-validate` — Program validation
- `/mill-optimize` — Optimization focus
- `/mill-learn` — Learning from programs
- `/mill-harden` — Machine-specific AI hardening
- `/auto-speed-feed` — Speed/feed calculations
