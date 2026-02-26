---
name: prism-hook-architecture
description: Hook system mechanics — 25 categories, priority levels 0-999, registration API, execution model, blocking vs warning patterns, and error handling
---
# Hook System Architecture

## When To Use
- Building a new dispatcher or engine that needs hook integration
- "How do I register a hook?" / "What priority should my hook use?"
- When adding validation, logging, or enforcement to an existing action
- Understanding which hook points fire for a given operation
- NOT for: what the 15 system hooks enforce (use prism-hook-enforcement)
- NOT for: cadence functions that auto-fire on intervals (those are in cadenceExecutor.ts)

## How To Use
**HOOK EXECUTION MODEL:**
  Hooks fire at named hook points (e.g., `task:start`, `material:preValidate`).
  Multiple hooks can register on the same point — they fire in priority order (lowest first).
  Each hook returns `{ continue: true/false, warnings?: [], abortReason?: string }`.
  If any hook returns `continue: false`, the entire operation is BLOCKED.

**25 HOOK CATEGORIES (147 total hooks):**
  Core: Session(7), Task(10), Microsession(5), Database(10), Material(6)
  Calc: Calculation(8), Formula(8), Prediction(5)
  Orchestration: Agent(6), Swarm(6), Ralph(6)
  Intelligence: Learning(7), Verification(5), Quality(4), Skill(4), Script(4)
  Extended: Transaction(5), Health(5), Cache(5), CircuitBreaker(4), RateLimiting(4),
            AuditTrail(4), Coordination(8), FeatureFlag(4), MCPIntegration(5), Planning(4)

**KEY HOOK POINTS (auto-fire timing):**
  Session start → `session:preStart` → state loading enforced
  Before any task → `task:prePlan` + `task:mathPlanValidate` → planning gates
  During work → `microsession:bufferWarning` → pressure alerts
  DB changes → `db:antiRegressionCheck` → data loss blocked
  Any calculation → `calc:uncertaintyInject` → uncertainty auto-added
  Task complete → `verification:chainComplete` → confidence checked
  After task → `learning:extract` → patterns captured

**PRIORITY LEVELS (lower = fires first):**
  0-29: SYSTEM_CRITICAL — safety, mathplan, state, buffer zone (cannot be overridden)
  30-49: LAW_ENFORCEMENT — Laws 2-6
  50-99: VALIDATION — schema, uncertainty, dimensional, bounds
  100-199: BUSINESS_LOGIC — wiring, learning, knowledge
  200-299: METRICS — calibration, performance monitoring
  300-399: USER_HOOKS — custom handlers registered at runtime
  400-499: PLUGIN_HOOKS — extensions
  900-999: CLEANUP — final processing, logging

**REGISTRATION API:**
  ```
  registerHook(id, hookPoint, handler, { priority, required?, timeout? })
  ```
  Execute: `const result = await executeHooks('hookPoint', payload, context)`
  If `result.aborted` → operation was BLOCKED by a hook

**BLOCKING vs WARNING pattern:**
  Block: return `{ continue: false, abortReason: 'why', abortSeverity: 'ERROR' }`
  Warn: return `{ continue: true, warnings: ['message'] }`
  Use blocking for safety/regression. Use warnings for advisory checks.

**ERROR HANDLING:**
  Hook timeout (>5s): skip if non-critical, throw if `required: true`
  Hook exception: catch + log + continue if non-critical
  Circular trigger: auto-detected and BLOCKED
  Priority conflict (same number): earlier registration wins

## What It Returns
- The correct hook point name for any operation type
- The right priority level for your hook's importance
- Whether to use blocking or warning pattern
- Error handling behavior for hook failures
- The hook fires automatically — you register once, it enforces forever

## Examples
- Input: "I'm adding a new material validation check that should block invalid data"
  Hook point: `material:preValidate` (fires before any material write)
  Priority: 50-99 (VALIDATION range)
  Pattern: BLOCKING — return `{ continue: false, abortReason: 'insufficient parameters' }`
  Registration: `registerHook('my-mat-check', 'material:preValidate', handler, { priority: 55 })`

- Input: "I want to log performance metrics after every calculation completes"
  Hook point: `calc:postExecute` or `task:complete`
  Priority: 200-299 (METRICS range — fires after all validation/business hooks)
  Pattern: WARNING — return `{ continue: true }` with side-effect logging
  Never block on metrics collection — it's observational, not enforcement

- Edge case: "My hook needs to fire before the safety hooks"
  Priority 0-29 is SYSTEM_CRITICAL — reserved for the 15 system hooks.
  You CANNOT register below priority 30. If you need pre-safety logic,
  register at 30+ and accept it fires after safety. Safety is always first.
SOURCE: Split from prism-hook-system (18.9KB)
RELATED: prism-hook-enforcement
