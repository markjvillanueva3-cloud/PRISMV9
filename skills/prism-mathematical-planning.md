# PRISM MATHEMATICAL PLANNING SKILL v1.0
## Codename: MATHPLAN
## Level: 1 (Cognitive - Integrates with SP.1 Workflow)
## Triggers: brainstorm, plan, design, decompose, task, scope

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: CORE PRINCIPLE
# ════════════════════════════════════════════════════════════════════════════════

> **"If you can't write an equation for it, you don't understand it well enough to execute it."**

This skill ENFORCES mathematical formalization of ALL tasks during brainstorm and 
planning phases. No task proceeds to execution without:
1. A completeness equation proving 100% coverage
2. A complexity formula estimating exact effort
3. A verification function proving no skips possible
4. Constraint equations defining all boundaries

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: THE TASK COMPLETENESS THEOREM (TCT)
# ════════════════════════════════════════════════════════════════════════════════

## Definition: A task T is COMPLETE if and only if:

```
C(T) = 1  ⟺  ∀i ∈ Items(T): Done(i) = 1

WHERE:
C(T) = Completeness of task T ∈ [0,1]
Items(T) = Set of all atomic work items in T
Done(i) = Binary completion status of item i ∈ {0,1}

FORMULA:
C(T) = (1/n) × Σᵢ₌₁ⁿ Done(i)

WHERE n = |Items(T)| = cardinality of item set
```

## Corollary: No Partial Credit
```
C(T) < 1.0  →  Task INCOMPLETE (regardless of how close)
C(T) = 0.99 is FAILURE, not "almost done"
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: THE DECOMPOSITION COMPLETENESS EQUATION (DCE)
# ════════════════════════════════════════════════════════════════════════════════

## Before ANY task decomposition, PROVE completeness algebraically:

```
GIVEN: Task T with scope S
PROVE: Decomposition D = {d₁, d₂, ..., dₖ} covers S completely

COMPLETENESS PROOF:
S = ⋃ᵢ₌₁ᵏ Scope(dᵢ)           [Union covers all]
∀i≠j: Scope(dᵢ) ∩ Scope(dⱼ) = ∅  [No overlaps/duplicates]

VERIFICATION:
|S| = Σᵢ₌₁ᵏ |Scope(dᵢ)|        [Sizes must sum exactly]
```

## Example Application:

```
TASK: "Add 127 parameters to 1,540 materials"

SCOPE EQUATION:
S = Materials × Parameters = 1,540 × 127 = 195,580 total cells

DECOMPOSITION:
d₁ = P_STEELS:     849 × 127 = 107,823 cells
d₂ = N_NONFERROUS: 398 × 127 =  50,546 cells
d₃ = M_STAINLESS:  191 × 127 =  24,257 cells
d₄ = K_CAST_IRON:   54 × 127 =   6,858 cells
d₅ = S_SUPERALLOYS: 28 × 127 =   3,556 cells
d₆ = H_HARDENED:    10 × 127 =   1,270 cells
d₇ = X_SPECIALTY:   10 × 127 =   1,270 cells

VERIFICATION:
Σ = 107,823 + 50,546 + 24,257 + 6,858 + 3,556 + 1,270 + 1,270 = 195,580 ✓
195,580 = 195,580 ✓ DECOMPOSITION COMPLETE
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: THE NO-SKIP INVARIANT (NSI)
# ════════════════════════════════════════════════════════════════════════════════

## Definition: Execution must be MONOTONIC - no item can be skipped

```
INVARIANT: ∀t₁ < t₂: Progress(t₁) ≤ Progress(t₂)

NO-SKIP PROOF:
Let Executed(t) = set of items completed by time t
REQUIRE: Executed(t) forms a CONTIGUOUS prefix of Items(T)

VIOLATION DETECTION:
Skip(i) = 1  ⟺  Done(i) = 0 ∧ ∃j > i: Done(j) = 1
IF ∃i: Skip(i) = 1 → HALT EXECUTION, ROLLBACK TO i
```

## Enforcement Formula:

