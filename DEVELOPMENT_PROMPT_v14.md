# PRISM DEVELOPMENT PROMPT v14.0
## FOR CLAUDE'S INSTRUCTIONS - MASTER RESOURCE COORDINATION + COGNITIVE SYSTEM
## v14.0: ILP OPTIMIZATION + COGNITIVE ENHANCEMENT FRAMEWORK
---

# CRITICAL CONTEXT

You are developing PRISM Manufacturing Intelligence v9.0+ - a system that controls CNC machines where **LIVES ARE AT STAKE**. This version introduces the **Master Resource Coordination System** using Integer Linear Programming (ILP) AND the **Cognitive Enhancement Framework** for mathematically optimal decision-making.

**NEW IN v14.0:**
- Cognitive Enhancement System with Master Equation Ω(x)
- 7 cognitive skills (L0 always-on + L1 detailed, ~5,637 lines)
- 5 AI/ML patterns auto-firing on every operation
- 162 hooks (147 existing + 15 cognitive)
- 66 agents (64 existing + 2 cognitive: cognitive_optimizer, bayesian_reasoner)
- Safety constraint S(x) ≥ 0.70 as HARD BLOCK

**PRESERVED FROM v13.0:**
- CombinationEngine with F-PSI-001 ILP optimization
- 99 skills + 7 cognitive = 106 skills
- 22 formulas (unchanged)
- Synergy Matrix with 150+ learned pairwise interactions
- Capability Matrix for resource-to-task matching
- Optimality proofs via F-PROOF-001

---

# MANDATORY FIRST ACTIONS (EVERY SESSION)

```
+===============================================================================+
|  ENFORCEMENT v14.0 - MATHEMATICAL CERTAINTY + ILP + COGNITIVE                 |
+===============================================================================+
|                                                                               |
|  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   |
|     -> HOOK: session:preStart fires                                           |
|     -> HOOK: BAYES-001 (Prior initialization) fires                           |
|                                                                               |
|  2. QUOTE: "State verified. quickResume: [exact content]"                     |
|                                                                               |
|  3. CHECK STATUS:                                                             |
|     IF IN_PROGRESS -> RESUME from checkpoint                                  |
|     IF COMPLETE -> May start new task                                         |
|                                                                               |
|  4. LOAD COORDINATION INFRASTRUCTURE:                                         |
|     -> C:\PRISM\data\coordination\RESOURCE_REGISTRY.json (706 resources)      |
|     -> C:\PRISM\data\coordination\CAPABILITY_MATRIX.json                      |
|     -> C:\PRISM\data\coordination\SYNERGY_MATRIX.json (150+ pairs)            |
|     -> C:\PRISM\data\FORMULA_REGISTRY.json (22 formulas)                      |
|                                                                               |
|  5. ACTIVATE COGNITIVE SYSTEM (L0 - ALWAYS ON):                               |
|     -> prism-cognitive-core (5 patterns auto-fire)                            |
|     -> Bayesian reasoning for uncertainty                                     |
|     -> Gradient-based optimization                                            |
|     -> Multi-objective balancing                                              |
|     -> Reinforcement learning from feedback                                   |
|                                                                               |
|  6. RUN COMBINATION ENGINE for new tasks:                                     |
|     -> Parse task requirements (domains, operations, complexity)              |
|     -> Compute capability scores (F-RESOURCE-001)                             |
|     -> Solve ILP optimization (F-PSI-001)                                     |
|     -> Compute Ω(x) master equation score                                     |
|     -> Generate optimality proof (F-PROOF-001)                                |
|     -> Present plan for approval                                              |
|                                                                               |
|  7. COMPLETE MATHPLAN GATE                                                    |
|                                                                               |
+===============================================================================+
```

---

# COGNITIVE ENHANCEMENT SYSTEM (NEW IN v14.0)

## Master Quality Equation Ω(x)

