---
name: prism-mathematical-planning
description: |
  Mathematical proof required before execution. Enforces MATHPLAN gate with
  scope quantification, decomposition proof, effort estimation with uncertainty,
  and completeness verification. Integrates with microsession decomposition.
  Every task must have mathematical certainty before starting. Level 0 Always-On.
---

# PRISM Mathematical Planning Skill v1.0
## Codename: MATHPLAN - Proof Before Execution
## Level 0 Always-On
## Triggers: brainstorm, plan, design, decompose, task, scope, estimate

---

## Core Principle

> **"If you can't write an equation for it, you don't understand it well enough to execute it."**

No task begins without mathematical proof of:
- Exact scope
- Complete decomposition
- Effort with uncertainty
- Success criteria

---

## 1. MATHPLAN GATE (MANDATORY)

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
║    d₁ + d₂ + ... + dₖ = S  (must equal exactly)                               ║
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

## 2. CORE FORMULAS

### Task Completeness (F-PLAN-001)
```
C(T) = (1/n) × Σᵢ Done(i)

WHERE:
  n = total items
  Done(i) = 1 if complete, 0 if not
  
REQUIRED: C(T) = 1.0 (no partial credit)
```

### Effort Estimation (F-PLAN-002)
```
EFFORT(T) = Σᵢ (Baseᵢ × Complexityᵢ × Riskᵢ)

WHERE:
  Base = fundamental operation count
  Complexity = 1.0 + Σ(factors)
  Risk = 1.0 to 2.0 multiplier
```

### Microsession Count (F-PLAN-004)
```
MS_COUNT = ⌈EFFORT / 15⌉

WHERE:
  15 = max tool calls per microsession
  ⌈⌉ = ceiling function
```

### Time Estimation (F-PLAN-005)
```
TIME = EFFORT × t_avg × buffer

WHERE:
  t_avg = 3 seconds/call (default)
  buffer = 1.5 (50% safety margin)
```

---

## 3. COMPLEXITY MULTIPLIERS

| Factor | Multiplier | When Applied |
|--------|------------|--------------|
| File I/O | +0.5 | Reading/writing files |
| Validation | +0.5 | Checking constraints |
| Cross-reference | +1.0 | Comparing sources |
| Dependencies | +1.0 | Managing relationships |
| Calculations | +2.0 | Physics/math computation |
| First of type | +0.5 | Learning curve |

**Example:**
```
Base = 44 files × 4 ops = 176 calls
Complexity = 1.0 + 0.5 + 0.5 + 1.0 = 3.0
Risk = 1.3 (moderate uncertainty)
EFFORT = 176 × 3.0 × 1.3 = 686 ± 137 calls (95% CI)
```

---

## 4. DECOMPOSITION PROOF

**Requirement:** Prove sub-tasks sum exactly to total scope.

```
THEOREM: Σ|dᵢ| = S

EXAMPLE:
Task: Audit 1,540 materials × 127 parameters = 195,580 cells

DECOMPOSITION:
d₁ = P_STEELS:     849 × 127 = 107,823 cells
d₂ = N_NONFERROUS: 398 × 127 =  50,546 cells
d₃ = M_STAINLESS:  191 × 127 =  24,257 cells
d₄ = K_CAST_IRON:   54 × 127 =   6,858 cells
d₅ = S_SUPERALLOYS: 28 × 127 =   3,556 cells
d₆ = H_HARDENED:    10 × 127 =   1,270 cells
d₇ = X_SPECIALTY:   10 × 127 =   1,270 cells
                              ─────────
Σ|dᵢ| =                        195,580 = S ✓
```

---

## 5. NO-SKIP INVARIANT

```
INVARIANT: Items must complete in ORDER

Skip(i) = 1  ⟺  Done(i) = 0 ∧ ∃j > i: Done(j) = 1

IF Skip detected → HALT, ROLLBACK to item i
```

**Enforces:** No jumping ahead. Complete each item before moving on.

---

## 6. PRISM-SPECIFIC FORMULAS

### Material Coverage Index (F-MAT-001)
```
MCI(m) = Σⱼ(wⱼ × hasValue(m,pⱼ)) / Σⱼwⱼ

WHERE:
  wⱼ = importance weight of parameter j
  hasValue(m,pⱼ) = 1 if material m has parameter pⱼ

MCI ≥ 0.90 = production ready
MCI < 0.50 = incomplete, needs enhancement
```

