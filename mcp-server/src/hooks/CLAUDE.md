# Hooks Module — Claude Code Context

## Hook Architecture

PRISM hooks are event-driven plugins that intercept dispatcher actions for:
- Validation (pre-execution guards)
- Enrichment (context injection)
- Observation (telemetry, logging)
- Safety enforcement (hard blocks on dangerous operations)

## File Naming Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*Hooks.ts` | Category hook collection | `ManufacturingHooks.ts`, `WEDMSafetyHooks.ts` |
| `*Hook.ts` | Single-purpose hook | `LatheSpeedFeedGuardHook.ts` |
| `*Cadences.ts` | Scheduled/periodic hooks | `SpecialtyCadences.ts` |
| `pre-*.ts` | Pre-execution guards | `pre-roadmap-execute.ts` |
| `post-*.ts` | Post-execution handlers | `post-roadmap-unit.ts` |

## Hook Registration

All hooks register via `hookRegistration.ts`:

```typescript
import { hookRegistry } from './hookRegistration.js';

hookRegistry.register({
  id: 'my-guard-hook',
  event: 'pre-dispatch',
  dispatcher: 'prism_calc',
  actions: ['cutting_force', 'tool_life'],
  handler: async (ctx) => { /* validate */ },
  priority: 100, // higher = runs first
});
```

## Hook Events

| Event | Timing | Can Block | Use Case |
|-------|--------|-----------|----------|
| `pre-dispatch` | Before action | Yes | Validation, safety guards |
| `post-dispatch` | After success | No | Telemetry, learning |
| `error` | On failure | No | Recovery, alerting |
| `cadence` | Scheduled | No | Periodic maintenance |

## Safety Hooks (CRITICAL)

These hooks enforce hard safety blocks and MUST NOT be bypassed:

- `LatheSafetyHooks.ts` — Spindle speed limits, force margins
- `WEDMSafetyHooks.ts` — Wire tension, power limits
- `SafetyQualityHooks.ts` — S(x) scoring gate
- `MachineValidationHooks.ts` — Envelope checks

S(x) < 0.70 triggers HARD BLOCK — no override mechanism.

## Hook Context Object

```typescript
interface HookContext {
  dispatcher: string;
  action: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  session_id: string;
  timestamp: string;
  user_id?: string;
  machine_id?: string;
  material?: string;
  tool?: string;
}
```

## Key Hook Categories

### Manufacturing Intelligence
- `ManufacturingHooks.ts` — General machining guards
- `AdvancedManufacturingHooks.ts` — 5-axis, mill-turn specific
- `SpecialtyManufacturingHooks.ts` — EDM, grinding, laser

### WEDM Domain (46 hooks)
- `WEDMSafetyHooks.ts` — 16 safety hooks
- `WEDMSVIHooks.ts` — 2 SVI coupling hooks
- `WEDMPerceptionHooks.ts` — 2 perception hooks
- `WEDMLearningHooks.ts` — 2 learning hooks
- `WEDMCoordinationHooks.ts` — Multi-agent coordination

### Orchestration
- `OrchestrationHooks.ts` — Swarm, agent coordination
- `LifecycleHooks.ts` — Session start/stop
- `RecoveryHooks.ts` — Error recovery, retry logic

### Knowledge
- `KnowledgeHooks.ts` — Tribal tip injection
- `CrossReferenceHooks.ts` — Formula/algorithm lookup

## Hook Bridge (External)

`.claude/hooks/` contains external Node.js hooks that run via Claude Code's hook system:
- `session_start_tier1_bolster.mjs` — Tier-1 context injection
- `engine-write-guard.mjs` — Duplicate engine prevention
- `dedup-detect.mjs` — Pre-create duplicate detection

These are separate from MCP server hooks and run in Claude Code's process.

## Adding New Hooks

1. Create file following naming convention
2. Import and register via `hookRegistration.ts`
3. Add tests in `__tests__/hooks/`
4. Document in relevant category hook file
5. Update `index.ts` exports

## Hook Testing

```bash
npx vitest run src/hooks/__tests__/
```

Hooks MUST have test coverage for:
- Normal execution path
- Validation failure (pre hooks)
- Error handling
- Priority ordering (when multiple hooks)