```
Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)

SUBJECT TO: S(x) ≥ 0.70 (HARD SAFETY CONSTRAINT - violators BLOCKED)

Components:
  R(x) = Reasoning quality score (12 metrics)
  C(x) = Code quality score (11 metrics)
  P(x) = Process efficiency score (12 metrics)
  S(x) = Safety/robustness score (7 failure modes, 7 defense layers)
  L(x) = Learning/adaptation score (feedback integration)

Default Weights:
  w_R = 0.25 (reasoning)
  w_C = 0.20 (code quality)
  w_P = 0.15 (process)
  w_S = 0.30 (safety - highest)
  w_L = 0.10 (learning)

Decision Thresholds:
  Ω ≥ 0.90 → RELEASE (high confidence)
  0.70 ≤ Ω < 0.90 → WARN (review recommended)
  Ω < 0.70 → BLOCK (insufficient quality)
```

## 5 AI/ML Patterns (L0 Always-On)

| Pattern | Application | Auto-Fire Trigger |
|---------|-------------|-------------------|
| **Bayesian** | Uncertainty quantification | Every probability estimate |
| **Optimization** | Parameter tuning | Every search/selection |
| **Multi-Objective** | Trade-off analysis | Conflicting constraints |
| **Gradient-Based** | Iterative improvement | Every feedback loop |
| **Reinforcement** | Learning from outcomes | Post-execution feedback |

## Cognitive Skills (7 skills, ~5,637 lines)

| Skill | Level | Lines | Output | Purpose |
|-------|-------|-------|--------|---------|
| prism-cognitive-core | L0 | 450 | Patterns | Always-on 5 patterns |
| prism-universal-formulas | L1 | 469 | Formulas | 109 formulas, 20 domains |
| prism-reasoning-engine | L1 | 955 | R(x) | 12 reasoning metrics |
| prism-safety-framework | L1 | 1,183 | S(x) | 7 FM, 7 defenses |
| prism-code-perfection | L1 | 907 | C(x) | 11 code metrics |
| prism-process-optimizer | L1 | 1,273 | P(x) | 12 process metrics |
| prism-master-equation | L2 | ~850 | Ω(x) | Capstone integration |

## Cognitive Hooks (15 new, 162 total)

| Hook ID | Trigger | Effect |
|---------|---------|--------|
| BAYES-001 | session:preStart | Initialize priors |
| BAYES-002 | evidence:received | Update beliefs |
| BAYES-003 | decision:required | Compute posteriors |
| OPT-001 | task:start | Set objective function |
| OPT-002 | constraint:detected | Add to feasible region |
| OPT-003 | solution:found | Verify optimality |
| MULTI-001 | conflict:detected | Activate Pareto analysis |
| MULTI-002 | tradeoff:required | Compute trade-off surface |
| MULTI-003 | selection:made | Document rationale |
| GRAD-001 | iteration:start | Compute gradient |
| GRAD-002 | step:taken | Update parameters |
| GRAD-003 | convergence:check | Evaluate stopping criteria |
| RL-001 | action:taken | Record state-action |
| RL-002 | outcome:observed | Compute reward |
| RL-003 | policy:update | Adjust future behavior |

## Cognitive Agents (2 new)

| Agent | Tier | Role |
|-------|------|------|
| cognitive_optimizer | OPUS | ILP + Ω(x) integration |
| bayesian_reasoner | OPUS | Uncertainty quantification |

---

# MASTER COMBINATION EQUATION (F-PSI-001) - Enhanced

```
Ψ(T,R) = argmax    [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) × K(R) / Cost(R) ]
         R⊆ALL

Subject to:
  |R_skills| ≤ 8           (max 8 skills)
  |R_agents| ≤ 8           (max 8 agents)  
  |R_execution| = 1        (exactly 1 execution mode)
  S(R) ≥ 0.70              (safety constraint - HARD BLOCK)
  M(R) ≥ 0.60              (rigor constraint)
  Coverage(R,T) = 1.0      (full coverage required)

NEW: K(R) = Cognitive enhancement score from prism-cognitive-core
```

## Supporting Formulas

| ID | Name | Purpose |
|----|------|---------|
| F-RESOURCE-001 | Capability Score | Cap(r,T) = weighted match |
| F-SYNERGY-001 | Synergy Calculator | Geometric mean of pairs |
| F-COVERAGE-001 | Coverage Score | Fraction covered |
| F-SWARM-001 | Swarm Efficiency | Output/Cost ratio |
| F-AGENT-001 | Agent Selection | Min cost @ 95% coverage |
| F-PROOF-001 | Optimality Proof | LP duality certificates |
| **F-OMEGA-001** | **Master Equation** | **Ω(x) computation** |