### Database Utilization Factor (F-MAT-002)
```
DUF(db) = (1/n) × Σᵢ min(consumers(i)/6, 1)

WHERE:
  n = number of data items
  consumers(i) = modules using item i
  6 = target minimum consumers (COMMANDMENT 1)

DUF < 0.50 = COMMANDMENT 1 violation
DUF ≥ 0.80 = well-utilized
```

### Task Completion Confidence (F-PLAN-003)
```
TCC(T) = C(T) × V(T) × (1 - E(T))

WHERE:
  C(T) = completeness [0-1]
  V(T) = verification score [0-1]
  E(T) = error rate [0-1]

TCC ≥ 0.95 = release ready
TCC < 0.80 = needs review
```

---

## 7. MICROSESSION INTEGRATION

**LAW 2: MANDATORY MICROSESSIONS**

```
EVERY task MUST be decomposed BEFORE execution:
- Chunk size: 15-25 items per microsession
- Max tool calls per MS: 15
- Checkpoint: At every MS boundary
```

**MATHPLAN provides:**
- MS_COUNT = how many microsessions
- Checkpoint positions = where to save state
- Order constraints = what sequence

---

## 8. BUFFER ZONES

| Zone | Tool Calls | Action |
|------|------------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Checkpoint soon |
| 🟠 ORANGE | 15-18 | Checkpoint NOW |
| 🔴 RED | 19+ | EMERGENCY STOP |

---

## 9. WORKED MATHPLAN EXAMPLE

```
═══════════════════════════════════════════════════════════════
TASK: Audit 1,540 materials for 127-parameter completeness
═══════════════════════════════════════════════════════════════

□ SCOPE QUANTIFIED
  S = 1,540 materials × 127 parameters = 195,580 cells

□ COMPLETENESS EQUATION
  C(audit) = cells_checked / 195,580 = 1.0 required

□ DECOMPOSITION PROVEN
  d₁ + d₂ + d₃ + d₄ + d₅ + d₆ + d₇ = 195,580 ✓
  (see breakdown above)

□ EFFORT WITH UNCERTAINTY
  Base = 44 files × 4 ops = 176 calls
  Complexity = 1.5 × 1.2 × 1.3 = 2.34
  EFFORT = 176 × 2.34 = 412 ± 85 calls (95% CI)
  MS_COUNT = ⌈412/15⌉ = 28 ± 6 microsessions
  TIME = 412 × 3s × 1.5 = 31 ± 6 minutes

□ CONSTRAINTS
  C1: ∀(m,p): Checked[m,p] ∈ {0,1}
  C2: ∀m: Σₚ Checked[m,p] = 127
  C3: Final count = 195,580

□ ORDER
  Execute: 1→2→3→4→5→6→7 (by ISO group)
  Checkpoints: After each group

□ SUCCESS CRITERIA
  C(audit) = 195,580 / 195,580 = 1.0

═══════════════════════════════════════════════════════════════
MATHPLAN GATE: PASSED ✓ → Proceed to execution
═══════════════════════════════════════════════════════════════
```

---

## 10. PREDICTION LOGGING

**Every estimate MUST be logged to PREDICTION_LOG.json:**

```json
{
  "id": "PRED-20260126-001",
  "formulaId": "F-PLAN-002",
  "task": "Material audit",
  "predicted": {
    "effort": {"value": 412, "uncertainty": 85, "ci": 0.95},
    "time": {"value": 31, "uncertainty": 6, "ci": 0.95}
  },
  "actual": null,
  "status": "PENDING_ACTUAL"
}
```

**After completion, update with actuals for calibration.**

---

## 11. ENFORCEMENT

```
HARD STOP: Cannot proceed without MATHPLAN gate

IF any checkbox unchecked:
  → STOP
  → Complete MATHPLAN
  → Re-verify all items
  → Only then proceed

NO EXCEPTIONS. NO SHORTCUTS.
```

---

## 12. QUICK REFERENCE

| What | Formula |
|------|---------|
| Completeness | C(T) = Σ Done(i) / n |
| Effort | EFFORT = Base × Complexity × Risk |
| Sessions | MS_COUNT = ⌈EFFORT/15⌉ |
| Time | TIME = EFFORT × 3s × 1.5 |
| Coverage | MCI = Σ(w × has) / Σw |
| Utilization | DUF = Σ min(cons/6, 1) / n |
| Confidence | TCC = C × V × (1-E) |

---

**IF YOU CAN'T PROVE IT, YOU CAN'T DO IT.**
