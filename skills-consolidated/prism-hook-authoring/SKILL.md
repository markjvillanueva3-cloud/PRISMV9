---
name: prism-hook-authoring
description: How to register, execute, and chain PRISM hooks — priority levels, blocking vs warning patterns, error handling, and the 25 hook categories
---
# Hook Authoring

## When To Use
- Building a new engine or dispatcher that needs to fire hooks at key points
- "How do I register a custom hook?" / "What priority should my hook use?"
- When implementing pre-validation, post-processing, or monitoring at hook points
- When deciding between a BLOCKING hook (returns continue:false) vs a WARNING hook
- NOT for: understanding which system hooks enforce which laws (use prism-hook-enforcement)
- NOT for: NL hook creation via natural language (use prism_nl_hook dispatcher)

## How To Use
**REGISTERING A HOOK:**
```typescript
registerHook(hookId, eventPoint, handler, { priority: PRIORITY.VALIDATION });
```
  hookId: unique string like 'my-material-validator'
  eventPoint: category:action format like 'material:preValidate', 'task:start', 'calc:safetyBoundsCheck'
  handler: async function receiving payload, returning HookResult
  priority: determines execution order (lower = earlier)

**PRIORITY LEVELS (lower fires first):**
  0-29: SYSTEM_CRITICAL — safety, mathplan, state, buffer zone. Reserved for system hooks.
  30-49: LAW_ENFORCEMENT — Laws 2-6 enforcement. Reserved for system hooks.
  50-99: VALIDATION — schema checks, uncertainty injection, dimensional analysis, bounds checking
  100-199: BUSINESS_LOGIC — wiring checks, learning extraction, knowledge capture
  200-299: METRICS — calibration monitoring, performance tracking
  300-399: USER_HOOKS — your custom handlers go here
  400-499: PLUGIN_HOOKS — extension points
  900-999: CLEANUP — final processing, logging

**BLOCKING PATTERN** (stops execution if validation fails):
  Return `{ continue: false, abortReason: 'why', abortSeverity: 'ERROR' }`
  Use for: safety violations, data loss prevention, schema failures
  The caller gets `result.aborted === true` and must not proceed

**WARNING PATTERN** (adds warning but allows execution):
  Return `{ continue: true, warnings: ['High hardness - verify tool selection'] }`
  Use for: unusual values, performance concerns, non-critical suggestions
  The caller proceeds but can display/log the warnings

**EXECUTING HOOKS:**
```typescript
const result = await executeHooks('task:start', payload, context);
if (result.aborted) { /* handle block */ }
```
  All hooks for that event point fire in priority order
  First BLOCK result stops the chain — remaining hooks don't fire
  Warnings accumulate across all hooks that fire

**ERROR HANDLING IN HOOKS:**
  Hooks get 5s timeout (configurable). HOOK_TIMEOUT → skip + log warning.
  If `hook.required = true`: exception re-throws (critical hook must succeed).
  If `hook.required = false`: catch, log, continue (non-critical).
  Circular trigger detection: if hook A fires event that triggers hook A → BLOCKED.
  Priority conflict (same priority): earlier registration wins.

**25 HOOK CATEGORIES** (147 total hook points):
  Session(7), Task(10), Microsession(5), Database(10), Material(6), Calculation(8),
  Formula(8), Prediction(5), Agent(6), Swarm(6), Ralph(6), Learning(7),
  Verification(5), Quality(4), Skill(4), Script(4), Plugin(6),
  Transaction(5), Health(5), Cache(5), CircuitBreaker(4), RateLimiting(4),
  AuditTrail(4), Coordination(8), FeatureFlag(4)

## What It Returns
- A registered hook that fires automatically at the specified event point
- Blocking hooks return aborted=true to prevent unsafe operations
- Warning hooks return warnings array for non-critical alerts
- Hook chain executes all registered hooks in priority order, collecting results
- Error-safe execution: timeouts and exceptions handled without crashing the system

## Examples
- Input: "I need to validate material parameters before database write"
  Register: hookId='validate-material-params', event='material:preValidate', priority=VALIDATION(50)
  Handler checks: parameters.length >= 50, all required fields present, values physically reasonable
  If fail: return { continue: false, abortReason: 'Material has 32 params, need 50+' }
  If pass: return { continue: true }

- Input: "I want to log every calculation for audit but never block"
  Register: hookId='calc-audit-logger', event='calc:uncertaintyInject', priority=METRICS(200)
  Handler: log calculation inputs/outputs to audit trail, always return { continue: true }
  Never blocks — this is monitoring, not validation

- Edge case: "Two hooks at same priority on same event"
  Earlier registration wins execution order. Both still fire.
  If first hook blocks, second never executes.
  Recommendation: use distinct priority values to make order explicit.
SOURCE: Split from prism-hook-system (18.9KB)
RELATED: prism-hook-enforcement
