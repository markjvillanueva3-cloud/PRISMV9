# PRISM MATHEMATICAL PLANNING SKILL v1.0
## Codename: MATHPLAN
## Level: 0 (Always-On - Proof Before Execution)
## Triggers: brainstorm, plan, design, decompose, task, scope

---

# CORE PRINCIPLE

> **"If you can't write an equation for it, you don't understand it well enough to execute it."**

---

# MATHPLAN GATE (MANDATORY BEFORE EXECUTION)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         MATHPLAN GATE v1.0                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  □ SCOPE QUANTIFIED                                                           ║
║    S = [n₁] × [n₂] × ... = [EXACT TOTAL]                                      ║
║                                                                               ║
║  □ COMPLETENESS EQUATION                                                      ║
║    C(T) = Σ Done(i) / n = 1.0 required                                        ║
║                                                                               ║
║  □ DECOMPOSITION PROVEN                                                       ║
║    d₁ + d₂ + ... + dₖ = S  ✓                                                  ║
║                                                                               ║
║  □ RESOURCES SELECTED (F-PSI-001)                                             ║
║    R* = argmax Ψ(T,R) over valid combinations                                 ║
║    Skills: [list], Agents: [list], Formulas: [list]                           ║
║                                                                               ║
║  □ EFFORT WITH UNCERTAINTY                                                    ║
║    EFFORT = [value] ± [uncertainty] calls ([confidence]% CI)                  ║
║    MS_COUNT = ⌈EFFORT/15⌉ = [N] microsessions                                 ║
║    TIME = [value] ± [uncertainty] minutes ([confidence]% CI)                  ║
║                                                                               ║
║  □ CONSTRAINTS FORMALIZED                                                     ║
║    C1: [mathematical constraint]                                              ║
║    C2: [mathematical constraint]                                              ║
║                                                                               ║
║  □ NO-SKIP ORDER DEFINED                                                      ║
║    Execution sequence: [1, 2, 3, ...]                                         ║
║    Checkpoints: After [items/groups]                                          ║
║                                                                               ║
║  □ VERIFICATION CRITERIA                                                      ║
║    Success when: [mathematical criteria]                                      ║
║                                                                               ║
║  ALL CHECKED? → Proceed    ANY UNCHECKED? → STOP                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# CORE FORMULAS

| Formula | Purpose |
|---------|---------|
| C(T) = Σ Done(i) / n | Task completeness (MUST = 1.0) |
| S = Π nᵢ | Scope size (product of dimensions) |
| EFFORT = Σ(Base × Cmplx × Risk) | Work estimation |
| MS_COUNT = ⌈EFFORT/15⌉ | Microsession count |
| TIME = EFFORT × 3s × 1.5 | Time estimate with buffer |

---

# COMPLEXITY MULTIPLIERS

| Factor | Value |
|--------|-------|
| File I/O | +0.5 |
| Validation | +0.5 |
| Cross-reference | +1.0 |
| Dependencies | +1.0 |
| Calculations | +2.0 |
| First of type | +0.5 |

---

# NO-SKIP INVARIANT

```
INVARIANT: Items must complete in ORDER
Skip(i) = 1  ⟺  Done(i) = 0 ∧ ∃j > i: Done(j) = 1
IF Skip detected → HALT, ROLLBACK to i
```

---

# PRISM-SPECIFIC FORMULAS

```
MCI(m) = Σ(wⱼ × hasValue(m,pⱼ)) / Σwⱼ
  Material Coverage Index [0-1]
  MCI ≥ 0.9 = production ready

DUF(db) = (1/n) × Σ min(consumers(i)/6, 1)
  Database Utilization Factor [0-1]
  DUF < 0.5 = COMMANDMENT 1 violation

TCC(T) = C(T) × V(T) × (1 - E(T))
  Task Completion Confidence [0-1]
  TCC ≥ 0.95 = release ready
```

---

**FULL DOCUMENTATION:** See C:\PRISM\skills\prism-mathematical-planning.md
