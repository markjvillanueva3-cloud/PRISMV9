# PRISM Hook System v1.0

## Overview

The PRISM Hook System provides **107 hook points** across **17 categories** for comprehensive lifecycle management of all PRISM operations. Hooks enable automatic enforcement of the 8 Laws, 15 Commandments, and mathematical certainty requirements.

## Design Principles

| Principle | Description |
|-----------|-------------|
| **ENFORCEMENT** | 8 Laws become automatic, not manual discipline |
| **PROVENANCE** | Track what triggered what with trace IDs |
| **CANCELLATION** | Hooks can abort operations with severity levels |
| **ASYNC** | All hooks support async operations |
| **ORDERING** | Hooks execute in priority order (lower = earlier) |
| **CHAINING** | Hooks can modify payloads for next hook |
| **COMPREHENSIVE** | Every system interaction has hooks |

## Hook Categories & Counts

| Category | Hook Points | Purpose |
|----------|-------------|---------|
| Session | 7 | Session start, end, compact, heartbeat |
| Task | 10 | Task planning, execution, completion |
| Microsession | 5 | Chunk-level execution tracking |
| Database | 10 | All DB mutations with validation |
| Material | 6 | Material-specific validation & cascade |
| Calculation | 8 | Physics calculations with safety checks |
| Formula | 8 | Formula evolution & calibration |
| Prediction | 5 | Prediction logging & calibration triggers |
| Agent | 6 | Agent execution & cost tracking |
| Swarm | 6 | Swarm orchestration & synthesis |
| Ralph | 6 | Ralph Loop iteration tracking |
| Learning | 7 | Learning extraction & propagation |
| Verification | 5 | 4-level verification chain |
| Quality | 4 | Quality gate enforcement |
| Skill | 4 | Skill detection & loading |
| Script | 4 | Python/PowerShell execution |
| Plugin | 6 | Browser/filesystem extensions |
| **TOTAL** | **107** | |

## Priority Levels

```typescript
PRIORITY = {
  // System-critical (cannot be overridden)
  SAFETY_GATE: 0,
  MATHPLAN_GATE: 5,
  STATE_PERSISTENCE: 10,
  ANTI_REGRESSION: 20,
  
  // Law enforcement
  LAW_ENFORCEMENT: 30,
  LIFE_SAFETY_CHECK: 31,
  MICROSESSION_ENFORCE: 32,
  COMPLETENESS_CHECK: 33,
  
  // Validation layer
  SCHEMA_VALIDATION: 50,
  UNCERTAINTY_INJECTION: 60,
  DIMENSIONAL_CHECK: 70,
  BOUNDS_CHECK: 80,
  
  // Business logic
  BUSINESS_RULES: 100,
  CONSUMER_WIRING: 110,
  CROSS_REFERENCE: 120,
  
  // Intelligence layer
  CONTEXT_BUILDING: 150,
  PATTERN_MATCHING: 160,
  LEARNING_CAPTURE: 170,
  KNOWLEDGE_GRAPH: 180,
  
  // Metrics and monitoring
  METRICS_COLLECTION: 200,
  PERFORMANCE_TRACKING: 210,
  CALIBRATION_CHECK: 220,
  
  // User/extension hooks
  USER_HOOKS: 300,
  PLUGIN_HOOKS: 400,
  
  // Cleanup (runs last)
  CLEANUP: 900,
  LOGGING: 990,
  TELEMETRY: 999
}
```

## Built-in System Hooks (15)

These hooks enforce the 8 Laws and cannot be disabled:

| ID | Enforces | Hook Point | Description |
|----|----------|------------|-------------|
| SYS-LAW1-SAFETY | Law 1 | calc:safetyBoundsCheck | S(x) >= 0.70 required |
| SYS-LAW2-MICROSESSION | Law 2 | task:prePlan | MATHPLAN required |
| SYS-LAW3-COMPLETENESS | Law 3 | task:preComplete | C(T) = 1.0 required |
| SYS-LAW4-REGRESSION | Law 4 | db:antiRegressionCheck | No data loss |
| SYS-LAW5-PREDICTIVE | Law 5 | task:start | Failure mode analysis |
| SYS-LAW6-CONTINUITY | Law 6 | session:preStart | State loading & resume |
| SYS-LAW7-VERIFICATION | Law 7 | verification:chainComplete | 95% confidence |
| SYS-LAW8-MATH-EVOLUTION | Law 8 | calc:postExecute | M(x) >= 0.60 required |
| SYS-MATHPLAN-GATE | Law 2,8 | task:mathPlanValidate | MATHPLAN validation |
| SYS-CMD1-WIRING | Cmd 1 | db:consumerWiringCheck | Min 6-8 consumers |
| SYS-CMD5-UNCERTAINTY | Cmd 5 | calc:uncertaintyInject | Uncertainty bounds |
| SYS-PREDICTION-LOG | Law 8 | prediction:create | Prediction logging |
| SYS-CALIBRATION-MONITOR | Law 8 | formula:calibrationCheck | Calibration alerts |
| SYS-LEARNING-EXTRACT | Cmd 14 | task:postComplete | Learning extraction |
| SYS-BUFFER-ZONE | Law 2 | microsession:progress | Buffer zone enforcement |

