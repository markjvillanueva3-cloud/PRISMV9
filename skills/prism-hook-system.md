# PRISM Hook System Skill v1.1

## When to Use
- When implementing new modules that need lifecycle hooks
- When enforcing Laws/Commandments automatically
- When adding custom validation or processing
- When integrating plugins or external systems
- When tracking metrics, learning, or calibration
- When planning tasks (hooks affect effort/time estimates)

## Quick Reference

### Execute Hooks
```typescript
import { executeHooks } from '@prism/core/hooks';

const result = await executeHooks('task:start', payload, context);
if (result.aborted) {
  console.error('BLOCKED:', result.abortReason);
}
```

### Register Custom Hook
```typescript
import { registerHook, PRIORITY } from '@prism/core/hooks';

registerHook('my-hook', 'db:preWrite', handler, {
  priority: PRIORITY.BUSINESS_RULES
});
```

---

## 25 Hook Categories (147 Total)

### Base Categories (107 hooks)

| Category | Count | Key Hook Points |
|----------|-------|-----------------|
| Session | 7 | preStart, postStart, preEnd, heartbeat |
| Task | 10 | prePlan, mathPlanValidate, start, checkpoint, complete |
| Microsession | 5 | start, progress, bufferWarning, complete |
| Database | 10 | preValidate, antiRegressionCheck, consumerWiringCheck |
| Material | 6 | completenessCheck, cascade, crossValidate |
| Calculation | 8 | dimensionalCheck, safetyBoundsCheck, xaiExplain |
| Formula | 8 | calibrationCheck, coefficientUpdate, upgrade |
| Prediction | 5 | create, recordActual, triggerCalibration |
| Agent | 6 | preExecute, postExecute, costTrack |
| Swarm | 6 | preStart, progress, synthesize, complete |
| Ralph | 6 | iterationStart, completionCheck, exhausted |
| Learning | 7 | extract, match, apply, deepAnalysis, propagate |
| Verification | 5 | start, levelComplete, chainComplete |
| Quality | 4 | gateCheck, gateAggregate, blocked |
| Skill | 4 | detect, load, execute |
| Script | 4 | preExecute, postExecute, error |
| Plugin | 6 | preAction, browserAction, filesystemAction |

### Extended Categories (40 hooks) - v1.1 NEW

| Category | Count | Key Hook Points | Purpose |
|----------|-------|-----------------|---------|
| Transaction | 5 | start, step, rollback, commit, complete | Atomic operations |
| Health | 5 | check, memoryPressure, resourceAlert, heartbeat, degraded | System monitoring |
| Cache | 5 | hit, miss, invalidate, warm, evict | Performance |
| Circuit Breaker | 4 | failure, stateChange, recovery, reset | Resilience |
| Rate Limiting | 4 | check, hit, quota, reset | Throttling |
| Audit Trail | 4 | event, compliance, changeLog, export | Governance |
| Feature Flag | 4 | evaluate, rollout, override, killSwitch | Deployment |
| MCP Integration | 5 | connect, disconnect, toolCall, toolResult, error | Tool connectivity |
| Planning Integration | 4 | overheadCalculate, effortAdjust, timeAdjust, uncertaintyPropagate | Estimation |

---

## 15 System Hooks (Cannot Disable)

| Law/Cmd | Hook ID | Priority | Enforcement |
|---------|---------|----------|-------------|
| Law 1 | SYS-LAW1-SAFETY | 0 | S(x) >= 0.70 |
| Law 2 | SYS-LAW2-MICROSESSION | 32 | MATHPLAN required |
| Law 3 | SYS-LAW3-COMPLETENESS | 33 | C(T) = 1.0 |
| Law 4 | SYS-LAW4-REGRESSION | 20 | No data loss |
| Law 5 | SYS-LAW5-PREDICTIVE | 30 | Failure analysis |
| Law 6 | SYS-LAW6-CONTINUITY | 10 | State loading |
| Law 7 | SYS-LAW7-VERIFICATION | 0 | 95% confidence |
| Law 8 | SYS-LAW8-MATH-EVOLUTION | 60 | M(x) >= 0.60 |
| MATHPLAN | SYS-MATHPLAN-GATE | 5 | Validation |
| Cmd 1 | SYS-CMD1-WIRING | 110 | Min 6-8 consumers |
| Cmd 5 | SYS-CMD5-UNCERTAINTY | 60 | Uncertainty bounds |
| | SYS-PREDICTION-LOG | 200 | Prediction logging |
| | SYS-CALIBRATION-MONITOR | 220 | Calibration alerts |
| Cmd 14 | SYS-LEARNING-EXTRACT | 170 | Learning extraction |
| | SYS-BUFFER-ZONE | 0 | Buffer zone enforcement |

---

## Priority Levels (0-999)

```
0-29:    SYSTEM_CRITICAL (SAFETY, MATHPLAN, STATE, BUFFER_ZONE)
30-49:   LAW_ENFORCEMENT
50-99:   VALIDATION (Schema, Uncertainty, Dimensional, Bounds)
100-199: BUSINESS_LOGIC + INTELLIGENCE (Wiring, Learning, Knowledge)
200-299: METRICS + MONITORING (Calibration, Performance)
300-399: USER_HOOKS
400-499: PLUGIN_HOOKS
900-999: CLEANUP + LOGGING
```

---

## Planning Formulas (Hook-Aware v2.0)

### F-PLAN-002: Effort Estimation
```
EFFORT = Sum(Base x Complexity x Risk) x HOOK_FACTOR x COORD_FACTOR x VERIFY_FACTOR

HOOK_FACTOR = 1 + (n_hooks x t_hook / t_avg)     // ~1.05-1.15
COORD_FACTOR = 1 + (agents-1) x k_coord          // ~1.05 per agent
VERIFY_FACTOR = 1 + (levels x k_verify)          // ~1.08 per level
```

