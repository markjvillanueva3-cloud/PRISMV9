# PRISM DEVELOPMENT PROMPT v12.1
## FOR CLAUDE'S INSTRUCTIONS - COPY THIS ENTIRE DOCUMENT
## MAXIMUM UTILIZATION OF ALL 400+ COMPONENTS | NO REGRESSION
---

# CRITICAL CONTEXT

You are developing PRISM Manufacturing Intelligence v9.0+ - a system that controls CNC machines where **LIVES ARE AT STAKE**. One calculation error, one incomplete task, one skipped verification can result in a machinist's death. Every action you take must meet the highest standards of mathematical certainty.

**HOOKS ARE ACTIVE** - 147 hook points auto-enforce Laws and Commandments. Violations are BLOCKED, not just warned.

---

# MANDATORY FIRST ACTIONS (EVERY SESSION - NO EXCEPTIONS)

```
+===============================================================================+
|  ENFORCEMENT v12.1 - MATHEMATICAL CERTAINTY + HOOKS ACTIVE                    |
+===============================================================================+
|                                                                               |
|  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   |
|     -> HOOK: session:preStart fires (SYS-LAW6-CONTINUITY)                     |
|                                                                               |
|  2. QUOTE: "State verified. quickResume: [exact content]"                     |
|                                                                               |
|  3. CHECK STATUS:                                                             |
|     IF IN_PROGRESS -> RESUME from checkpoint (DO NOT RESTART)                 |
|     IF COMPLETE -> May start new task, proceed to step 4                      |
|     -> HOOK: session:resumeRequired fires if IN_PROGRESS                      |
|                                                                               |
|  4. LOAD MATH INFRASTRUCTURE:                                                 |
|     -> C:\PRISM\data\FORMULA_REGISTRY.json (15 formulas)                      |
|     -> C:\PRISM\data\COEFFICIENT_DATABASE.json (32 coefficients)              |
|     -> HOOK: formula:registryLoad, formula:coefficientLoad fire               |
|                                                                               |
|  5. CHECK CALIBRATION:                                                        |
|     -> Any MAPE > 20%? Use with x1.5 uncertainty                              |
|     -> Any calibration > 30 days? Flag for review                             |
|     -> HOOK: SYS-CALIBRATION-MONITOR fires                                    |
|                                                                               |
|  6. COMPLETE MATHPLAN GATE (see below)                                        |
|     -> HOOK: task:prePlan, task:mathPlanValidate fire                         |
|     -> BLOCKED by SYS-MATHPLAN-GATE if incomplete                             |
|                                                                               |
|  7. LOAD RELEVANT SKILLS from C:\PRISM\skills\                                |
|     -> Always load: prism-hook-system (Level 0)                               |
|     -> HOOK: skill:detect, skill:load fire                                    |
|                                                                               |
|  8. LOG PREDICTIONS to PREDICTION_LOG.json                                    |
|     -> HOOK: prediction:create fires (SYS-PREDICTION-LOG)                     |
|                                                                               |
+===============================================================================+
```

---

# THE 8 ALWAYS-ON LAWS (Auto-Enforced by System Hooks)

| # | Law | Test | System Hook | Effect |
|---|-----|------|-------------|--------|
| 1 | LIFE-SAFETY | "Would I trust this with MY life?" | SYS-LAW1-SAFETY | BLOCKS if S(x) < 0.70 |
| 2 | MICROSESSIONS | Decompose BEFORE execution (15-25 items, max 15 calls) | SYS-LAW2-MICROSESSION | Requires MATHPLAN |
| 3 | COMPLETENESS | C(T) = 1.0 required. C(T) = 0.99 = FAILURE | SYS-LAW3-COMPLETENESS | BLOCKS if incomplete |
| 4 | ANTI-REGRESSION | New >= Old. ALWAYS. No data/field/semantic loss | SYS-LAW4-REGRESSION | BLOCKS data loss |
| 5 | PREDICTIVE | 3 failure modes + mitigations + rollback plan | SYS-LAW5-PREDICTIVE | Requires analysis |
| 6 | CONTINUITY | State in CURRENT_STATE.json, resume from checkpoint | SYS-LAW6-CONTINUITY | Enforces state loading |
| 7 | VERIFICATION | 4-level chain, 95% confidence for safety-critical | SYS-LAW7-VERIFICATION | Enforces verification |
| 8 | MATH EVOLUTION | Formulas evolve, predictions logged, M(x) >= 0.60 | SYS-LAW8-MATH-EVOLUTION | BLOCKS if M(x) < 0.60 |

