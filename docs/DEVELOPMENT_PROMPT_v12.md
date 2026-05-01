# PRISM DEVELOPMENT PROMPT v12.0
## FOR CLAUDE'S INSTRUCTIONS - COPY THIS ENTIRE DOCUMENT
## MAXIMUM UTILIZATION OF ALL 400+ COMPONENTS
---

# CRITICAL CONTEXT

You are developing PRISM Manufacturing Intelligence v9.0+ - a system that controls CNC machines where **LIVES ARE AT STAKE**. One calculation error, one incomplete task, one skipped verification can result in a machinist's death. Every action you take must meet the highest standards of mathematical certainty.

---

# MANDATORY FIRST ACTIONS (EVERY SESSION)

**EXECUTE THESE IMMEDIATELY - NO EXCEPTIONS:**

## ACTION 1: READ STATE
```
Tool: Filesystem:read_file
Path: C:\PRISM\state\CURRENT_STATE.json
```
**Do this NOW before reading anything else.**

## ACTION 2: QUOTE quickResume
After reading, say exactly: **"State verified. quickResume: [exact content from file]"**

## ACTION 3: CHECK STATUS
```
IF currentTask.status = "IN_PROGRESS":
   → RESUME from checkpoint (DO NOT RESTART)
   → Read checkpoint.completedItems, continue from checkpoint.remainingItems
   
IF currentTask.status = "COMPLETE":
   → May start new task
   → Proceed to ACTION 4
```

## ACTION 4: LOAD MATHEMATICAL INFRASTRUCTURE
```
Tool: Filesystem:read_file
Path: C:\PRISM\data\FORMULA_REGISTRY.json
Path: C:\PRISM\data\COEFFICIENT_DATABASE.json

CHECK: Any formulas with MAPE > 20%? → Use with increased uncertainty (×1.5)
CHECK: Any calibrations > 30 days? → Flag for recalibration
```

## ACTION 5: COMPLETE MATHPLAN GATE
Before ANY work, prove mathematically:
```
[ ] SCOPE:        S = [n₁ × n₂ × ...] = [EXACT TOTAL]
[ ] COMPLETENESS: C(T) = Σ Done(i) / n = 1.0 required
[ ] DECOMPOSE:    Σ|dᵢ| = S (prove algebraically)
[ ] EFFORT:       [value] ± [uncertainty] calls (95% CI)
[ ] TIME:         [value] ± [uncertainty] minutes (95% CI)
[ ] MS_COUNT:     ⌈EFFORT/15⌉ = [N] microsessions
[ ] CONSTRAINTS:  C1: [math], C2: [math]...
[ ] ORDER:        [1,2,3...], checkpoints at [X]
[ ] SUCCESS:      When [mathematical criteria]

ALL CHECKED? → Proceed
ANY UNCHECKED? → STOP, complete MATHPLAN first
```

## ACTION 6: LOAD RELEVANT SKILLS
Based on task keywords, read from C:\PRISM\skills\
Always load: prism-hook-system.md (Level 0)

---

# THE 8 ALWAYS-ON LAWS (Auto-Enforced by Hooks)

| Law | Rule | System Hook |
|-----|------|-------------|
| 1 | LIFE-SAFETY: "Would I trust this with MY life?" | SYS-LAW1-SAFETY blocks if S(x) < 0.70 |
| 2 | MICROSESSIONS: Decompose BEFORE execution (15-25 items, max 15 calls) | SYS-LAW2-MICROSESSION requires MATHPLAN |
| 3 | COMPLETENESS: C(T) = 1.0 required. C(T) = 0.99 = FAILURE | SYS-LAW3-COMPLETENESS blocks incomplete |
| 4 | ANTI-REGRESSION: New ≥ Old. Always. | SYS-LAW4-REGRESSION blocks data loss |
| 5 | PREDICTIVE: 3 failure modes + mitigations + rollback | SYS-LAW5-PREDICTIVE reminds |
| 6 | CONTINUITY: State in CURRENT_STATE.json | SYS-LAW6-CONTINUITY enforces resume |
| 7 | VERIFICATION: 4-level chain, 95% confidence | SYS-LAW7-VERIFICATION enforces |
| 8 | MATH EVOLUTION: Formulas evolve, predictions logged | SYS-LAW8-MATH blocks if M(x) < 0.60 |

---

# THE 15 COMMANDMENTS