---

# COORDINATION SKILLS (6 from v13)

| Skill | Level | Purpose |
|-------|-------|---------|
| prism-combination-engine | L0 Always-On | Master ILP optimization |
| prism-swarm-coordinator | L1 Cognitive | Multi-agent swarm orchestration |
| prism-resource-optimizer | L1 Cognitive | Capability scoring (F-RESOURCE-001) |
| prism-agent-selector | L1 Cognitive | Agent selection (F-AGENT-001) |
| prism-synergy-calculator | L1 Cognitive | Synergy computation (F-SYNERGY-001) |
| prism-claude-code-bridge | L2 Workflow | Script execution bridge |

---

# AGENTS (66 total)

## New in v14 (2)
| Agent | Tier | Role |
|-------|------|------|
| cognitive_optimizer | OPUS | Ω(x) computation and enforcement |
| bayesian_reasoner | OPUS | Uncertainty quantification |

## From v13 (6)
| Agent | Tier | Role |
|-------|------|------|
| combination_optimizer | OPUS | ILP solver with optimality proofs |
| synergy_analyst | OPUS | Synergy pattern learning |
| proof_generator | OPUS | Mathematical proof construction |
| resource_auditor | SONNET | Resource registry maintenance |
| calibration_engineer | SONNET | Coefficient calibration |
| test_orchestrator | SONNET | Ralph loop testing |

## Upgraded (3)
| Agent | Tier | Role |
|-------|------|------|
| coordinator_v2 | OPUS | ILP-based selection |
| meta_analyst_v2 | OPUS | Resource utilization |
| learning_extractor_v2 | OPUS | Synergy learning |

---

# THE 8 ALWAYS-ON LAWS + COGNITIVE

| # | Law | Hook | Cognitive Enhancement |
|---|-----|------|----------------------|
| 1 | LIFE-SAFETY | SYS-LAW1-SAFETY blocks S(x)<0.70 | S(x) from prism-safety-framework |
| 2 | MICROSESSIONS (15-25 items) | SYS-LAW2-MICROSESSION | P(x) tracking |
| 3 | COMPLETENESS C(T)=1.0 | SYS-LAW3-COMPLETENESS | R(x) completeness metric |
| 4 | ANTI-REGRESSION New≥Old | SYS-LAW4-REGRESSION | Bayesian change detection |
| 5 | PREDICTIVE (3 failure modes) | SYS-LAW5-PREDICTIVE | Multi-objective analysis |
| 6 | CONTINUITY (state file) | SYS-LAW6-CONTINUITY | RL session continuity |
| 7 | VERIFICATION (95% confidence) | SYS-LAW7-VERIFICATION | Bayesian confidence |
| 8 | MATH EVOLUTION M(x)≥0.60 | SYS-LAW8-MATH-EVOLUTION | Gradient improvement |

---

# RESOURCE INVENTORY (706 total)

| Category | Count | Notes |
|----------|-------|-------|
| Skills | 106 | 99 existing + 7 cognitive |
| Agents | 66 | 64 existing + 2 cognitive |
| Formulas | 22 | 15 existing + 7 coordination |
| Coefficients | 32 | Including 7 coordination |
| Hooks | 162 | 147 existing + 15 cognitive |
| Databases | 4 | Materials, Machines, Tools, Knowledge |
| Swarm Patterns | 8 | Pre-defined multi-agent patterns |
| Execution Modes | 4 | single, swarm, intelligent, ralph |

---

# CRITICAL PATHS

```
STATE:           C:\PRISM\state\CURRENT_STATE.json
COORDINATION:    C:\PRISM\data\coordination\
  ├── RESOURCE_REGISTRY.json
  ├── CAPABILITY_MATRIX.json
  ├── SYNERGY_MATRIX.json
  └── AGENT_REGISTRY.json
COGNITIVE:       C:\_SKILLS\
  ├── prism-cognitive-core\SKILL.md
  ├── prism-universal-formulas\SKILL.md
  ├── prism-reasoning-engine\SKILL.md
  ├── prism-safety-framework\SKILL.md
  ├── prism-code-perfection\SKILL.md
  ├── prism-process-optimizer\SKILL.md
  └── prism-master-equation\SKILL.md
FORMULAS:        C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENTS:    C:\PRISM\data\COEFFICIENT_DATABASE.json
CALIBRATION:     C:\PRISM\state\CALIBRATION_STATE.json
SKILLS:          C:\PRISM\skills\
ORCHESTRATOR:    C:\_SKILLS\prism-skill-orchestrator_v6_SKILL.md
MANIFEST:        C:\_SKILLS\SKILL_MANIFEST_v6.0.json
TESTING:         C:\PRISM\scripts\testing\
```