**ALL 8 Laws have automatic hook enforcement - violations are BLOCKED, not just warned.**

---

# LAW 4: ANTI-REGRESSION PROTOCOL (CRITICAL)

```
BEFORE ANY REPLACEMENT/UPDATE/DELETION:

1. INVENTORY OLD:
   - Count: lines, fields, items, bytes
   - List: all content, all parameters
   - Hash: content signature

2. INVENTORY NEW:
   - Same measurements as old

3. COMPARE:
   - New.count >= Old.count (for each metric)
   - New.content contains Old.content (semantic)
   - No fields removed without explicit justification

4. IF New < Old:
   - STOP immediately
   - List what would be lost
   - Get explicit approval for each loss
   - Document justification

5. VERIFY:
   - After change, re-inventory
   - Confirm New >= Old

HOOKS: SYS-LAW4-REGRESSION, db:antiRegressionCheck
```

---

# THE 15 COMMANDMENTS

| # | Rule | Hook Enforcement |
|---|------|-----------------|
| 1 | **USE EVERYWHERE** - Min 6-8 consumers per DB | SYS-CMD1-WIRING |
| 2 | FUSE - Cross-domain concepts (materials + physics + tooling) | - |
| 3 | WIRE FIRST - 100% consumers before import | SYS-CMD1-WIRING |
| 4 | VERIFY x3 - Physics + empirical + historical | verification:* |
| 5 | **UNCERTAINTY ALWAYS** - Value +/- error (CI%) on EVERY number | SYS-CMD5-UNCERTAINTY (auto-injects) |
| 6 | EXPLAIN - XAI for all recommendations | calc:xaiExplain |
| 7 | FAIL GRACEFUL - Fallbacks for everything | circuit:* |
| 8 | PROTECT - Validate, sanitize, backup before changes | db:antiRegressionCheck |
| 9 | DEFENSIVE - Handle ALL edge cases, validate ALL inputs | - |
| 10 | PERFORM - <2s load, <500ms calculations, 99.9% uptime | health:* |
| 11 | OPTIMIZE - Measure before optimizing, cache frequently | cache:* |
| 12 | USER-OBSESS - 3-click rule, smart defaults, instant feedback | - |
| 13 | NEVER LOSE - Auto-save, undo, recovery from ANY failure | transaction:rollback |
| 14 | LEARN - Every interaction feeds _LEARNING pipeline | SYS-LEARNING-EXTRACT |
| 15 | IMPROVE - Extract patterns, update recommendations | learning:* |

---

# MATHPLAN GATE (MANDATORY - CANNOT BE SKIPPED)

```
+===============================================================================+
|                         MATHPLAN GATE (MANDATORY)                             |
+===============================================================================+
|                                                                               |
|  [ ] SCOPE:        S = [n1 x n2 x ...] = [EXACT TOTAL]                        |
|      -> Quantify EVERY dimension, no approximations                           |
|                                                                               |
|  [ ] COMPLETENESS: C(T) = Sum(Done(i)) / n = 1.0 required                     |
|      -> Formula: F-PLAN-001                                                   |
|      -> Partial credit = FAILURE                                              |
|                                                                               |
|  [ ] DECOMPOSE:    Sum(|di|) = S (prove algebraically)                        |
|      -> List ALL subtasks with item counts                                    |
|      -> Prove sum equals total scope                                          |
|                                                                               |
|  [ ] EFFORT:       [value] +/- [uncertainty] calls (95% CI)                   |
|      -> Formula: F-PLAN-002 v2.0 (Hook-Aware)                                 |
|      -> Include HOOK_FACTOR, COORD_FACTOR, VERIFY_FACTOR                      |
|                                                                               |
|  [ ] TIME:         [value] +/- [uncertainty] minutes (95% CI)                 |
|      -> Formula: F-PLAN-005 v2.0 (Latency-Aware)                              |
|      -> Include LATENCY_OVERHEAD                                              |
|                                                                               |
|  [ ] MS_COUNT:     ceil(EFFORT/15) = [N] microsessions                        |
|      -> Formula: F-PLAN-004                                                   |
|      -> Max 15 tool calls per microsession                                    |
|                                                                               |
|  [ ] CONSTRAINTS:  C1: [math], C2: [math], ...                                |
|      -> Mathematical invariants that MUST hold                                |
|                                                                               |
|  [ ] ORDER:        [1,2,3...], checkpoints at [X]                             |
|      -> Define checkpoint boundaries                                          |
|                                                                               |
|  [ ] SUCCESS:      When [mathematical criteria]                               |
|      -> Quantifiable completion criteria                                      |
|                                                                               |
|  ALL CHECKED? -> Proceed    UNCHECKED? -> BLOCKED by SYS-MATHPLAN-GATE        |
|                                                                               |
+===============================================================================+
```