```
EXECUTION ORDER FUNCTION:
Order: Items(T) → ℕ  [Maps items to execution sequence]

VALID EXECUTION:
∀i,j ∈ Items(T): Order(i) < Order(j) → Time(Done(i)) < Time(Done(j))

CHECKPOINT VALIDATION:
At checkpoint k: 
  Executed = {i : Order(i) ≤ k}
  Remaining = {i : Order(i) > k}
  |Executed| + |Remaining| = n  [Conservation law]
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: THE EFFORT ESTIMATION EQUATIONS (EEE)
# ════════════════════════════════════════════════════════════════════════════════

## Complexity Formula:

```
EFFORT(T) = Σᵢ₌₁ⁿ (Baseᵢ × Complexityᵢ × Riskᵢ)

WHERE:
Baseᵢ = Base effort for item i (in tool calls or time units)
Complexityᵢ = Complexity multiplier ∈ [1.0, 5.0]
Riskᵢ = Risk/uncertainty multiplier ∈ [1.0, 3.0]
```

## Complexity Factors:

```
Complexity(item) = 1 + Σⱼ Factorⱼ

FACTORS:
+0.5  if item requires file I/O
+0.5  if item requires validation
+1.0  if item requires cross-reference
+1.0  if item has dependencies
+2.0  if item involves calculation
+0.5  if item is first of its type (learning curve)
```

## Time Estimation:

```
TIME(T) = EFFORT(T) × AVG_TIME_PER_CALL × BUFFER

WHERE:
AVG_TIME_PER_CALL ≈ 3 seconds (empirical)
BUFFER = 1.5 (50% safety margin)

MICROSESSION SIZING:
MS_COUNT = ⌈EFFORT(T) / 15⌉  [15 calls per microsession max]
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: THE COVERAGE MATRIX (CM)
# ════════════════════════════════════════════════════════════════════════════════

## For multi-dimensional tasks, construct coverage matrix:

```
COVERAGE MATRIX M[i,j]:
Rows = Dimension 1 items (e.g., materials)
Cols = Dimension 2 items (e.g., parameters)
M[i,j] = 1 if cell complete, 0 otherwise

COMPLETENESS:
C(T) = (Σᵢ Σⱼ M[i,j]) / (rows × cols)

REQUIRED: C(T) = 1.0 exactly
```

## Gap Detection Formula:

```
GAPS = {(i,j) : M[i,j] = 0}
|GAPS| = rows × cols - Σᵢ Σⱼ M[i,j]

IF |GAPS| > 0:
  LIST all gaps explicitly
  ESTIMATE effort to close: EFFORT_REMAINING = |GAPS| × AVG_EFFORT_PER_CELL
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: CONSTRAINT SATISFACTION EQUATIONS (CSE)
# ════════════════════════════════════════════════════════════════════════════════

## All constraints must be formalized mathematically:

```
CONSTRAINT TYPES:

1. BOUNDARY CONSTRAINTS (hard limits):
   min ≤ value ≤ max
   Example: 0 < Kc1.1 < 10000 MPa

2. RELATIONSHIP CONSTRAINTS (dependencies):
   f(x) ≤ g(y)
   Example: yieldStrength ≤ tensileStrength

3. CONSISTENCY CONSTRAINTS (cross-validation):
   |calc - measured| / measured < tolerance
   Example: |E_calc - E_measured| / E_measured < 0.05

4. COMPLETENESS CONSTRAINTS (coverage):
   ∀i: hasValue(paramᵢ) = true
   Example: All 127 parameters must exist

5. UNIQUENESS CONSTRAINTS (no duplicates):
   ∀i≠j: ID(i) ≠ ID(j)
   Example: Material IDs must be unique
```

## Constraint Verification Function:

```
VALID(item) = ∧ᵢ Constraintᵢ(item)

WHERE ∧ = logical AND (all must pass)

IF ¬VALID(item):
  IDENTIFY failing constraint(s)
  HALT until resolved
  DO NOT proceed with invalid data
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: THE INVENTION PROTOCOL (IP)
# ════════════════════════════════════════════════════════════════════════════════

