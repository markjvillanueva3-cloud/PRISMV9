---
name: prism-all-skills
description: |
  Complete PRISM Manufacturing Intelligence skill package v4.0 containing 99 skills
  and 64 agents for PRISM v13.0 rebuild. Includes Combination Engine with F-PSI-001
  ILP optimization. Covers: 9 core development, 3 monolith navigation, 5 materials
  system, 4 session management, 6 quality/validation, 6 code/architecture, 4 context
  management, 2 knowledge base, 10 AI expert role skills, and 6 NEW coordination/
  combination skills. For PRISM v9.0 rebuild. Total coverage: 1.5MB+ of manufacturing
  intelligence.
---

# PRISM ALL-SKILLS v4.0
## Complete Manufacturing Intelligence Skill Package
## 99 Skills | 64 Agents | 22 Formulas | 691 Resources

---

# SKILL METADATA

```yaml
id: prism-all-skills
version: 4.0.0
level: META  # Master package containing all skills
trigger: prism|manufacturing|cnc|machining|material|tool|machine
purpose: Complete skill inventory and quick reference
dependencies: []
enforcement: REFERENCE  # Use for skill lookup and loading
```

---

# SYSTEM SUMMARY v13.0

```
Skills:       99 (93 existing + 6 NEW)
Agents:       64 (58 existing + 6 NEW)
Formulas:     22 (15 existing + 7 NEW COORDINATION)
Hooks:        147 (15 system hooks)
Coefficients: 40+
Resources:    691 cataloged

Materials:    3,518
Machines:     824
Tools:        1,944
```

---

# LEVEL 0 - ALWAYS ON (6 Skills)

| Skill | Purpose |
|-------|---------|
| **prism-combination-engine** ★ | ILP-based optimal resource selection via F-PSI-001 |
| prism-deep-learning | Auto-discovery and propagation of improvements |
| prism-formula-evolution | Formula lifecycle, calibration tracking |
| prism-hook-system | 147 hooks, 15 system hooks auto-enforce Laws |
| prism-mathematical-planning | MATHPLAN gate, scope quantification |
| prism-uncertainty-propagation | Mandatory uncertainty on all outputs |

★ = NEW in v13.0

---

# LEVEL 1 - COGNITIVE (10 Skills)

| Skill | Purpose |
|-------|---------|
| **prism-agent-selector** ★ | Cost-optimized agent assignment via F-AGENT-001 |
| prism-code-perfection | Code quality standards |
| prism-master-equation | Omega quality score |
| prism-process-optimizer | Workflow efficiency |
| prism-reasoning-engine | Step-back reasoning |
| **prism-resource-optimizer** ★ | Capability scoring |
| prism-safety-framework | S(x) ≥ 0.70 enforcement |
| **prism-swarm-coordinator** ★ | Multi-agent orchestration |
| **prism-synergy-calculator** ★ | Pairwise interaction via F-SYNERGY-001 |
| prism-universal-formulas | Core physics formulas |

---

# LEVEL 2 - WORKFLOW (9 Skills)

| Skill | Purpose |
|-------|---------|
| **prism-claude-code-bridge** ★ | Script execution, Python integration |
| prism-sp-brainstorm | Socratic design with chunked approval |
| prism-sp-debugging | 4-phase mandatory debugging |
| prism-sp-execution | Checkpoint execution |
| prism-sp-handoff | Session transition |
| prism-sp-planning | Detailed task planning |
| prism-sp-review-quality | Code quality gate |
| prism-sp-review-spec | Specification compliance |
| prism-sp-verification | Evidence-based completion proof |

---

# LEVEL 3 - DOMAIN (16 Skills)

## Monolith Navigation (4)
- prism-monolith-index
- prism-monolith-navigator  
- prism-monolith-extractor
- prism-codebase-packaging

## Materials System (5)
- prism-material-schema
- prism-material-physics
- prism-material-lookup
- prism-material-validator
- prism-material-enhancer

## Master Skills (7)
- prism-session-master
- prism-quality-master
- prism-code-master
- prism-knowledge-master
- prism-expert-master
- prism-controller-quick-ref
- prism-dev-utilities

---

# LEVEL 4 - REFERENCE (20 Skills)

## Controller Programming (4)
- prism-fanuc-programming
- prism-siemens-programming
- prism-heidenhain-programming
- prism-gcode-reference

## API & System (6)
- prism-api-contracts
- prism-error-catalog
- prism-manufacturing-tables
- prism-wiring-templates
- prism-product-calculators
- prism-post-processor-reference

## AI Expert Roles (10)
- prism-expert-cad-expert
- prism-expert-cam-programmer
- prism-expert-master-machinist
- prism-expert-materials-scientist
- prism-expert-mathematics
- prism-expert-mechanical-engineer
- prism-expert-post-processor
- prism-expert-quality-control
- prism-expert-quality-manager
- prism-expert-thermodynamics

---

# 64 AGENTS