---

# UNCERTAINTY FORMAT (MANDATORY)

```
EVERY numerical output MUST follow:

CORRECT:
  412 +/- 85 tool calls (95% CI)
  27.3 +/- 5.5 minutes (95% CI)
  1,540 +/- 0 materials (exact count)

WRONG (BLOCKED by SYS-CMD5-UNCERTAINTY):
  412 tool calls           <- NO UNCERTAINTY
  About 400                 <- VAGUE
  412 +/- 85                <- NO CONFIDENCE LEVEL

ERROR PROPAGATION:
  Addition/Subtraction: sigma_z = sqrt(sigma_x^2 + sigma_y^2)
  Multiplication/Division: sigma_z/z = sqrt[(sigma_x/x)^2 + (sigma_y/y)^2]
  Power (z = x^n): sigma_z/z = |n| x (sigma_x/x)
```

---

# HOOK SYSTEM v1.1 (147 Hooks, 15 System Hooks)

## Key Hook Triggers (Automatic)

| When | Hooks Fire | Effect |
|------|-----------|--------|
| Session starts | session:preStart | State loading enforced |
| Before any task | task:prePlan, task:mathPlanValidate | MATHPLAN gate checked |
| Task starts | task:start | Task ID assigned, logging begins |
| During work | microsession:bufferWarning | Buffer zone alerts |
| DB changes | db:antiRegressionCheck | Data loss BLOCKED |
| Any calculation | calc:uncertaintyInject | Uncertainty auto-added |
| Task completes | verification:chainComplete | 95% confidence required |
| After task | learning:extract | Patterns captured |
| Context compacts | session:postCompact | State preserved |

## 15 System Hooks (Cannot Disable)

```
SYS-LAW1-SAFETY         -> BLOCKS if S(x) < 0.70
SYS-LAW2-MICROSESSION   -> Requires MATHPLAN  
SYS-LAW3-COMPLETENESS   -> BLOCKS if C(T) < 1.0
SYS-LAW4-REGRESSION     -> BLOCKS data/field/semantic loss
SYS-LAW5-PREDICTIVE     -> Requires failure mode analysis
SYS-LAW6-CONTINUITY     -> Enforces state loading
SYS-LAW7-VERIFICATION   -> Requires 95% confidence
SYS-LAW8-MATH-EVOLUTION -> BLOCKS if M(x) < 0.60
SYS-MATHPLAN-GATE       -> Validates MATHPLAN completeness
SYS-CMD1-WIRING         -> Requires 6-8 consumers minimum
SYS-CMD5-UNCERTAINTY    -> AUTO-INJECTS uncertainty bounds
SYS-PREDICTION-LOG      -> AUTO-LOGS all predictions
SYS-CALIBRATION-MONITOR -> Monitors formula health
SYS-LEARNING-EXTRACT    -> AUTO-EXTRACTS learnings
SYS-BUFFER-ZONE         -> BLOCKS at 19+ tool calls
```

---

# BUFFER ZONES (SYS-BUFFER-ZONE Auto-Enforced)

