# PRISM CONDENSED PROTOCOL v12.0
## Quick Reference | Full Integration | HOOK ENFORCEMENT ACTIVE
---

# MANDATORY SESSION START

```
1. READ: C:\PRISM\state\CURRENT_STATE.json
2. QUOTE: "State verified. quickResume: [exact content]"
3. CHECK: IN_PROGRESS? → RESUME. COMPLETE? → New task.
4. LOAD: FORMULA_REGISTRY.json + COEFFICIENT_DATABASE.json
5. CHECK: Calibration staleness (>30 days = alert)
6. MATHPLAN: Complete gate before ANY execution
7. SKILLS: Load relevant from C:\PRISM\skills\
```

---

# 8 LAWS + HOOKS

| Law | Rule | Hook |
|-----|------|------|
| 1 | LIFE-SAFETY | SYS-LAW1-SAFETY blocks S(x)<0.70 |
| 2 | MICROSESSIONS (15-25 items) | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS C(T)=1.0 | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION New≥Old | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE (3 failure modes) | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY (state file) | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION (95% confidence) | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION M(x)≥0.60 | SYS-LAW8-MATH-EVOLUTION |

---

# MATHPLAN GATE (MANDATORY)

```
[ ] SCOPE:        S = [n₁ × n₂] = [EXACT TOTAL]
[ ] COMPLETENESS: C(T) = 1.0 required
[ ] DECOMPOSE:    Σ|dᵢ| = S (prove it)
[ ] EFFORT:       [X] ± [Y] calls (95% CI)
[ ] TIME:         [X] ± [Y] min (95% CI)
[ ] MS_COUNT:     ⌈EFFORT/15⌉ = [N]
[ ] CONSTRAINTS:  C1:[math], C2:[math]
[ ] ORDER:        [sequence], checkpoints at [X]
[ ] SUCCESS:      [mathematical criteria]

ALL CHECKED? → Execute   UNCHECKED? → BLOCKED
```

---

# UNCERTAINTY FORMAT (REQUIRED)

```
✓ 412 ± 85 calls (95% CI)
✓ 27.3 ± 5.5 min (95% CI)
✗ 412 calls          ← BLOCKED
✗ About 400          ← BLOCKED
```

---

# BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Work |
| 🟡 | 9-14 | Checkpoint soon |
| 🟠 | 15-18 | Checkpoint NOW |
| 🔴 | 19+ | BLOCKED |

---

# PLANNING FORMULAS v2.0

```
EFFORT = Base × Complexity × Risk × HOOK × COORD × VERIFY
TIME = EFFORT × AVG_TIME × BUFFER + LATENCY_OVERHEAD
```

---

# 15 COMMANDMENTS

| # | Rule | Hook |
|---|------|------|
| 1 | USE EVERYWHERE (6-8 consumers) | SYS-CMD1-WIRING |
| 2 | FUSE cross-domain | - |
| 3 | WIRE FIRST | SYS-CMD1-WIRING |
| 4 | VERIFY ×3 | verification:* |
| 5 | UNCERTAINTY ALWAYS | SYS-CMD5-UNCERTAINTY |
| 6 | EXPLAIN (XAI) | calc:xaiExplain |
| 7 | FAIL GRACEFUL | circuit:* |
| 8 | PROTECT | db:antiRegressionCheck |
| 9 | DEFENSIVE | - |
| 10 | PERFORM (<2s) | health:* |
| 11 | OPTIMIZE | cache:* |
| 12 | USER-OBSESS | - |
| 13 | NEVER LOSE | transaction:rollback |
| 14 | LEARN | SYS-LEARNING-EXTRACT |
| 15 | IMPROVE | learning:* |

---

# CRITICAL PATHS

```
STATE:       C:\PRISM\state\CURRENT_STATE.json
FORMULAS:    C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENTS: C:\PRISM\data\COEFFICIENT_DATABASE.json
PREDICTIONS: C:\PRISM\state\learning\PREDICTION_LOG.json
SKILLS:      C:\PRISM\skills\
HOOKS:       C:\PRISM\src\core\hooks\
SCRIPTS:     C:\PRISM\scripts\
```

**NEVER /home/claude/ - RESETS**

---

# TOOLS

| Task | Tool |
|------|------|
| Read C: | Filesystem:read_file |
| Write C: | Filesystem:write_file |
| Large file | Desktop Commander:read_file |
| Append | Desktop Commander:write_file (mode:"append") |
| Search | Desktop Commander:start_search |
| Python | Desktop Commander:start_process |

---

# ORCHESTRATORS

```powershell
# 56-agent swarm
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Task"

# Manufacturing (8 experts)
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Mat" "Op"

# Ralph loop
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --ralph agent "Prompt" N
```