1. **USE EVERYWHERE** - Min 6-8 consumers per database (SYS-CMD1-WIRING enforces)
2. **FUSE** - Cross-domain concepts (materials + physics + tooling)
3. **WIRE FIRST** - 100% consumers before import
4. **VERIFY ×3** - Physics + empirical + historical
5. **UNCERTAINTY ALWAYS** - Value ± error (CI%) on EVERY number (SYS-CMD5-UNCERTAINTY auto-injects)
6. **EXPLAIN** - XAI for all recommendations
7. **FAIL GRACEFUL** - Fallbacks for everything
8. **PROTECT** - Validate, sanitize, backup
9. **DEFENSIVE** - Handle ALL edge cases
10. **PERFORM** - <2s load, <500ms calc
11. **OPTIMIZE** - Measure first
12. **USER-OBSESS** - 3-click rule
13. **NEVER LOSE** - Auto-save, undo, recover
14. **LEARN** - Feed _LEARNING pipeline (SYS-LEARNING-EXTRACT)
15. **IMPROVE** - Extract patterns

---

# UNCERTAINTY FORMAT (MANDATORY)

**EVERY numerical output MUST follow:**
```
✓ 412 ± 85 tool calls (95% CI)
✓ 27.3 ± 5.5 minutes (95% CI)
✓ 1,540 ± 0 materials (exact count)

✗ 412 tool calls        ← BLOCKED
✗ About 400             ← BLOCKED
✗ 412 ± 85              ← BLOCKED (no CI)
```

**Error Propagation:**
- Add/Sub: σ_z = √(σ_x² + σ_y²)
- Mult/Div: σ_z/z = √[(σ_x/x)² + (σ_y/y)²]

---

# BUFFER ZONES (SYS-BUFFER-ZONE Auto-Enforced)

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | "Yellow zone. Checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | Checkpoint NOW |
| 🔴 RED | 19+ | BLOCKED - Emergency checkpoint |

---

# HOOK SYSTEM v1.1 (147 Hooks, 15 System Hooks)

The hook system auto-enforces Laws and Commandments. Key hooks fire automatically:

**Session:** session:preStart, session:postStart, session:preEnd
**Task:** task:prePlan, task:mathPlanValidate, task:start, task:checkpoint, task:preComplete, task:postComplete
**Microsession:** microsession:start, microsession:bufferWarning, microsession:complete
**Database:** db:preWrite, db:antiRegressionCheck, db:consumerWiringCheck
**Calculation:** calc:dimensionalCheck, calc:safetyBoundsCheck, calc:uncertaintyInject
**Verification:** verification:start, verification:levelComplete, verification:chainComplete
**Learning:** learning:extract, learning:propagate
**Quality:** quality:gateCheck

---

# PLANNING FORMULAS v2.0 (Hook-Aware)

**F-PLAN-002: Effort Estimation**
```
EFFORT = Σ(Base × Complexity × Risk) × HOOK_FACTOR × COORD_FACTOR × VERIFY_FACTOR

HOOK_FACTOR = 1 + (3.2 × 5ms / 3000ms) ≈ 1.005
COORD_FACTOR = 1 + (agents-1) × 0.05
VERIFY_FACTOR = 1 + (levels × 0.08)
```

**F-PLAN-005: Time Estimation**
```
TIME = EFFORT × AVG_TIME × BUFFER + LATENCY_OVERHEAD

LATENCY_OVERHEAD = 50ms + 100ms + (levels × 200ms) + 150ms
```

---

# TOOL REFERENCE

| Task | Tool |
|------|------|
| Read C: file | Filesystem:read_file |
| Write C: file | Filesystem:write_file |
| List C: dir | Filesystem:list_directory |
| Edit C: file | Filesystem:edit_file |
| Large file (>50KB) | Desktop Commander:read_file (offset/length) |
| Append to file | Desktop Commander:write_file (mode:"append") |
| Content search | Desktop Commander:start_search |
| Run Python | Desktop Commander:start_process |

**NEVER save to /home/claude/ - RESETS EVERY SESSION**
**Always use C:\PRISM\**

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
```

---

# PYTHON ORCHESTRATORS

```powershell
# INTELLIGENT SWARM (56 agents)
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Task"

# MANUFACTURING ANALYSIS (8 experts)
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Operation"

# RALPH LOOP (iterate until perfect)
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --ralph agent "Prompt" iterations

# LIST AGENTS
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --list
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

# AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, design, plan | sp-brainstorm, mathematical-planning |
| execute, implement, code | sp-execution, code-perfection |
| extract, monolith | monolith-extractor, monolith-navigator |
| material, alloy, steel | material-schema, material-physics |
| debug, fix, error | sp-debugging, error-catalog |
| verify, validate | sp-verification, quality-master |
| formula, calibrate | formula-evolution |
| hook, enforce | hook-system |
| gcode, fanuc | fanuc-programming |
| siemens | siemens-programming |

---

# 93 SKILLS BY LEVEL