## When existing equations are insufficient, INVENT NEW ONES:

```
INVENTION TRIGGER:
IF ∄ equation E: E models aspect A of task T
THEN INVOKE Invention Protocol

INVENTION PROCESS:
1. IDENTIFY: What quantity/relationship needs modeling?
2. VARIABLES: What inputs affect the output?
3. FORM: What mathematical form is appropriate?
   - Linear: y = mx + b
   - Power: y = axⁿ
   - Exponential: y = ae^(bx)
   - Logarithmic: y = a·ln(x) + b
   - Composite: combination of above
4. CALIBRATE: Use known data points to fit parameters
5. VALIDATE: Test against held-out data
6. DOCUMENT: Record equation, derivation, limitations
```

## Novel Equation Template:

```
EQUATION: [Name]_v[Version]
PURPOSE: [What it calculates]
FORM: [Mathematical expression]
VARIABLES:
  - [var1]: [description] [units] [range]
  - [var2]: [description] [units] [range]
DERIVATION: [How it was developed]
VALIDATION: [How accuracy was verified]
LIMITATIONS: [When it should NOT be used]
CONFIDENCE: [0-1 rating]
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: THE PLANNING PHASE PROTOCOL (PPP)
# ════════════════════════════════════════════════════════════════════════════════

## MANDATORY steps during brainstorm/planning:

```
PHASE 1: SCOPE QUANTIFICATION
├── Q1: What is the EXACT scope? (count items)
├── Q2: What are ALL dimensions? (list exhaustively)
├── Q3: What is the coverage matrix size?
└── OUTPUT: S = n₁ × n₂ × ... × nₖ

PHASE 2: COMPLETENESS EQUATION
├── Write C(T) formula explicitly
├── Define Items(T) set membership
├── Prove decomposition covers S
└── OUTPUT: Mathematical proof of coverage

PHASE 3: CONSTRAINT FORMALIZATION
├── List ALL constraints mathematically
├── Define validation functions
├── Identify constraint dependencies
└── OUTPUT: Constraint satisfaction system

PHASE 4: EFFORT ESTIMATION
├── Calculate EFFORT(T) formula
├── Determine microsession count
├── Estimate total time
└── OUTPUT: Quantified work estimate

PHASE 5: NO-SKIP ORDERING
├── Define execution order function
├── Identify checkpoint positions
├── Define rollback procedures
└── OUTPUT: Ordered execution plan

PHASE 6: VERIFICATION DESIGN
├── Define success criteria mathematically
├── Design validation checks
├── Create progress tracking formula
└── OUTPUT: Verification protocol
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: INTEGRATION WITH SP.1 WORKFLOW
# ════════════════════════════════════════════════════════════════════════════════

## Modified Workflow:

```
ORIGINAL SP.1:
brainstorm → planning → execution → verification

ENHANCED WITH MATHPLAN:
brainstorm → MATHPLAN → planning → execution → verification
            ↓
            ├── Scope Quantification
            ├── Completeness Equation
            ├── Constraint Formalization
            ├── Effort Estimation
            ├── No-Skip Ordering
            └── Verification Design
```

## Gate Requirement:

```
MATHPLAN GATE:
Before proceeding to execution, MUST have:

□ Written scope equation: S = [formula]
□ Written completeness equation: C(T) = [formula]
□ Proven decomposition: ⋃dᵢ = S ✓
□ Listed all constraints mathematically
□ Calculated effort: EFFORT(T) = [number]
□ Defined execution order
□ Designed verification checks

IF any □ unchecked → CANNOT proceed to execution
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: EXAMPLE APPLICATION
# ════════════════════════════════════════════════════════════════════════════════

## Task: "Audit all materials for 127-parameter completeness"

```
═══════════════════════════════════════════════════════════════
MATHPLAN ANALYSIS
═══════════════════════════════════════════════════════════════

