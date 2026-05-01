# PRISM DEVELOPMENT PROMPT v13.0
## FOR CLAUDE'S INSTRUCTIONS - MASTER RESOURCE COORDINATION
## v13.0: ILP-BASED OPTIMAL COMBINATION ENGINE + 691 RESOURCES
---

# CRITICAL CONTEXT

You are developing PRISM Manufacturing Intelligence v9.0+ - a system that controls CNC machines where **LIVES ARE AT STAKE**. This version introduces the **Master Resource Coordination System** using Integer Linear Programming (ILP) for mathematically optimal resource selection.

**NEW IN v13.0:**
- CombinationEngine with F-PSI-001 ILP optimization
- 99 skills (93 existing + 6 new coordination skills)
- 64 agents (58 existing + 6 new)
- 22 formulas (15 existing + 7 new coordination formulas)
- Synergy Matrix with 150+ learned pairwise interactions
- Capability Matrix for resource-to-task matching
- Optimality proofs via F-PROOF-001

---

# MANDATORY FIRST ACTIONS (EVERY SESSION)

```
+===============================================================================+
|  ENFORCEMENT v13.0 - MATHEMATICAL CERTAINTY + ILP OPTIMIZATION                |
+===============================================================================+
|                                                                               |
|  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   |
|     -> HOOK: session:preStart fires                                           |
|                                                                               |
|  2. QUOTE: "State verified. quickResume: [exact content]"                     |
|                                                                               |
|  3. CHECK STATUS:                                                             |
|     IF IN_PROGRESS -> RESUME from checkpoint                                  |
|     IF COMPLETE -> May start new task                                         |
|                                                                               |
|  4. LOAD COORDINATION INFRASTRUCTURE:                                         |
|     -> C:\PRISM\data\coordination\RESOURCE_REGISTRY.json (691 resources)      |
|     -> C:\PRISM\data\coordination\CAPABILITY_MATRIX.json                      |
|     -> C:\PRISM\data\coordination\SYNERGY_MATRIX.json (150+ pairs)            |
|     -> C:\PRISM\data\FORMULA_REGISTRY.json (22 formulas)                      |
|                                                                               |
|  5. RUN COMBINATION ENGINE for new tasks:                                     |
|     -> Parse task requirements (domains, operations, complexity)              |
|     -> Compute capability scores (F-RESOURCE-001)                             |
|     -> Solve ILP optimization (F-PSI-001)                                     |
|     -> Generate optimality proof (F-PROOF-001)                                |
|     -> Present plan for approval                                              |
|                                                                               |
|  6. COMPLETE MATHPLAN GATE                                                    |
|                                                                               |
+===============================================================================+
```

---

# MASTER COMBINATION EQUATION (F-PSI-001)

```
Ψ(T,R) = argmax    [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) / Cost(R) ]
         R⊆ALL

Subject to:
  |R_skills| ≤ 8           (max 8 skills)
  |R_agents| ≤ 8           (max 8 agents)  
  |R_execution| = 1         (exactly 1 execution mode)
  S(R) ≥ 0.70              (safety constraint)
  M(R) ≥ 0.60              (rigor constraint)
  Coverage(R,T) = 1.0       (full coverage required)
```

## Supporting Formulas

| ID | Name | Purpose |
|----|------|---------|
| F-RESOURCE-001 | Capability Score | Cap(r,T) = weighted match on domains/operations/complexity |
| F-SYNERGY-001 | Synergy Calculator | Geometric mean of pairwise synergies |
| F-COVERAGE-001 | Coverage Score | Fraction of task requirements covered |
| F-SWARM-001 | Swarm Efficiency | Output/Cost ratio vs independent agents |
| F-AGENT-001 | Agent Selection | Minimum cost subset with 95% coverage |
| F-PROOF-001 | Optimality Proof | LP duality certificates for solutions |

---

# NEW COORDINATION SKILLS (6)

| Skill | Level | Purpose |
|-------|-------|---------|
| prism-combination-engine | L0 Always-On | Master ILP optimization |
| prism-swarm-coordinator | L1 Cognitive | Multi-agent swarm orchestration |
| prism-resource-optimizer | L1 Cognitive | Capability scoring (F-RESOURCE-001) |
| prism-agent-selector | L1 Cognitive | Agent selection (F-AGENT-001) |
| prism-synergy-calculator | L1 Cognitive | Synergy computation (F-SYNERGY-001) |
| prism-claude-code-bridge | L2 Workflow | Script execution bridge |

---

# NEW AGENTS (6 + 3 upgrades)

| Agent | Tier | Role |
|-------|------|------|
| combination_optimizer | OPUS | ILP solver with optimality proofs |
| synergy_analyst | OPUS | Synergy pattern learning |
| proof_generator | OPUS | Mathematical proof construction |
| resource_auditor | SONNET | Resource registry maintenance |
| calibration_engineer | SONNET | Coefficient calibration |
| test_orchestrator | SONNET | Ralph loop testing |
| coordinator_v2 | OPUS | UPGRADED: ILP-based selection |
| meta_analyst_v2 | OPUS | UPGRADED: Resource utilization |
| learning_extractor_v2 | OPUS | UPGRADED: Synergy learning |

---

# THE 8 ALWAYS-ON LAWS (unchanged)

| # | Law | Hook |
|---|-----|------|
| 1 | LIFE-SAFETY | SYS-LAW1-SAFETY blocks S(x)<0.70 |
| 2 | MICROSESSIONS (15-25 items) | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS C(T)=1.0 | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION New≥Old | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE (3 failure modes) | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY (state file) | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION (95% confidence) | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION M(x)≥0.60 | SYS-LAW8-MATH-EVOLUTION |

---

# RESOURCE INVENTORY (691 total)

| Category | Count | Notes |
|----------|-------|-------|
| Skills | 99 | 93 existing + 6 new |
| Agents | 64 | 58 existing + 6 new |
| Formulas | 22 | 15 existing + 7 new |
| Coefficients | 32 | Including 7 new coordination |
| Hooks | 147 | 15 system hooks auto-enforce |
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
FORMULAS:        C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENTS:    C:\PRISM\data\COEFFICIENT_DATABASE.json
CALIBRATION:     C:\PRISM\state\CALIBRATION_STATE.json
SKILLS:          C:\PRISM\skills\
ORCHESTRATOR:    C:\PRISM\scripts\prism_unified_system_v6.py
TESTING:         C:\PRISM\scripts\testing\
```

---

# ORCHESTRATOR COMMANDS (v6)

```powershell
# ILP-optimized intelligent swarm (NEW - uses CombinationEngine)
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

# SYSTEM SUMMARY v13.0

```
+========================================================================+
|  PRISM v13.0 | C:\PRISM\ | MASTER COORDINATION SYSTEM                  |
|  Skills: 99 | Agents: 64 | Formulas: 22 | Hooks: 147 | Resources: 691 |
|                                                                        |
|  NEW CAPABILITIES:                                                     |
|  - ILP-based optimal resource selection (F-PSI-001)                   |
|  - Synergy matrix with 150+ learned pairs                             |
|  - Capability matrix for task matching                                 |
|  - Optimality proofs with LP duality                                   |
|  - 6 new coordination skills + 6 new agents                           |
|                                                                        |
|  ENFORCEMENT: 8 Laws + 15 Commandments + MATHPLAN + ILP + Hooks       |
+========================================================================+
```

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v13.0 | 2026-01-27 | ILP OPTIMIZATION ACTIVE**
