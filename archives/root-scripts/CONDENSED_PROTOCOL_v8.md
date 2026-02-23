# PRISM CONDENSED PROTOCOL v8.0
## Quick Reference | ILP Optimization | HOOK ENFORCEMENT ACTIVE
---

# MANDATORY SESSION START

```
1. READ: C:\PRISM\state\CURRENT_STATE.json
2. QUOTE: "State verified. quickResume: [exact content]"
3. CHECK: IN_PROGRESS? → RESUME. COMPLETE? → New task.
4. LOAD: FORMULA_REGISTRY (22), COEFFICIENT_DATABASE (40+), RESOURCE_REGISTRY (691)
5. CHECK: Calibration staleness (>30 days = alert)
6. MATHPLAN: Complete gate before ANY execution
7. F-PSI-001: Get optimal resources with proof
8. SKILLS: Load relevant from C:\PRISM\skills\
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

# F-PSI-001 MASTER COMBINATION EQUATION

```
Ψ(T,R) = argmax [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) / Cost(R) ]
         R⊆ALL

CONSTRAINTS:
  |R_skills| ≤ 8, |R_agents| ≤ 8
  S(R) ≥ 0.70, M(R) ≥ 0.60
  Coverage(R,T) = 1.0

SOLVER: PuLP ILP, 500ms timeout, 2% gap
OUTPUT: R* with PROOF
```

---

# 7 COORDINATION FORMULAS (NEW)

| ID | Symbol | Purpose |
|----|--------|---------|
| F-PSI-001 | Ψ(T,R) | Optimal combination |
| F-RESOURCE-001 | Cap(r,T) | Capability scoring |
| F-SYNERGY-001 | Syn(R) | Interaction effects |
| F-COVERAGE-001 | Coverage(R,T) | Task completeness |
| F-SWARM-001 | SwarmEff(A) | Swarm efficiency |
| F-AGENT-001 | A*(T) | Agent selection |
| F-PROOF-001 | Proof(R*) | Optimality proof |

---

# MATHPLAN GATE (MANDATORY)

```
[ ] SCOPE:        S = [n₁ × n₂] = [EXACT TOTAL]
[ ] COMPLETENESS: C(T) = 1.0 required
[ ] DECOMPOSE:    Σ|dᵢ| = S (prove it)
[ ] EFFORT:       [X] ± [Y] calls (95% CI)
[ ] TIME:         [X] ± [Y] min (95% CI)
[ ] MS_COUNT:     ⌈EFFORT/15⌉ = [N]
[ ] RESOURCES:    R* = F-PSI-001(T) with proof
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

# CRITICAL PATHS

```
STATE:       C:\PRISM\state\CURRENT_STATE.json
FORMULAS:    C:\PRISM\data\FORMULA_REGISTRY.json (22)
COEFF:       C:\PRISM\data\COEFFICIENT_DATABASE.json (40+)
RESOURCES:   C:\PRISM\data\coordination\RESOURCE_REGISTRY.json (691)
CAPABILITY:  C:\PRISM\data\coordination\CAPABILITY_MATRIX.json
SYNERGY:     C:\PRISM\data\coordination\SYNERGY_MATRIX.json
PREDICTIONS: C:\PRISM\state\learning\PREDICTION_LOG.json
SKILLS:      C:\PRISM\skills\
```

**NEVER /home/claude/ - RESETS**

---

# ORCHESTRATORS (v6.0)

```powershell
# OPTIMAL (ILP-based) - NEW
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --optimal "Task"

# Intelligent swarm (64 agents)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Manufacturing (8 experts)
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Mat" "Op"

# Ralph loop
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph agent "Prompt" N
```

---

# AGENTS (64 = 58 existing + 6 new)

**OPUS (18):** architect, coordinator↑, materials_scientist, machinist, physics_validator, domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor↑, verification_chain, uncertainty_quantifier, meta_analyst↑, **combination_optimizer★**, **synergy_analyst★**, **proof_generator★**

**SONNET (37):** extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer, thermal_calculator, force_calculator, estimator, context_builder, cross_referencer, pattern_matcher, quality_gate, session_continuity, dependency_analyzer, **resource_auditor★**, **calibration_engineer★**, **test_orchestrator★**

**HAIKU (9):** state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder

★ = NEW, ↑ = UPGRADED

---

# SKILLS (99 = 93 existing + 6 new)

**L0 (6):** deep-learning, formula-evolution, uncertainty-propagation, mathematical-planning, hook-system, **combination-engine★**
**L1 (10):** universal-formulas, reasoning-engine, code-perfection, process-optimizer, safety-framework, master-equation, **swarm-coordinator★**, **resource-optimizer★**, **agent-selector★**, **synergy-calculator★**
**L2 (9):** sp-brainstorm, sp-planning, sp-execution, sp-review-spec, sp-review-quality, sp-debugging, sp-verification, sp-handoff, **claude-code-bridge★**
**L3 (16):** monolith-*, material-*, *-master
**L4 (20):** fanuc/siemens/heidenhain-programming, api-contracts, manufacturing-tables, 10 experts

---

# 22 FORMULAS

**PLANNING (5):** F-PLAN-001 to F-PLAN-005
**MATERIALS (2):** F-MAT-001, F-MAT-002
**QUALITY (3):** F-QUAL-001 to F-QUAL-003
**PHYSICS (3):** F-PHYS-001 to F-PHYS-003
**VERIFICATION (1):** F-VERIFY-001
**COORDINATION (7):** F-PSI-001, F-RESOURCE-001, F-SYNERGY-001, F-COVERAGE-001, F-SWARM-001, F-AGENT-001, F-PROOF-001 ★

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

# 147 HOOKS (15 System)

**System (15):** SYS-LAW1-8, SYS-MATHPLAN-GATE, SYS-CMD1-WIRING, SYS-CMD5-UNCERTAINTY, SYS-PREDICTION-LOG, SYS-CALIBRATION-MONITOR, SYS-LEARNING-EXTRACT, SYS-BUFFER-ZONE

---

# AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| optimal, combination | combination-engine, resource-optimizer |
| swarm, coordinate | swarm-coordinator |
| synergy | synergy-calculator |
| brainstorm, plan | sp-brainstorm, mathematical-planning |
| extract, monolith | monolith-extractor |
| material, steel | material-schema, material-physics |
| debug, error | sp-debugging |
| verify, validate | sp-verification |
| formula | formula-evolution |
| hook | hook-system |
| gcode, fanuc | fanuc-programming |

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

# SYSTEM v13.0

```
PRISM v13.0 | C:\PRISM\
Skills: 99 | Agents: 64 | Resources: 691 | Hooks: 147
Formulas: 22 (7 COORDINATION) | Coefficients: 40+
Materials: 3,518 | Machines: 824 | Tools: 1,944

NEW: F-PSI-001 ILP optimization, 6 agents, 6 skills, orchestrator v6
ENFORCEMENT: 8 Laws + 15 Commandments + MATHPLAN + Hooks + ILP
```

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v8.0 | 2026-01-27**
