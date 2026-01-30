---
name: prism-hook-system
description: |
  Hook-based automatic enforcement system for PRISM Manufacturing Intelligence.
  155 hook points across 26 categories. 15 system hooks auto-enforce all 8 Laws
  and key Commandments. v1.2 adds Coordination category for F-PSI-001.
  Level 0 Always-On skill - hooks fire automatically on every operation.
  Key principle: If it can be forgotten, it must be automated.
---

# PRISM HOOK SYSTEM v1.2
## LEVEL 0 ALWAYS-ON - AUTOMATIC ENFORCEMENT
## 155 Hooks | 26 Categories | 15 System Hooks

---

# CORE PRINCIPLE

**If it can be forgotten, it MUST be automated.**

Hooks transform manual discipline into architectural guarantees. When hooks are active:
- Laws are BLOCKED if violated, not just warned
- Uncertainty is AUTO-INJECTED if missing
- Predictions are AUTO-LOGGED for calibration
- Learnings are AUTO-EXTRACTED after tasks

---

# WHEN TO USE

- When implementing ANY new module (hooks provide lifecycle)
- When enforcing Laws/Commandments automatically
- When adding validation or processing
- When integrating plugins or external systems
- When tracking metrics, learning, or calibration
- When planning tasks (hooks affect effort/time estimates)

---

# QUICK REFERENCE

## Execute Hooks
```typescript
import { executeHooks } from '@prism/core/hooks';

const result = await executeHooks('task:start', payload, context);
if (result.aborted) {
  console.error('BLOCKED:', result.abortReason);
}
```

## Register Custom Hook
```typescript
import { registerHook, PRIORITY } from '@prism/core/hooks';

registerHook('my-hook', 'db:preWrite', handler, {
  priority: PRIORITY.BUSINESS_RULES
});
```

---

# 15 SYSTEM HOOKS (Cannot Disable)

These auto-enforce Laws and Commandments:

| ID | Enforces | Priority | Effect |
|----|----------|----------|--------|
| SYS-LAW1-SAFETY | Law 1 | 0 | BLOCKS if S(x) < 0.70 |
| SYS-LAW2-MICROSESSION | Law 2 | 32 | Requires MATHPLAN |
| SYS-LAW3-COMPLETENESS | Law 3 | 33 | BLOCKS if C(T) < 1.0 |
| SYS-LAW4-REGRESSION | Law 4 | 20 | BLOCKS data loss |
| SYS-LAW5-PREDICTIVE | Law 5 | 30 | Requires failure analysis |
| SYS-LAW6-CONTINUITY | Law 6 | 10 | Enforces state loading |
| SYS-LAW7-VERIFICATION | Law 7 | 0 | Requires 95% confidence |
| SYS-LAW8-MATH-EVOLUTION | Law 8 | 60 | BLOCKS if M(x) < 0.60 |
| SYS-MATHPLAN-GATE | Law 2+8 | 5 | Validates MATHPLAN completeness |
| SYS-CMD1-WIRING | Cmd 1 | 110 | Requires 6-8 consumers |
| SYS-CMD5-UNCERTAINTY | Cmd 5 | 60 | AUTO-INJECTS uncertainty |
| SYS-PREDICTION-LOG | Law 8 | 200 | AUTO-LOGS predictions |
| SYS-CALIBRATION-MONITOR | Law 8 | 220 | Monitors formula health |
| SYS-LEARNING-EXTRACT | Cmd 14 | 170 | AUTO-EXTRACTS learnings |
| SYS-BUFFER-ZONE | Law 2 | 0 | BLOCKS at 19+ calls |

---

# 25 HOOK CATEGORIES (147 Total)

## Base Categories (107 hooks)

| Category | Count | Key Hook Points |
|----------|-------|-----------------|
| Session | 7 | preStart, postStart, preEnd, postCompact, heartbeat |
| Task | 10 | prePlan, mathPlanValidate, start, checkpoint, complete |
| Microsession | 5 | start, progress, bufferWarning, complete |
| Database | 10 | preValidate, antiRegressionCheck, consumerWiringCheck |
| Material | 6 | completenessCheck, cascade, crossValidate |
| Calculation | 8 | dimensionalCheck, safetyBoundsCheck, uncertaintyInject, xaiExplain |
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

## Extended Categories (40 hooks) - v1.1

| Category | Count | Purpose |
|----------|-------|---------|
| Transaction | 5 | Atomic operations, rollback |
| Health | 5 | System monitoring, alerts |
| Cache | 5 | Performance optimization |
| Circuit Breaker | 4 | Resilience, recovery |
| Rate Limiting | 4 | Throttling, quotas |
| Audit Trail | 4 | Governance, compliance |
| Coordination | 8 | F-PSI-001, resource selection, synergy calc (NEW v6.0) |
| Feature Flag | 4 | Deployment control |
| MCP Integration | 5 | Tool connectivity |
| Planning Integration | 4 | Estimation overhead |

---

# KEY HOOK TRIGGERS (Automatic)

| When | Hooks Fire | Effect |
|------|-----------|--------|
| Session starts | `session:preStart` | State loading enforced |
| Before any task | `task:prePlan`, `task:mathPlanValidate` | MATHPLAN gate checked |
| During work | `microsession:bufferWarning` | Buffer zone alerts |
| DB changes | `db:antiRegressionCheck` | Data loss BLOCKED |
| Any calculation | `calc:uncertaintyInject` | Uncertainty auto-added |
| Task completes | `verification:chainComplete` | 95% confidence required |
| After task | `learning:extract` | Patterns captured |
| Context compacts | `session:postCompact` | State preserved |

