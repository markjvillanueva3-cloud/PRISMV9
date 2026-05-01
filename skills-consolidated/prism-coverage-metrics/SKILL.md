---
name: prism-coverage-metrics
description: Three formulas to measure completeness and utilization — MCI for material parameter coverage, DUF for database consumer utilization, TCC for task completion confidence
---
# Coverage Metrics

## When To Use
- At milestone gates when you need to prove coverage is sufficient
- "Is this material complete enough for production?" → compute MCI
- "Are our database entries actually being used?" → compute DUF
- "Can I confidently call this task done?" → compute TCC
- When phase gates require quantified evidence of completeness
- NOT for: estimating effort before starting (use prism-effort-estimation)
- NOT for: process quality scoring (use prism-process-quality-audit for P(x))

## How To Use
**FORMULA 1: Material Coverage Index — MCI(m)**
  Measures how complete a material's parameter set is, weighted by importance.
  ```
  MCI(m) = sum(wj * hasValue(m, pj)) / sum(wj)
  ```
  wj = importance weight of parameter j (critical parameters weighted higher)
  hasValue(m, pj) = 1 if material m has a value for parameter pj, else 0

  Weight scheme for 127 parameters:
  - w=3.0: kc1_1, mc (Kienzle constants — safety-critical for cutting force)
  - w=2.0: density, hardness, tensile_strength, thermal_conductivity (key physics)
  - w=1.5: elongation, yield_strength, elastic_modulus (important but less critical)
  - w=1.0: all other parameters

  Gates:
  MCI >= 0.90: production ready — safe to use for cutting parameter calculations
  MCI 0.70-0.89: usable with warnings — missing parameters flagged to user
  MCI 0.50-0.69: incomplete — needs enhancement before use
  MCI < 0.50: stub — too incomplete, block from calculations

  Execute: `prism_validate action=material params={material_id: "4140"}`

**FORMULA 2: Database Utilization Factor — DUF(db)**
  Measures whether database entries have enough downstream consumers.
  ```
  DUF(db) = (1/n) * sum(min(consumers(i)/6, 1))
  ```
  n = number of data items in database
  consumers(i) = count of modules/dispatchers that read item i
  6 = target minimum consumers (Commandment 1: every data point serves 6-8 consumers)

  Gates:
  DUF >= 0.80: well-utilized — data is earning its keep
  DUF 0.60-0.79: underutilized — some data has too few consumers
  DUF < 0.60: Commandment 1 violation — significant rewiring needed
  DUF < 0.50: critical — most data is orphaned, architectural problem

  Execute: check consumer counts via `prism_knowledge action=relations`

**FORMULA 3: Task Completion Confidence — TCC(T)**
  Measures whether a task is truly done, combining three factors.
  ```
  TCC(T) = C(T) * V(T) * (1 - E(T))
  ```
  C(T) = completeness ratio: items_done / total_items (0.0-1.0)
  V(T) = verification score: evidence_level / required_level (0.0-1.0)
  E(T) = error rate: errors_found / items_checked (0.0-1.0, lower is better)

  Gates:
  TCC >= 0.90: confidently complete — ready for phase gate
  TCC 0.70-0.89: mostly complete — minor gaps to address
  TCC < 0.70: not ready — significant gaps or high error rate
  TCC = 0.0 if C(T)=0 OR V(T)=0 — can't be done without completeness AND verification

  Key insight: a task that's 100% complete but 0% verified has TCC=0.
  Verification is not optional — it multiplies directly.

## What It Returns
- MCI: single score per material, identifies which parameters are missing
- DUF: single score per database, identifies which items lack consumers
- TCC: single score per task, identifies whether completeness and verification are sufficient
- All three produce gate classifications with clear pass/fail thresholds
- Missing items are enumerated — not just "incomplete" but "missing parameters: [list]"

## Examples
- Input: "Is 4140 steel ready for production calculations?"
  MCI(4140): 122 of 127 parameters populated. Missing: thermal_diffusivity (w=1.0),
  specific_cutting_energy (w=2.0), 3 minor params (w=1.0 each).
  MCI = (sum weights present) / (sum all weights) = 194.5/201.0 = 0.968
  Gate: PRODUCTION READY. Safe for cutting calculations.

- Input: "How utilized is the materials registry?"
  DUF: 3518 materials. Average consumers: 4.2. Items with 6+ consumers: 2,100 (60%).
  DUF = 0.72. Gate: UNDERUTILIZED. 1,418 materials have fewer than 6 consumers.
  Action: add consumer wiring for underutilized materials (Commandment 1).

- Edge case: "Is DA-MS10 ready for gate?"
  C(T) = 24/30 skills created = 0.80. V(T) = all 24 verified via quality check = 1.0.
  E(T) = 2 skills needed size trim / 24 checked = 0.083.
  TCC = 0.80 * 1.0 * (1 - 0.083) = 0.73. Gate: MOSTLY COMPLETE. Need 6 more skills.
SOURCE: Split from prism-mathematical-planning (11.8KB)
RELATED: prism-effort-estimation, prism-mathplan-creation, prism-process-quality-audit
