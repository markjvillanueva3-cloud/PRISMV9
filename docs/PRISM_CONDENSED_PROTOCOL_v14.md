# PRISM CONDENSED PROTOCOL v14.0
## Quick Reference | ILP + Cognitive | 706 Resources
---

# SESSION START

```
1. READ: C:\PRISM\state\CURRENT_STATE.json
2. QUOTE: "quickResume: [exact]"
3. CHECK: IN_PROGRESS? → RESUME. COMPLETE? → New task.
4. LOAD: RESOURCE_REGISTRY, CAPABILITY_MATRIX, SYNERGY_MATRIX
5. ACTIVATE COGNITIVE (L0): 5 patterns auto-fire
6. RUN COMBINATION ENGINE for new tasks
7. MATHPLAN GATE before execution
```

---

# MASTER EQUATIONS

## ILP Selection (F-PSI-001)
```
Ψ = argmax [ Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R) ]

Constraints: |skills|≤8, |agents|≤8, S≥0.70, M≥0.60, Coverage=1.0
```

## Cognitive Quality (Ω)
```
Ω(x) = 0.25·R(x) + 0.20·C(x) + 0.15·P(x) + 0.30·S(x) + 0.10·L(x)

HARD CONSTRAINT: S(x) ≥ 0.70 (violators BLOCKED)

Decision: Ω≥0.90 RELEASE | 0.70≤Ω<0.90 WARN | Ω<0.70 BLOCK
```

---

# 8 LAWS + HOOKS

| Law | Hook | Cognitive |
|-----|------|-----------|
| 1. LIFE-SAFETY | SYS-LAW1-SAFETY | S(x)≥0.70 |
| 2. MICROSESSIONS | SYS-LAW2-MICROSESSION | P(x) |
| 3. COMPLETENESS | SYS-LAW3 (C=1.0) | R(x) |
| 4. ANTI-REGRESSION | SYS-LAW4 (New≥Old) | Bayesian |
| 5. PREDICTIVE | SYS-LAW5 | Multi-obj |
| 6. CONTINUITY | SYS-LAW6 | RL |
| 7. VERIFICATION | SYS-LAW7 (95%) | Bayesian |
| 8. MATH EVOLUTION | SYS-LAW8 (M≥0.60) | Gradient |

---

# RESOURCES (706)

| Type | Count |
|------|-------|
| Skills | 106 (99+7 cognitive) |
| Agents | 66 (64+2 cognitive) |
| Formulas | 22 |
| Coefficients | 32 |
| Hooks | 162 (147+15 cognitive) |
| Swarm Patterns | 8 |

---

# COGNITIVE SYSTEM (NEW)

## 5 AI/ML Patterns (L0 Always-On)
| Pattern | Trigger |
|---------|---------|
| Bayesian | Every probability |
| Optimization | Every search |
| Multi-Objective | Conflicts |
| Gradient | Feedback loops |
| Reinforcement | Post-execution |

## 7 Cognitive Skills (~5,637 lines)
| Skill | Output |
|-------|--------|
| prism-cognitive-core | 5 patterns |
| prism-universal-formulas | 109 formulas |
| prism-reasoning-engine | R(x) |
| prism-safety-framework | S(x) |
| prism-code-perfection | C(x) |
| prism-process-optimizer | P(x) |
| prism-master-equation | Ω(x) |

## 15 Cognitive Hooks
```
BAYES-001/002/003: Prior → Update → Posterior
OPT-001/002/003: Objective → Constraints → Verify
MULTI-001/002/003: Conflict → Pareto → Select
GRAD-001/002/003: Gradient → Step → Converge
RL-001/002/003: Action → Reward → Policy
```

## 2 Cognitive Agents
| Agent | Tier |
|-------|------|
| cognitive_optimizer | OPUS |
| bayesian_reasoner | OPUS |

---

# COORDINATION SKILLS (6)

- prism-combination-engine (L0)
- prism-swarm-coordinator (L1)
- prism-resource-optimizer (L1)
- prism-agent-selector (L1)
- prism-synergy-calculator (L1)
- prism-claude-code-bridge (L2)

---

# FORMULAS (22)

**Planning:** F-PLAN-001 to 005
**Materials:** F-MAT-001, 002
**Quality:** F-QUAL-001 to 003
**Physics:** F-PHYS-001 to 003
**Coordination:** F-PSI-001, F-RESOURCE-001, F-SYNERGY-001, F-COVERAGE-001, F-SWARM-001, F-AGENT-001, F-PROOF-001
**Cognitive:** F-OMEGA-001 (Ω computation)
**Verification:** F-VERIFY-001

---

# QUALITY GATES

| Gate | Threshold | Action |
|------|-----------|--------|
| S(x) Safety | ≥0.70 | **HARD BLOCK** |
| R(x) Reasoning | ≥0.60 | WARN |
| C(x) Code | ≥0.70 | WARN |
| P(x) Process | ≥0.60 | WARN |
| Ω(x) Overall | ≥0.70 | WARN |

---

# PATHS

```
STATE:        C:\PRISM\state\CURRENT_STATE.json
COORDINATION: C:\PRISM\data\coordination\
COGNITIVE:    C:\_SKILLS\prism-cognitive-core\
ORCHESTRATOR: C:\_SKILLS\prism-skill-orchestrator_v6_SKILL.md
MANIFEST:     C:\_SKILLS\SKILL_MANIFEST_v6.0.json
FORMULAS:     C:\PRISM\data\FORMULA_REGISTRY.json
TESTING:      C:\PRISM\scripts\testing\
```

---

# COMMANDS

```powershell
# Intelligent (ILP + Cognitive)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Single agent
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single agent "Task"

# Swarm
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm pattern "Task"

# Tests
py -3 C:\PRISM\scripts\testing\run_full_suite.py
```

---

# PROOF CERTIFICATES

| Cert | Gap |
|------|-----|
| OPTIMAL | 0% |
| NEAR_OPTIMAL | ≤2% |
| GOOD | ≤5% |
| HEURISTIC | timeout |

---

# BUFFER ZONES

| Zone | Calls |
|------|-------|
| 🟢 | 0-8 |
| 🟡 | 9-14 |
| 🟠 | 15-18 |
| 🔴 | 19+ BLOCKED |

---

# UNCERTAINTY FORMAT

```
✓ 412 ± 85 calls (95% CI)
✗ 412 calls (BLOCKED)
```

---

# COGNITIVE QUICK CHECK

```
Before Output:
□ S(x) ≥ 0.70? (safety - HARD)
□ R(x) computed? (reasoning)
□ C(x) computed? (code quality)
□ P(x) computed? (process)
□ Ω(x) ≥ 0.70? (overall)

If S(x) < 0.70 → OUTPUT BLOCKED
```

---

**v14.0 | 2026-01-30 | 706 RESOURCES | ILP + COGNITIVE ACTIVE**
