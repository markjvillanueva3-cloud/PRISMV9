# PRISM CONDENSED PROTOCOL v13.0
## Quick Reference | ILP Optimization | 691 Resources
---

# SESSION START

```
1. READ: C:\PRISM\state\CURRENT_STATE.json
2. QUOTE: "quickResume: [exact]"
3. CHECK: IN_PROGRESS? → RESUME. COMPLETE? → New task.
4. LOAD: RESOURCE_REGISTRY, CAPABILITY_MATRIX, SYNERGY_MATRIX
5. RUN COMBINATION ENGINE for new tasks
6. MATHPLAN GATE before execution
```

---

# MASTER EQUATION (F-PSI-001)

```
Ψ = argmax [ Σ Cap(r,T) × Syn(R) × Ω(R) / Cost(R) ]

Constraints: |skills|≤8, |agents|≤8, S≥0.70, M≥0.60, Coverage=1.0
```

---

# 8 LAWS + HOOKS

| Law | Hook |
|-----|------|
| 1. LIFE-SAFETY | SYS-LAW1-SAFETY (S≥0.70) |
| 2. MICROSESSIONS | SYS-LAW2-MICROSESSION |
| 3. COMPLETENESS | SYS-LAW3 (C=1.0) |
| 4. ANTI-REGRESSION | SYS-LAW4 (New≥Old) |
| 5. PREDICTIVE | SYS-LAW5 |
| 6. CONTINUITY | SYS-LAW6 |
| 7. VERIFICATION | SYS-LAW7 (95%) |
| 8. MATH EVOLUTION | SYS-LAW8 (M≥0.60) |

---

# RESOURCES (691)

| Type | Count |
|------|-------|
| Skills | 99 |
| Agents | 64 |
| Formulas | 22 |
| Coefficients | 32 |
| Hooks | 147 |
| Swarm Patterns | 8 |

---

# NEW SKILLS (6)

- prism-combination-engine (L0)
- prism-swarm-coordinator (L1)
- prism-resource-optimizer (L1)
- prism-agent-selector (L1)
- prism-synergy-calculator (L1)
- prism-claude-code-bridge (L2)

---

# NEW AGENTS (6)

| Agent | Tier |
|-------|------|
| combination_optimizer | OPUS |
| synergy_analyst | OPUS |
| proof_generator | OPUS |
| resource_auditor | SONNET |
| calibration_engineer | SONNET |
| test_orchestrator | SONNET |

---

# FORMULAS (22)

**Planning:** F-PLAN-001 to 005
**Materials:** F-MAT-001, 002
**Quality:** F-QUAL-001 to 003
**Physics:** F-PHYS-001 to 003
**Coordination (NEW):** F-PSI-001, F-RESOURCE-001, F-SYNERGY-001, F-COVERAGE-001, F-SWARM-001, F-AGENT-001, F-PROOF-001
**Verification:** F-VERIFY-001

---

# PATHS

```
STATE:        C:\PRISM\state\CURRENT_STATE.json
COORDINATION: C:\PRISM\data\coordination\
FORMULAS:     C:\PRISM\data\FORMULA_REGISTRY.json
ORCHESTRATOR: C:\PRISM\scripts\prism_unified_system_v6.py
TESTING:      C:\PRISM\scripts\testing\
```

---

# COMMANDS

```powershell
# Intelligent (ILP-optimized)
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

**v13.0 | 2026-01-27 | 691 RESOURCES | ILP ACTIVE**