---

# ORCHESTRATOR COMMANDS (v6)

```powershell
# ILP-optimized intelligent swarm with cognitive enhancement
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Specific swarm pattern
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm deep_extraction_swarm "Task"

# Single agent
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single architect "Task"

# Ralph improvement loop
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "Task" 3

# List all resources
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --list
```

---

# TESTING SUITE

```powershell
# Full test suite
py -3 C:\PRISM\scripts\testing\run_full_suite.py

# Regression tests only
py -3 C:\PRISM\scripts\testing\regression_tests.py

# Ralph loop benchmarks
py -3 C:\PRISM\scripts\testing\ralph_loop_tester.py --suite
```

---

# OPTIMALITY PROOF CERTIFICATES

| Certificate | Gap | Meaning |
|-------------|-----|---------|
| OPTIMAL | 0% | Provably optimal solution |
| NEAR_OPTIMAL | ≤2% | Within 2% of theoretical maximum |
| GOOD | ≤5% | Acceptable solution |
| HEURISTIC | N/A | ILP timed out, greedy fallback |

---

# COGNITIVE QUALITY GATES

| Gate | Threshold | Action if Failed |
|------|-----------|------------------|
| S(x) Safety | ≥ 0.70 | **HARD BLOCK** - output rejected |
| R(x) Reasoning | ≥ 0.60 | WARN - review recommended |
| C(x) Code | ≥ 0.70 | WARN - refactor suggested |
| P(x) Process | ≥ 0.60 | WARN - efficiency review |
| Ω(x) Overall | ≥ 0.70 | WARN - comprehensive review |

---

# SYSTEM SUMMARY v14.0

```
+========================================================================+
|  PRISM v14.0 | C:\PRISM\ | COGNITIVE ENHANCEMENT ACTIVE                 |
|  Skills: 106 | Agents: 66 | Formulas: 22 | Hooks: 162 | Resources: 706 |
|                                                                        |
|  COGNITIVE SYSTEM:                                                     |
|  - Master Equation Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x)   |
|  - Safety constraint S(x) ≥ 0.70 HARD BLOCK                           |
|  - 5 AI/ML patterns auto-firing on every operation                    |
|  - 7 cognitive skills (~5,637 lines)                                  |
|  - 15 cognitive hooks integrated                                       |
|                                                                        |
|  PRESERVED FROM v13.0:                                                 |
|  - ILP-based optimal resource selection (F-PSI-001)                   |
|  - Synergy matrix with 150+ learned pairs                             |
|  - Capability matrix for task matching                                 |
|  - Optimality proofs with LP duality                                   |
|                                                                        |
|  ENFORCEMENT: 8 Laws + Cognitive Gates + MATHPLAN + ILP + Hooks       |
+========================================================================+
```

---

# ANTI-REGRESSION AUDIT v13 → v14

```
PRESERVED FROM v13 (100%):
✅ ILP Optimization (F-PSI-001)
✅ 8 Always-On Laws
✅ 6 Coordination Skills
✅ 6 New Agents (from v13)
✅ 3 Upgraded Agents
✅ Synergy Matrix (150+ pairs)
✅ Capability Matrix
✅ All paths and commands
✅ Testing suite
✅ Optimality proof certificates

ADDED IN v14:
✅ Cognitive Enhancement System (Ω(x))
✅ 7 Cognitive Skills (~5,637 lines)
✅ 15 Cognitive Hooks
✅ 2 Cognitive Agents
✅ S(x) ≥ 0.70 Hard Safety Block
✅ 5 AI/ML Patterns (L0 always-on)
✅ Cognitive Quality Gates

REMOVED: Nothing. Zero content loss.
```

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v14.0 | 2026-01-30 | ILP + COGNITIVE ACTIVE**
