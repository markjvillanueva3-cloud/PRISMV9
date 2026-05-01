# HOOK SYSTEM SECTION - ADD TO PRISM_COMPLETE_SYSTEM_v11.md
# Insert this after SECTION 6 (Python Orchestrators) and before SECTION 7 (Master Equation)
# This becomes NEW SECTION 7, renumber subsequent sections

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: HOOK SYSTEM v1.1 (AUTOMATIC ENFORCEMENT)
# ════════════════════════════════════════════════════════════════════════════════

## Overview
The Hook System transforms manual discipline into **automatic enforcement**.
- **147 hook points** across **25 categories**
- **15 system hooks** enforce all 8 Laws + key Commandments
- Hooks fire automatically - no manual invocation needed
- Violations are BLOCKED, not just warned

## Hook Categories

### Base Hooks (107)
```
Session (7)       Task (10)         Microsession (5)   Database (10)
Material (6)      Calculation (8)   Formula (8)        Prediction (5)
Agent (6)         Swarm (6)         Ralph (6)          Learning (7)
Verification (5)  Quality (4)       Skill (4)          Script (4)
Plugin (6)
```

### Extended Hooks (40) - v1.1
```
Transaction (5)   Health (5)        Cache (5)          Circuit Breaker (4)
Rate Limiting (4) Audit Trail (4)   Feature Flags (4)  MCP Integration (5)
Planning (4)
```

## 15 System Hooks (CANNOT DISABLE)

| Enforces | Hook ID | Action |
|----------|---------|--------|
| Law 1 | SYS-LAW1-SAFETY | Blocks if S(x) < 0.70 |
| Law 2 | SYS-LAW2-MICROSESSION | Requires MATHPLAN |
| Law 3 | SYS-LAW3-COMPLETENESS | Requires C(T) = 1.0 |
| Law 4 | SYS-LAW4-REGRESSION | Blocks data loss |
| Law 5 | SYS-LAW5-PREDICTIVE | Reminds failure modes |
| Law 6 | SYS-LAW6-CONTINUITY | Loads state, enforces resume |
| Law 7 | SYS-LAW7-VERIFICATION | Requires 95% confidence |
| Law 8 | SYS-LAW8-MATH-EVOLUTION | Requires M(x) >= 0.60 |
| MATHPLAN | SYS-MATHPLAN-GATE | Validates MATHPLAN |
| Cmd 1 | SYS-CMD1-WIRING | Min 6-8 consumers |
| Cmd 5 | SYS-CMD5-UNCERTAINTY | Injects uncertainty |
| | SYS-PREDICTION-LOG | Logs all predictions |
| | SYS-CALIBRATION-MONITOR | Monitors formula health |
| Cmd 14 | SYS-LEARNING-EXTRACT | Extracts learnings |
| | SYS-BUFFER-ZONE | Enforces buffer zones |

## Hook Priority System (0-999)

| Range | Category | Examples |
|-------|----------|----------|
| 0-29 | SYSTEM_CRITICAL | SAFETY, MATHPLAN, BUFFER_ZONE |
| 30-49 | LAW_ENFORCEMENT | Laws 1-8 |
| 50-99 | VALIDATION | Schema, Uncertainty, Dimensional |
| 100-199 | BUSINESS_LOGIC | Wiring, Learning, Knowledge |
| 200-299 | METRICS | Calibration, Performance |
| 300-399 | USER_HOOKS | Custom hooks |
| 400-499 | PLUGIN_HOOKS | Extensions |
| 900-999 | CLEANUP | Logging, Telemetry |

## Hook-Aware Planning Formulas (v2.0)

### F-PLAN-002: Effort Estimation
```
EFFORT = Σ(Base × Complexity × Risk) × HOOK_FACTOR × COORD_FACTOR × VERIFY_FACTOR

Where:
  HOOK_FACTOR = 1 + (n_hooks × t_hook / t_avg)     // ~1.05-1.15
  COORD_FACTOR = 1 + (agents-1) × k_coord          // ~1.05 per agent
  VERIFY_FACTOR = 1 + (levels × k_verify)          // ~1.08 per level
```

### F-PLAN-005: Time Estimation
```
TIME = EFFORT × AVG_TIME × BUFFER + LATENCY_OVERHEAD

Where:
  LATENCY_OVERHEAD = t_state + t_context + (levels × t_verify_level) + t_learn
```

## Hook-Related Coefficients (9)

| ID | Name | Value | Purpose |
|----|------|-------|---------|
| K-HOOK-001 | Hook Execution Time | 5 ± 2 ms | Per-hook latency |
| K-HOOK-002 | Hooks Per Operation | 3.2 ± 0.8 | Average hooks fired |
| K-COORD-001 | Agent Coordination | 0.05 ± 0.02 | Swarm overhead |
| K-VERIFY-001 | Verification Level | 0.08 ± 0.03 | Per-level overhead |
| K-LEARN-001 | Learning Extraction | 0.03 ± 0.01 | Learning overhead |
| K-LATENCY-001 | State Load | 50 ± 20 ms | State file load |
| K-LATENCY-002 | Context Build | 100 ± 40 ms | Context assembly |
| K-LATENCY-003 | Verification Latency | 200 ± 80 ms | Per verification level |
| K-LATENCY-004 | Learning Latency | 150 ± 50 ms | Learning extraction |

## Critical Hook Points by Phase

### Session Start (Automatic)
```
session:preStart → Load state, check IN_PROGRESS
session:postStart → Verify math infra loaded
```

### Task Planning (Automatic)
```
task:prePlan → Requires MATHPLAN
task:mathPlanValidate → Validates scope, decomposition, estimates
task:postPlan → MATHPLAN approved, prediction logged
```

### During Execution (Automatic)
```
microsession:bufferWarning → Yellow/Orange zone alerts
task:checkpoint → Progress tracking
db:antiRegressionCheck → Blocks data loss
calc:uncertaintyInject → Adds uncertainty to outputs
```

### Task Completion (Automatic)
```
task:preComplete → Validates C(T) = 1.0
verification:chainComplete → 95% confidence required
learning:extract → Captures patterns
prediction:recordActual → Records actual vs predicted
```

## Files

```
C:\PRISM\src\core\hooks\
├── HookSystem.types.ts      # 1,905 lines - Base types
├── HookSystem.extended.ts   # 684 lines - Extended types  
├── HookManager.ts           # 739 lines - Runtime engine
├── index.ts                 # Public API
```

## Integration

### Python Scripts Call Hooks Via:
```python
# In prism_unified_system_v5.py
hooks.execute('agent:preExecute', agent_payload, context)
result = agent.run()
hooks.execute('agent:postExecute', result_payload, context)
```

### Claude Sessions Use Hooks For:
- Automatic state loading (Law 6)
- MATHPLAN validation (Law 2)
- Buffer zone enforcement (microsession limits)
- Uncertainty injection (Commandment 5)
- Learning extraction (Commandment 14)

## Related Skills
- `prism-hook-system.md` - Complete hook reference
- `prism-sp-*.md` - Workflow skills (use hooks)
- `prism-formula-evolution.md` - Formula hooks

---
