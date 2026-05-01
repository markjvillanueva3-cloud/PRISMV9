---
name: prism-effort-estimation
description: Estimate tool calls and sessions needed for a task — base scope count, complexity multipliers, risk factor, producing an effort range with 95% confidence interval
---
# Effort Estimation

## When To Use
- During MATHPLAN creation when filling the SCOPE QUANTIFIED and DECOMPOSITION fields
- "How many tool calls will this take?" / "How many sessions do I need?"
- Before committing to a milestone to verify it fits in the session/call budget
- When a task seems "about right" but you haven't actually counted — count first
- NOT for: creating the full MATHPLAN (use prism-mathplan-creation for all 7 fields)
- NOT for: tracking completion progress (use prism-context-pressure for call counting)

## How To Use
**STEP 1: COUNT BASE SCOPE (S)**
  Quantify the work items mathematically. Be specific — no "about" or "roughly."
  S = [countable items] x [operations per item]
  Examples:
  - "Split 5 oversized skills, 3 atomic skills each" → S = 5 x 3 = 15 skills
  - "Validate 49 materials with 127 parameters" → S = 49 x 127 = 6,223 checks
  - "Write 7 milestones with 5 steps each" → S = 7 x 5 = 35 steps

**STEP 2: APPLY COMPLEXITY MULTIPLIERS (C)**
  Add applicable multipliers to base 1.0:

  | Factor | Multiplier | When It Applies |
  |--------|-----------|-----------------|
  | File I/O | +0.5 | Reading/writing files per item |
  | Validation | +0.5 | Checking constraints per item |
  | Cross-reference | +1.0 | Comparing against other sources |
  | Dependencies | +1.0 | Managing relationships between items |
  | Calculations | +2.0 | Physics or math computation per item |
  | First-of-type | +0.5 | Learning curve on new patterns |

  C = 1.0 + sum of applicable multipliers

**STEP 3: APPLY RISK FACTOR (R)**
  | Confidence | Risk Factor | When |
  |-----------|-------------|------|
  | High (done this before) | 1.1 | Repeated pattern, known tools |
  | Medium (similar experience) | 1.3 | Similar but not identical task |
  | Low (new territory) | 1.5 | First time, unfamiliar tools |
  | Unknown | 2.0 | No comparable experience |

**STEP 4: COMPUTE EFFORT with confidence interval:**
  ```
  EFFORT = S x C x R
  95% CI = EFFORT +/- (EFFORT x 0.20)
  ```
  Lower bound = EFFORT x 0.80. Upper bound = EFFORT x 1.20.

**STEP 5: CONVERT to sessions:**
  Max 15 productive tool calls per session (leave buffer for checkpoints).
  Sessions = ceil(EFFORT / 15)
  Add 1 session buffer for the first attempt at a new task type.

## What It Returns
- Base scope S: exact count of work items
- Complexity multiplier C: accumulated from applicable factors
- Risk factor R: based on confidence level
- Effort estimate: S x C x R with 95% confidence interval
- Session count: how many sessions to budget, including buffer
- If EFFORT > 150 calls: flag as "needs decomposition into sub-tasks"

## Examples
- Input: "Split 5 oversized skills into 3 atomic skills each"
  S = 5 x 3 = 15 skills. C = 1.0 + 0.5(file I/O) + 0.5(validation/quality check) = 2.0
  R = 1.1 (done this pattern 5 times already)
  EFFORT = 15 x 2.0 x 1.1 = 33 +/- 7 calls. Sessions = ceil(33/15) = 3 sessions.

- Input: "Implement 7 cadence functions in cadenceExecutor.ts"
  S = 7 functions. C = 1.0 + 0.5(file I/O) + 1.0(dependencies) + 2.0(calculations) = 4.5
  R = 1.3 (implemented similar functions but not identical)
  EFFORT = 7 x 4.5 x 1.3 = 41 +/- 8 calls. Sessions = ceil(41/15) = 3 sessions.

- Edge case: "Audit all 3,518 materials for parameter completeness"
  S = 3518. C = 1.0 + 0.5(validation) + 1.0(cross-ref) = 2.5. R = 1.3
  EFFORT = 3518 x 2.5 x 1.3 = 11,434 calls. WAY over 150.
  Action: decompose. Batch by material group. P-steels (849) alone = 2,759 calls = 184 sessions.
  This is an ATCS task, not a manual session task.
SOURCE: Split from prism-mathematical-planning (11.8KB)
RELATED: prism-mathplan-creation, prism-context-pressure