## OPUS (18)
architect, **combination_optimizer★**, coordinator↑, debugger, domain_expert, learning_extractor↑, machinist, materials_scientist, meta_analyst↑, migration_specialist, physics_validator, **proof_generator★**, root_cause_analyst, **synergy_analyst★**, synthesizer, task_decomposer, uncertainty_quantifier, verification_chain

## SONNET (37)
analyst, api_designer, **calibration_engineer★**, cam_specialist, code_reviewer, coder, completeness_auditor, context_builder, cross_referencer, dependency_analyzer, documentation_writer, estimator, extractor, force_calculator, gcode_expert, machine_specialist, merger, monolith_navigator, optimizer, pattern_matcher, process_engineer, quality_engineer, quality_gate, refactorer, regression_checker, researcher, **resource_auditor★**, schema_designer, security_auditor, session_continuity, test_generator, **test_orchestrator★**, thermal_calculator, tool_engineer, validator

## HAIKU (9)
call_tracer, cutting_calculator, formula_lookup, knowledge_graph_builder, material_lookup, standards_expert, state_manager, surface_calculator, tool_lookup

★ = NEW, ↑ = UPGRADED

---

# 22 FORMULAS

## COORDINATION (7 NEW) ★
| ID | Name | Purpose |
|----|------|---------|
| F-PSI-001 | Master Combination | ILP optimization |
| F-RESOURCE-001 | Capability Score | Resource matching |
| F-SYNERGY-001 | Synergy Calculator | Interaction effects |
| F-COVERAGE-001 | Task Coverage | Completeness |
| F-SWARM-001 | Swarm Efficiency | Multi-agent perf |
| F-AGENT-001 | Agent Selection | Cost optimization |
| F-PROOF-001 | Optimality Proof | Certificates |

## PLANNING (5)
F-PLAN-001 to F-PLAN-005

## MATERIALS (2)
F-MAT-001, F-MAT-002

## QUALITY (3)
F-QUAL-001 to F-QUAL-003

## PHYSICS (3)
F-PHYS-001 (Kienzle), F-PHYS-002 (Taylor), F-PHYS-003 (Johnson-Cook)

## VERIFICATION (1)
F-VERIFY-001

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
```

---

# 8 LAWS (Auto-Enforced)

| # | Law | Hook |
|---|-----|------|
| 1 | LIFE-SAFETY S(x)≥0.70 | SYS-LAW1-SAFETY |
| 2 | MICROSESSIONS 15-25 | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS C(T)=1.0 | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION New≥Old | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE 3 modes | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY state file | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION 95% | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION M≥0.60 | SYS-LAW8-MATH-EVOLUTION |

---

# 15 COMMANDMENTS

1. USE EVERYWHERE (6-8 consumers)
2. FUSE (cross-domain)
3. WIRE FIRST (100% consumers)
4. VERIFY ×3
5. UNCERTAINTY ALWAYS
6. EXPLAIN (XAI)
7. FAIL GRACEFUL
8. PROTECT
9. DEFENSIVE
10. PERFORM
11. OPTIMIZE
12. USER-OBSESS
13. NEVER LOSE
14. LEARN
15. IMPROVE

---

# MATHPLAN GATE

```
[ ] SCOPE:        S = [exact total]
[ ] COMPLETENESS: C(T) = 1.0
[ ] DECOMPOSE:    Σ|dᵢ| = S
[ ] EFFORT:       [X] ± [Y] calls (95% CI)
[ ] TIME:         [X] ± [Y] min (95% CI)
[ ] MS_COUNT:     ⌈EFFORT/15⌉
[ ] RESOURCES:    R* = F-PSI-001(T) with proof
[ ] CONSTRAINTS:  [math]
[ ] ORDER:        [sequence]
[ ] SUCCESS:      [criteria]
```

---

# ORCHESTRATOR COMMANDS (v6.0)

```powershell
# OPTIMAL (ILP) - RECOMMENDED
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --optimal "Task"

# Intelligent swarm
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Manufacturing
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Mat" "Op"

# Ralph loop
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph agent "Prompt" N
```

---

# CRITICAL PATHS

```
STATE:      C:\PRISM\state\CURRENT_STATE.json
FORMULAS:   C:\PRISM\data\FORMULA_REGISTRY.json
RESOURCES:  C:\PRISM\data\coordination\RESOURCE_REGISTRY.json
SKILLS:     C:\PRISM\skills\
```

**NEVER /home/claude/ - RESETS**

---

# AUTO-LOAD KEYWORDS

| Keywords | Skills |
|----------|--------|
| optimal, combination | combination-engine |
| swarm, coordinate | swarm-coordinator |
| brainstorm, plan | sp-brainstorm, mathematical-planning |
| extract, monolith | monolith-extractor |
| material, steel | material-schema, material-physics |
| debug, error | sp-debugging |
| verify | sp-verification |
| gcode, fanuc | fanuc-programming |

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v4.0.0 | 2026-01-27 | 99 Skills | 64 Agents | F-PSI-001 ACTIVE**