---

# PRIORITY LEVELS (0-999)

```
0-29:    SYSTEM_CRITICAL (SAFETY, MATHPLAN, STATE, BUFFER_ZONE)
30-49:   LAW_ENFORCEMENT (Laws 2-6)
50-99:   VALIDATION (Schema, Uncertainty, Dimensional, Bounds)
100-199: BUSINESS_LOGIC + INTELLIGENCE (Wiring, Learning, Knowledge)
200-299: METRICS + MONITORING (Calibration, Performance)
300-399: USER_HOOKS (Custom handlers)
400-499: PLUGIN_HOOKS (Extensions)
900-999: CLEANUP + LOGGING (Final processing)
```

---

# PLANNING FORMULAS v2.0 (Hook-Aware)

## F-PLAN-002: Effort Estimation
```
EFFORT = Sum(Base x Complexity x Risk) x HOOK_FACTOR x COORD_FACTOR x VERIFY_FACTOR

HOOK_FACTOR = 1 + (n_hooks x t_hook / t_avg)     // ~1.005-1.15
COORD_FACTOR = 1 + (agents-1) x k_coord          // ~1.05 per agent
VERIFY_FACTOR = 1 + (levels x k_verify)          // ~1.08 per level
```

## F-PLAN-005: Time Estimation
```
TIME = EFFORT x AVG_TIME x BUFFER + LATENCY_OVERHEAD

LATENCY_OVERHEAD = t_state + t_context + (levels x t_verify) + t_learn
                 = 50ms + 100ms + (levels x 200ms) + 150ms
```

## Hook-Related Coefficients (9)

| ID | Name | Value | Unit |
|----|------|-------|------|
| K-HOOK-001 | Hook Execution Time | 5 +/- 2 | ms |
| K-HOOK-002 | Hooks Per Operation | 3.2 +/- 0.8 | hooks/op |
| K-COORD-001 | Agent Coordination | 0.05 +/- 0.02 | factor |
| K-VERIFY-001 | Verification Level | 0.08 +/- 0.03 | factor |
| K-LEARN-001 | Learning Extraction | 0.03 +/- 0.01 | factor |
| K-LATENCY-001 | State Load | 50 +/- 20 | ms |
| K-LATENCY-002 | Context Build | 100 +/- 40 | ms |
| K-LATENCY-003 | Verification Latency | 200 +/- 80 | ms/level |
| K-LATENCY-004 | Learning Latency | 150 +/- 50 | ms |

---

# HOOK EXECUTION FLOW

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

# FORMULA CALIBRATION ALERTS

| Alert | Condition | Hook |
|-------|-----------|------|
| CRITICAL | MAPE > 50% or Bias > 25% | formula:calibrationCheck BLOCKS |
| WARNING | MAPE > 20% or Bias > 10% | prediction:triggerCalibration |
| NOTICE | Calibration > 30 days | SYS-CALIBRATION-MONITOR alerts |
| HEALTHY | All metrics in bounds | Continue |

---

# PYTHON INTEGRATION

```python
from prism_hooks import hooks, HookPriority

# Execute hooks
result = hooks.execute('agent:preExecute', payload, context)
if result.blocked:
    print(f"BLOCKED: {result.abort_reason}")

# Register custom hook
hooks.register('my-hook', 'task:start', my_handler, HookPriority.USER)

# Get statistics
print(hooks.stats())
```

---

# FILES

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

# COMMON PATTERNS

## Block on Validation Failure
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

## Add Warning Without Blocking
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

---

# INTEGRATION WITH ORCHESTRATORS

The Python orchestrators automatically integrate with hooks:

```powershell
# 56-agent swarm - fires agent:*, swarm:* hooks
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Task"

# Manufacturing analysis - fires agent:* hooks  
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Op"

# Ralph loop - fires ralph:* hooks
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --ralph agent "Prompt" N
```

---

# RELATED SKILLS

- prism-sp-brainstorm.md -> task:prePlan hooks
- prism-sp-execution.md -> task:checkpoint hooks
- prism-sp-verification.md -> verification:* hooks
- prism-formula-evolution.md -> formula:*, prediction:* hooks
- prism-mathematical-planning.md -> planning:* hooks
- prism-deep-learning.md -> learning:* hooks

---

# ENFORCEMENT SUMMARY

## HARD RULES (Hooks BLOCK violations)

- S(x) < 0.70 -> SYS-LAW1-SAFETY BLOCKS
- M(x) < 0.60 -> SYS-LAW8-MATH-EVOLUTION BLOCKS
- C(T) < 1.0 -> SYS-LAW3-COMPLETENESS BLOCKS
- No MATHPLAN -> SYS-MATHPLAN-GATE BLOCKS
- Data loss -> SYS-LAW4-REGRESSION BLOCKS
- 19+ calls -> SYS-BUFFER-ZONE BLOCKS

## SOFT RULES (Hooks WARN/AUTO-FIX)

- Missing uncertainty -> SYS-CMD5-UNCERTAINTY injects
- Missing predictions -> SYS-PREDICTION-LOG captures
- Missing learnings -> SYS-LEARNING-EXTRACT captures
- Stale calibration -> SYS-CALIBRATION-MONITOR alerts

---

**HOOKS = AUTOMATIC ENFORCEMENT. LIVES DEPEND ON ARCHITECTURAL GUARANTEES.**