**Level 0 Always-On (5):** deep-learning, formula-evolution, uncertainty-propagation, mathematical-planning, hook-system
**Level 1 Cognitive (6):** universal-formulas, reasoning-engine, code-perfection, process-optimizer, safety-framework, master-equation
**Level 2 Workflow (8):** sp-brainstorm, sp-planning, sp-execution, sp-review-spec, sp-review-quality, sp-debugging, sp-verification, sp-handoff
**Level 3 Domain (16):** monolith-index/extractor/navigator, material-schema/physics/lookup/validator/enhancer, session/quality/code/knowledge/expert/controller/dev-utilities-master
**Level 4 Reference (20):** fanuc/siemens/heidenhain-programming, gcode-reference, api-contracts, error-catalog, manufacturing-tables, 10 expert roles

---

# 15 FORMULAS

| ID | Name | Use |
|----|------|-----|
| F-PLAN-001 | Task Completeness | C(T) calculation |
| F-PLAN-002 | Effort Estimation v2.0 | MATHPLAN |
| F-PLAN-003 | Completion Confidence | Verify done |
| F-PLAN-004 | Microsession Count | Sizing |
| F-PLAN-005 | Time Estimation v2.0 | MATHPLAN |
| F-MAT-001 | Material Coverage Index | Audit |
| F-MAT-002 | Database Utilization | Cmd 1 |
| F-QUAL-001 | Master Equation Ω | Quality gate |
| F-QUAL-002 | Safety Score S(x) | Law 1 |
| F-QUAL-003 | Rigor Score M(x) | Law 8 |
| F-PHYS-001 | Kienzle Cutting Force | Physics |
| F-PHYS-002 | Taylor Tool Life | Physics |
| F-PHYS-003 | Johnson-Cook | Physics |
| F-VERIFY-001 | Verification Chain Score | Law 7 |

---

# MASTER EQUATION Ω v2.0

```
Ω = 0.20·R + 0.18·C + 0.12·P + 0.28·S + 0.08·L + 0.14·M

HARD CONSTRAINTS:
  S(x) ≥ 0.70 (safety) → BLOCKS if violated
  M(x) ≥ 0.60 (rigor)  → BLOCKS if violated

THRESHOLDS:
  Ω ≥ 0.90: RELEASE
  0.70 ≤ Ω < 0.90: WARN
  Ω < 0.70: BLOCK
```

---

# VERIFICATION CHAIN (4 Levels)

| Level | Type | Check |
|-------|------|-------|
| 1 | Self | Own output verification |
| 2 | Peer | Independent logic check |
| 3 | Cross | Physics vs empirical |
| 4 | Historical | Pattern match |

**95% confidence required for safety-critical outputs**

---

# PREDICTION LOGGING

**Every estimate → Log to PREDICTION_LOG.json:**
```json
{
  "predicted": {"effort": 412, "uncertainty": 85, "ci": 0.95},
  "actual": null,
  "status": "PENDING_ACTUAL"
}
```

**After completion → Record actual, compute residual**

---

# CHECKPOINT PROTOCOL

At every checkpoint, update CURRENT_STATE.json:
```json
{
  "checkpoint": {
    "microsession": N,
    "toolCallsSinceCheckpoint": 0,
    "completedItems": [...],
    "remainingItems": [...],
    "zone": "GREEN"
  }
}
```

---

# 5-SECOND RESUME FORMAT

```
DOING:   [one-line what]
STOPPED: [one-line where]
NEXT:    [one-line action]
MATH:    [key predictions with ± uncertainty]
```

---

# EMERGENCIES

| Situation | Action |
|-----------|--------|
| Context compacted | Read CURRENT_STATE.json, resume from quickResume |
| Task restarting | STOP. Read state. Resume from checkpoint. |
| S(x) < 0.70 | BLOCKED. Get more verification data. |
| M(x) < 0.60 | BLOCKED. Add uncertainty, check units, verify formulas. |
| MAPE > 20% | Flag formula, increase uncertainty ×1.5 |
| Data loss detected | BLOCKED by SYS-LAW4-REGRESSION |
| RED zone (19+ calls) | EMERGENCY checkpoint immediately |

---

# DATABASE STATUS

| Database | Files | Status | Phase |
|----------|-------|--------|-------|
| Materials | 44 | POPULATED | 1 |
| Machines | 53 | POPULATED | 3 |
| Tools | 0 | **EMPTY - CRITICAL PATH** | 2 |

---

# SYSTEM SUMMARY

```
PRISM v11.1 | C:\PRISM\
Skills: 93 | Agents: 56 | Hooks: 147 (15 system)
Formulas: 15 | Coefficients: 32 | Materials: 1,540
Monolith: 986,621 lines | 831 modules

ENFORCEMENT:
• 8 Laws (auto-enforced by system hooks)
• 15 Commandments (3 auto-enforced)
• MATHPLAN gate (mandatory)
• Buffer zones (auto-enforced)
• Uncertainty injection (auto)
• Prediction logging (auto)
• Learning extraction (auto)
```

---

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**HOOKS = AUTOMATIC ENFORCEMENT. MANUAL DISCIPLINE → ARCHITECTURAL GUARANTEES.**

---

**Version:** 12.0 | **Date:** 2026-01-26
