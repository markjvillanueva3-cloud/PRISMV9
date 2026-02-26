# MATHPLAN PROTOCOL - QUICK REFERENCE
## Mathematical Planning Enforcement | v1.0
---

# ⛔ BEFORE ANY TASK: COMPLETE THIS MATH

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  NO EXECUTION WITHOUT MATHEMATICAL PROOF OF COMPLETENESS                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  □ SCOPE:        S = [n₁ × n₂ × ...] = [exact total]                         ║
║  □ COMPLETENESS: C(T) = Σ Done(i) / n                                        ║
║  □ DECOMPOSE:    Σ|dᵢ| = S  (prove it sums exactly)                          ║
║  □ CONSTRAINTS:  List ALL as equations                                        ║
║  □ EFFORT:       EFFORT = [number], MS = ⌈EFFORT/15⌉                         ║
║  □ ORDER:        Define exact sequence, no skips allowed                      ║
║  □ VERIFY:       Success = [mathematical criteria]                            ║
║                                                                               ║
║  ALL BOXES CHECKED? → Proceed. ANY UNCHECKED? → STOP.                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# 📐 CORE EQUATIONS

| Formula | Purpose |
|---------|---------|
| `C(T) = Σ Done(i) / n` | Completeness (must = 1.0) |
| `S = n₁ × n₂ × ... × nₖ` | Scope size |
| `Σ\|dᵢ\| = S` | Decomposition proof |
| `GAPS = S - Σ M[i,j]` | Gap count |
| `EFFORT = Σ(Base × Cmplx × Risk)` | Work estimate |
| `MS = ⌈EFFORT/15⌉` | Microsession count |
| `TIME = EFFORT × 3s × 1.5` | Time estimate |
| `MCI = Σ(w × has) / Σw` | Material coverage |
| `TCC = C × V × (1-E)` | Completion confidence |

---

# 🚫 NO-SKIP INVARIANT

```
RULE: Items must complete in ORDER. No jumping ahead.

∀i,j: Order(i) < Order(j) → Complete(i) BEFORE Complete(j)

VIOLATION: If item k skipped → HALT, ROLLBACK to k
```

---

# ✅ COMPLETENESS PROOF TEMPLATE

```
TASK: [Description]

SCOPE CALCULATION:
S = [Dimension1] × [Dimension2] × ... = [EXACT TOTAL]

DECOMPOSITION:
d₁ = [subset1]: [count1]
d₂ = [subset2]: [count2]
...
dₖ = [subsetk]: [countk]
                ─────────
TOTAL:          [sum] ✓ (must equal S exactly)

CONSTRAINTS:
C1: [mathematical constraint]
C2: [mathematical constraint]
...

EFFORT:
EFFORT = [calculation] = [number]
MS_COUNT = ⌈[number]/15⌉ = [microsessions]
TIME ≈ [minutes]

VERIFICATION:
Success when: [mathematical criteria]
```

---

# 🔢 COMPLEXITY MULTIPLIERS

| Factor | Multiplier |
|--------|------------|
| File I/O | +0.5 |
| Validation | +0.5 |
| Cross-reference | +1.0 |
| Dependencies | +1.0 |
| Calculations | +2.0 |
| First of type | +0.5 |

---

# 🎯 PRISM-SPECIFIC FORMULAS

**Material Coverage Index:**
```
MCI(m) = Σ(wⱼ × hasValue(m,pⱼ)) / Σwⱼ
```
- MCI ≥ 0.9: Production ready
- MCI < 0.7: Needs enhancement

**Database Utilization Factor:**
```
DUF(db) = Σ min(consumers(i)/6, 1) / n
```
- DUF = 1.0: All items have ≥6 consumers
- DUF < 0.5: COMMANDMENT 1 violation

**Task Completion Confidence:**
```
TCC = C(T) × V(T) × (1 - E(T))
```
- TCC ≥ 0.95: Release ready

---

# 🆕 INVENT NEW EQUATIONS WHEN NEEDED

```
TRIGGER: No existing equation models the task aspect

PROCESS:
1. IDENTIFY: What needs modeling?
2. VARIABLES: What inputs affect output?
3. FORM: Linear? Power? Exponential? Composite?
4. CALIBRATE: Fit to known data
5. VALIDATE: Test accuracy
6. DOCUMENT: Record everything
```

---

# 🔄 INTEGRATION WITH SP.1

```
ORIGINAL:  brainstorm → planning → execution → verification

ENHANCED:  brainstorm → MATHPLAN → planning → execution → verification
                        ↓
                        Must pass mathematical gate
```

---

**"If you can't write an equation, you don't understand it."**
