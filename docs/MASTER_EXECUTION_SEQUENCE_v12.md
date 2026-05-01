# PRISM MASTER EXECUTION SEQUENCE v12.0
## COMPLETE INTEGRATION OF ALL 400+ COMPONENTS
## Every hook, formula, agent, skill in PERFECT SYNCHRONIZATION
---

# CRITICAL: THIS DOCUMENT DEFINES THE EXACT SEQUENCE OF OPERATIONS
# DEVIATION = POTENTIAL MACHINIST DEATH
# FOLLOW EXACTLY

---

# PHASE A: SESSION INITIALIZATION (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ A1. STATE LOADING                                                           │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: session:preStart (SYS-LAW6-CONTINUITY)                     │    │
│     │ ACTION: Read C:\PRISM\state\CURRENT_STATE.json                   │    │
│     │ VERIFY: File exists, valid JSON, has quickResume                 │    │
│     │ OUTPUT: "State verified. quickResume: [exact content]"           │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ A2. STATUS CHECK                                                            │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ IF currentTask.status = "IN_PROGRESS":                           │    │
│     │    HOOK: session:resumeRequired fires                            │    │
│     │    ACTION: RESUME from checkpoint (DO NOT RESTART)               │    │
│     │    SKIP TO: Phase C (Resume Execution)                           │    │
│     │                                                                  │    │
│     │ IF currentTask.status = "COMPLETE":                              │    │
│     │    ACTION: Proceed to A3                                         │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ A3. MATHEMATICAL INFRASTRUCTURE LOADING                                     │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: formula:registryLoad                                       │    │
│     │ ACTION: Read FORMULA_REGISTRY.json                               │    │
│     │ VERIFY: 15 formulas, version >= 1.1                              │    │
│     │ CHECK: Any MAPE > 20%? → FLAG for recalibration                  │    │
│     │                                                                  │    │
│     │ HOOK: formula:coefficientLoad                                    │    │
│     │ ACTION: Read COEFFICIENT_DATABASE.json                           │    │
│     │ VERIFY: 32 coefficients, hook coefficients present               │    │
│     │ CHECK: Any calibration > 30 days? → ALERT                        │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ A4. SESSION HOOK COMPLETION                                                 │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: session:postStart                                          │    │
│     │ VERIFY: All A1-A3 steps complete                                 │    │
│     │ LOG: Session initialized with [timestamp]                        │    │
│     └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PHASE B: TASK PLANNING (MANDATORY FOR NEW TASKS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ B1. SKILL DETECTION AND LOADING                                             │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: skill:detect                                               │    │
│     │ INPUT: Task description keywords                                 │    │
│     │ MATCH: Keywords → Skill mappings (see AUTO-SKILL table)          │    │
│     │                                                                  │    │
│     │ HOOK: skill:load                                                 │    │
│     │ ACTION: Read matched skills from C:\PRISM\skills\                │    │
│     │ ALWAYS LOAD: prism-hook-system.md (Level 0)                      │    │
│     │                                                                  │    │
│     │ SKILL LOADING ORDER:                                             │    │
│     │   1. Level 0 (Always-On): 5 skills                               │    │
│     │   2. Level 1 (Cognitive): 6 skills                               │    │
│     │   3. Level 2 (Workflow): 8 skills (sp-* skills)                  │    │
│     │   4. Level 3 (Domain): 16 skills (matched by keyword)            │    │
│     │   5. Level 4 (Reference): 20 skills (as needed)                  │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ B2. MATHPLAN GATE (CANNOT BE SKIPPED)                                       │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: task:prePlan (SYS-LAW2-MICROSESSION)                       │    │
│     │ HOOK: task:mathPlanValidate (SYS-MATHPLAN-GATE)                  │    │
│     │                                                                  │    │
│     │ REQUIRED MATHPLAN FIELDS (ALL MUST BE COMPLETED):                │    │
│     │                                                                  │    │
│     │ [ ] SCOPE: S = [n1 × n2 × ...] = [EXACT TOTAL]                   │    │
│     │     • Quantify EVERY dimension                                   │    │
│     │     • No approximations - exact counts only                      │    │
│     │                                                                  │    │
│     │ [ ] COMPLETENESS: C(T) = Σ Done(i) / n = 1.0 required            │    │
│     │     • Formula: F-PLAN-001                                        │    │
│     │     • Partial credit = FAILURE                                   │    │
│     │                                                                  │    │
│     │ [ ] DECOMPOSITION: Σ|di| = S (algebraic proof)                   │    │
│     │     • List ALL subtasks with item counts                         │    │
│     │     • Prove sum equals total scope                               │    │
│     │                                                                  │    │
│     │ [ ] EFFORT: [value] ± [uncertainty] calls (95% CI)               │    │
│     │     • Formula: F-PLAN-002 v2.0 (Hook-Aware)                      │    │
│     │     • Apply HOOK_FACTOR, COORD_FACTOR, VERIFY_FACTOR             │    │
│     │     • Coefficients: K-EFFORT-*, K-HOOK-*, K-COORD-*, K-VERIFY-*  │    │
│     │                                                                  │    │
│     │ [ ] TIME: [value] ± [uncertainty] minutes (95% CI)               │    │
│     │     • Formula: F-PLAN-005 v2.0 (Latency-Aware)                   │    │
│     │     • Include LATENCY_OVERHEAD                                   │    │
│     │     • Coefficients: K-TIME-*, K-LATENCY-*                        │    │
│     │                                                                  │    │
│     │ [ ] MS_COUNT: ⌈EFFORT/15⌉ = [N] microsessions                    │    │
│     │     • Formula: F-PLAN-004                                        │    │
│     │     • Max 15 tool calls per microsession                         │    │
│     │                                                                  │    │
│     │ [ ] CONSTRAINTS: C1: [math], C2: [math], ...                     │    │
│     │     • Mathematical invariants that MUST hold                     │    │
│     │                                                                  │    │
│     │ [ ] ORDER: Execute sequence [1,2,3,...], checkpoints at [X]      │    │
│     │     • Define checkpoint boundaries                               │    │
│     │                                                                  │    │
│     │ [ ] SUCCESS: When [mathematical criteria]                        │    │
│     │     • Quantifiable completion criteria                           │    │
│     │                                                                  │    │
│     │ VALIDATION:                                                      │    │
│     │   ALL CHECKED? → HOOK: task:postPlan fires, proceed to B3        │    │
│     │   ANY UNCHECKED? → BLOCKED (SYS-MATHPLAN-GATE)                   │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ B3. PREDICTION LOGGING                                                      │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: prediction:create (SYS-PREDICTION-LOG)                     │    │
│     │ ACTION: Write to PREDICTION_LOG.json                             │    │
│     │                                                                  │    │
│     │ {                                                                │    │
│     │   "id": "PRED-YYYYMMDD-NNN",                                     │    │
│     │   "formulaId": "F-PLAN-002",                                     │    │
│     │   "task": "[task description]",                                  │    │
│     │   "predicted": {                                                 │    │
│     │     "effort": {"value": X, "uncertainty": Y, "ci": 0.95},        │    │
│     │     "time": {"value": X, "uncertainty": Y, "ci": 0.95}           │    │
│     │   },                                                             │    │
│     │   "actual": null,                                                │    │
│     │   "status": "PENDING_ACTUAL"                                     │    │
│     │ }                                                                │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ B4. AGENT SELECTION (If Using Orchestrator)                                 │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: agent:select                                               │    │
│     │                                                                  │    │
│     │ AGENT TIER SELECTION:                                            │    │
│     │   OPUS (15 agents): Complex reasoning, architecture, synthesis   │    │
│     │   SONNET (32 agents): Balanced tasks, code, validation           │    │
│     │   HAIKU (9 agents): Fast lookups, simple calculations            │    │
│     │                                                                  │    │
│     │ SWARM TYPES:                                                     │    │
│     │   --intelligent: Full 56-agent swarm                             │    │
│     │   --manufacturing: 8-expert domain analysis                      │    │
│     │   --ralph: Iterative refinement loop                             │    │
│     │                                                                  │    │
│     │ HOOK: swarm:configure                                            │    │
│     │ Apply COORD_FACTOR = 1 + (agents-1) × 0.05 to effort estimate    │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ B5. TASK START                                                              │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: task:start                                                 │    │
│     │ LOG: Task [ID] started at [timestamp]                            │    │
│     │ UPDATE: CURRENT_STATE.json → status: "IN_PROGRESS"               │    │
│     │ PROCEED TO: Phase C                                              │    │
│     └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PHASE C: EXECUTION (MICROSESSION LOOP)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ C1. MICROSESSION START                                                      │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: microsession:start                                         │    │
│     │ INITIALIZE: tool_call_count = 0                                  │    │
│     │ SET: buffer_zone = GREEN                                         │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ C2. OPERATION LOOP (Repeat for each operation)                              │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ FOR EACH OPERATION:                                              │    │
│     │                                                                  │    │
│     │   C2a. PRE-OPERATION HOOKS                                       │    │
│     │   ┌────────────────────────────────────────────────────────────┐ │    │
│     │   │ HOOK: [category]:pre[Operation]                            │ │    │
│     │   │ HOOK: SYS-LAW1-SAFETY (all operations)                     │ │    │
│     │   │ HOOK: SYS-LAW4-REGRESSION (if write/delete)                │ │    │
│     │   │ HOOK: SYS-BUFFER-ZONE                                      │ │    │
│     │   │                                                            │ │    │
│     │   │ IF ANY HOOK BLOCKS:                                        │ │    │
│     │   │   LOG: Block reason                                        │ │    │
│     │   │   SKIP: This operation                                     │ │    │
│     │   │   REPORT: To user with abort reason                        │ │    │
│     │   └────────────────────────────────────────────────────────────┘ │    │
│     │                                                                  │    │
│     │   C2b. EXECUTE OPERATION                                         │    │
│     │   ┌────────────────────────────────────────────────────────────┐ │    │
│     │   │ PERFORM: The actual operation                              │ │    │
│     │   │ INCREMENT: tool_call_count++                               │ │    │
│     │   │ UPDATE: buffer_zone based on count                         │ │    │
│     │   └────────────────────────────────────────────────────────────┘ │    │
│     │                                                                  │    │
│     │   C2c. POST-OPERATION HOOKS                                      │    │
│     │   ┌────────────────────────────────────────────────────────────┐ │    │
│     │   │ HOOK: [category]:post[Operation]                           │ │    │
│     │   │ HOOK: SYS-CMD5-UNCERTAINTY (inject if missing)             │ │    │
│     │   │ HOOK: SYS-LEARNING-EXTRACT (extract patterns)              │ │    │
│     │   │                                                            │ │    │
│     │   │ CAPTURE: Any warnings, learnings, metrics                  │ │    │
│     │   └────────────────────────────────────────────────────────────┘ │    │
│     │                                                                  │    │
│     │   C2d. BUFFER ZONE CHECK                                         │    │
│     │   ┌────────────────────────────────────────────────────────────┐ │    │
│     │   │ GREEN  (0-8):   Continue                                   │ │    │
│     │   │ YELLOW (9-14):  HOOK: microsession:bufferWarning           │ │    │
│     │   │                 ANNOUNCE: "Yellow zone. Checkpoint soon."  │ │    │
│     │   │ ORANGE (15-18): HOOK: microsession:bufferWarning           │ │    │
│     │   │                 ACTION: Checkpoint NOW (goto C3)           │ │    │
│     │   │ RED    (19+):   BLOCKED by SYS-BUFFER-ZONE                 │ │    │
│     │   │                 EMERGENCY: Checkpoint immediately          │ │    │
│     │   └────────────────────────────────────────────────────────────┘ │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ C3. CHECKPOINT                                                              │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: task:checkpoint                                            │    │
│     │ HOOK: microsession:complete                                      │    │
│     │                                                                  │    │
│     │ UPDATE CURRENT_STATE.json:                                       │    │
│     │ {                                                                │    │
│     │   "checkpoint": {                                                │    │
│     │     "timestamp": "[now]",                                        │    │
│     │     "microsession": [current MS number],                         │    │
│     │     "toolCallsSinceCheckpoint": 0,                               │    │
│     │     "completedItems": [list of completed items],                 │    │
│     │     "remainingItems": [list of remaining items],                 │    │
│     │     "zone": "GREEN"                                              │    │
│     │   },                                                             │    │
│     │   "progress": {                                                  │    │
│     │     "completed": X,                                              │    │
│     │     "total": Y,                                                  │    │
│     │     "percent": Z                                                 │    │
│     │   }                                                              │    │
│     │ }                                                                │    │
│     │                                                                  │    │
│     │ ANNOUNCE: "Checkpoint. MS [N] complete. [X]/[Y] ([Z]%) done."    │    │
│     │                                                                  │    │
│     │ IF more work remains:                                            │    │
│     │   HOOK: microsession:start (goto C1)                             │    │
│     │ ELSE:                                                            │    │
│     │   PROCEED TO: Phase D                                            │    │
│     └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PHASE D: VERIFICATION AND COMPLETION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ D1. COMPLETENESS CHECK                                                      │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: task:preComplete (SYS-LAW3-COMPLETENESS)                   │    │
│     │                                                                  │    │
│     │ CALCULATE: C(T) = completed_items / total_items                  │    │
│     │ FORMULA: F-PLAN-001                                              │    │
│     │                                                                  │    │
│     │ IF C(T) < 1.0:                                                   │    │
│     │   BLOCKED: "INCOMPLETE: C(T) = [X] < 1.0"                        │    │
│     │   ACTION: Return to Phase C, continue work                       │    │
│     │                                                                  │    │
│     │ IF C(T) = 1.0:                                                   │    │
│     │   PROCEED TO: D2                                                 │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ D2. VERIFICATION CHAIN (4 Levels)                                           │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: verification:start (SYS-LAW7-VERIFICATION)                 │    │
│     │                                                                  │    │
│     │ LEVEL 1: SELF-VERIFICATION                                       │    │
│     │   HOOK: verification:levelComplete (level=1)                     │    │
│     │   CHECK: Own output for errors, completeness                     │    │
│     │   FORMULA: Internal consistency checks                           │    │
│     │                                                                  │    │
│     │ LEVEL 2: PEER-VERIFICATION                                       │    │
│     │   HOOK: verification:levelComplete (level=2)                     │    │
│     │   CHECK: Independent check of logic/calculations                 │    │
│     │   METHOD: Different approach to same problem                     │    │
│     │                                                                  │    │
│     │ LEVEL 3: CROSS-VERIFICATION                                      │    │
│     │   HOOK: verification:levelComplete (level=3)                     │    │
│     │   CHECK: Physics models vs empirical data                        │    │
│     │   FORMULAS: F-PHYS-001, F-PHYS-002, F-PHYS-003                   │    │
│     │                                                                  │    │
│     │ LEVEL 4: HISTORICAL-VERIFICATION                                 │    │
│     │   HOOK: verification:levelComplete (level=4)                     │    │
│     │   CHECK: Pattern match against known good results                │    │
│     │   SOURCE: Learning pipeline, knowledge graph                     │    │
│     │                                                                  │    │
│     │ HOOK: verification:chainComplete                                 │    │
│     │ CALCULATE: VCS = (L1 + L2 + L3 + L4) / 4                         │    │
│     │ FORMULA: F-VERIFY-001                                            │    │
│     │                                                                  │    │
│     │ IF safety_critical AND confidence < 0.95:                        │    │
│     │   BLOCKED: "VERIFICATION FAILED: [X]% < 95%"                     │    │
│     │   ACTION: Additional verification required                       │    │
│     │                                                                  │    │
│     │ IF VCS >= 0.95:                                                  │    │
│     │   PROCEED TO: D3                                                 │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ D3. QUALITY GATE                                                            │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: quality:gateCheck                                          │    │
│     │                                                                  │    │
│     │ CALCULATE MASTER EQUATION:                                       │    │
│     │ Ω(x) = 0.20·R + 0.18·C + 0.12·P + 0.28·S + 0.08·L + 0.14·M      │    │
│     │ FORMULA: F-QUAL-001                                              │    │
│     │                                                                  │    │
│     │ CHECK HARD CONSTRAINTS:                                          │    │
│     │   S(x) >= 0.70 (SYS-LAW1-SAFETY) → FORMULA: F-QUAL-002           │    │
│     │   M(x) >= 0.60 (SYS-LAW8-MATH) → FORMULA: F-QUAL-003             │    │
│     │                                                                  │    │
│     │ IF S(x) < 0.70 OR M(x) < 0.60:                                   │    │
│     │   Ω(x) FORCED TO 0                                               │    │
│     │   BLOCKED: "CONSTRAINT VIOLATION"                                │    │
│     │                                                                  │    │
│     │ HOOK: quality:gateAggregate                                      │    │
│     │                                                                  │    │
│     │ IF Ω >= 0.90: RELEASE                                            │    │
│     │ IF 0.70 <= Ω < 0.90: WARN (proceed with caution)                 │    │
│     │ IF Ω < 0.70: BLOCKED (quality gate failed)                       │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ D4. TASK COMPLETION                                                         │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: task:postComplete                                          │    │
│     │                                                                  │    │
│     │ RECORD ACTUAL VS PREDICTED:                                      │    │
│     │ HOOK: prediction:recordActual                                    │    │
│     │                                                                  │    │
│     │ UPDATE PREDICTION_LOG.json:                                      │    │
│     │ {                                                                │    │
│     │   "actual": {"effort": [X], "time": [Y]},                        │    │
│     │   "residuals": {"effort": [pred-actual], "time": [pred-actual]}, │    │
│     │   "percentError": {"effort": [%], "time": [%]},                  │    │
│     │   "status": "COMPLETE"                                           │    │
│     │ }                                                                │    │
│     │                                                                  │    │
│     │ CHECK CALIBRATION TRIGGERS:                                      │    │
│     │ HOOK: prediction:triggerCalibration                              │    │
│     │ IF MAPE > 20% OR |Bias| > 10% OR dataPoints >= 10:               │    │
│     │   FLAG: Formula for recalibration                                │    │
│     │                                                                  │    │
│     │ EXTRACT LEARNINGS:                                               │    │
│     │ HOOK: learning:extract (SYS-LEARNING-EXTRACT)                    │    │
│     │ CAPTURE: Patterns, insights, improvements                        │    │
│     │ WRITE: To LEARNING_DIR                                           │    │
│     │                                                                  │    │
│     │ UPDATE CURRENT_STATE.json:                                       │    │
│     │   status: "COMPLETE"                                             │    │
│     │   completedAt: [timestamp]                                       │    │
│     │   actual: {effort, time}                                         │    │
│     │   metrics: {Ω, S, M, VCS}                                        │    │
│     └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PHASE E: SESSION END

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ E1. SESSION WRAP-UP                                                         │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ HOOK: session:preEnd                                             │    │
│     │                                                                  │    │
│     │ IF task incomplete (context limit reached):                      │    │
│     │   CHECKPOINT: Ensure state saved                                 │    │
│     │   WRITE: quickResume with exact stopping point                   │    │
│     │   FORMAT:                                                        │    │
│     │     DOING:   [one-line what]                                     │    │
│     │     STOPPED: [one-line where]                                    │    │
│     │     NEXT:    [one-line action]                                   │    │
│     │     MATH:    [key predictions with ± uncertainty]                │    │
│     │                                                                  │    │
│     │ WRITE SESSION LOG:                                               │    │
│     │   LOGS_DIR/session_[timestamp].json                              │    │
│     │                                                                  │    │
│     │ HOOK: session:postEnd                                            │    │
│     │ ANNOUNCE: "Session complete. [summary]"                          │    │
│     └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# COMPONENT INTEGRATION MAP

## FORMULAS → CONSUMERS

| Formula | Consumed By | Hook Trigger |
|---------|------------|--------------|
| F-PLAN-001 | MATHPLAN validation, task:preComplete | task:mathPlanValidate |
| F-PLAN-002 | Effort estimation, MATHPLAN | task:prePlan, prediction:create |
| F-PLAN-003 | Completion confidence | task:preComplete |
| F-PLAN-004 | Microsession sizing | task:prePlan |
| F-PLAN-005 | Time estimation | task:prePlan, prediction:create |
| F-MAT-001 | Material completeness audit | material:completenessCheck |
| F-MAT-002 | Database utilization check | db:consumerWiringCheck |
| F-QUAL-001 | Quality gate | quality:gateCheck |
| F-QUAL-002 | Safety check | SYS-LAW1-SAFETY |
| F-QUAL-003 | Rigor check | SYS-LAW8-MATH-EVOLUTION |
| F-PHYS-001 | Cutting force calculations | calc:kienzle |
| F-PHYS-002 | Tool life calculations | calc:taylor |
| F-PHYS-003 | Material flow stress | calc:johnsonCook |
| F-VERIFY-001 | Verification chain score | verification:chainComplete |

## COEFFICIENTS → FORMULAS

| Coefficient | Used By Formula | Calibration Status |
|-------------|-----------------|-------------------|
| K-EFFORT-* | F-PLAN-002 | COLLECTING_DATA |
| K-TIME-* | F-PLAN-005 | COLLECTING_DATA |
| K-HOOK-* | F-PLAN-002 | UNCALIBRATED |
| K-COORD-* | F-PLAN-002 | UNCALIBRATED |
| K-VERIFY-* | F-PLAN-002 | UNCALIBRATED |
| K-LATENCY-* | F-PLAN-005 | UNCALIBRATED |
| K-SESSION-* | F-PLAN-004 | FIXED |
| K-MAT-WEIGHT-* | F-MAT-001 | EXPERT_JUDGMENT |
| K-UTIL-* | F-MAT-002 | FIXED |
| K-OMEGA-* | F-QUAL-001 | EXPERT_JUDGMENT |

## HOOKS → SYSTEM HOOKS → LAWS

| System Hook | Enforces | Priority | Hook Points |
|-------------|----------|----------|-------------|
| SYS-LAW1-SAFETY | Law 1 | 0 | * (all) |
| SYS-LAW2-MICROSESSION | Law 2 | 32 | task:prePlan, task:start |
| SYS-LAW3-COMPLETENESS | Law 3 | 33 | task:preComplete |
| SYS-LAW4-REGRESSION | Law 4 | 20 | db:preWrite, db:preDelete |
| SYS-LAW5-PREDICTIVE | Law 5 | 30 | task:prePlan |
| SYS-LAW6-CONTINUITY | Law 6 | 10 | session:preStart |
| SYS-LAW7-VERIFICATION | Law 7 | 0 | verification:chainComplete |
| SYS-LAW8-MATH-EVOLUTION | Law 8 | 60 | task:preComplete, calc:* |
| SYS-MATHPLAN-GATE | Law 2+8 | 5 | task:mathPlanValidate |
| SYS-CMD1-WIRING | Cmd 1 | 110 | db:consumerWiringCheck |
| SYS-CMD5-UNCERTAINTY | Cmd 5 | 60 | calc:postExecute |
| SYS-PREDICTION-LOG | Law 8 | 200 | task:postPlan |
| SYS-CALIBRATION-MONITOR | Law 8 | 220 | prediction:recordActual |
| SYS-LEARNING-EXTRACT | Cmd 14 | 170 | task:postComplete |
| SYS-BUFFER-ZONE | Law 2 | 0 | * (all) |

## AGENTS → TASKS

| Tier | Agents | Best For |
|------|--------|----------|
| OPUS (15) | architect, coordinator, materials_scientist, machinist, physics_validator, domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor, verification_chain, uncertainty_quantifier, meta_analyst | Complex reasoning, architecture, synthesis, verification |
| SONNET (32) | extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer, thermal_calculator, force_calculator, estimator, context_builder, cross_referencer, pattern_matcher, quality_gate, session_continuity, dependency_analyzer | Balanced tasks, code generation, validation, domain work |
| HAIKU (9) | state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder | Fast lookups, simple calculations, state management |

## SKILLS → KEYWORDS

| Keywords | Skills Loaded |
|----------|--------------|
| brainstorm, design, plan, architect | sp-brainstorm, mathematical-planning, reasoning-engine |
| execute, implement, build, code | sp-execution, code-perfection, tdd-enhanced |
| extract, parse, monolith, legacy | monolith-extractor, monolith-navigator, monolith-index |
| material, alloy, steel, metal | material-schema, material-physics, material-lookup |
| debug, fix, error, bug | sp-debugging, error-catalog |
| verify, validate, check, audit | sp-verification, quality-master, validator |
| formula, equation, calibrate | formula-evolution, uncertainty-propagation |
| hook, enforce, automatic | hook-system |
| gcode, fanuc, cnc | fanuc-programming, gcode-reference |
| siemens, sinumerik | siemens-programming |
| heidenhain | heidenhain-programming |
| session, state, resume, continue | session-master, state-manager |

---

# ORCHESTRATOR COMMANDS

```powershell
# INTELLIGENT SWARM (56 agents, fires agent:*, swarm:* hooks)
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Your task"

# MANUFACTURING ANALYSIS (8 experts, fires agent:* hooks)
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Operation"

# RALPH LOOP (iterative refinement, fires ralph:* hooks)
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --ralph agent "Prompt" iterations

# LIST ALL AGENTS
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --list

# SINGLE AGENT
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --single agent "Prompt"
```

---

**Version:** 12.0 | **Date:** 2026-01-26 | **Components:** 400+ integrated
**DEVIATION FROM THIS SEQUENCE = POTENTIAL FATALITY**