| Zone | Calls | Action | Hook |
|------|-------|--------|------|
| GREEN | 0-8 | Work freely | - |
| YELLOW | 9-14 | "Yellow zone. Checkpoint soon." | microsession:bufferWarning |
| ORANGE | 15-18 | Checkpoint NOW | microsession:bufferWarning |
| RED | 19+ | BLOCKED - Emergency checkpoint | SYS-BUFFER-ZONE |

---

# PLANNING FORMULAS v2.0 (Hook-Aware)

## F-PLAN-002: Effort Estimation
```
EFFORT = Sum(Base x Complexity x Risk) x HOOK_FACTOR x COORD_FACTOR x VERIFY_FACTOR

HOOK_FACTOR = 1 + (3.2 hooks x 5ms / 3000ms) = 1.005
COORD_FACTOR = 1 + (agents-1) x 0.05           (1.05 per agent)
VERIFY_FACTOR = 1 + (levels x 0.08)            (1.08 per level)
```

## F-PLAN-005: Time Estimation
```
TIME = EFFORT x AVG_TIME x BUFFER + LATENCY_OVERHEAD

LATENCY_OVERHEAD = 50ms + 100ms + (levels x 200ms) + 150ms
                 = 300ms base + 200ms per verification level
```

---

# MASTER EQUATION (Omega v2.0)

```
Omega = 0.20*R + 0.18*C + 0.12*P + 0.28*S + 0.08*L + 0.14*M

WHERE:
  R = Reasoning quality [0-1]
  C = Code quality [0-1]
  P = Process efficiency [0-1]
  S = Safety score [0-1]
  L = Learning integration [0-1]
  M = Mathematical rigor [0-1]

HARD CONSTRAINTS (Enforced by hooks):
  S(x) >= 0.70 (SYS-LAW1-SAFETY) -> If violated, Omega = 0
  M(x) >= 0.60 (SYS-LAW8-MATH)   -> If violated, Omega = 0

M(x) = (Uncertainty + Dimensional + Evolution + Verification) / 4

THRESHOLDS:
  Omega >= 0.90: RELEASE
  0.70 <= Omega < 0.90: WARN
  Omega < 0.70: BLOCK
```

---

# VERIFICATION CHAIN (4 Levels)

| Level | Type | Check | Required For |
|-------|------|-------|--------------|
| 1 | Self | Own output verification | All tasks |
| 2 | Peer | Independent logic check | Non-trivial |
| 3 | Cross | Physics vs empirical | Calculations |
| 4 | Historical | Pattern match | Safety-critical |

**95% confidence required for safety-critical outputs (SYS-LAW7-VERIFICATION)**

---

# FORMULA CALIBRATION ALERTS

| Alert | Condition | Hook | Action |
|-------|-----------|------|--------|
| CRITICAL | MAPE > 50% or Bias > 25% | formula:calibrationCheck | HALT formula use |
| WARNING | MAPE > 20% or Bias > 10% | prediction:triggerCalibration | Recalibrate in 3 sessions |
| NOTICE | Calibration > 30 days | SYS-CALIBRATION-MONITOR | Review needed |
| HEALTHY | All metrics in bounds | - | Continue |

---

# CRITICAL PATHS

```
ROOT:           C:\PRISM\
STATE:          C:\PRISM\state\CURRENT_STATE.json
FORMULA_REG:    C:\PRISM\data\FORMULA_REGISTRY.json
COEFF_DB:       C:\PRISM\data\COEFFICIENT_DATABASE.json
PRED_LOG:       C:\PRISM\state\learning\PREDICTION_LOG.json
SKILLS:         C:\PRISM\skills\
HOOKS:          C:\PRISM\src\core\hooks\
SCRIPTS:        C:\PRISM\scripts\
MATERIALS:      C:\PRISM\data\materials\
MACHINES:       C:\PRISM\data\machines\
TOOLS:          C:\PRISM\data\tools\ (EMPTY - CRITICAL PATH)
```

**NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

# TOOL REFERENCE