---

# AGENTS (56)

**OPUS (15):** architect, coordinator, materials_scientist, machinist, physics_validator, domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor, verification_chain, uncertainty_quantifier, meta_analyst

**SONNET (32):** extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer, thermal_calculator, force_calculator, estimator, context_builder, cross_referencer, pattern_matcher, quality_gate, session_continuity, dependency_analyzer

**HAIKU (9):** state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder

---

# AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, plan | sp-brainstorm, mathematical-planning |
| extract, monolith | monolith-extractor |
| material, steel | material-schema, material-physics |
| debug, error | sp-debugging |
| verify, validate | sp-verification |
| formula | formula-evolution |
| hook | hook-system |
| gcode, fanuc | fanuc-programming |

---

# 93 SKILLS

**L0 (5):** deep-learning, formula-evolution, uncertainty-propagation, mathematical-planning, hook-system
**L1 (6):** universal-formulas, reasoning-engine, code-perfection, process-optimizer, safety-framework, master-equation
**L2 (8):** sp-brainstorm, sp-planning, sp-execution, sp-review-spec, sp-review-quality, sp-debugging, sp-verification, sp-handoff
**L3 (16):** monolith-*, material-*, *-master
**L4 (20):** fanuc/siemens/heidenhain-programming, api-contracts, manufacturing-tables, 10 experts

---

# 15 FORMULAS

| ID | Name | Hook |
|----|------|------|
| F-PLAN-001 | Completeness C(T) | task:mathPlanValidate |
| F-PLAN-002 | Effort (v2.0) | task:prePlan |
| F-PLAN-003 | Confidence | task:preComplete |
| F-PLAN-004 | MS Count | task:prePlan |
| F-PLAN-005 | Time (v2.0) | task:prePlan |
| F-MAT-001 | Coverage MCI | material:completenessCheck |
| F-MAT-002 | Utilization DUF | db:consumerWiringCheck |
| F-QUAL-001 | Master Ω | quality:gateCheck |
| F-QUAL-002 | Safety S(x) | SYS-LAW1-SAFETY |
| F-QUAL-003 | Rigor M(x) | SYS-LAW8-MATH |
| F-PHYS-001 | Kienzle Fc | calc:kienzle |
| F-PHYS-002 | Taylor T | calc:taylor |
| F-PHYS-003 | J-C σ | calc:johnsonCook |
| F-VERIFY-001 | VCS | verification:chainComplete |

---

# MASTER EQUATION

```
Ω = 0.20R + 0.18C + 0.12P + 0.28S + 0.08L + 0.14M

S(x) ≥ 0.70 REQUIRED
M(x) ≥ 0.60 REQUIRED

Ω ≥ 0.90: RELEASE
0.70-0.90: WARN
< 0.70: BLOCK
```

---

# 147 HOOKS (25 Categories)

**Base (107):** Session, Task, Microsession, Database, Material, Calculation, Formula, Prediction, Agent, Swarm, Ralph, Learning, Verification, Quality, Skill, Script, Plugin

**Extended (40):** Transaction, Health, Cache, Circuit Breaker, Rate Limiting, Audit Trail, Feature Flag, MCP Integration, Planning Integration

**System (15):** SYS-LAW1-8, SYS-MATHPLAN-GATE, SYS-CMD1-WIRING, SYS-CMD5-UNCERTAINTY, SYS-PREDICTION-LOG, SYS-CALIBRATION-MONITOR, SYS-LEARNING-EXTRACT, SYS-BUFFER-ZONE

---

# VERIFICATION CHAIN

| Level | Type |
|-------|------|
| 1 | Self |
| 2 | Peer |
| 3 | Cross (physics vs empirical) |
| 4 | Historical |

**95% confidence for safety-critical**

---

# EMERGENCIES

| Situation | Action |
|-----------|--------|
| Compacted | Read state, resume |
| Restarting | STOP, read state, resume checkpoint |
| S(x)<0.70 | BLOCKED |
| M(x)<0.60 | BLOCKED |
| MAPE>20% | Flag, ×1.5 uncertainty |
| RED zone | Emergency checkpoint |

---

# 5-SECOND RESUME

```
DOING:   [what]
STOPPED: [where]
NEXT:    [action]
MATH:    [predictions ± uncertainty]
```

---

# SYSTEM v12.0

```
PRISM v11.1 | C:\PRISM\
Skills: 93 | Agents: 56 | Hooks: 147
Formulas: 15 | Coefficients: 32
Materials: 1,540 | Monolith: 986K lines

ENFORCEMENT: 8 Laws + 15 Commandments + MATHPLAN + Hooks
```

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v12.0 | 2026-01-26**