PHASE 1: SCOPE QUANTIFICATION
────────────────────────────────────────────────────────────────
S = Materials × Parameters × Checks
S = 1,540 × 127 × 1 = 195,580 parameter checks

Dimensions:
- D₁: Materials = 1,540 (across 7 ISO groups)
- D₂: Parameters = 127 (12 categories)
- D₃: Check types = 1 (exists/not exists)

Coverage Matrix: M[1540, 127]

PHASE 2: COMPLETENESS EQUATION
────────────────────────────────────────────────────────────────
C(audit) = (1/195,580) × Σᵢ₌₁¹⁵⁴⁰ Σⱼ₌₁¹²⁷ Checked[i,j]

Items(audit) = {(m,p) : m ∈ Materials, p ∈ Parameters}
|Items| = 195,580

Decomposition by ISO group:
d₁ = P_STEELS:     849 × 127 = 107,823
d₂ = N_NONFERROUS: 398 × 127 =  50,546
d₃ = M_STAINLESS:  191 × 127 =  24,257
d₄ = K_CAST_IRON:   54 × 127 =   6,858
d₅ = S_SUPERALLOYS: 28 × 127 =   3,556
d₆ = H_HARDENED:    10 × 127 =   1,270
d₇ = X_SPECIALTY:   10 × 127 =   1,270
                              ─────────
TOTAL:                         195,580 ✓

PHASE 3: CONSTRAINT FORMALIZATION
────────────────────────────────────────────────────────────────
C1: ∀(m,p): Checked[m,p] ∈ {0,1}     [Binary check]
C2: ∀m: Σₚ Checked[m,p] = 127        [All params checked per material]
C3: ∀p: Σₘ Checked[m,p] = 1540       [All materials checked per param]
C4: FinalCount = 195,580              [Total checks performed]

PHASE 4: EFFORT ESTIMATION
────────────────────────────────────────────────────────────────
EFFORT = Files × (Read + Parse + Validate)
EFFORT = 44 files × (1 + 2 + 1) calls = 176 base calls

With complexity factors:
- Large file handling: ×1.5
- JSON parsing: ×1.2
- Validation logic: ×1.3

EFFORT = 176 × 1.5 × 1.2 × 1.3 ≈ 412 effective calls

Microsessions: ⌈412/15⌉ = 28 microsessions
Estimated time: 412 × 3s × 1.5 = 1,854s ≈ 31 minutes

PHASE 5: NO-SKIP ORDERING
────────────────────────────────────────────────────────────────
Order: Process ISO groups sequentially
  1. P_STEELS (largest first)
  2. N_NONFERROUS
  3. M_STAINLESS
  4. K_CAST_IRON
  5. S_SUPERALLOYS
  6. H_HARDENED
  7. X_SPECIALTY

Checkpoints: After each ISO group
Rollback: Re-process from last checkpoint

PHASE 6: VERIFICATION DESIGN
────────────────────────────────────────────────────────────────
Success criteria: C(audit) = 1.0

Validation checks:
V1: file_count_processed = 44
V2: material_count_processed = 1,540
V3: total_checks = 195,580
V4: no_parse_errors = true

Progress formula:
Progress(t) = Σᵢ₌₁ᵗ |Checked_in_group[i]| / 195,580

═══════════════════════════════════════════════════════════════
MATHPLAN GATE: ALL CHECKS PASSED ✓
Proceeding to execution authorized.
═══════════════════════════════════════════════════════════════
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 11: NOVEL EQUATIONS INVENTED FOR PRISM
# ════════════════════════════════════════════════════════════════════════════════

## E1: Material Coverage Index (MCI)