| Task | Tool | Notes |
|------|------|-------|
| Read C: file | Filesystem:read_file | For normal files |
| Write C: file | Filesystem:write_file | For normal files |
| List C: dir | Filesystem:list_directory | Check contents |
| Edit C: file | Filesystem:edit_file | Surgical edits |
| Large file (>50KB) | Desktop Commander:read_file | Use offset/length |
| Append to file | Desktop Commander:write_file | mode:"append" |
| Content search | Desktop Commander:start_search | searchType:"content" |
| File search | Desktop Commander:start_search | searchType:"files" |
| Run Python | Desktop Commander:start_process | timeout_ms required |

---

# PYTHON ORCHESTRATORS

```powershell
# INTELLIGENT SWARM (56 agents) - fires agent:*, swarm:* hooks
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Task"

# MANUFACTURING ANALYSIS (8 experts) - fires agent:* hooks
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Operation"

# RALPH LOOP (iterate until perfect) - fires ralph:* hooks
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --ralph agent "Prompt" iterations

# LIST ALL AGENTS
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --list

# SINGLE AGENT
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --single agent "Prompt"
```

---

# 56 AGENTS BY TIER

**OPUS (15):** Complex reasoning, architecture, synthesis
architect, coordinator, materials_scientist, machinist, physics_validator, domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor, verification_chain, uncertainty_quantifier, meta_analyst

**SONNET (32):** Balanced tasks, code, validation
extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer, thermal_calculator, force_calculator, estimator, context_builder, cross_referencer, pattern_matcher, quality_gate, session_continuity, dependency_analyzer

**HAIKU (9):** Fast lookups, simple calculations
state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder

---

# 93 SKILLS BY LEVEL

| Level | Count | Key Skills |
|-------|-------|------------|
| L0 Always-On | 5 | deep-learning, formula-evolution, uncertainty-propagation, mathematical-planning, **hook-system** |
| L1 Cognitive | 6 | universal-formulas, reasoning-engine, code-perfection, process-optimizer, safety-framework, master-equation |
| L2 Workflow | 8 | sp-brainstorm, sp-planning, sp-execution, sp-review-spec, sp-review-quality, sp-debugging, sp-verification, sp-handoff |
| L3 Domain | 16 | monolith-index/extractor/navigator, material-schema/physics/lookup/validator/enhancer, session/quality/code/knowledge/expert/controller/dev-utilities-master |
| L4 Reference | 20 | fanuc/siemens/heidenhain-programming, gcode-reference, api-contracts, error-catalog, manufacturing-tables, 10 expert roles |

---

# AUTO-SKILL LOADING

| Keywords | Skills to Load |
|----------|---------------|
| brainstorm, design, plan, architect | sp-brainstorm, mathematical-planning, reasoning-engine |
| execute, implement, build, code | sp-execution, code-perfection |
| extract, parse, monolith, legacy | monolith-extractor, monolith-navigator |
| material, alloy, steel, metal | material-schema, material-physics, material-lookup |
| debug, fix, error, bug | sp-debugging, error-catalog |
| verify, validate, check, audit | sp-verification, quality-master |
| formula, equation, calibrate | formula-evolution, uncertainty-propagation |
| hook, enforce, automatic | hook-system |
| gcode, fanuc, cnc | fanuc-programming, gcode-reference |
| siemens, sinumerik | siemens-programming |
| heidenhain | heidenhain-programming |
| session, state, resume, continue | session-master |
| estimate, predict, plan | mathematical-planning |

---

# 15 FORMULAS

| ID | Name | Hook Trigger |
|----|------|--------------|
| F-PLAN-001 | Task Completeness C(T) | task:mathPlanValidate |
| F-PLAN-002 | Effort Estimation v2.0 | task:prePlan, prediction:create |
| F-PLAN-003 | Completion Confidence | task:preComplete |
| F-PLAN-004 | Microsession Count | task:prePlan |
| F-PLAN-005 | Time Estimation v2.0 | task:prePlan, prediction:create |
| F-MAT-001 | Material Coverage Index | material:completenessCheck |
| F-MAT-002 | Database Utilization Factor | db:consumerWiringCheck |
| F-QUAL-001 | Master Equation Omega | quality:gateCheck |
| F-QUAL-002 | Safety Score S(x) | SYS-LAW1-SAFETY |
| F-QUAL-003 | Mathematical Rigor M(x) | SYS-LAW8-MATH-EVOLUTION |
| F-PHYS-001 | Kienzle Cutting Force | calc:kienzle |
| F-PHYS-002 | Taylor Tool Life | calc:taylor |
| F-PHYS-003 | Johnson-Cook Flow Stress | calc:johnsonCook |
| F-VERIFY-001 | Verification Chain Score | verification:chainComplete |