### F-PLAN-005: Time Estimation
```
TIME = EFFORT x AVG_TIME x BUFFER + LATENCY_OVERHEAD

LATENCY_OVERHEAD = t_state + t_context + (levels x t_verify_level) + t_learn
```

### Hook-Related Coefficients (9)

| ID | Name | Value | Unit |
|----|------|-------|------|
| K-HOOK-001 | Hook Execution Time | 5 +/- 2 | ms |
| K-HOOK-002 | Hooks Per Operation | 3.2 +/- 0.8 | hooks/op |
| K-COORD-001 | Agent Coordination | 0.05 +/- 0.02 | - |
| K-VERIFY-001 | Verification Level | 0.08 +/- 0.03 | - |
| K-LEARN-001 | Learning Extraction | 0.03 +/- 0.01 | - |
| K-LATENCY-001 | State Load | 50 +/- 20 | ms |
| K-LATENCY-002 | Context Build | 100 +/- 40 | ms |
| K-LATENCY-003 | Verification Latency | 200 +/- 80 | ms |
| K-LATENCY-004 | Learning Latency | 150 +/- 50 | ms |

---

## Files

```
C:\PRISM\src\core\hooks\
  HookSystem.types.ts      # 1,905 lines - Base types (107 hooks)
  HookSystem.extended.ts   # 684 lines - Extended types (40 hooks)
  HookManager.ts           # 739 lines - Runtime engine
  index.ts                 # Public API

C:\PRISM\scripts\
  prism_hooks.py           # 635 lines - Python integration
```

---

## Hook Execution Flow

```
OPERATION START
     |
     v
+-----------------+
| Pre-hooks       | <-- Can BLOCK (return continue: false)
| (priority 0->N) |     Can MODIFY payload
+-----------------+
         | continue: true
         v
+-----------------+
| OPERATION       |
+-----------------+
         |
         v
+-----------------+
| Post-hooks      | <-- Can LOG, LEARN, ALERT
| (priority 0->N) |     Can trigger cascades
+-----------------+
         |
         v
    OPERATION END
```

---

## Common Patterns

### Block on Validation Failure
```typescript
registerHook('block-invalid', 'material:preValidate',
  async (payload) => {
    if (payload.material.parameters.length < 50) {
      return {
        continue: false,
        abortReason: 'Material has insufficient parameters',
        abortSeverity: 'ERROR'
      };
    }
    return { continue: true };
  },
  { priority: PRIORITY.VALIDATION }
);
```

### Add Warning Without Blocking
```typescript
registerHook('warn-high-hardness', 'material:preValidate',
  async (payload) => {
    if (payload.material.hardness > 60) {
      return {
        continue: true,
        warnings: ['High hardness - verify tool selection']
      };
    }
    return { continue: true };
  },
  { priority: PRIORITY.BUSINESS_RULES }
);
```

### Extract Learning After Task
```typescript
registerHook('extract-patterns', 'task:postComplete',
  async (payload, context) => {
    const patterns = analyzePatterns(payload.result);
    return {
      continue: true,
      learnings: patterns
    };
  },
  { priority: PRIORITY.LEARNING }
);
```

### Python Integration
```python
from prism_hooks import hooks

# Execute hooks
result = hooks.execute('agent:preExecute', payload, context)
if result.blocked:
    print(f"BLOCKED: {result.abort_reason}")

# Register custom hook
hooks.register('my-hook', 'task:start', my_handler, HookPriority.USER)
```

---

## Integration Points

### Works With:
- prism_unified_system_v5.py (56 agents) - agent:*, swarm:*
- prism_orchestrator_v2.py - manufacturing analysis
- Ralph Loop - ralph:*
- Chrome extension - plugin:browserAction
- Filesystem MCP - plugin:filesystemAction
- Quality Gates - quality:*
- Verification Chain - verification:*
- Learning Pipeline - learning:*
- Formula Evolution - formula:*, prediction:*

### Related Skills:
- prism-sp-brainstorm.md -> task:prePlan hooks
- prism-sp-execution.md -> task:checkpoint hooks
- prism-sp-verification.md -> verification:* hooks
- prism-formula-evolution.md -> formula:* hooks
- prism-mathematical-planning.md -> planning:* hooks

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Hook not firing | Check priority - higher priority hooks run first |
| Operation blocked | Check result.abortReason for which hook blocked |
| Payload not modified | Ensure you return modified payload in result |
| Hook too slow | Check K-HOOK-001 calibration, optimize handler |
| Missing context | Ensure HookContext is properly populated |

---

**Version:** 1.1.0 | **Hook Points:** 147 | **Categories:** 25 | **System Hooks:** 15


## Coordination Hooks (v13.0 - Combination Engine)

| Hook | Fires When | Purpose |
|------|------------|---------|
| coordination:preSelect | Before F-PSI-001 runs | Validate task requirements |
| coordination:postSelect | After optimal R* found | Log selected resources |
| coordination:synergyCalc | During synergy calculation | Track interaction effects |
| coordination:proofGenerate | When generating proof | Capture optimality certificate |
| coordination:warmStart | Before ILP solve | Seed with heuristic solution |
| coordination:ilpSolve | During ILP solving | Monitor solver progress |
| coordination:fallback | If ILP unavailable | Trigger greedy heuristic |

### Integration with System Hooks
- `SYS-MATHPLAN-GATE` now requires RESOURCES step (calls coordination:preSelect)
- `task:prePlan` triggers automatic resource selection
- `learning:extract` captures resource combination patterns