## Usage Examples

### Basic Hook Execution

```typescript
import { executeHooks, HookContext } from '@prism/core/hooks';

// Execute task start hooks
const result = await executeHooks('task:start', {
  task: { id: 'T-001', name: 'Extract materials', priority: 'HIGH' },
  mathPlan: { /* ... */ },
  prediction: { id: 'PRED-20260126-001', logged: true }
}, {
  sessionId: 'session-123',
  triggeredBy: { type: 'USER', id: 'mark' }
});

if (result.aborted) {
  console.error(`Blocked: ${result.abortReason}`);
} else {
  // Proceed with task
}
```

### Register Custom Hook

```typescript
import { registerHook, PRIORITY } from '@prism/core/hooks';

registerHook(
  'my-custom-validator',
  'material:preValidate',
  async (payload, context) => {
    // Custom validation logic
    if (payload.parameters.hardness?.value > 70) {
      return {
        continue: true,
        warnings: ['High hardness material - verify tool selection']
      };
    }
    return { continue: true };
  },
  {
    priority: PRIORITY.BUSINESS_RULES,
    description: 'Custom hardness warning'
  }
);
```

### Hook Context

Every hook receives a `HookContext` with:

```typescript
interface HookContext {
  traceId: string;              // Unique trace ID
  sessionId: string;            // Current session
  taskId?: string;              // Current task
  timestamp: string;            // When chain started
  triggeredBy: {                // Who triggered
    type: 'USER' | 'AGENT' | 'SYSTEM' | 'SCHEDULER' | 'PLUGIN' | 'SCRIPT';
    id: string;
    tier?: 'OPUS' | 'SONNET' | 'HAIKU';
  };
  bufferZone: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';
  toolCallCount: number;
  qualityScores: {
    safety: number;   // S(x)
    rigor: number;    // M(x)
    omega: number;    // Ω(x)
  };
  mathInfra: {
    formulaRegistryLoaded: boolean;
    calibrationAlerts: string[];
  };
  warnings: string[];           // Accumulated warnings
  learnings: string[];          // Accumulated learnings
  custom: Record<string, any>;  // Custom data
}
```

### Hook Result

Hooks return:

```typescript
interface HookResult<T> {
  continue: boolean;            // Continue to next hook?
  abortReason?: string;         // Why abort
  abortSeverity?: 'WARN' | 'ERROR' | 'CRITICAL' | 'SAFETY';
  payload?: T;                  // Modified payload (chaining)
  warnings?: string[];          // Non-blocking warnings
  learnings?: string[];         // Learning insights
  metrics?: Record<string, number>;
}
```

## Integration Points

### With Python Scripts

The hook system integrates with:
- `prism_unified_system_v5.py` - Agent swarms
- `prism_orchestrator_v2.py` - Manufacturing analysis
- Ralph Loop iterations

### With Plugins

Hooks support:
- Browser automation (Chrome extension)
- Filesystem operations
- External integrations

## File Locations

```
C:\PRISM\src\core\hooks\
├── HookSystem.types.ts    # 1,905 lines - All type definitions
├── HookManager.ts         # 739 lines - Implementation
└── index.ts               # Public API exports
```

## Summary

The PRISM Hook System transforms manual discipline into **automatic enforcement**:

- **8 Laws** → 15 built-in system hooks
- **15 Commandments** → Automatic validation at every mutation
- **Mathematical Certainty** → Uncertainty injection on all outputs
- **Session Continuity** → Automatic state loading and checkpointing
- **Learning Pipeline** → Automatic extraction from every completed task

**Total: 107 hook points | 15 system hooks | 17 categories**

---

*Manufacturing Intelligence. Lives depend on it.*