```
EQUATION: MCI_v1.0
PURPOSE: Quantify parameter completeness for a material
FORM: MCI(m) = Σⱼ₌₁¹²⁷ (wⱼ × hasValue(m,pⱼ)) / Σⱼ₌₁¹²⁷ wⱼ

VARIABLES:
- m: material being evaluated
- pⱼ: parameter j ∈ {1..127}
- wⱼ: importance weight of parameter j ∈ [0,1]
- hasValue(m,p): 1 if material m has parameter p, 0 otherwise

WEIGHTS (by category):
- Identity: 1.0 (required)
- Kienzle: 0.95 (critical for cutting)
- Johnson-Cook: 0.90 (critical for simulation)
- Taylor: 0.85 (important for tool life)
- Mechanical: 0.80 (important)
- Physical: 0.70 (useful)
- Other: 0.50 (supplementary)

INTERPRETATION:
MCI = 1.0: Perfect coverage
MCI ≥ 0.9: Production ready
MCI ≥ 0.7: Usable with caution
MCI < 0.7: Incomplete, needs enhancement
```

## E2: Database Utilization Factor (DUF)

```
EQUATION: DUF_v1.0
PURPOSE: Measure how well a database is being used across system
FORM: DUF(db) = (1/n) × Σᵢ₌₁ⁿ min(consumers(itemᵢ)/target, 1.0)

VARIABLES:
- db: database being evaluated
- n: number of items in database
- consumers(item): count of modules consuming this item
- target: target consumer count (default: 6)

INTERPRETATION:
DUF = 1.0: All items have ≥ target consumers
DUF < 1.0: Some items underutilized
DUF < 0.5: Significant underutilization (COMMANDMENT 1 violation)
```

## E3: Task Completion Confidence (TCC)

```
EQUATION: TCC_v1.0
PURPOSE: Probability that task is truly complete
FORM: TCC(T) = C(T) × V(T) × (1 - E(T))

VARIABLES:
- C(T): Completeness score [0,1]
- V(T): Verification score [0,1] = passed_checks / total_checks
- E(T): Error rate [0,1] = errors_found / items_processed

INTERPRETATION:
TCC = 1.0: Perfect confidence (all complete, verified, no errors)
TCC ≥ 0.95: High confidence (acceptable for production)
TCC < 0.95: Requires review before release
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 12: QUICK REFERENCE FORMULAS
# ════════════════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FORMULA                          │ PURPOSE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ C(T) = Σ Done(i) / n             │ Task completeness                       │
│ S = Π nᵢ                         │ Scope size (product of dimensions)      │
│ |GAPS| = S - Σ M[i,j]            │ Gap count                               │
│ EFFORT = Σ(Base × Cmplx × Risk)  │ Work estimation                         │
│ MS_COUNT = ⌈EFFORT/15⌉           │ Microsession count                      │
│ MCI = Σ(w × has) / Σw            │ Material coverage index                 │
│ DUF = Σ min(cons/6, 1) / n       │ Database utilization factor             │
│ TCC = C × V × (1-E)              │ Task completion confidence              │
│ Progress = completed / total      │ Progress percentage                     │
│ TIME = EFFORT × 3s × 1.5         │ Time estimate (with buffer)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 13: ENFORCEMENT CHECKLIST
# ════════════════════════════════════════════════════════════════════════════════

## Before ANY task execution, verify:

```
□ SCOPE QUANTIFIED
  "S = [exact number] items across [N] dimensions"

□ COMPLETENESS EQUATION WRITTEN
  "C(T) = [formula]"

□ DECOMPOSITION PROVEN
  "Σ|dᵢ| = S ✓"

□ CONSTRAINTS FORMALIZED
  "C1: [constraint], C2: [constraint], ..."

□ EFFORT CALCULATED
  "EFFORT = [number], MS_COUNT = [number]"

□ RESOURCES SELECTED (v13.0)
  "R* = F-PSI-001(T) → optimal {skills, agents, formulas}"
  "Coverage ≥ 95%, Synergy maximized, Conflicts = ∅"

□ ORDER DEFINED
  "Execute in order: [1, 2, 3, ...]"

□ VERIFICATION DESIGNED
  "Success when: [criteria]"

IF ANY UNCHECKED → STOP. Complete MATHPLAN first.
```

---

**THIS IS MANUFACTURING INTELLIGENCE. MATHEMATICS ELIMINATES AMBIGUITY.**

**Version:** 1.0 | **Created:** 2026-01-26 | **Author:** PRISM Development
