# Validate Program — Unified NC Code Validation Dispatcher

Single entry point for NC program validation. Routes by `--machine=` to the correct specialised validator (lathe / mill / wire EDM / sinker EDM / 5-axis / Swiss). Each routed validator runs collision, syntax, controller-grammar, force, and tribal-rule checks specific to its kinematics.

## Args: $ARGUMENTS
- `<file>`: path to NC program (.nc, .min, .mcx-8, etc.) — required
- `--machine=<machine-id>`: required when machine isn't inferable from file/folder; e.g. `okuma-lt-3`, `mitsubishi-mv4800`, `hurco-vmx42i`
- `--profile=<id>`: shop profile (default: `jm-die`); pulls machine inventory + rates
- `--strict`: fail on any warning, not just errors
- `--report=<json|markdown>`: output format (default: markdown)

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"validate program"
    - keyword:"check this NC"
    - keyword:"is this safe to run"
    - on:UserPromptSubmit
```

## Routing logic
1. **From `--machine=`**: explicit override always wins
2. **From file extension**: `.min` → Okuma lathe; `.mcx-8` → Mastercam (route by post); `.eia` → Heidenhain; `.nc` → fall back to step 3
3. **From folder convention**: `JM DIE/CNC LATHE/...` → lathe; `JM DIE/WIRE EDM/...` → wedm; etc.
4. **From program first lines**: `G50 S<n>` → lathe; `G17 G40 G80` → mill; `M40` (without `M3`) → wire EDM
5. **No match**: ask user, never guess

## Routing table

| Machine class | Routed to | Engines used |
|---------------|-----------|--------------|
| Lathe (Okuma, Haas) | `/lathe-validate`    | LatheCollisionZone, LatheToolpathOrchestrator, OkumaPostValidator |
| Mill (Hurco, Haas)  | `/mill-validate`     | MillCollisionZone, ToolDeflection, ChatterStabilityLobe |
| 5-axis              | `/five-axis-validate`| FiveAxisKinematics, RTCPCollisionEngine |
| Mill-turn (Okuma)   | `/mill-turn-validate`| MillTurnSyncEngine, both lathe + mill kinematics |
| Wire EDM            | `/wedm-validate`     | WEDMCollision, WEDMSafetyEnvelope, WEDMHeadClearance |
| Sinker EDM          | `/sinker-edm-validate`| SinkerEDMElectrodeWear, SinkerEDMFlushing |
| Swiss               | `/swiss-validate`    | SwissGuideBushing, SwissBackworkSync |

## Output (markdown)
```
# Validation: H:/.../my-program.min  (machine: okuma-lt-3)

## Errors (2)
- Line 47: G50 S<no-value> — spindle limit not set; will trigger soft alarm
- Line 132: M19 + M3 — orientation + start without G54.4 zero

## Warnings (5)
- Line 89: feed F0.4 exceeds 0.3 max for chip-control on 4140
...

## Tribal flags (3)
- M-A-L25 (large-OD finish): use 0.05–0.15 mm/rev feed; current 0.4 too aggressive
...

## Engines invoked
- LatheCollisionZoneEngine: 23 zones checked, 0 collisions
- KienzleForceModel: max Fc = 1240 N (within spindle envelope)
- TaylorToolLifeEngine: 38min predicted at current params
```

## MCP wiring
Routes to the relevant `prism_<machine>:program_validate` action; the dispatcher pattern means this skill is rename-stable as new machine validators come online.

## Related
- `/auto-speed-feed` — set the speeds before validation
- `/program-optimize` — apply suggested edits after validation
- `/audit program` — invariant-only sweep, faster than full validate