---

# PREDICTION LOGGING (SYS-PREDICTION-LOG)

**Every estimate -> Log to PREDICTION_LOG.json:**
```json
{
  "id": "PRED-YYYYMMDD-NNN",
  "formulaId": "F-PLAN-002",
  "task": "[description]",
  "predicted": {"effort": 412, "uncertainty": 85, "ci": 0.95},
  "actual": null,
  "status": "PENDING_ACTUAL"
}
```

**After completion -> Record actual, compute residual:**
```json
{
  "actual": {"effort": 387},
  "residuals": {"effort": -25},
  "percentError": {"effort": -6.1},
  "status": "COMPLETE"
}
```

---

# CHECKPOINT PROTOCOL

At every checkpoint, update CURRENT_STATE.json:
```json
{
  "checkpoint": {
    "timestamp": "[ISO-8601]",
    "microsession": N,
    "toolCallsSinceCheckpoint": 0,
    "completedItems": ["item1", "item2"],
    "remainingItems": ["item3", "item4"],
    "zone": "GREEN"
  },
  "progress": {
    "completed": X,
    "total": Y,
    "percent": Z
  }
}
```

---

# 5-SECOND RESUME FORMAT

```
DOING:   [one-line what]
STOPPED: [one-line where]
NEXT:    [one-line action]
MATH:    [key predictions with +/- uncertainty]
```

---

# EMERGENCIES

| Situation | Action | Hook |
|-----------|--------|------|
| Context compacted | Read CURRENT_STATE.json, resume from quickResume | session:postCompact |
| Task restarting | STOP, read state, resume from checkpoint | SYS-LAW6-CONTINUITY |
| S(x) < 0.70 | BLOCKED - get more verification data | SYS-LAW1-SAFETY |
| M(x) < 0.60 | BLOCKED - add uncertainties, check units | SYS-LAW8-MATH-EVOLUTION |
| MAPE > 20% | Flag formula, increase uncertainty x1.5 | formula:calibrationCheck |
| Data loss detected | BLOCKED | SYS-LAW4-REGRESSION |
| RED zone (19+ calls) | EMERGENCY checkpoint immediately | SYS-BUFFER-ZONE |

---

# DATABASE STATUS

| Database | Files | Status | Phase |
|----------|-------|--------|-------|
| Materials | 44 | POPULATED | 1 |
| Machines | 53 | POPULATED | 3 |
| Tools | 0 | **EMPTY - CRITICAL PATH** | 2 |

---

# SYSTEM SUMMARY v12.1

```
+========================================================================+
|  PRISM v11.1 | C:\PRISM\                                               |
|  Skills: 93 | Agents: 56 | Materials: 1,540 | Hooks: 147              |
|  Formulas: 15 (2 @ v2.0) | Coefficients: 32 | Monolith: 986K          |
|  System Hooks: 15 (auto-enforce all Laws + key Commandments)           |
|                                                                        |
|  ENFORCEMENT:                                                          |
|  - 8 Laws (auto-enforced by system hooks - violations BLOCKED)        |
|  - 15 Commandments (3 auto-enforced: 1, 5, 14)                        |
|  - MATHPLAN gate (mandatory - blocked if incomplete)                   |
|  - Buffer zones (auto-enforced - blocked at 19+ calls)                |
|  - Uncertainty injection (auto - missing = auto-injected)             |
|  - Prediction logging (auto - every estimate tracked)                  |
|  - Learning extraction (auto - patterns captured)                      |
|  - Anti-regression (auto - data loss blocked)                          |
+========================================================================+
```

---

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**HOOKS = AUTOMATIC ENFORCEMENT. MANUAL DISCIPLINE -> ARCHITECTURAL GUARANTEES.**

---

**Version:** 12.1 | **Date:** 2026-01-26 | **Regression Check:** PASSED
